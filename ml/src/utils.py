from __future__ import annotations

from pathlib import Path
from typing import Iterable

import matplotlib.pyplot as plt
import torch
from torch.utils.data import DataLoader
from torchvision import datasets, transforms

from models import MODEL_MAP

ML_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA_ROOT = ML_ROOT / "Data"
DEFAULT_ARTIFACTS_ROOT = ML_ROOT / "artifacts"

IMAGE_SIZE_MAP = {
    "xception_enhancement": 299,
    "xception_focal": 299,
    "efficientnetv2s": 224,
    "convnext_tiny": 224,
    "efficientnet_b0": 224,
}

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def resolve_ml_path(path_like: str | Path) -> Path:
    path = Path(path_like)
    if path.is_absolute():
        return path
    return (ML_ROOT / path).resolve()


def resolve_data_root(data_root: str | Path | None = None) -> Path:
    if data_root is None:
        return DEFAULT_DATA_ROOT
    return resolve_ml_path(data_root)


def resolve_artifacts_root(artifacts_root: str | Path | None = None) -> Path:
    if artifacts_root is None:
        return DEFAULT_ARTIFACTS_ROOT
    return resolve_ml_path(artifacts_root)


def ensure_directory(path_like: str | Path) -> Path:
    path = Path(path_like)
    path.mkdir(parents=True, exist_ok=True)
    return path


def validate_split_directories(data_root: str | Path, required_splits: Iterable[str]) -> Path:
    root = resolve_data_root(data_root)
    missing = [split for split in required_splits if not (root / split).exists()]
    if missing:
        raise FileNotFoundError(
            f"Missing dataset folder(s): {missing}. Expected them inside: {root}"
        )
    return root


def build_model(model_name: str, num_classes: int, pretrained: bool = True):
    if model_name not in MODEL_MAP:
        raise ValueError(f"Unknown model name: {model_name}")
    return MODEL_MAP[model_name](num_classes=num_classes, pretrained=pretrained)



def get_image_size(model_name: str) -> int:
    if model_name not in IMAGE_SIZE_MAP:
        raise ValueError(f"Unknown model name: {model_name}")
    return IMAGE_SIZE_MAP[model_name]



def get_train_transform(model_name: str):
    size = get_image_size(model_name)
    return transforms.Compose([
        transforms.Resize((size, size)),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])



def get_eval_transform(model_name: str):
    size = get_image_size(model_name)
    return transforms.Compose([
        transforms.Resize((size, size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])



def make_train_val_loaders(
    data_root: str | Path,
    model_name: str,
    batch_size: int = 8,
    num_workers: int = 0,
):
    root = validate_split_directories(data_root, required_splits=("train", "val"))
    train_ds = datasets.ImageFolder(root / "train", transform=get_train_transform(model_name))
    val_ds = datasets.ImageFolder(root / "val", transform=get_eval_transform(model_name))

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=num_workers)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=num_workers)
    return train_loader, val_loader, train_ds.classes



def make_test_loader(
    data_root: str | Path,
    model_name: str,
    batch_size: int = 8,
    num_workers: int = 0,
):
    root = validate_split_directories(data_root, required_splits=("test",))
    test_ds = datasets.ImageFolder(root / "test", transform=get_eval_transform(model_name))
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False, num_workers=num_workers)
    return test_loader, test_ds.classes



def get_device() -> str:
    return "cuda" if torch.cuda.is_available() else "cpu"



def save_confusion_heatmap(
    confusion_matrix: list[list[int]],
    class_names: list[str],
    output_path: str | Path,
    title: str = "Confusion Matrix",
) -> Path:
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    fig, ax = plt.subplots(figsize=(8, 6))
    im = ax.imshow(confusion_matrix)
    fig.colorbar(im, ax=ax)

    ax.set_xticks(range(len(class_names)))
    ax.set_yticks(range(len(class_names)))
    ax.set_xticklabels(class_names, rotation=45, ha="right")
    ax.set_yticklabels(class_names)
    ax.set_xlabel("Predicted label")
    ax.set_ylabel("True label")
    ax.set_title(title)

    for i, row in enumerate(confusion_matrix):
        for j, value in enumerate(row):
            ax.text(j, i, str(value), ha="center", va="center")

    fig.tight_layout()
    fig.savefig(output_path, dpi=200, bbox_inches="tight")
    plt.close(fig)
    return output_path
