from __future__ import annotations

from pathlib import Path

import torch

from src.classification.model import BrainTumorClassifier
from src.common.io import ensure_parent_dir


def export_classification_to_onnx(config: dict) -> str:
    checkpoint = torch.load(config["artifacts"]["checkpoint_path"], map_location="cpu")
    image_size = config["data"]["image_size"]
    out_path = ensure_parent_dir(config["artifacts"]["onnx_path"])

    model = BrainTumorClassifier(
        backbone=checkpoint["backbone"],
        num_classes=len(checkpoint["class_names"]),
        pretrained=False,
        hidden_dim=checkpoint["hidden_dim"],
        dropout=checkpoint["dropout"],
    )
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    dummy = torch.randn(1, 3, image_size, image_size)
    torch.onnx.export(
        model,
        dummy,
        str(out_path),
        input_names=["image"],
        output_names=["logits"],
        dynamic_axes={"image": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=14,
    )
    return str(out_path)
