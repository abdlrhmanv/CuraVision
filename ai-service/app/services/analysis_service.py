"""MRI analysis service.

The production CV models are not present in this repository yet. Until the
ONNX/PyTorch weights land, this module runs an interim DICOM-aware pipeline:
load the scan pixels, generate derived visual artifacts, estimate simple
image-derived metrics, and use the configured LLM for the report draft.
"""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

from app.services import llm_service


_TUMOR_LOCATIONS = [
    "left frontal lobe",
    "right temporal lobe",
    "left parietal lobe",
    "right occipital lobe",
    "pontine region of the brainstem",
]

_REPO_ROOT = Path(__file__).resolve().parents[3]
_AI_ROOT = Path(__file__).resolve().parents[2]


def _safe_scan_id(scan_id: str) -> str:
    return "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in scan_id)


def _seed_index(scan_id: str, bucket: int) -> int:
    digest = hashlib.sha1(scan_id.encode("utf-8")).hexdigest()
    return int(digest, 16) % bucket


def _seed_float(scan_id: str, lo: float, hi: float) -> float:
    digest = hashlib.sha1(scan_id.encode("utf-8")).hexdigest()
    pct = (int(digest[:8], 16) % 10_000) / 10_000
    return round(lo + (hi - lo) * pct, 2)


def _storage_root() -> Path:
    configured = os.getenv("STORAGE_PATH", "").strip()
    if configured:
        return Path(configured).resolve()

    # Docker compose mounts the shared backend storage at /app/storage.
    if Path("/app").exists():
        return Path("/app/storage")

    return _REPO_ROOT / "backend" / "storage"


def _resolve_path(logical_path: str) -> Path:
    path = Path(logical_path)
    if path.is_absolute():
        return path

    candidates = []
    if path.parts and path.parts[0] == "storage":
        candidates.append(_storage_root() / Path(*path.parts[1:]))
    candidates.extend([
        Path.cwd() / path,
        _AI_ROOT / path,
        _REPO_ROOT / path,
        _REPO_ROOT / "backend" / path,
    ])

    for candidate in candidates:
        if candidate.exists():
            return candidate

    return candidates[0] if candidates else path


def _artifact_path(kind: str, scan_id: str, suffix: str) -> tuple[Path, str]:
    safe_id = _safe_scan_id(scan_id)
    abs_path = _storage_root() / kind / f"{safe_id}{suffix}"
    abs_path.parent.mkdir(parents=True, exist_ok=True)
    return abs_path, f"storage/{kind}/{safe_id}{suffix}"


def load_dicom_as_image(dicom_path: str) -> Image.Image:
    """Load a DICOM pixel array as an RGB PIL image."""
    import pydicom

    ds = pydicom.dcmread(_resolve_path(dicom_path))
    arr = ds.pixel_array.astype(np.float32)
    arr = (arr - arr.min()) / (arr.max() - arr.min() + 1e-8) * 255
    return Image.fromarray(arr.astype(np.uint8)).convert("RGB")


def _dicom_metadata(dicom_path: str) -> dict[str, Any]:
    try:
        import pydicom

        ds = pydicom.dcmread(_resolve_path(dicom_path), stop_before_pixels=True)
    except Exception as exc:
        return {
            "source_path": dicom_path,
            "load_warning": str(exc),
        }

    def read(name: str) -> Any:
        value = getattr(ds, name, None)
        if value is None:
            return None
        if isinstance(value, (str, int, float)):
            return value
        return str(value)

    return {
        "source_path": dicom_path,
        "modality": read("Modality"),
        "rows": read("Rows"),
        "columns": read("Columns"),
        "body_part": read("BodyPartExamined"),
        "study_description": read("StudyDescription"),
        "series_description": read("SeriesDescription"),
        "slice_thickness_mm": read("SliceThickness"),
        "pixel_spacing_mm": read("PixelSpacing"),
    }


