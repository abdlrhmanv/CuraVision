import timm
import torch
import torch.nn as nn
from ._base import BaseBrainTumorModel


class EfficientNetB0Net(BaseBrainTumorModel):
    """
    Keras-style architecture rebuilt in PyTorch:
    EfficientNetB0 backbone -> BN -> Dropout(0.50) -> Linear(512) -> ReLU -> BN -> Dropout(0.30) -> Linear(128) -> ReLU -> Dropout(0.20) -> Linear(num_classes)
    """

    def __init__(self, num_classes: int = 4, pretrained: bool = True):
        super().__init__()
        self.backbone = timm.create_model(
            'efficientnet_b0',
            pretrained=pretrained,
            num_classes=0,
            global_pool='avg',
        )
        in_features = self.backbone.num_features
        self.classifier = nn.Sequential(
            nn.BatchNorm1d(in_features),
            nn.Dropout(p=0.50),
            nn.Linear(in_features, 512),
            nn.ReLU(inplace=True),
            nn.BatchNorm1d(512),
            nn.Dropout(p=0.30),
            nn.Linear(512, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(p=0.20),
            nn.Linear(128, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.backbone(x)
        x = self.classifier(x)
        return x
