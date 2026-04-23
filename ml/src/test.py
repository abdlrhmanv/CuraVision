from __future__ import annotations

import argparse
from pathlib import Path

import torch
from sklearn.metrics import confusion_matrix

from models import MODEL_MAP
from utils import (
    DEFAULT_ARTIFACTS_ROOT,
    get_device,
    make_test_loader,
    resolve_artifacts_root,
    save_confusion_heatmap,
)


@torch.no_grad()
def test_model(
    model_name: str,
    weights_path: str,
    data_root: str,
    batch_size: int = 8,
    num_workers: int = 0,
    heatmap_path: str | None = None,
):
    device = get_device()
    test_loader, class_names = make_test_loader(
        data_root=data_root,
        model_name=model_name,
        batch_size=batch_size,
        num_workers=num_workers,
    )

    ckpt = torch.load(weights_path, map_location="cpu")
    num_classes = ckpt["num_classes"]

    model = MODEL_MAP[model_name](num_classes=num_classes, pretrained=False)
    model.load_state_dict(ckpt["state_dict"])
    model.to(device)
    model.eval()

    all_labels = []
    all_preds = []

    for images, labels in test_loader:
        images = images.to(device)
        logits = model(images)
        preds = logits.argmax(dim=1).cpu()
        all_preds.extend(preds.tolist())
        all_labels.extend(labels.tolist())

    accuracy = sum(int(pred == label) for pred, label in zip(all_preds, all_labels)) / len(all_labels)

    checkpoint_classes = ckpt["class_names"]
    if checkpoint_classes != class_names:
        print("Warning: checkpoint classes do not match folder classes exactly.")
        print(f"Checkpoint classes: {checkpoint_classes}")
        print(f"Folder classes: {class_names}")

    cm = confusion_matrix(all_labels, all_preds, labels=list(range(len(class_names))))

    if heatmap_path is None:
        heatmap_path = resolve_artifacts_root(DEFAULT_ARTIFACTS_ROOT) / "heatmaps" / f"{model_name}_confusion_matrix.png"
    else:
        heatmap_path = resolve_artifacts_root(heatmap_path)

    saved_heatmap = save_confusion_heatmap(
        confusion_matrix=cm.tolist(),
        class_names=class_names,
        output_path=heatmap_path,
        title=f"{model_name} Test Confusion Matrix",
    )

    print(f"Using device: {device}")
    print(f"Checkpoint classes: {checkpoint_classes}")
    print(f"Folder classes: {class_names}")
    print(f"Test accuracy: {accuracy:.4f}")
    print(f"Heatmap saved to: {saved_heatmap}")
    return {"accuracy": accuracy, "heatmap_path": str(saved_heatmap)}



def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True, choices=MODEL_MAP.keys())
    parser.add_argument("--weights", required=True)
    parser.add_argument("--data_root", required=True)
    parser.add_argument("--batch_size", type=int, default=8)
    parser.add_argument("--num_workers", type=int, default=0)
    parser.add_argument("--heatmap_path", default=None)
    return parser.parse_args()



def main():
    args = parse_args()
    test_model(
        model_name=args.model,
        weights_path=args.weights,
        data_root=args.data_root,
        batch_size=args.batch_size,
        num_workers=args.num_workers,
        heatmap_path=args.heatmap_path,
    )


if __name__ == "__main__":
    main()
