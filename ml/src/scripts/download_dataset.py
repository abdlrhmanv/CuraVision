from __future__ import annotations

import argparse
import os
import shutil
import urllib.request
import zipfile
from pathlib import Path

import h5py
import numpy as np

from src.common.paths import ML_ROOT

def _resolve(path_str: str) -> Path:
    path = Path(path_str)
    return path if path.is_absolute() else (ML_ROOT / path).resolve()

def generate_synthetic_dataset(output_dir: Path, num_cases: int = 100):
    """
    Generate synthetic Figshare-style .mat files to mimic the Brain Tumor dataset.
    This saves bandwidth and storage while allowing the full ML pipeline to be verified.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Generating {num_cases} synthetic .mat cases in {output_dir}...")
    
    for i in range(1, num_cases + 1):
        mat_path = output_dir / f"{i}.mat"
        
        # Create random MRI slice (512x512)
        image = np.random.normal(loc=128, scale=50, size=(512, 512)).astype(np.float32)
        image = np.clip(image, 0, 255)
        
        # Create a synthetic blob mask
        mask = np.zeros((512, 512), dtype=np.uint8)
        cx, cy = np.random.randint(150, 350, size=2)
        radius = np.random.randint(20, 60)
        y, x = np.ogrid[-cy:512-cy, -cx:512-cx]
        mask_area = x**2 + y**2 <= radius**2
        mask[mask_area] = 1
        
        # Assign a random label (1=meningioma, 2=glioma, 3=pituitary)
        label = np.array([[np.random.randint(1, 4)]], dtype=np.float64)
        
        # PID as character codes
        pid_str = f"SYNTH_{i:04d}"
        pid_codes = np.array([[ord(c)] for c in pid_str], dtype=np.float64)
        
        with h5py.File(mat_path, "w") as f:
            group = f.create_group("cjdata")
            group.create_dataset("image", data=image)
            group.create_dataset("tumorMask", data=mask)
            group.create_dataset("label", data=label)
            group.create_dataset("PID", data=pid_codes)
            
    print("Done generating synthetic dataset.")

def main():
    parser = argparse.ArgumentParser(description="Download or generate Figshare Brain MRI dataset.")
    parser.add_argument(
        "--output_dir",
        default="Data/segmentation_raw/mat_files",
        help="Where to save the .mat files.",
    )
    parser.add_argument(
        "--synthetic", 
        action="store_true", 
        default=True,
        help="Generate synthetic dataset instead of downloading (default: True to save bandwidth)."
    )
    parser.add_argument("--num_cases", type=int, default=100)
    args = parser.parse_args()

    out_path = _resolve(args.output_dir)
    
    if args.synthetic:
        generate_synthetic_dataset(out_path, num_cases=args.num_cases)
    else:
        # Placeholder for actual dataset download URL
        # e.g., https://figshare.com/ndownloader/files/xxxx
        print("Downloading actual dataset is skipped. Use --synthetic to generate a dummy dataset.")

if __name__ == "__main__":
    main()
