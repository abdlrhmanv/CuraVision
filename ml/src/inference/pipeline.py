from __future__ import annotations

from PIL import Image

from src.classification.infer_onnx import ClassificationONNXPredictor
from src.inference.schemas import AnalysisResponse, ClassificationResult, SegmentationResult, StructuredFindings
from src.segmentation.infer_onnx import SegmentationONNXPredictor


class BrainMRIPipeline:
    """Production-style inference pipeline.

    Logic:
    1. Always classify first.
    2. Stop early only when `no_tumor` is strong enough.
    3. Otherwise run segmentation.

    This avoids hard gating purely by class label.
    """

    def __init__(self, config: dict):
        self.config = config
        self.class_names = config["class_names"]
        cls_cfg = config["classification"]
        seg_cfg = config["segmentation"]

        self.classifier = ClassificationONNXPredictor(
            onnx_path=cls_cfg["onnx_path"],
            image_size=cls_cfg["image_size"],
            class_names=self.class_names,
        )
        self.segmenter = SegmentationONNXPredictor(
            onnx_path=seg_cfg["onnx_path"],
            image_size=seg_cfg["image_size"],
            positive_threshold=seg_cfg["positive_threshold"],
        )
        self.no_tumor_index = cls_cfg["no_tumor_index"]
        self.no_tumor_stop_threshold = cls_cfg["no_tumor_stop_threshold"]
        self.tumor_class_threshold = cls_cfg["tumor_class_threshold"]
        self.segmentation_trigger_threshold = cls_cfg["segmentation_trigger_threshold"]

    def analyze(self, image: Image.Image) -> AnalysisResponse:
        cls_raw = self.classifier.predict(image)
        class_result = ClassificationResult(**cls_raw)

        no_tumor_prob = class_result.class_probabilities[self.class_names[self.no_tumor_index]]
        tumor_probability = 1.0 - no_tumor_prob

        stop_early = (
            class_result.predicted_index == self.no_tumor_index
            and class_result.confidence >= self.no_tumor_stop_threshold
            and tumor_probability < self.segmentation_trigger_threshold
        )

        should_run_segmentation = (
            not stop_early and (
                (class_result.predicted_index != self.no_tumor_index and class_result.confidence >= self.tumor_class_threshold)
                or tumor_probability >= self.segmentation_trigger_threshold
            )
        )

        if stop_early:
            seg_result = SegmentationResult(ran_segmentation=False)
            reason = (
                "Classification predicted no_tumor with high confidence, "
                "so segmentation was skipped."
            )
        elif should_run_segmentation:
            seg_raw = self.segmenter.predict(image)
            seg_result = SegmentationResult(
                ran_segmentation=True,
                mask_found=seg_raw["mask_found"],
                tumor_area_pixels=seg_raw["tumor_area_pixels"],
                tumor_area_ratio=seg_raw["tumor_area_ratio"],
                bbox=seg_raw["bbox"],
            )
            reason = "Segmentation ran because tumor likelihood was high enough."
        else:
            seg_result = SegmentationResult(ran_segmentation=False)
            reason = "Segmentation was skipped because tumor likelihood was below the trigger threshold."

        findings = StructuredFindings(
            classification=class_result,
            segmentation=seg_result,
            decision_reason=reason,
        )
        return AnalysisResponse(findings=findings)
