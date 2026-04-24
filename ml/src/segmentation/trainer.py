from __future__ import annotations

from pathlib import Path
import copy

import torch

from src.common.io import ensure_dir, ensure_parent_dir
from src.common.metrics import save_json
from src.common.seeds import set_seed
from src.segmentation.dataset import build_segmentation_dataloaders
from src.segmentation.evaluator import evaluate_segmentation_model
from src.segmentation.losses import BCEWithDiceLoss
from src.segmentation.model import UNet


def _run_epoch(model, loader, criterion, optimizer, device: str, train: bool, threshold: float):
    model.train() if train else model.eval()
    total_loss = 0.0
    total_samples = 0

    dice_scores = []
    iou_scores = []

    context = torch.enable_grad() if train else torch.no_grad()
    with context:
        for images, masks, _ in loader:
            images = images.to(device)
            masks = masks.to(device)

            if train:
                optimizer.zero_grad()

            logits = model(images)
            loss = criterion(logits, masks)

            if train:
                loss.backward()
                optimizer.step()

            probs = torch.sigmoid(logits)
            preds = (probs >= threshold).float()

            total_loss += loss.item() * images.size(0)
            total_samples += images.size(0)

            # batch-wise Dice / IoU for monitoring
            intersection = (preds * masks).sum(dim=(1, 2, 3))
            union = preds.sum(dim=(1, 2, 3)) + masks.sum(dim=(1, 2, 3))
            dice = ((2 * intersection + 1e-6) / (union + 1e-6)).mean().item()
            denom = (preds + masks - preds * masks).sum(dim=(1, 2, 3))
            iou = ((intersection + 1e-6) / (denom + 1e-6)).mean().item()
            dice_scores.append(dice)
            iou_scores.append(iou)

    return {
        "loss": total_loss / max(total_samples, 1),
        "dice": float(sum(dice_scores) / max(len(dice_scores), 1)),
        "iou": float(sum(iou_scores) / max(len(iou_scores), 1)),
    }


def train_segmentation(config: dict) -> dict:
    set_seed(config.get("seed", 42))

    data_cfg = config["data"]
    model_cfg = config["model"]
    train_cfg = config["train"]
    artifact_cfg = config["artifacts"]

    device = "cuda" if torch.cuda.is_available() else "cpu"
    train_loader, val_loader = build_segmentation_dataloaders(
        data_root=data_cfg["root_dir"],
        image_size=data_cfg["image_size"],
        batch_size=train_cfg["batch_size"],
        num_workers=data_cfg["num_workers"],
        mask_suffix=data_cfg.get("mask_suffix", ""),
    )

    model = UNet(
        in_channels=model_cfg["in_channels"],
        out_channels=model_cfg["out_channels"],
        init_features=model_cfg["init_features"],
    ).to(device)
    criterion = BCEWithDiceLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=train_cfg["learning_rate"], weight_decay=train_cfg.get("weight_decay", 0.0))

    best_state = None
    best_val_dice = -1.0
    best_epoch = 0
    patience_counter = 0
    history = []

    print(f"[Segmentation] Device: {device}")
    for epoch in range(1, train_cfg["epochs"] + 1):
        train_stats = _run_epoch(model, train_loader, criterion, optimizer, device, True, train_cfg["positive_threshold"])
        val_stats = _run_epoch(model, val_loader, criterion, optimizer, device, False, train_cfg["positive_threshold"])

        history.append({
            "epoch": epoch,
            "train": train_stats,
            "val": val_stats,
        })
        print(
            f"[Segmentation] Epoch {epoch}/{train_cfg['epochs']} | "
            f"train_loss={train_stats['loss']:.4f} train_dice={train_stats['dice']:.4f} | "
            f"val_loss={val_stats['loss']:.4f} val_dice={val_stats['dice']:.4f}"
        )

        if val_stats["dice"] > best_val_dice:
            best_val_dice = val_stats["dice"]
            best_epoch = epoch
            patience_counter = 0
            best_state = copy.deepcopy(model.state_dict())
            ckpt_path = ensure_parent_dir(artifact_cfg["checkpoint_path"])
            torch.save({
                "task": "segmentation",
                "config": config,
                "model_state_dict": best_state,
                "image_size": data_cfg["image_size"],
                "in_channels": model_cfg["in_channels"],
                "out_channels": model_cfg["out_channels"],
                "init_features": model_cfg["init_features"],
            }, ckpt_path)
        else:
            patience_counter += 1

        if patience_counter >= train_cfg.get("early_stopping_patience", 5):
            print("[Segmentation] Early stopping triggered.")
            break

    if best_state is None:
        raise RuntimeError("Training did not produce a checkpoint.")

    model.load_state_dict(best_state)
    metrics = evaluate_segmentation_model(config=config, split="val", save_outputs=True, model=model)
    metrics["best_val_dice"] = float(best_val_dice)
    metrics["best_epoch"] = int(best_epoch)
    metrics["history"] = history
    save_json(metrics, artifact_cfg["metrics_path"])
    return metrics
