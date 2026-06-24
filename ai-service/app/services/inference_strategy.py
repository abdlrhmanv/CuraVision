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
    def run_full_analysis(self, scan_id: str, dicom_path: str) -> dict[str, Any]:
        pass

class InterimDicomStrategy(InferenceStrategy):
    """
    Fallback strategy that uses synthetic/interim analysis
    when ONNX models are not available.
    """
    def run_full_analysis(self, scan_id: str, dicom_path: str) -> dict[str, Any]:
        seg = analysis_service.run_segmentation(scan_id, dicom_path)
        cam = analysis_service.run_gradcam(scan_id, dicom_path)
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
        repo_root = Path(__file__).resolve().parents[4]
        ml_path = repo_root / "ml"
        if str(ml_path) not in sys.path:
            sys.path.append(str(ml_path))
            
        from src.inference.pipeline import BrainMRIPipeline
        self.pipeline = BrainMRIPipeline(config)
        
        # MLflow setup
        mlflow.set_tracking_uri("sqlite:///mlruns.db")
        mlflow.set_experiment("CuraVision-Tumor-Segmentation")

    def run_full_analysis(self, scan_id: str, dicom_path: str) -> dict[str, Any]:
        from PIL import Image
        
        # Load image (we reuse analysis_service's loader which returns PIL Image)
        image, metadata, _ = analysis_service._load_image(scan_id, dicom_path)
        
        # Run inference
        response = self.pipeline.analyze(image)
        findings = response.findings
        
        # Format the result to match the expected API
        cls_result = findings.classification
        seg_result = findings.segmentation
        
        # We might not have a mask path since the real pipeline returns bounding box / area right now
        # but we can try to conform to the API
        volume = None
        location = "undetermined"
        
        if seg_result.ran_segmentation and seg_result.mask_found:
            # Fake volume for now, or calculate from pixel area
            volume = round(seg_result.tumor_area_pixels * 0.01, 2)
            location = "detected region"
        elif cls_result.predicted_index != 0:
            location = "diffuse or non-focal"
            
        # Stub mask and gradcam paths for now
        mask_path = ""
        gradcam_path = ""
        
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
            mlflow.log_param("predicted_class", cls_result.predicted_index)
            mlflow.log_metric("confidence", cls_result.confidence)
        
        return {
            "scan_id": scan_id,
            "segmentation": {
                "scan_id": scan_id,
                "mask_path": mask_path,
                "tumor_volume_cc": volume,
                "tumor_location_description": location,
                "inference_log": findings.decision_reason
            },
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
            # We would load actual config from env/yaml here
            config = {
                "class_names": ["no_tumor", "glioma", "meningioma", "pituitary"],
                "classification": {
                    "onnx_path": os.getenv("CLS_ONNX_PATH", "models/cls.onnx"),
                    "image_size": [224, 224],
                    "no_tumor_index": 0,
                    "no_tumor_stop_threshold": 0.95,
                    "tumor_class_threshold": 0.5,
                    "segmentation_trigger_threshold": 0.1
                },
                "segmentation": {
                    "onnx_path": os.getenv("SEG_ONNX_PATH", "models/seg.onnx"),
                    "image_size": [256, 256],
                    "positive_threshold": 0.5
                }
            }
            # Only return Onnx if we can actually instantiate it (might fail if models missing)
            # For now, if files don't exist, it might crash inside ClassificationONNXPredictor
            # but we allow the exception to bubble up or fallback
            return OnnxPipelineStrategy(config)
        except Exception as e:
            logger.warning(f"Failed to initialize ONNX strategy, falling back to interim: {e}")
            return InterimDicomStrategy()
            
    return InterimDicomStrategy()
