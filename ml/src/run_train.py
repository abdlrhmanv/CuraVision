from pathlib import Path

from train import train_model


if __name__ == "__main__":
    ml_root = Path(__file__).resolve().parents[1]

    result = train_model(
        model_name="convnext_tiny",
        data_root=str(ml_root / "Data"),
        epochs=20,
        batch_size=16,
        lr=1e-3,
        loss_name="ce",
        save_path=str(ml_root / "artifacts" / "checkpoints" / "convnext_tiny_best.pth"),
        num_workers=4,
        freeze_backbone=True,
    )

    print("Training finished.")
    print(result)