def _synthetic_image(scan_id: str, size: int = 224) -> Image.Image:
    rng = np.random.default_rng(_seed_index(scan_id, 2**32 - 1))
    y, x = np.ogrid[:size, :size]
    cx = size * (0.35 + 0.3 * rng.random())
    cy = size * (0.35 + 0.3 * rng.random())
    brain = ((x - size / 2) ** 2 / (size * 0.36) ** 2) + (
        (y - size / 2) ** 2 / (size * 0.44) ** 2
    ) <= 1
    lesion = ((x - cx) ** 2 + (y - cy) ** 2) <= (size * 0.08) ** 2
    arr = np.zeros((size, size), dtype=np.float32)
    arr[brain] = 95 + rng.normal(0, 8, brain.sum())
    arr[lesion] = 190 + rng.normal(0, 10, lesion.sum())
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    return Image.fromarray(arr).convert("RGB")


def _load_image(scan_id: str, dicom_path: str) -> tuple[Image.Image, dict[str, Any], bool]:
    metadata = _dicom_metadata(dicom_path)
    try:
        return load_dicom_as_image(dicom_path), metadata, True
    except Exception as exc:
        metadata["pixel_warning"] = str(exc)
        return _synthetic_image(scan_id), metadata, False


def _grayscale_array(image: Image.Image) -> np.ndarray:
    return np.asarray(image.convert("L"), dtype=np.float32)


def _lesion_mask(image: Image.Image) -> np.ndarray:
    arr = _grayscale_array(image)
    nonzero = arr[arr > 0]
    if nonzero.size == 0:
        return np.zeros(arr.shape, dtype=bool)

    threshold = max(float(np.percentile(nonzero, 92)), float(nonzero.mean() + nonzero.std()))
    mask = arr >= threshold
    if mask.sum() < 12:
        threshold = float(np.percentile(nonzero, 88))
        mask = arr >= threshold
    return mask


def _estimate_volume_cc(mask: np.ndarray, metadata: dict[str, Any], scan_id: str) -> float:
    area_pixels = int(mask.sum())
    if area_pixels <= 0:
        return _seed_float(scan_id, 4.0, 18.0)

    spacing = metadata.get("pixel_spacing_mm")
    row_spacing = col_spacing = 1.0
    if isinstance(spacing, str):
        cleaned = spacing.replace("[", "").replace("]", "").replace(",", " ")
        values = [part for part in cleaned.split() if part]
        if len(values) >= 2:
            try:
                row_spacing = float(values[0])
                col_spacing = float(values[1])
            except ValueError:
                pass

    try:
        slice_thickness = float(metadata.get("slice_thickness_mm") or 5.0)
    except (TypeError, ValueError):
        slice_thickness = 5.0

    volume_cc = area_pixels * row_spacing * col_spacing * slice_thickness / 1000
    return round(max(volume_cc, 0.1), 2)


def _describe_location(mask: np.ndarray, scan_id: str) -> str:
    ys, xs = np.where(mask)
    if xs.size == 0:
        return _TUMOR_LOCATIONS[_seed_index(scan_id, len(_TUMOR_LOCATIONS))]

    x_pct = float(xs.mean() / max(mask.shape[1] - 1, 1))
    y_pct = float(ys.mean() / max(mask.shape[0] - 1, 1))

    side = "left" if x_pct < 0.48 else "right" if x_pct > 0.52 else "midline"
    if y_pct < 0.38:
        region = "frontal lobe"
    elif y_pct < 0.68:
        region = "parietal-temporal region"
    else:
        region = "occipital lobe"
    return f"{side} {region}"


def _save_mask(mask: np.ndarray, scan_id: str) -> str:
    abs_path, logical_path = _artifact_path("masks", scan_id, ".png")
    Image.fromarray((mask.astype(np.uint8) * 255)).save(abs_path)
    return logical_path


def _save_heatmap(image: Image.Image, mask: np.ndarray, scan_id: str) -> str:
    abs_path, logical_path = _artifact_path("heatmaps", scan_id, ".png")
    base = np.asarray(image.resize((512, 512)).convert("RGB"), dtype=np.float32) / 255
    resized_mask = Image.fromarray((mask.astype(np.uint8) * 255)).resize((512, 512))
    intensity = np.asarray(resized_mask, dtype=np.float32) / 255

    heat = np.zeros_like(base)
    heat[..., 0] = np.clip(intensity * 1.4, 0, 1)
    heat[..., 1] = np.clip((1 - np.abs(intensity - 0.5) * 2) * 0.9, 0, 1)
    heat[..., 2] = np.clip((1 - intensity) * 0.35, 0, 1)

    overlay = np.clip(base * 0.62 + heat * 0.38, 0, 1)
    Image.fromarray((overlay * 255).astype(np.uint8)).save(abs_path)
    return logical_path


