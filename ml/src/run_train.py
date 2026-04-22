from train import train_model


if __name__ == '__main__':
    result = train_model(
        model_name='efficientnet_b0',
        data_root=r'AI\Data',
        epochs=5,
        batch_size=8,
        lr=1e-3,
        loss_name='ce',
        save_path='checkpoints/efficientnet_b0_best.pth',
        num_workers=2,
        freeze_backbone=True,
    )

    print('Training finished.')
    print(result)
