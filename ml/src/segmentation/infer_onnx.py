from __future__ import annotations

import numpy as np
import onnxruntime as ort
from PIL import Image

from src.segmentation.augmentations import SegmentationInferenceTransform


class SegmentationONNXPredictor:
    def __init__(self, onnx_path: str, image_size: int, positive_threshold: float = 0.5):
        available = ort.get_available_providers()
        providers = ["CUDAExecutionProvider", "CPUExecutionProvider"] if "CUDAExecutionProvider" in available else ["CPUExecutionProvider"]
        self.session = ort.InferenceSession(onnx_path, providers=providers)
        self.transform = SegmentationInferenceTransform(image_size=image_size)
        self.positive_threshold = positive_threshold

    def predict(self, image: Image.Image) -> dict:
        x = self.transform(image)[None, ...].astype(np.float32)
        logits = self.session.run(None, {"image": x})[0][0, 0]
        probs = 1.0 / (1.0 + np.exp(-logits))
        mask = (probs >= self.positive_threshold).astype(np.uint8)
        bbox = self._compute_bbox(mask)
        area_pixels = int(mask.sum())
        area_ratio = float(area_pixels / max(mask.size, 1))
        return {
            "mask": mask,
            "bbox": bbox,
            "tumor_area_pixels": area_pixels,
            "tumor_area_ratio": area_ratio,
            "mask_found": bool(area_pixels > 0),
        }

    @staticmethod
    def _compute_bbox(mask: np.ndarray):
        ys, xs = np.where(mask > 0)
        if len(xs) == 0 or len(ys) == 0:
            return None
        return [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
