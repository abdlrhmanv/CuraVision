import argparse

import torch

from models import MODEL_MAP
from utils import make_test_loader, get_device


@torch.no_grad()
def test_model(
    model_name: str,
    weights_path: str,
    data_root: str,
    batch_size: int = 8,
    num_workers: int = 2,
):
    device = get_device()
    test_loader, class_names = make_test_loader(
        data_root=data_root,
        model_name=model_name,
        batch_size=batch_size,
        num_workers=num_workers,
    )

    ckpt = torch.load(weights_path, map_location='cpu')
    num_classes = ckpt['num_classes']

    model = MODEL_MAP[model_name](num_classes=num_classes, pretrained=False)
    model.load_state_dict(ckpt['state_dict'])
    model.to(device)
    model.eval()

    correct = 0
    total = 0
    for images, labels in test_loader:
        images = images.to(device)
        labels = labels.to(device)
        logits = model(images)
        preds = logits.argmax(dim=1)
        correct += (preds == labels).sum().item()
        total += images.size(0)

    accuracy = correct / total
    print(f"Using device: {device}")
    print(f"Checkpoint classes: {ckpt['class_names']}")
    print(f"Folder classes: {class_names}")
    print(f"Test accuracy: {accuracy:.4f}")
    return accuracy


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', required=True, choices=MODEL_MAP.keys())
    parser.add_argument('--weights', required=True)
    parser.add_argument('--data_root', required=True)
    parser.add_argument('--batch_size', type=int, default=8)
    parser.add_argument('--num_workers', type=int, default=2)
    return parser.parse_args()


def main():
    args = parse_args()
    test_model(
        model_name=args.model,
        weights_path=args.weights,
        data_root=args.data_root,
        batch_size=args.batch_size,
        num_workers=args.num_workers,
    )


if __name__ == '__main__':
    main()
