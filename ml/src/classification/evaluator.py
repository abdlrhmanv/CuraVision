from __future__ import annotations

import torch

from src.classification.dataset import build_classification_eval_loader
from src.classification.model import BrainTumorClassifier
from src.common.metrics import classification_metrics, save_confusion_matrix_heatmap


@torch.no_grad()
def evaluate_classification_model(config: dict, split: str = "test", save_outputs: bool = True, model=None) -> dict:
    data_cfg = config["data"]
    eval_cfg = config["eval"]
    artifact_cfg = config["artifacts"]
    model_cfg = config["model"]

    device = "cuda" if torch.cuda.is_available() else "cpu"
    loader, class_names = build_classification_eval_loader(
        data_root=data_cfg["root_dir"],
        split=split,
        image_size=data_cfg["image_size"],
        batch_size=eval_cfg["batch_size"],
        num_workers=data_cfg["num_workers"],
    )

    if model is None:
        checkpoint = torch.load(artifact_cfg["checkpoint_path"], map_location="cpu")
        model = BrainTumorClassifier(
            backbone=checkpoint["backbone"],
            num_classes=len(checkpoint["class_names"]),
            pretrained=False,
            hidden_dim=checkpoint["hidden_dim"],
            dropout=checkpoint["dropout"],
        )
        model.load_state_dict(checkpoint["model_state_dict"])

    model.to(device)
    model.eval()

    y_true = []
    y_pred = []
    for images, labels in loader:
        images = images.to(device)
        labels = labels.to(device)
        logits = model(images)
        preds = logits.argmax(dim=1)
        y_true.extend(labels.cpu().numpy().tolist())
        y_pred.extend(preds.cpu().numpy().tolist())

    metrics = classification_metrics(y_true, y_pred, class_names)
    if save_outputs:
        save_confusion_matrix_heatmap(y_true, y_pred, class_names, artifact_cfg["heatmap_path"])
    return metrics
