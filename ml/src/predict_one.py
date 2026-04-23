from pathlib import Path

import torch
from PIL import Image

from models import MODEL_MAP
from utils import get_device, get_eval_transform



def predict_one_image(model_name: str, weights_path: str, image_path: str):
    device = get_device()

    checkpoint = torch.load(weights_path, map_location="cpu")
    class_names = checkpoint["class_names"]
    num_classes = checkpoint["num_classes"]

    model = MODEL_MAP[model_name](num_classes=num_classes, pretrained=False)
    model.load_state_dict(checkpoint["state_dict"])
    model.to(device)
    model.eval()

    transform = get_eval_transform(model_name)
    image = Image.open(image_path).convert("RGB")
    x = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        logits = model(x)
        pred_idx = logits.argmax(dim=1).item()

    prediction = class_names[pred_idx]
    print(f"Image: {Path(image_path).name}")
    print(f"Predicted class: {prediction}")
    return prediction


if __name__ == "__main__":
    ml_root = Path(__file__).resolve().parents[1]
    model_name = "efficientnet_b0"
    weights_path = ml_root / "artifacts" / "checkpoints" / "efficientnet_b0_best.pth"
    sample_image = ml_root / "Data" / "test" / "glioma" / "example.jpg"

    if not sample_image.exists():
        raise FileNotFoundError(
            f"Put a test image here before running prediction: {sample_image}"
        )

    predict_one_image(
        model_name=model_name,
        weights_path=str(weights_path),
        image_path=str(sample_image),
    )
