"""
Celery tasks implementing the full analysis chain defined in SDD §7.

    run_full_analysis = segmentation -> gradcam -> report
"""
from __future__ import annotations

from typing import Any

import httpx
import os

from app.services import analysis_service
from app.worker.celery_app import celery


BACKEND_CALLBACK_URL = os.getenv("BACKEND_CALLBACK_URL", "http://localhost:3001")


@celery.task(name="curavision.segmentation")
def segmentation_task(scan_id: str, dicom_path: str) -> dict[str, Any]:
    return analysis_service.run_segmentation(scan_id, dicom_path)


@celery.task(name="curavision.gradcam")
def gradcam_task(scan_id: str, dicom_path: str) -> dict[str, Any]:
    return analysis_service.run_gradcam(scan_id, dicom_path)


@celery.task(name="curavision.report")
def report_task(
    scan_id: str,
    tumor_volume_cc: float | None,
    tumor_location_description: str | None,
    dicom_path: str | None = None,
) -> dict[str, Any]:
    return analysis_service.run_report(
        scan_id,
        tumor_volume_cc=tumor_volume_cc,
        tumor_location_description=tumor_location_description,
        dicom_path=dicom_path,
    )


@celery.task(name="curavision.run_full_analysis", bind=True)
def run_full_analysis(
    self,
    scan_id: str,
    dicom_path: str,
    dicom_url: str | None = None,
    mask_put_url: str | None = None,
    gradcam_put_url: str | None = None,
) -> dict[str, Any]:
    """Full pipeline executed as a single Celery task."""
    from app.services.inference_strategy import get_inference_strategy
    strategy = get_inference_strategy()
    result = strategy.run_full_analysis(
        scan_id,
        dicom_path,
        dicom_url=dicom_url,
        mask_put_url=mask_put_url,
        gradcam_put_url=gradcam_put_url,
    )

    # Best-effort callback so the Node backend can persist the analysis.
    try:
        httpx.post(
            f"{BACKEND_CALLBACK_URL}/api/internal/scans/{scan_id}/analysis-complete",
            json=result,
            timeout=5,
        )
    except Exception:  # pragma: no cover — best-effort callback
        pass

    return result
