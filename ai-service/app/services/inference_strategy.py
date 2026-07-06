import abc
import os
import logging
import time
import threading
import mlflow
from typing import Any
from pathlib import Path

from app.services import analysis_service

logger = logging.getLogger(__name__)
_mlflow_init_lock = threading.Lock()


def _configure_mlflow_tracking() -> None:
    """Initialize MLflow once; safe under Celery prefork concurrency."""
    mlflow_db_path = os.getenv("MLFLOW_DB_PATH", "/tmp/mlruns.db")
    mlflow.set_tracking_uri(f"sqlite:///{mlflow_db_path}")
    experiment_name = "CuraVision-Tumor-Segmentation"
    with _mlflow_init_lock:
        experiment = mlflow.get_experiment_by_name(experiment_name)
        if experiment is None:
            mlflow.create_experiment(experiment_name)
        mlflow.set_experiment(experiment_name)


def _ensure_ml_on_path() -> Path:
    """Make the ml/ package importable as `src.*` in dev and Docker."""
    import sys

    candidates: list[Path] = []
    if os.getenv("ML_ROOT"):
        candidates.append(Path(os.environ["ML_ROOT"]))
    candidates.extend([
        Path("/ml"),
        Path(__file__).resolve().parents[3] / "ml",
    ])

    for root in candidates:
        pipeline_file = root / "src" / "inference" / "pipeline.py"
        if pipeline_file.is_file():
            root_str = str(root.resolve())
            if root_str not in sys.path:
                sys.path.insert(0, root_str)
            logger.info("Using ML pipeline code from %s", root_str)
            return root.resolve()

    searched = ", ".join(str(path) for path in candidates)
    raise FileNotFoundError(
        f"ML pipeline package not found (expected src/inference/pipeline.py). Searched: {searched}"
    )


class InferenceStrategy(abc.ABC):
    @abc.abstractmethod
    def run_full_analysis(self, scan_id: str, dicom_path: str, dicom_url: str | None = None, mask_put_url: str | None = None, gradcam_put_url: str | None = None) -> dict[str, Any]:
        pass


class InterimDicomStrategy(InferenceStrategy):
    """Local/interim pipeline using image-derived heuristics when ONNX is unavailable."""

    def run_full_analysis(self, scan_id: str, dicom_path: str, dicom_url: str | None = None, mask_put_url: str | None = None, gradcam_put_url: str | None = None) -> dict[str, Any]:
        seg = analysis_service.run_segmentation(scan_id, dicom_path, dicom_url, mask_put_url)
        cam = analysis_service.run_gradcam(scan_id, dicom_path, dicom_url, gradcam_put_url)
        rep = analysis_service.run_report(
            scan_id,
            tumor_volume_cc=seg["tumor_volume_cc"],
            tumor_location_description=seg["tumor_location_description"],
            dicom_path=dicom_path,
            confidence=seg.get("confidence"),
            processing_time_sec=seg.get("processing_time_sec"),
        )
        return {"scan_id": scan_id, "segmentation": seg, "gradcam": cam, "report": rep}


