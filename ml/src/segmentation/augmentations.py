from __future__ import annotations

import random
import numpy as np
import torch
from PIL import Image, ImageOps


class SegmentationTrainTransform:
    """Paired image-mask transform without extra dependencies.

    The key rule in segmentation is that image and mask must receive the same
    geometric transforms. That is why this transform class handles both at once.
    """

    def __init__(self, image_size: int):
        self.image_size = image_size

    def __call__(self, image: Image.Image, mask: Image.Image):
        image = image.resize((self.image_size, self.image_size), resample=Image.BILINEAR)
        mask = mask.resize((self.image_size, self.image_size), resample=Image.NEAREST)

        if random.random() < 0.5:
            image = ImageOps.mirror(image)
            mask = ImageOps.mirror(mask)
        if random.random() < 0.2:
            image = ImageOps.flip(image)
            mask = ImageOps.flip(mask)

        angle = random.uniform(-10, 10)
        image = image.rotate(angle, resample=Image.BILINEAR)
        mask = mask.rotate(angle, resample=Image.NEAREST)
        return pil_pair_to_tensors(image, mask)


class SegmentationEvalTransform:
    def __init__(self, image_size: int):
        self.image_size = image_size

    def __call__(self, image: Image.Image, mask: Image.Image):
        image = image.resize((self.image_size, self.image_size), resample=Image.BILINEAR)
        mask = mask.resize((self.image_size, self.image_size), resample=Image.NEAREST)
        return pil_pair_to_tensors(image, mask)


class SegmentationInferenceTransform:
    def __init__(self, image_size: int):
        self.image_size = image_size

    def __call__(self, image: Image.Image):
        image = image.resize((self.image_size, self.image_size), resample=Image.BILINEAR)
        image_np = np.asarray(image.convert("RGB"), dtype=np.float32) / 255.0
        image_np = np.transpose(image_np, (2, 0, 1))
        return image_np


def pil_pair_to_tensors(image: Image.Image, mask: Image.Image):
    image_np = np.asarray(image.convert("RGB"), dtype=np.float32) / 255.0
    image_np = np.transpose(image_np, (2, 0, 1))

    mask_np = np.asarray(mask.convert("L"), dtype=np.float32)
    mask_np = (mask_np > 0).astype(np.float32)[None, ...]
    return torch.tensor(image_np, dtype=torch.float32), torch.tensor(mask_np, dtype=torch.float32)
