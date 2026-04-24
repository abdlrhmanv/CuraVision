from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class ClassificationResult(BaseModel):
    """Output from the classification ONNX model."""

    predicted_class: str
    predicted_index: int
    confidence: float
    class_probabilities: Dict[str, float]


class SegmentationResult(BaseModel):
    """Output from the segmentation ONNX model.

    If segmentation is skipped, ran_segmentation will be False and the rest
    stays empty/default.
    """

    ran_segmentation: bool
    mask_found: bool = False
    tumor_area_pixels: int = 0
    tumor_area_ratio: float = 0.0
    bbox: Optional[List[int]] = None


class StructuredFindings(BaseModel):
    """Final CV-only result produced by the ML module.

    This object is safe to send to your backend or ai-service later.
    The LLM team can consume this structured data without seeing raw images.
    """

    classification: ClassificationResult
    segmentation: SegmentationResult
    decision_reason: str = Field(description="Why the pipeline did or did not run segmentation")


class AnalysisResponse(BaseModel):
    """API/inference response from the ML service."""

    findings: StructuredFindings
