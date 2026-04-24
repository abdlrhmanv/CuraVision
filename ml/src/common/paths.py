from pathlib import Path

# `paths.py` centralizes important folders so the rest of the code does not
# hardcode absolute Windows paths.
ML_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ML_ROOT / "Data"
CONFIG_DIR = ML_ROOT / "configs"
ARTIFACT_DIR = ML_ROOT / "artifacts"
CHECKPOINT_DIR = ARTIFACT_DIR / "checkpoints"
HEATMAP_DIR = ARTIFACT_DIR / "heatmaps"
OVERLAY_DIR = ARTIFACT_DIR / "overlays"
ONNX_DIR = ARTIFACT_DIR / "onnx"
