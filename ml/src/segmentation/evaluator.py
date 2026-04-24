from __future__ import annotations

from pathlib import Path

import numpy as np
import torch

from src.common.metrics import dice_score_from_arrays, iou_score_from_arrays, save_segmentation_overlay
from src.segmentation.dataset import build_segmentation_eval_loader
from src.segmentation.model import UNet


@torch.no_grad()
def evaluate_segmentation_model(config: dict, split: str = "test", save_outputs: bool = True, model=None) -> dict:
    data_cfg = config["data"]
    eval_cfg = config["eval"]
    artifact_cfg = config["artifacts"]
    model_cfg = config["model"]

    device = "cuda" if torch.cuda.is_available() else "cpu"
    loader = build_segmentation_eval_loader(
        data_root=data_cfg["root_dir"],
        split=split,
        image_size=data_cfg["image_size"],
        batch_size=eval_cfg["batch_size"],
        num_workers=data_cfg["num_workers"],
        mask_suffix=data_cfg.get("mask_suffix", ""),
    )

    if model is None:
        checkpoint = torch.load(artifact_cfg["checkpoint_path"], map_location="cpu")
        model = UNet(
            in_channels=checkpoint["in_channels"],
            out_channels=checkpoint["out_channels"],
            init_features=checkpoint["init_features"],
        )
        model.load_state_dict(checkpoint["model_state_dict"])

    model.to(device)
    model.eval()

    dice_scores = []
    iou_scores = []
    overlay_dir = Path(artifact_cfg["overlay_dir"]) / split
    overlay_dir.mkdir(parents=True, exist_ok=True)

    for batch_index, (images, masks, file_names) in enumerate(loader):
        images = images.to(device)
        masks = masks.to(device)
        logits = model(images)
        probs = torch.sigmoid(logits)
        preds = (probs >= eval_cfg["positive_threshold"]).float()

        for i in range(images.size(0)):
            mask_true = masks[i, 0].cpu().numpy().astype(np.uint8)
            mask_pred = preds[i, 0].cpu().numpy().astype(np.uint8)
            image_np = (images[i].cpu().numpy().transpose(1, 2, 0) * 255.0).clip(0, 255).astype(np.uint8)
            dice_scores.append(dice_score_from_arrays(mask_true, mask_pred))
            iou_scores.append(iou_score_from_arrays(mask_true, mask_pred))

            if save_outputs and batch_index < 3:
                save_segmentation_overlay(
                    image_np=image_np,
                    mask_true=mask_true,
                    mask_pred=mask_pred,
                    out_path=overlay_dir / f"overlay_{file_names[i]}.png",
                )

    return {
        "dice": float(np.mean(dice_scores)) if dice_scores else 0.0,
        "iou": float(np.mean(iou_scores)) if iou_scores else 0.0,
        "num_samples": len(dice_scores),
    }
