# CuraVision ML Module — Classification + Segmentation Only

This `ml/` folder contains only the computer-vision part of CuraVision.
The separate `ai-service/` folder/team can handle LLM summaries later.

The ML workflow is:

1. **Classification first**: predict one of `glioma`, `meningioma`, `pituitary`, `no_tumor`.
2. **Early stop**: if `no_tumor` is predicted with high confidence, skip segmentation.
3. **Segmentation second**: if tumor likelihood is high enough, generate a binary tumor mask.
4. **Return structured findings**: send clean JSON to backend or ai-service.

No LLM code is included here.

## Folder map

```text
ml/
├── Data/                         # datasets live here
│   ├── classification/            # classification train/val/test folders
│   └── segmentation/              # segmentation images/masks folders
├── artifacts/                    # saved outputs
│   ├── checkpoints/               # .pth checkpoints
│   ├── heatmaps/                  # confusion matrix heatmaps
│   ├── onnx/                      # exported ONNX models
│   └── overlays/                  # segmentation overlay debug images
├── configs/                      # YAML settings
│   ├── classification.yaml
│   ├── segmentation.yaml
│   └── inference.yaml
├── src/
│   ├── common/                   # shared helpers
│   ├── classification/           # classification training/eval/export/inference
│   ├── segmentation/             # segmentation training/eval/export/inference
│   ├── inference/                # combined class→segment pipeline
│   ├── api/                      # optional FastAPI CV endpoint
│   └── scripts/                  # easy runnable entry points
└── requirements.txt
```

## Expected datasets

### Classification

```text
ml/Data/classification/
├── train/
│   ├── glioma/
│   ├── meningioma/
│   ├── pituitary/
│   └── no_tumor/
├── val/
│   ├── glioma/
│   ├── meningioma/
│   ├── pituitary/
│   └── no_tumor/
└── test/
    ├── glioma/
    ├── meningioma/
    ├── pituitary/
    └── no_tumor/
```

### Segmentation

```text
ml/Data/segmentation/
├── train/
│   ├── images/
│   └── masks/
├── val/
│   ├── images/
│   └── masks/
└── test/
    ├── images/
    └── masks/
```

Image/mask names should match, for example:

```text
train/images/case_001.png
train/masks/case_001.png
```

Masks should be binary:
- `0` = background
- `1` or `255` = tumor

## Quick run commands

Run commands from inside `ml/`:

```bash
pip install -r requirements.txt
```

Train classification:

```bash
python -m src.scripts.train_classification --config configs/classification.yaml
```

Evaluate classification:

```bash
python -m src.scripts.evaluate_classification --config configs/classification.yaml --split test
```

Train segmentation:

```bash
python -m src.scripts.train_segmentation --config configs/segmentation.yaml
```

Evaluate segmentation:

```bash
python -m src.scripts.evaluate_segmentation --config configs/segmentation.yaml --split test
```

Export ONNX models:

```bash
python -m src.scripts.export_classification_onnx --config configs/classification.yaml
python -m src.scripts.export_segmentation_onnx --config configs/segmentation.yaml
```

Run combined inference demo:

```bash
python -m src.scripts.run_inference_demo --config configs/inference.yaml --image path/to/mri.png
```

Start optional ML-only API:

```bash
uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
```

## File explanation

### `configs/`
- `classification.yaml`: classification dataset path, model name, classes, training settings, checkpoint path, ONNX path.
- `segmentation.yaml`: segmentation dataset path, image size, training settings, checkpoint path, ONNX path.
- `inference.yaml`: ONNX paths and thresholds controlling when segmentation runs.

### `src/common/`
Shared helper code used by both tasks.
- `paths.py`: resolves paths from the `ml/` root.
- `config.py`: loads YAML configs and fixes relative paths.
- `seeds.py`: sets random seeds.
- `io.py`: file and image helpers.
- `metrics.py`: accuracy, confusion heatmap, Dice/IoU, overlay saving.

