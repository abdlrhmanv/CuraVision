from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image


def ensure_parent_dir(path: str | Path) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def ensure_dir(path: str | Path) -> Path:
    path = Path(path)
    path.mkdir(parents=True, exist_ok=True)
    return path


def load_rgb_image(path: str | Path) -> Image.Image:
    return Image.open(path).convert("RGB")


def load_mask_image(path: str | Path) -> Image.Image:
    return Image.open(path).convert("L")


def list_files(path: str | Path, suffixes: Iterable[str] = (".png", ".jpg", ".jpeg")) -> list[Path]:
    path = Path(path)
    return sorted([p for p in path.iterdir() if p.suffix.lower() in suffixes and p.is_file()])
