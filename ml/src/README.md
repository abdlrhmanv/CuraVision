# Brain Tumor PyTorch Project

This is a clean PyTorch rewrite of the architectures from your Keras notebooks.

## Included models
- xception_enhancement
- xception_focal
- efficientnetv2s
- convnext_tiny
- efficientnet_b0

## Project structure
```text
brain_tumor_pytorch_complete/
├── models/
│   ├── __init__.py
│   ├── _base.py
│   ├── xception_enhancement.py
│   ├── xception_focal.py
│   ├── efficientnetv2s.py
│   ├── convnext_tiny.py
│   └── efficientnet_b0.py
├── losses.py
├── utils.py
├── train.py
├── test.py
├── predict_one.py
├── run_train.py
├── run_test.py
├── requirements.txt
└── README.md
```

## Dataset folder
```text
D:\brain_tumor_data
├── train
│   ├── glioma
│   ├── meningioma
│   ├── notumor
│   └── pituitary
├── val
│   ├── glioma
│   ├── meningioma
│   ├── notumor
│   └── pituitary
└── test
    ├── glioma
    ├── meningioma
    ├── notumor
    └── pituitary
```

## How to run from code
### Training
Open `run_train.py` and edit the values, especially:
- `model_name`
- `data_root`
- `save_path`

Then run that file in VS Code or PyCharm.

### Testing
Open `run_test.py` and edit:
- `model_name`
- `weights_path`
- `data_root`

Then run that file.

### Predict one image
Open `predict_one.py` and edit:
- `MODEL_NAME`
- `WEIGHTS_PATH`
- `IMAGE_PATH`

Then run that file.

## Notes
- These are PyTorch architecture rewrites, not direct `.keras` weight imports.
- Backbones use pretrained weights from `timm`.
- `train.py` supports both code-based use and CLI use.
