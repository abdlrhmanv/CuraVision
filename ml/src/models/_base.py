import torch.nn as nn


class BaseBrainTumorModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.backbone = None
        self.classifier = None

    def freeze_backbone(self):
        if self.backbone is None:
            return
        for param in self.backbone.parameters():
            param.requires_grad = False

    def unfreeze_backbone(self):
        if self.backbone is None:
            return
        for param in self.backbone.parameters():
            param.requires_grad = True

    def count_trainable_params(self) -> int:
        return sum(p.numel() for p in self.parameters() if p.requires_grad)
