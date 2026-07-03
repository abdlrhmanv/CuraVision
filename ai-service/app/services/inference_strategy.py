import abc
import os
import logging
import time
import mlflow
from typing import Any
from pathlib import Path

# Local fallback imports
from app.services import analysis_service

logger = logging.getLogger(__name__)

class InferenceStrategy(abc.ABC):
    @abc.abstractmethod
    def run_full_analysis(self, scan_id: str, dicom_path: str, dicom_url: str | None = None, mask_put_url: str | None = None, gradcam_put_url: str | None = None) -> dict[str, Any]:
        pass

class InterimDicomStrategy(InferenceStrategy):
    """
    Fallback strategy that uses synthetic/interim analysis
    when ONNX models are not available.
    """
    def run_full_analysis(self, scan_id: str, dicom_path: str, dicom_url: str | None = None, mask_put_url: str | None = None, gradcam_put_url: str | None = None) -> dict[str, Any]:
        seg = analysis_service.run_segmentation(scan_id, dicom_path, dicom_url, mask_put_url)
        cam = analysis_service.run_gradcam(scan_id, dicom_path, dicom_url, gradcam_put_url)
        rep = analysis_service.run_report(
            scan_id,
            tumor_volume_cc=seg["tumor_volume_cc"],
            tumor_location_description=seg["tumor_location_description"],
            dicom_path=dicom_path,
        )
        return {"scan_id": scan_id, "segmentation": seg, "gradcam": cam, "report": rep}

class OnnxPipelineStrategy(InferenceStrategy):
    """
    Production strategy that delegates to the ONNX ML pipeline.
    """
    def __init__(self, config: dict):
        # Dynamically import ml module to avoid breaking if not present
        import sys
        import importlib
        repo_root = Path(__file__).resolve().parents[3]
        ml_path = repo_root / "ml"
        if str(ml_path) not in sys.path:
            sys.path.append(str(ml_path))
            
        pipeline_mod = importlib.import_module("src.inference.pipeline")
        BrainMRIPipeline = pipeline_mod.BrainMRIPipeline
        self.pipeline = BrainMRIPipeline(config)
        
        # MLflow setup
        mlflow.set_tracking_uri("sqlite:///mlruns.db")
        mlflow.set_experiment("CuraVision-Tumor-Segmentation")

    def run_full_analysis(self, scan_id: str, dicom_path: str, dicom_url: str | None = None, mask_put_url: str | None = None, gradcam_put_url: str | None = None) -> dict[str, Any]:
        import time
        start_time = time.time()

        from PIL import Image
        import importlib
        schemas_mod = importlib.import_module("src.inference.schemas")
        ClassificationResult = schemas_mod.ClassificationResult
        
        # Load image (we reuse analysis_service's loader which returns PIL Image)
        image, metadata, _ = analysis_service._load_image(scan_id, dicom_path, dicom_url)
        
        # Run classification model
        cls_raw = self.pipeline.classifier.predict(image)
        class_result = ClassificationResult(**cls_raw)
        
        # Determine if we need to segment based on class probabilities
        no_tumor_prob = class_result.class_probabilities[self.pipeline.class_names[self.pipeline.no_tumor_index]]
        tumor_probability = 1.0 - no_tumor_prob
        
        stop_early = (
            class_result.predicted_index == self.pipeline.no_tumor_index
            and class_result.confidence >= self.pipeline.no_tumor_stop_threshold
            and tumor_probability < self.pipeline.segmentation_trigger_threshold
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
                # Save mask and gradcam using analysis_service helpers
                mask_path = analysis_service._save_mask(mask, scan_id, mask_put_url)
                gradcam_path = analysis_service._save_heatmap(image, mask, scan_id, gradcam_put_url)
                volume = analysis_service._estimate_volume_cc(mask, metadata, scan_id)
                location = analysis_service._describe_location(mask, scan_id)
            else:
                location = "no anomaly segmented"
        else:
            decision_reason = "Segmentation was skipped because tumor likelihood was below the trigger threshold."
            
        rep = analysis_service.run_report(
            scan_id,
            tumor_volume_cc=volume,
            tumor_location_description=location,
            dicom_path=dicom_path,
        )
        
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
            scan_id=scan_id,
            volume=volume,
            location=location,
            confidence=class_result.confidence,
            processing_time_sec=elapsed
        )
        
        segmentation_data = {
            "scan_id": scan_id,
            "mask_path": mask_path,
            "tumor_volume_cc": volume,
            "tumor_location_description": location,
            "inference_log": decision_reason
        }
        segmentation_data.update(metrics)

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

def get_inference_strategy() -> InferenceStrategy:
    """
    Factory to resolve the active strategy based on env vars.
    """
    strategy_name = os.getenv("INFERENCE_STRATEGY", "interim").lower()
    
    if strategy_name == "onnx":
        logger.info("Initializing ONNX Inference Strategy")
        try:
            repo_root = Path(__file__).resolve().parents[3]
            
            def find_model(env_var: str, default_name: str) -> str:
                val = os.getenv(env_var)
                if val:
                    return val
                
                # Dev path: ml/artifacts/onnx/
                dev_dir = repo_root / "ml" / "artifacts" / "onnx"
                for ext in [".onnx.data", ".onnx"]:
                    p = dev_dir / f"{default_name}{ext}"
                    if p.exists():
                        return str(p)
                
                # Prod path: ai-service/app/ml_models/
                prod_dir = Path(__file__).resolve().parents[2] / "ml_models"
                for ext in [".onnx.data", ".onnx"]:
                    p = prod_dir / f"{default_name}{ext}"
                    if p.exists():
                        return str(p)
                
                # Fallback default
                return f"models/{default_name}.onnx"

            cls_path = find_model("CLS_ONNX_PATH", "classification")
            seg_path = find_model("SEG_ONNX_PATH", "segmentation")
            
            logger.info(f"Using classification model: {cls_path}")
            logger.info(f"Using segmentation model: {seg_path}")
            logger.info("Model loaded")

            config = {
                "class_names": ["glioma", "meningioma", "pituitary", "no_tumor"],
                "classification": {
                    "onnx_path": cls_path,
                    "image_size": [224, 224],
                    "no_tumor_index": 3,
                    "no_tumor_stop_threshold": 0.85,
                    "tumor_class_threshold": 0.50,
                    "segmentation_trigger_threshold": 0.35
                },
                "segmentation": {
                    "onnx_path": seg_path,
                    "image_size": [256, 256],
                    "positive_threshold": 0.5
                }
            }
            return OnnxPipelineStrategy(config)
        except Exception as e:
            logger.warning(f"Failed to initialize ONNX strategy, falling back to interim: {e}", exc_info=True)
            return InterimDicomStrategy()
            
    return InterimDicomStrategy()
