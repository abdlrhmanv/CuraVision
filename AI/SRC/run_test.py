from test import test_model


if __name__ == '__main__':
    accuracy = test_model(
        model_name='efficientnet_b0',
        weights_path='checkpoints\efficientnet_b0_best.pth',
        data_root=r'AI\Data',
        batch_size=8,
        num_workers=2,
    )
    print("testy testy")
    print(f'Returned accuracy: {accuracy:.4f}')
