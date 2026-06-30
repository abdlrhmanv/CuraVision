from __future__ import annotations

import numpy as np
import onnxruntime as ort
from PIL import Image
from torchvision import transforms

from src.classification.augmentations import IMAGENET_MEAN, IMAGENET_STD


class ClassificationONNXPredictor:
    def __init__(self, onnx_path: str, image_size: int, class_names: list[str]):
        self.class_names = class_names
        available = ort.get_available_providers()
        providers = ["CUDAExecutionProvider", "CPUExecutionProvider"] if "CUDAExecutionProvider" in available else ["CPUExecutionProvider"]
        self.session = ort.InferenceSession(onnx_path, providers=providers)
        self.transform = transforms.Compose([
            transforms.Resize((image_size, image_size)),
            transforms.ToTensor(),
            transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
        ])

    def predict(self, image: Image.Image) -> dict:
        x = self.transform(image.convert("RGB")).unsqueeze(0).numpy().astype(np.float32)
        logits = self.session.run(None, {"image": x})[0]
        probs = self._softmax(logits[0])
        top_idx = int(np.argmax(probs))
        return {
            "predicted_class": self.class_names[top_idx],
            "predicted_index": top_idx,
            "confidence": float(probs[top_idx]),
            "class_probabilities": {name: float(probs[i]) for i, name in enumerate(self.class_names)},
        }

    @staticmethod
    def _softmax(logits: np.ndarray) -> np.ndarray:
        logits = logits - np.max(logits)
        exps = np.exp(logits)
        return exps / np.sum(exps)