class OnnxPipelineStrategy(InferenceStrategy):
    """
    Production strategy that delegates to the ONNX ML pipeline.
    """
    def __init__(self, config: dict):
        import importlib

        _ensure_ml_on_path()
        pipeline_mod = importlib.import_module("src.inference.pipeline")
        BrainMRIPipeline = pipeline_mod.BrainMRIPipeline
        self.pipeline = BrainMRIPipeline(config)
        _configure_mlflow_tracking()

    def run_full_analysis(self, scan_id: str, dicom_path: str, dicom_url: str | None = None, mask_put_url: str | None = None, gradcam_put_url: str | None = None) -> dict[str, Any]:
        import time
        start_time = time.time()

        from PIL import Image
        import importlib
        schemas_mod = importlib.import_module("src.inference.schemas")
        ClassificationResult = schemas_mod.ClassificationResult
        
        # Load image (we reuse analysis_service's loader which returns PIL Image)
        image, metadata = analysis_service._load_image(scan_id, dicom_path, dicom_url)
        
        # Run classification model
        cls_raw = self.pipeline.classifier.predict(image)
        class_result = ClassificationResult(**cls_raw)
        
        # Determine if we need to segment based on class probabilities
        no_tumor_prob = class_result.class_probabilities[self.pipeline.class_names[self.pipeline.no_tumor_index]]
        tumor_probability = 1.0 - no_tumor_prob
        
        stop_early = (
            class_result.predicted_index == self.pipeline.no_tumor_index
        )
        
        should_run_segmentation = (
            not stop_early and (
                (class_result.predicted_index != self.pipeline.no_tumor_index and class_result.confidence >= self.pipeline.tumor_class_threshold)
                or tumor_probability >= self.pipeline.segmentation_trigger_threshold
            )
        )
        
        mask_path = ""
        gradcam_path = ""
        volume = None
        location = "no anomaly detected"
        decision_reason = ""
        
        if stop_early:
            decision_reason = "Classification predicted no_tumor with high confidence, so segmentation was skipped."
        elif should_run_segmentation:
            seg_raw = self.pipeline.segmenter.predict(image)
            decision_reason = "Segmentation ran because tumor likelihood was high enough."
            
            if seg_raw["mask_found"]:
                mask = seg_raw["mask"]
                if mask.sum() < 150:
                    seg_raw["mask_found"] = False
                    
            if seg_raw["mask_found"]:
                # Save mask and gradcam using analysis_service helpers
                mask_path = analysis_service._save_mask(mask, scan_id, mask_put_url)
                gradcam_path = analysis_service._save_heatmap(image, mask, scan_id, gradcam_put_url)
                volume = analysis_service._estimate_volume_cc(mask, metadata, scan_id)
                location = analysis_service._describe_location(mask, scan_id)
            else:
                location = "no anomaly segmented"
        else:
            decision_reason = "Segmentation was skipped because tumor likelihood was below the trigger threshold."
            
        # Log to MLflow
        with mlflow.start_run(run_name=f"scan_{scan_id}"):
            mlflow.log_param("scan_id", scan_id)
            mlflow.log_param("model_type", "ONNX_Pipeline")
            if volume is not None:
                mlflow.log_metric("tumor_volume_cc", volume)
            mlflow.log_param("tumor_location", location)
            mlflow.log_param("predicted_class", class_result.predicted_class)
            mlflow.log_metric("confidence", class_result.confidence)
            mlflow.log_param("decision_reason", decision_reason)
        
        elapsed = round(time.time() - start_time, 2)
        metrics = analysis_service.compute_derived_metrics(
            volume=0.0 if volume is None else volume,
            location=location,
            confidence=class_result.confidence,
            predicted_class=class_result.predicted_class,
            processing_time_sec=elapsed,
        )
        
        segmentation_data = {
            "scan_id": scan_id,
            "mask_path": mask_path,
            "tumor_volume_cc": volume,
            "tumor_location_description": location,
            "inference_log": decision_reason
        }
        segmentation_data.update(metrics)

        rep = analysis_service.run_report(
            scan_id,
            tumor_volume_cc=volume,
            tumor_location_description=location,
            dicom_path=dicom_path,
            confidence=metrics.get("confidence"),
            processing_time_sec=metrics.get("processing_time_sec"),
        )
        
        return {
            "scan_id": scan_id,
            "segmentation": segmentation_data,
            "gradcam": {
                "scan_id": scan_id,
                "gradcam_path": gradcam_path,
                "activation_peak_region": location
            },
            "report": rep
        }

_cached_strategy: InferenceStrategy | None = None


def get_inference_strategy() -> InferenceStrategy:
    """
    Factory to resolve the active strategy based on env vars.
    """
    global _cached_strategy
    if _cached_strategy is not None:
        return _cached_strategy

    strategy_name = os.getenv("INFERENCE_STRATEGY", "interim").lower()

    if strategy_name in ("interim", "local"):
        logger.info("Using interim DICOM inference strategy")
        _cached_strategy = InterimDicomStrategy()
        return _cached_strategy

    logger.info("Initializing ONNX Inference Strategy")
    try:
        repo_root = Path(__file__).resolve().parents[3]

        def find_model(env_var: str, default_name: str) -> str:
            candidates: list[Path] = []
            env_val = os.getenv(env_var)
            if env_val:
                candidates.append(Path(env_val))
            candidates.extend([
                Path("/models") / f"{default_name}.onnx",
                Path("/ml/artifacts/onnx") / f"{default_name}.onnx",
                repo_root / "ml" / "artifacts" / "onnx" / f"{default_name}.onnx",
                Path(__file__).resolve().parents[2] / "ml_models" / f"{default_name}.onnx",
            ])

            for candidate in candidates:
                if candidate.exists():
                    data_file = Path(f"{candidate}.data")
                    if data_file.exists():
                        logger.info(f"Using external ONNX weights: {data_file}")
                    return str(candidate.resolve())

            searched = ", ".join(str(path) for path in candidates)
            raise FileNotFoundError(
                f"ONNX model '{default_name}.onnx' not found. Searched: {searched}"
            )

        cls_path = find_model("CLS_ONNX_PATH", "classification")
        seg_path = find_model("SEG_ONNX_PATH", "segmentation")

        logger.info(f"Using classification model: {cls_path}")
        logger.info(f"Using segmentation model: {seg_path}")
        logger.info("Model loaded")

        config = {
            "class_names": ["glioma", "meningioma", "no_tumor", "pituitary"],
            "classification": {
                "onnx_path": cls_path,
                "image_size": 224,
                "no_tumor_index": 2,
                "no_tumor_stop_threshold": 0.85,
                "tumor_class_threshold": 0.50,
                "segmentation_trigger_threshold": 0.35
            },
            "segmentation": {
                "onnx_path": seg_path,
                "image_size": 256,
                "positive_threshold": 0.5
            }
        }
        _cached_strategy = OnnxPipelineStrategy(config)
        return _cached_strategy
    except Exception as e:
        logger.error(f"Failed to initialize ONNX strategy: {e}", exc_info=True)
        logger.warning("Falling back to interim DICOM inference strategy")
        _cached_strategy = InterimDicomStrategy()
        return _cached_strategy
