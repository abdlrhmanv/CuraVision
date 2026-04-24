from __future__ import annotations

import argparse
import json
from pathlib import Path

from src.common.paths import ML_ROOT
from src.segmentation.mat_utils import inspect_mat_file, load_figshare_mat


def _resolve(path_str: str) -> Path:
    path = Path(path_str)
    return path if path.is_absolute() else (ML_ROOT / path).resolve()


def main():
    parser = argparse.ArgumentParser(description="Inspect one Figshare-style brain tumor .mat file.")
    parser.add_argument("--mat", default="Data/segmentation_raw/mat_files/3057.mat", help="Path to one .mat file.")
    args = parser.parse_args()

    mat_path = _resolve(args.mat)
    info = inspect_mat_file(mat_path)
    case = load_figshare_mat(mat_path)

    print(json.dumps(info, indent=2))
    print("\nExtracted case summary:")
    print(f"image shape: {case.image.shape}, dtype: {case.image.dtype}, min/max: {case.image.min()}/{case.image.max()}")
    print(f"mask shape : {case.mask.shape}, dtype: {case.mask.dtype}, unique: {sorted(set(case.mask.flatten().tolist()))[:5]}")
    print(f"label     : {case.label_id} ({case.label_name})")
    print(f"PID       : {case.pid}")


if __name__ == "__main__":
    main()
