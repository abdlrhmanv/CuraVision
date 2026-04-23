from pathlib import Path

from test import test_model


if __name__ == "__main__":
    ml_root = Path(__file__).resolve().parents[1]

    result = test_model(
        model_name="convnext_tiny",
        weights_path=str(ml_root / "artifacts" / "checkpoints" / "convnext_tiny_best.pth"),
        data_root=str(ml_root / "Data"),
        batch_size=8,
        num_workers=0,
        heatmap_path=str(ml_root / "artifacts" / "heatmaps" / "convnext_tiny_test_heatmap.png"),
    )

    print(f"Returned accuracy: {result['accuracy']:.4f}")
    print(f"Heatmap path: {result['heatmap_path']}")
