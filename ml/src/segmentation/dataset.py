from __future__ import annotations

from pathlib import Path

from torch.utils.data import DataLoader, Dataset

from src.common.io import list_files, load_mask_image, load_rgb_image
from src.segmentation.augmentations import SegmentationTrainTransform, SegmentationEvalTransform


class BrainMRISegmentationDataset(Dataset):
    def __init__(self, image_dir: str, mask_dir: str, transform, mask_suffix: str = ""):
        self.image_dir = Path(image_dir)
        self.mask_dir = Path(mask_dir)
        self.transform = transform
        self.mask_suffix = mask_suffix
        self.image_paths = list_files(self.image_dir)
        if not self.image_paths:
            raise FileNotFoundError(f"No images found in: {self.image_dir}")

    def __len__(self) -> int:
        return len(self.image_paths)

    def __getitem__(self, index: int):
        image_path = self.image_paths[index]
        mask_name = f"{image_path.stem}{self.mask_suffix}{image_path.suffix}"
        mask_path = self.mask_dir / mask_name
        if not mask_path.exists():
            raise FileNotFoundError(f"Missing mask for {image_path.name}: expected {mask_path.name}")
        image = load_rgb_image(image_path)
        mask = load_mask_image(mask_path)
        image_t, mask_t = self.transform(image, mask)
        return image_t, mask_t, image_path.name


def build_segmentation_dataloaders(data_root: str, image_size: int, batch_size: int, num_workers: int, mask_suffix: str = ""):
    root = Path(data_root)
    train_ds = BrainMRISegmentationDataset(
        image_dir=root / "train" / "images",
        mask_dir=root / "train" / "masks",
        transform=SegmentationTrainTransform(image_size),
        mask_suffix=mask_suffix,
    )
    val_ds = BrainMRISegmentationDataset(
        image_dir=root / "val" / "images",
        mask_dir=root / "val" / "masks",
        transform=SegmentationEvalTransform(image_size),
        mask_suffix=mask_suffix,
    )
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=num_workers)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=num_workers)
    return train_loader, val_loader


def build_segmentation_eval_loader(data_root: str, split: str, image_size: int, batch_size: int, num_workers: int, mask_suffix: str = ""):
    root = Path(data_root)
    ds = BrainMRISegmentationDataset(
        image_dir=root / split / "images",
        mask_dir=root / split / "masks",
        transform=SegmentationEvalTransform(image_size),
        mask_suffix=mask_suffix,
    )
    loader = DataLoader(ds, batch_size=batch_size, shuffle=False, num_workers=num_workers)
    return loader