### `src/classification/`
Classification code.
- `dataset.py`: loads class folders with `ImageFolder`.
- `augmentations.py`: resize, augmentation, normalization.
- `model.py`: timm backbone + classification head.
- `losses.py`: optional focal loss.
- `trainer.py`: training loop and checkpoint saving.
- `evaluator.py`: evaluation and confusion-matrix heatmap.
- `export_onnx.py`: exports classifier to ONNX.
- `infer_onnx.py`: ONNX Runtime classifier used at deployment.

### `src/segmentation/`
Segmentation code.
- `dataset.py`: custom image-mask dataset.
- `augmentations.py`: paired transforms for image and mask.
- `model.py`: beginner-friendly U-Net.
- `losses.py`: Dice loss and BCE+Dice loss.
- `trainer.py`: segmentation training loop and checkpoint saving.
- `evaluator.py`: Dice/IoU evaluation and overlay output.
- `export_onnx.py`: exports segmenter to ONNX.
- `infer_onnx.py`: ONNX Runtime segmenter used at deployment.

### `src/inference/`
Combined CV pipeline.
- `schemas.py`: clean Pydantic response models.
- `pipeline.py`: runs classification first and segmentation only when needed.

### `src/api/`
Optional FastAPI service for CV only.
- `main.py`: `/health` and `/analyze`. It does not call any LLM.

### `src/scripts/`
Small entry files so commands are easy.

## Output sent to backend or ai-service

The final output is structured JSON like:

```json
{
  "findings": {
    "classification": {
      "predicted_class": "glioma",
      "predicted_index": 0,
      "confidence": 0.91,
      "class_probabilities": {
        "glioma": 0.91,
        "meningioma": 0.04,
        "pituitary": 0.03,
        "no_tumor": 0.02
      }
    },
    "segmentation": {
      "ran_segmentation": true,
      "mask_found": true,
      "tumor_area_pixels": 18432,
      "tumor_area_ratio": 0.127,
      "bbox": [84, 65, 211, 220]
    },
    "decision_reason": "Segmentation ran because tumor likelihood was high enough."
  }
}
```

Your `ai-service/` team can later convert this structured JSON into a summary.

## Things you may need to adjust

- Change `no_tumor` to `notumor` in configs if your folder name is different.
- Update mask pairing rules in `segmentation/dataset.py` if masks use names like `case_001_mask.png`.
- Tune thresholds in `inference.yaml` after validation.
- Change image size if your model or dataset needs another resolution.

## Figshare `.mat` segmentation data

Your sample file `3057.mat` is a MATLAB v7.3 file. It contains:

```text
cjdata/
├── image       # MRI image, shape 512x512, int16
├── tumorMask   # binary tumor mask, shape 512x512, values 0/1
├── label       # tumor type label, e.g. 2 = glioma
├── tumorBorder # optional tumor border coordinates
└── PID         # patient/case id stored as character codes
```

Because the training code expects normal image/mask files, the `ml` module now includes a converter.

Put raw `.mat` files here:

```text
ml/Data/segmentation_raw/mat_files/
```

Convert them into PNG image/mask pairs:

```bash
python -m src.scripts.convert_mat_segmentation --overwrite
```

The converter creates:

```text
ml/Data/segmentation/
├── train/images
├── train/masks
├── val/images
├── val/masks
├── test/images
├── test/masks
└── metadata.csv
```

The saved masks use:
- `0` for background
- `255` for tumor

You can inspect one `.mat` file before conversion:

```bash
python -m src.scripts.inspect_mat_file --mat Data/segmentation_raw/mat_files/3057.mat
```

New files for `.mat` support:
- `src/segmentation/mat_utils.py`: reads Figshare `.mat` files and converts them to PNG.
- `src/scripts/inspect_mat_file.py`: prints the internal structure of one `.mat` file.
- `src/scripts/convert_mat_segmentation.py`: converts all raw `.mat` files into train/val/test image-mask folders.

The rest of the segmentation pipeline does not need to change after conversion. It still trains from `Data/segmentation/train|val|test/images` and `masks`.
