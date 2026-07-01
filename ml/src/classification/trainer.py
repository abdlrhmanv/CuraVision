from __future__ import annotations

from pathlib import Path
import copy

import torch
import torch.nn as nn
import mlflow

from src.classification.dataset import build_classification_dataloaders
from src.classification.losses import FocalLoss
from src.classification.model import BrainTumorClassifier
from src.classification.evaluator import evaluate_classification_model
from src.common.io import ensure_parent_dir
from src.common.metrics import save_json
from src.common.seeds import set_seed


def _run_epoch(model, loader, criterion, optimizer, device: str, train: bool):
    if train:
        model.train()
    else:
        model.eval()

    total_loss = 0.0
    total_correct = 0
    total_samples = 0

    context = torch.enable_grad() if train else torch.no_grad()
    with context:
        for images, labels in loader:
            images = images.to(device)
            labels = labels.to(device)

            if train:
                optimizer.zero_grad()

            logits = model(images)
            loss = criterion(logits, labels)

            if train:
                loss.backward()
                optimizer.step()

            preds = logits.argmax(dim=1)
            total_loss += loss.item() * images.size(0)
            total_correct += (preds == labels).sum().item()
            total_samples += images.size(0)

    return total_loss / max(total_samples, 1), total_correct / max(total_samples, 1)


def train_classification(config: dict) -> dict:
    set_seed(config.get("seed", 42))

    data_cfg = config["data"]
    train_cfg = config["train"]
    model_cfg = config["model"]
    artifact_cfg = config["artifacts"]

    device = "cuda" if torch.cuda.is_available() else "cpu"
    train_loader, val_loader, class_names = build_classification_dataloaders(
        data_root=data_cfg["root_dir"],
        image_size=data_cfg["image_size"],
        batch_size=train_cfg["batch_size"],
        num_workers=data_cfg["num_workers"],
    )

    model = BrainTumorClassifier(
        backbone=model_cfg["backbone"],
        num_classes=len(class_names),
        pretrained=model_cfg["pretrained"],
        hidden_dim=model_cfg["hidden_dim"],
        dropout=model_cfg["dropout"],
    ).to(device)

    if train_cfg.get("freeze_backbone", True):
        model.freeze_backbone()

    criterion = FocalLoss() if train_cfg.get("use_focal_loss", False) else nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(
        [p for p in model.parameters() if p.requires_grad],
        lr=train_cfg["learning_rate"],
        weight_decay=train_cfg.get("weight_decay", 0.0),
    )

    best_state = None
    best_val_acc = -1.0
    best_epoch = 0
    patience_counter = 0
    history = []

    print(f"[Classification] Device: {device}")
    print(f"[Classification] Classes: {class_names}")

    with mlflow.start_run(run_name=config.get("experiment_name", "classification")):
        mlflow.log_params({
            "backbone": model_cfg["backbone"],
            "hidden_dim": model_cfg["hidden_dim"],
            "dropout": model_cfg["dropout"],
            "learning_rate": train_cfg["learning_rate"],
            "epochs": train_cfg["epochs"],
            "batch_size": train_cfg["batch_size"],
            "weight_decay": train_cfg.get("weight_decay", 0.0),
        })

        for epoch in range(1, train_cfg["epochs"] + 1):
            train_loss, train_acc = _run_epoch(model, train_loader, criterion, optimizer, device, train=True)
            val_loss, val_acc = _run_epoch(model, val_loader, criterion, optimizer, device, train=False)

            history.append({
                "epoch": epoch,
                "train_loss": float(train_loss),
                "train_acc": float(train_acc),
                "val_loss": float(val_loss),
                "val_acc": float(val_acc),
            })

            print(
                f"[Classification] Epoch {epoch}/{train_cfg['epochs']} | "
                f"train_loss={train_loss:.4f} train_acc={train_acc:.4f} | "
                f"val_loss={val_loss:.4f} val_acc={val_acc:.4f}"
            )

            mlflow.log_metrics({
                "train_loss": train_loss,
                "train_acc": train_acc,
                "val_loss": val_loss,
                "val_acc": val_acc,
            }, step=epoch)

            if val_acc > best_val_acc:
                best_val_acc = val_acc
                best_epoch = epoch
                patience_counter = 0
                best_state = copy.deepcopy(model.state_dict())
                ckpt_path = ensure_parent_dir(artifact_cfg["checkpoint_path"])
                torch.save({
                    "task": "classification",
                    "class_names": class_names,
                    "config": config,
                    "model_state_dict": best_state,
                    "backbone": model_cfg["backbone"],
                    "hidden_dim": model_cfg["hidden_dim"],
                    "dropout": model_cfg["dropout"],
                }, ckpt_path)
            else:
                patience_counter += 1

            if patience_counter >= train_cfg.get("early_stopping_patience", 4):
                print("[Classification] Early stopping triggered.")
                break

        if best_state is None:
            raise RuntimeError("Training did not produce a checkpoint.")

        model.load_state_dict(best_state)
        metrics = evaluate_classification_model(config=config, split="val", save_outputs=True, model=model)
        metrics["best_val_acc"] = float(best_val_acc)
        metrics["best_epoch"] = int(best_epoch)
        metrics["history"] = history
        save_json(metrics, artifact_cfg["metrics_path"])

        mlflow.log_artifact(artifact_cfg["checkpoint_path"])
        mlflow.log_artifact(artifact_cfg["metrics_path"])

    return metrics
