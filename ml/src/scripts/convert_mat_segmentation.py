from __future__ import annotations

import argparse
from pathlib import Path

from src.common.paths import ML_ROOT
from src.segmentation.mat_utils import convert_mat_folder_to_png


def _resolve(path_str: str) -> Path:
    path = Path(path_str)
    return path if path.is_absolute() else (ML_ROOT / path).resolve()


def main():
    parser = argparse.ArgumentParser(
        description="Convert Figshare-style .mat segmentation files into PNG image/mask folders."
    )
    parser.add_argument(
        "--input_dir",
        default="Data/segmentation_raw/mat_files",
        help="Folder containing .mat files.",
    )
    parser.add_argument(
        "--output_dir",
        default="Data/segmentation",
        help="Where train/val/test images and masks will be created.",
    )
    parser.add_argument("--train_ratio", type=float, default=0.70)
    parser.add_argument("--val_ratio", type=float, default=0.15)
    parser.add_argument("--test_ratio", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    counts = convert_mat_folder_to_png(
        input_dir=_resolve(args.input_dir),
        output_dir=_resolve(args.output_dir),
        train_ratio=args.train_ratio,
        val_ratio=args.val_ratio,
        test_ratio=args.test_ratio,
        seed=args.seed,
        overwrite=args.overwrite,
    )

    print("Conversion finished.")
    print("Created segmentation splits:")
    for split, count in counts.items():
        print(f"- {split}: {count} cases")
    print(f"Output folder: {_resolve(args.output_dir)}")


if __name__ == "__main__":
    main()
