from pathlib import Path

import torch
from torch.utils.data import DataLoader
from torchvision import datasets, transforms

from models import MODEL_MAP

IMAGE_SIZE_MAP = {
    "xception_enhancement": 299,
    "xception_focal": 299,
    "efficientnetv2s": 224,
    "convnext_tiny": 224,
    "efficientnet_b0": 224,
}


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
    ])


def get_eval_transform(model_name: str):
    size = get_image_size(model_name)
    return transforms.Compose([
        transforms.Resize((size, size)),
        transforms.ToTensor(),
    ])


def make_train_val_loaders(data_root: str, model_name: str, batch_size: int = 8, num_workers: int = 2):
    data_root = Path(data_root)
    train_ds = datasets.ImageFolder(data_root / 'train', transform=get_train_transform(model_name))
    val_ds = datasets.ImageFolder(data_root / 'val', transform=get_eval_transform(model_name))

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=num_workers)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=num_workers)
    return train_loader, val_loader, train_ds.classes


def make_test_loader(data_root: str, model_name: str, batch_size: int = 8, num_workers: int = 2):
    data_root = Path(data_root)
    test_ds = datasets.ImageFolder(data_root / 'test', transform=get_eval_transform(model_name))
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False, num_workers=num_workers)
    return test_loader, test_ds.classes


def get_device() -> str:
    return 'cuda' if torch.cuda.is_available() else 'cpu'
