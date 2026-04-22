import timm
import torch
import torch.nn as nn
from ._base import BaseBrainTumorModel


class EfficientNetV2SNet(BaseBrainTumorModel):
    """
    Keras-style architecture rebuilt in PyTorch:
    EfficientNetV2S backbone -> BN -> Linear(512) -> ReLU -> Dropout(0.40) -> Linear(256) -> ReLU -> Dropout(0.30) -> Linear(num_classes)
    """

    def __init__(self, num_classes: int = 4, pretrained: bool = True):
        super().__init__()
        self.backbone = timm.create_model(
            'tf_efficientnetv2_s',
            pretrained=pretrained,
            num_classes=0,
            global_pool='avg',
        )
        in_features = self.backbone.num_features
        self.classifier = nn.Sequential(
            nn.BatchNorm1d(in_features),
            nn.Linear(in_features, 512),
            nn.ReLU(inplace=True),
            nn.Dropout(p=0.40),
            nn.Linear(512, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(p=0.30),
            nn.Linear(256, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.backbone(x)
        x = self.classifier(x)
        return x
