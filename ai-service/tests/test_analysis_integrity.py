"""Unit tests for medical-integrity rules in analysis metrics and reports."""

from __future__ import annotations

from app.services.analysis_service import (
    HUMAN_REVIEW_CONFIDENCE,
    UNCLASSIFIED_TUMOR_TYPE,
    compute_derived_metrics,
    format_draft_report_template,
)


def test_compute_derived_metrics_never_fabricates_confidence():
    metrics = compute_derived_metrics(
        volume=5.2,
        location="left frontal lobe",
        confidence=None,
        predicted_class=None,
    )
    assert metrics["confidence"] is None
    assert metrics["tumor_type"] == UNCLASSIFIED_TUMOR_TYPE
    assert metrics["segmentation_quality"] is None


def test_compute_derived_metrics_uses_real_classifier_output():
    metrics = compute_derived_metrics(
        volume=4.1,
        location="right temporal lobe",
        confidence=0.91,
        predicted_class="glioma",
    )
    assert metrics["confidence"] == 91.0
    assert metrics["tumor_type"] == "Glioma (Model Prediction)"


def test_compute_derived_metrics_shows_classifier_label_without_segmentation():
    metrics = compute_derived_metrics(
        volume=0.0,
        location="no anomaly segmented",
        confidence=0.929,
        predicted_class="glioma",
        processing_time_sec=4.6,
    )
    assert metrics["confidence"] == 92.9
    assert metrics["tumor_type"] == "Glioma (Model Prediction)"
    assert metrics["risk_level"] == "Low"
    assert "Radiologist review recommended" in metrics["suggested_action"]


def test_report_template_states_human_review_when_confidence_missing():
    draft = format_draft_report_template(
        volume=0.0,
        location="no anomaly detected",
        confidence=None,
        processing_time_sec=1.2,
    )
    assert HUMAN_REVIEW_CONFIDENCE in draft
    assert "No focal abnormality was segmented" in draft
    assert "97.8" not in draft
    assert "Glioma (Predicted)" not in draft
