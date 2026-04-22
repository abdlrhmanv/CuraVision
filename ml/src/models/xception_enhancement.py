import timm
import torch
import torch.nn as nn
from ._base import BaseBrainTumorModel


class XceptionEnhancementNet(BaseBrainTumorModel):
    """
    Keras-style architecture rebuilt in PyTorch:
    Xception backbone -> Dropout(0.35) -> Linear(256) -> ReLU -> Dropout(0.30) -> Linear(num_classes)
    """

    def __init__(self, num_classes: int = 4, pretrained: bool = True):
        super().__init__()
        self.backbone = timm.create_model(
            'xception',
            pretrained=pretrained,
            num_classes=0,
            global_pool='avg',
        )
        in_features = self.backbone.num_features
        self.classifier = nn.Sequential(
            nn.Dropout(p=0.35),
            nn.Linear(in_features, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(p=0.30),
            nn.Linear(256, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.backbone(x)
        x = self.classifier(x)
        return x
