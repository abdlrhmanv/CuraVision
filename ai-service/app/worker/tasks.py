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


@celery.task(
    name="curavision.send_callback",
    bind=True,
    autoretry_for=(httpx.HTTPError, Exception),
    retry_backoff=True,
    max_retries=3
)
def send_callback_task(self, scan_id: str, result: dict[str, Any]) -> None:
    """Send back results to Node.js backend. Retries on failure."""
    resp = httpx.post(
        f"{BACKEND_CALLBACK_URL}/api/internal/scans/{scan_id}/analysis-complete",
        json=result,
        timeout=10.0,
    )
    resp.raise_for_status()


@celery.task(
    name="curavision.send_failure_callback",
    bind=True,
    autoretry_for=(httpx.HTTPError, Exception),
    retry_backoff=True,
    max_retries=3
)
def send_failure_callback_task(self, scan_id: str, error_msg: str) -> None:
    """Send failure back to Node.js backend. Retries on failure."""
    resp = httpx.post(
        f"{BACKEND_CALLBACK_URL}/api/internal/scans/{scan_id}/analysis-failed",
        json={"error": error_msg},
        timeout=10.0,
    )
    resp.raise_for_status()


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
    try:
        strategy = get_inference_strategy()
        result = strategy.run_full_analysis(
            scan_id,
            dicom_path,
            dicom_url=dicom_url,
            mask_put_url=mask_put_url,
            gradcam_put_url=gradcam_put_url,
        )

        # Asynchronously trigger the callback task with retry configurations
        send_callback_task.delay(scan_id, result)

        return result
    except Exception as e:
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Analysis failed for scan {scan_id}: {str(e)}\n{traceback.format_exc()}")
        send_failure_callback_task.delay(scan_id, str(e))
        raise e
