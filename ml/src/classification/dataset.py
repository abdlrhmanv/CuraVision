from __future__ import annotations

from pathlib import Path

from torch.utils.data import DataLoader
from torchvision.datasets import ImageFolder

from src.classification.augmentations import build_train_transform, build_eval_transform


def build_classification_dataloaders(data_root: str, image_size: int, batch_size: int, num_workers: int):
    """Create train and validation loaders using the standard folder layout."""
    root = Path(data_root)
    train_ds = ImageFolder(root / "train", transform=build_train_transform(image_size))
    val_ds = ImageFolder(root / "val", transform=build_eval_transform(image_size))

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=num_workers)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=num_workers)
    return train_loader, val_loader, train_ds.classes


def build_classification_eval_loader(data_root: str, split: str, image_size: int, batch_size: int, num_workers: int):
    root = Path(data_root)
    ds = ImageFolder(root / split, transform=build_eval_transform(image_size))
    loader = DataLoader(ds, batch_size=batch_size, shuffle=False, num_workers=num_workers)
    return loader, ds.classes
