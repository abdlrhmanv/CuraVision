from __future__ import annotations

import torch

from src.common.io import ensure_parent_dir
from src.segmentation.model import UNet


def export_segmentation_to_onnx(config: dict) -> str:
    checkpoint = torch.load(config["artifacts"]["checkpoint_path"], map_location="cpu")
    image_size = config["data"]["image_size"]
    out_path = ensure_parent_dir(config["artifacts"]["onnx_path"])

    model = UNet(
        in_channels=checkpoint["in_channels"],
        out_channels=checkpoint["out_channels"],
        init_features=checkpoint["init_features"],
    )
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    dummy = torch.randn(1, 3, image_size, image_size)
    torch.onnx.export(
        model,
        dummy,
        str(out_path),
        input_names=["image"],
        output_names=["mask_logits"],
        dynamic_axes={"image": {0: "batch"}, "mask_logits": {0: "batch"}},
        opset_version=17,
    )
    return str(out_path)