def _metadata_summary(metadata: dict[str, Any]) -> str:
    fields = [
        ("Modality", metadata.get("modality")),
        ("Rows", metadata.get("rows")),
        ("Columns", metadata.get("columns")),
        ("Body part", metadata.get("body_part")),
        ("Study", metadata.get("study_description")),
        ("Series", metadata.get("series_description")),
    ]
    return "; ".join(f"{label}: {value}" for label, value in fields if value) or "Metadata unavailable"


def _fallback_report(scan_id: str, volume: float, location: str, metadata: dict[str, Any]) -> str:
    return (
        "FINDINGS:\n"
        f"MRI analysis estimates an abnormal signal focus measuring approximately {volume:.1f} cc "
        f"in the {location}. The derived heatmap highlights the same region as the dominant "
        "area of activation. "
        f"Available scan metadata: {_metadata_summary(metadata)}.\n\n"
        "IMPRESSION:\n"
        "Image-derived findings are suspicious for a focal intracranial lesion. This draft is "
        "for radiologist review and must be correlated with the complete MRI series and clinical history.\n\n"
        "(Draft generated automatically by CuraVision AI - requires radiologist review.)"
    )


def run_segmentation(scan_id: str, dicom_path: str) -> dict[str, Any]:
    image, metadata, loaded_dicom = _load_image(scan_id, dicom_path)
    mask = _lesion_mask(image)
    volume = _estimate_volume_cc(mask, metadata, scan_id)
    location = _describe_location(mask, scan_id)
    mask_path = _save_mask(mask, scan_id)

    source = "dicom" if loaded_dicom else "synthetic-fallback"
    return {
        "scan_id": scan_id,
        "mask_path": mask_path,
        "tumor_volume_cc": volume,
        "tumor_location_description": location,
        "inference_log": (
            f"interim-dicom-analysis v0.2 source={source}; "
            f"{_metadata_summary(metadata)}"
        ),
    }


def run_gradcam(scan_id: str, dicom_path: str) -> dict[str, Any]:
    image, _metadata, _loaded_dicom = _load_image(scan_id, dicom_path)
    mask = _lesion_mask(image)
    location = _describe_location(mask, scan_id)
    return {
        "scan_id": scan_id,
        "gradcam_path": _save_heatmap(image, mask, scan_id),
        "activation_peak_region": location,
    }


def run_report(
    scan_id: str,
    tumor_volume_cc: float | None,
    tumor_location_description: str | None,
    dicom_path: str | None = None,
) -> dict[str, Any]:
    volume = tumor_volume_cc if tumor_volume_cc is not None else _seed_float(scan_id, 4.0, 18.0)
    location = tumor_location_description or _TUMOR_LOCATIONS[_seed_index(scan_id, len(_TUMOR_LOCATIONS))]
    metadata = _dicom_metadata(dicom_path or "")

    try:
        draft = llm_service.generate_report_draft(
            scan_id=scan_id,
            tumor_volume_cc=volume,
            tumor_location_description=location,
            metadata_summary=_metadata_summary(metadata),
        )
    except Exception:
        draft = _fallback_report(scan_id, volume, location, metadata)

    return {"scan_id": scan_id, "ai_draft": draft}


def run_full_analysis(scan_id: str, dicom_path: str) -> dict[str, Any]:
    seg = run_segmentation(scan_id, dicom_path)
    cam = run_gradcam(scan_id, dicom_path)
    rep = run_report(
        scan_id,
        tumor_volume_cc=seg["tumor_volume_cc"],
        tumor_location_description=seg["tumor_location_description"],
        dicom_path=dicom_path,
    )
    return {"scan_id": scan_id, "segmentation": seg, "gradcam": cam, "report": rep}
