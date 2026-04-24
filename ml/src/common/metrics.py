from __future__ import annotations

from pathlib import Path
from typing import Iterable, Sequence

import json
import numpy as np
import matplotlib.pyplot as plt
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report

from src.common.io import ensure_parent_dir, ensure_dir


def save_json(data: dict, path: str | Path) -> None:
    path = ensure_parent_dir(path)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def classification_metrics(y_true: Sequence[int], y_pred: Sequence[int], class_names: Sequence[str]) -> dict:
    report = classification_report(y_true, y_pred, target_names=list(class_names), output_dict=True, zero_division=0)
    report["accuracy"] = float(accuracy_score(y_true, y_pred))
    return report


def save_confusion_matrix_heatmap(y_true: Sequence[int], y_pred: Sequence[int], class_names: Sequence[str], path: str | Path) -> None:
    cm = confusion_matrix(y_true, y_pred, labels=list(range(len(class_names))))
    path = ensure_parent_dir(path)

    fig, ax = plt.subplots(figsize=(7, 6))
    im = ax.imshow(cm)
    ax.set_title("Classification Confusion Matrix")
    ax.set_xlabel("Predicted label")
    ax.set_ylabel("True label")
    ax.set_xticks(range(len(class_names)))
    ax.set_yticks(range(len(class_names)))
    ax.set_xticklabels(class_names, rotation=45, ha="right")
    ax.set_yticklabels(class_names)

    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, str(cm[i, j]), ha="center", va="center")

    fig.colorbar(im, ax=ax)
    fig.tight_layout()
    fig.savefig(path, dpi=160)
    plt.close(fig)


def dice_score_from_arrays(y_true: np.ndarray, y_pred: np.ndarray, eps: float = 1e-6) -> float:
    y_true = y_true.astype(np.float32).reshape(-1)
    y_pred = y_pred.astype(np.float32).reshape(-1)
    intersection = float((y_true * y_pred).sum())
    return (2.0 * intersection + eps) / (float(y_true.sum() + y_pred.sum()) + eps)


def iou_score_from_arrays(y_true: np.ndarray, y_pred: np.ndarray, eps: float = 1e-6) -> float:
    y_true = y_true.astype(np.float32).reshape(-1)
    y_pred = y_pred.astype(np.float32).reshape(-1)
    intersection = float((y_true * y_pred).sum())
    union = float(y_true.sum() + y_pred.sum() - intersection)
    return (intersection + eps) / (union + eps)


def save_segmentation_overlay(image_np: np.ndarray, mask_true: np.ndarray | None, mask_pred: np.ndarray, out_path: str | Path) -> None:
    """Save a simple overlay image for debugging segmentation.

    Green = predicted tumor
    Red = ground-truth tumor (if available)
    """
    out_path = ensure_parent_dir(out_path)
    image_np = image_np.copy().astype(np.uint8)

    if image_np.ndim == 2:
        image_np = np.stack([image_np] * 3, axis=-1)

    overlay = image_np.copy()
    if mask_true is not None:
        overlay[mask_true > 0] = [255, 0, 0]
    overlay[mask_pred > 0] = [0, 255, 0]

    fig, axes = plt.subplots(1, 3 if mask_true is not None else 2, figsize=(12, 4))
    axes[0].imshow(image_np)
    axes[0].set_title("MRI")
    axes[0].axis("off")

    if mask_true is not None:
        axes[1].imshow(mask_true, cmap="gray")
        axes[1].set_title("Ground Truth Mask")
        axes[1].axis("off")
        axes[2].imshow(overlay)
        axes[2].set_title("Overlay")
        axes[2].axis("off")
    else:
        axes[1].imshow(overlay)
        axes[1].set_title("Prediction Overlay")
        axes[1].axis("off")

    fig.tight_layout()
    fig.savefig(out_path, dpi=160)
    plt.close(fig)
