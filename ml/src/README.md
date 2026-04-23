# ML folder guide

This folder is the standalone machine-learning part of the project.

## Folder layout
```text
ml/
├── Data/
│   ├── train/
│   ├── val/
│   ├── test/
│   └── data_splitter.py
├── artifacts/
│   ├── checkpoints/
│   └── heatmaps/
├── requirements.txt
└── src/
    ├── losses.py
    ├── predict_one.py
    ├── run_test.py
    ├── run_train.py
    ├── test.py
    ├── train.py
    ├── utils.py
    └── models/
```

## Expected dataset structure
```text
ml/Data/
├── train/
│   ├── glioma/
│   ├── meningioma/
│   ├── notumor/
│   └── pituitary/
├── val/
│   ├── glioma/
│   ├── meningioma/
│   ├── notumor/
│   └── pituitary/
└── test/
    ├── glioma/
    ├── meningioma/
    ├── notumor/
    └── pituitary/
```

## What gets saved
Only the essentials:
- best model checkpoint in `ml/artifacts/checkpoints/`
- test confusion-matrix heatmap in `ml/artifacts/heatmaps/`

No CSV, no Excel, no extra report files.

## How to run
Run these files directly:
- `ml/src/run_train.py`
- `ml/src/run_test.py`
- `ml/src/predict_one.py`
