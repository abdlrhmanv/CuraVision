from __future__ import annotations

"""Utilities for Figshare-style Brain Tumor .mat files.

The Figshare brain tumor segmentation dataset often stores each case as a MATLAB
v7.3 .mat file with a group named `cjdata` containing:
    - image       : MRI slice array
    - tumorMask   : binary tumor mask
    - label       : tumor label, commonly 1=meningioma, 2=glioma, 3=pituitary
    - tumorBorder : optional polygon/border coordinates
    - PID         : patient/case id stored as character codes

This module converts those files into normal PNG image/mask pairs so the rest of
our segmentation pipeline can stay simple and easy to debug.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple
import csv
import random

import h5py
import numpy as np
from PIL import Image


FIGSHARE_LABEL_MAP = {
    1: "meningioma",
    2: "glioma",
    3: "pituitary",
}


@dataclass
class MatCase:
    """One extracted .mat case."""

    image: np.ndarray
    mask: np.ndarray
    label_id: Optional[int]
    label_name: Optional[str]
    pid: Optional[str]


def _normalize_to_uint8(image: np.ndarray) -> np.ndarray:
    """Normalize an MRI array to uint8 range 0..255 for PNG saving.

    MRI files can store values as int16/float with arbitrary intensity ranges.
    PNG images need normal 8-bit values, so we min-max normalize each slice.
    """
    image = np.asarray(image, dtype=np.float32)
    image = np.squeeze(image)

    image = image - float(np.min(image))
    max_value = float(np.max(image))
    if max_value > 0:
        image = image / max_value

    image = image * 255.0
    return image.astype(np.uint8)


def _mask_to_uint8(mask: np.ndarray) -> np.ndarray:
    """Convert any non-zero mask pixels to 255 and background to 0."""
    mask = np.asarray(mask)
    mask = np.squeeze(mask)
    mask = (mask > 0).astype(np.uint8) * 255
    return mask


def _decode_pid(raw_pid: np.ndarray) -> Optional[str]:
    """Decode MATLAB character-code PID arrays into text when possible."""
    try:
        arr = np.asarray(raw_pid).squeeze()
        if arr.size == 0:
            return None
        chars = []
        for value in arr.flatten():
            code = int(value)
            if code > 0:
                chars.append(chr(code))
        text = "".join(chars).strip()
        return text or None
    except Exception:
        return None


def load_figshare_mat(mat_path: str | Path) -> MatCase:
    """Load a Figshare-style v7.3 .mat file using h5py.

    Your uploaded sample `3057.mat` has this exact structure:
        cjdata/image       -> (512, 512) int16
        cjdata/tumorMask   -> (512, 512) uint8, values 0/1
        cjdata/label       -> (1, 1) float64
        cjdata/PID         -> character codes

    Returns a MatCase with image normalized to uint8 and mask converted to 0/255.
    """
    mat_path = Path(mat_path)
    with h5py.File(mat_path, "r") as f:
        if "cjdata" not in f:
            raise KeyError(f"Expected group 'cjdata' in {mat_path}")

        cjdata = f["cjdata"]
        required = ["image", "tumorMask"]
        missing = [key for key in required if key not in cjdata]
        if missing:
            raise KeyError(f"Missing keys {missing} in {mat_path}")

        image = _normalize_to_uint8(cjdata["image"][()])
        mask = _mask_to_uint8(cjdata["tumorMask"][()])

        label_id = None
        label_name = None
        if "label" in cjdata:
            label_value = np.asarray(cjdata["label"][()]).squeeze()
            label_id = int(label_value.item()) if np.asarray(label_value).size else None
            label_name = FIGSHARE_LABEL_MAP.get(label_id, f"label_{label_id}" if label_id is not None else None)

        pid = _decode_pid(cjdata["PID"][()]) if "PID" in cjdata else None

    return MatCase(image=image, mask=mask, label_id=label_id, label_name=label_name, pid=pid)


def inspect_mat_file(mat_path: str | Path) -> Dict[str, object]:
    """Return basic structure information for debugging one .mat file."""
    mat_path = Path(mat_path)
    info: Dict[str, object] = {"path": str(mat_path), "groups": {}}
    with h5py.File(mat_path, "r") as f:
        for group_name in f.keys():
            group_obj = f[group_name]
            if isinstance(group_obj, h5py.Group):
                info["groups"][group_name] = {}
                for key in group_obj.keys():
                    obj = group_obj[key]
                    shape = tuple(obj.shape) if hasattr(obj, "shape") else None
                    dtype = str(obj.dtype) if hasattr(obj, "dtype") else None
                    entry = {"shape": shape, "dtype": dtype}
                    try:
                        arr = np.asarray(obj[()])
                        if np.issubdtype(arr.dtype, np.number) and arr.size:
                            entry["min"] = float(arr.min())
                            entry["max"] = float(arr.max())
                    except Exception:
                        pass
                    info["groups"][group_name][key] = entry
            else:
                info["groups"][group_name] = {
                    "shape": tuple(group_obj.shape),
                    "dtype": str(group_obj.dtype),
                }
    return info


def split_paths(paths: Iterable[Path], train_ratio: float, val_ratio: float, test_ratio: float, seed: int) -> Dict[str, List[Path]]:
    """Shuffle and split case paths into train/val/test."""
    if abs((train_ratio + val_ratio + test_ratio) - 1.0) > 1e-6:
        raise ValueError("train_ratio + val_ratio + test_ratio must equal 1.0")

    paths = list(paths)
    rng = random.Random(seed)
    rng.shuffle(paths)

    n = len(paths)
    train_end = int(n * train_ratio)
    val_end = train_end + int(n * val_ratio)

    return {
        "train": paths[:train_end],
        "val": paths[train_end:val_end],
        "test": paths[val_end:],
    }


def convert_mat_folder_to_png(
    input_dir: str | Path,
    output_dir: str | Path,
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    seed: int = 42,
    overwrite: bool = False,
) -> Dict[str, int]:
    """Convert a folder of Figshare .mat files into image/mask PNG folders.

    Output structure:
        output_dir/train/images/*.png
        output_dir/train/masks/*.png
        output_dir/val/images/*.png
        output_dir/val/masks/*.png
        output_dir/test/images/*.png
        output_dir/test/masks/*.png
        output_dir/metadata.csv
    """
    input_dir = Path(input_dir)
    output_dir = Path(output_dir)

    mat_files = sorted(input_dir.glob("*.mat"))
    if not mat_files:
        raise FileNotFoundError(f"No .mat files found in: {input_dir}")

    splits = split_paths(mat_files, train_ratio, val_ratio, test_ratio, seed)
    output_dir.mkdir(parents=True, exist_ok=True)

    metadata_rows = []
    counts: Dict[str, int] = {}

    for split_name, files in splits.items():
        image_dir = output_dir / split_name / "images"
        mask_dir = output_dir / split_name / "masks"
        image_dir.mkdir(parents=True, exist_ok=True)
        mask_dir.mkdir(parents=True, exist_ok=True)
        counts[split_name] = len(files)

        for mat_path in files:
            case = load_figshare_mat(mat_path)
            image_path = image_dir / f"{mat_path.stem}.png"
            mask_path = mask_dir / f"{mat_path.stem}.png"

            if not overwrite and (image_path.exists() or mask_path.exists()):
                raise FileExistsError(
                    f"Output already exists for {mat_path.name}. Use overwrite=True to replace files."
                )

            Image.fromarray(case.image).save(image_path)
            Image.fromarray(case.mask).save(mask_path)

            metadata_rows.append(
                {
                    "split": split_name,
                    "source_mat": mat_path.name,
                    "image_file": image_path.name,
                    "mask_file": mask_path.name,
                    "label_id": case.label_id if case.label_id is not None else "",
                    "label_name": case.label_name or "",
                    "pid": case.pid or "",
                    "mask_positive_pixels": int((case.mask > 0).sum()),
                    "image_height": int(case.image.shape[0]),
                    "image_width": int(case.image.shape[1]),
                }
            )

    metadata_path = output_dir / "metadata.csv"
    with metadata_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(metadata_rows[0].keys()))
        writer.writeheader()
        writer.writerows(metadata_rows)

    return counts
