from .xception_enhancement import XceptionEnhancementNet
from .xception_focal import XceptionFocalNet
from .efficientnetv2s import EfficientNetV2SNet
from .convnext_tiny import ConvNeXtTinyNet
from .efficientnet_b0 import EfficientNetB0Net

MODEL_MAP = {
    "xception_enhancement": XceptionEnhancementNet,
    "xception_focal": XceptionFocalNet,
    "efficientnetv2s": EfficientNetV2SNet,
    "convnext_tiny": ConvNeXtTinyNet,
    "efficientnet_b0": EfficientNetB0Net,
}

__all__ = [
    "XceptionEnhancementNet",
    "XceptionFocalNet",
    "EfficientNetV2SNet",
    "ConvNeXtTinyNet",
    "EfficientNetB0Net",
    "MODEL_MAP",
]
