import argparse
from pathlib import Path

import torch
import torch.nn as nn

from losses import FocalLoss
from utils import build_model, make_train_val_loaders, get_device
from models import MODEL_MAP


def train_one_epoch(model, loader, criterion, optimizer, device):
    model.train()
    total_loss = 0.0
    total_correct = 0
    total_samples = 0

    for images, labels in loader:
        images = images.to(device)
        labels = labels.to(device)

        optimizer.zero_grad()
        logits = model(images)
        loss = criterion(logits, labels)
        loss.backward()
        optimizer.step()

        total_loss += loss.item() * images.size(0)
        total_correct += (logits.argmax(dim=1) == labels).sum().item()
        total_samples += images.size(0)

    return total_loss / total_samples, total_correct / total_samples


@torch.no_grad()
def evaluate(model, loader, criterion, device):
    model.eval()
    total_loss = 0.0
    total_correct = 0
    total_samples = 0

    for images, labels in loader:
        images = images.to(device)
        labels = labels.to(device)
        logits = model(images)
        loss = criterion(logits, labels)

        total_loss += loss.item() * images.size(0)
        total_correct += (logits.argmax(dim=1) == labels).sum().item()
        total_samples += images.size(0)

    return total_loss / total_samples, total_correct / total_samples


def train_model(
    model_name: str,
    data_root: str,
    epochs: int = 5,
    batch_size: int = 8,
    lr: float = 1e-3,
    loss_name: str = 'ce',
    save_path: str = 'best_model.pth',
    num_workers: int = 2,
    freeze_backbone: bool = True,
):
    device = get_device()
    train_loader, val_loader, class_names = make_train_val_loaders(
        data_root=data_root,
        model_name=model_name,
        batch_size=batch_size,
        num_workers=num_workers,
    )

    model = build_model(model_name, num_classes=len(class_names), pretrained=True).to(device)

    if freeze_backbone and hasattr(model, 'freeze_backbone'):
        model.freeze_backbone()

    criterion = nn.CrossEntropyLoss() if loss_name == 'ce' else FocalLoss(gamma=2.0)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)

    save_path = Path(save_path)
    if save_path.parent != Path('.'):
        save_path.parent.mkdir(parents=True, exist_ok=True)

    best_acc = 0.0
    history = []

    print(f"Using device: {device}")
    print(f"Train classes: {class_names}")
    if hasattr(model, 'count_trainable_params'):
        print(f"Trainable params: {model.count_trainable_params():,}")

    for epoch in range(epochs):
        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc = evaluate(model, val_loader, criterion, device)

        row = {
            'epoch': epoch + 1,
            'train_loss': train_loss,
            'train_acc': train_acc,
            'val_loss': val_loss,
            'val_acc': val_acc,
        }
        history.append(row)

        print(
            f"Epoch {epoch + 1}/{epochs} | "
            f"train_loss={train_loss:.4f} train_acc={train_acc:.4f} | "
            f"val_loss={val_loss:.4f} val_acc={val_acc:.4f}"
        )

        if val_acc > best_acc:
            best_acc = val_acc
            torch.save(
                {
                    'model_name': model_name,
                    'num_classes': len(class_names),
                    'class_names': class_names,
                    'state_dict': model.state_dict(),
                },
                str(save_path),
            )
            print(f"Saved best checkpoint to: {save_path}")

    return {
        'best_val_acc': best_acc,
        'class_names': class_names,
        'history': history,
        'save_path': str(save_path),
    }


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', required=True, choices=MODEL_MAP.keys())
    parser.add_argument('--data_root', required=True)
    parser.add_argument('--epochs', type=int, default=5)
    parser.add_argument('--batch_size', type=int, default=8)
    parser.add_argument('--lr', type=float, default=1e-3)
    parser.add_argument('--loss', choices=['ce', 'focal'], default='ce')
    parser.add_argument('--save_path', default='best_model.pth')
    parser.add_argument('--num_workers', type=int, default=2)
    parser.add_argument('--no_freeze_backbone', action='store_true')
    return parser.parse_args()


def main():
    args = parse_args()
    train_model(
        model_name=args.model,
        data_root=args.data_root,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        loss_name=args.loss,
        save_path=args.save_path,
        num_workers=args.num_workers,
        freeze_backbone=not args.no_freeze_backbone,
    )


if __name__ == '__main__':
    main()
