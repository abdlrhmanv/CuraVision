"""
Celery tasks implementing the full analysis chain defined in SDD §7.

    run_full_analysis = segmentation -> gradcam -> report

The tasks currently delegate to the deterministic stubs in
`app.services.analysis_service`. Swap those stubs for real model calls
when the trained U-Net / classifier weights are ready.
"""
from __future__ import annotations

from typing import Any

import httpx

from app.services import analysis_service
from app.worker.celery_app import celery


import os

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
) -> dict[str, Any]:
    return analysis_service.run_report(
        scan_id,
        tumor_volume_cc=tumor_volume_cc,
        tumor_location_description=tumor_location_description,
    )


@celery.task(name="curavision.run_full_analysis", bind=True)
def run_full_analysis(self, scan_id: str, dicom_path: str) -> dict[str, Any]:
    """Full pipeline executed as a single Celery task.

    Splitting this into a Celery `chain` is straightforward once the tasks
    stop needing to share state in-process; for now the compact form keeps
    the scheduling path simple.
    """
    seg = analysis_service.run_segmentation(scan_id, dicom_path)
    cam = analysis_service.run_gradcam(scan_id, dicom_path)
    rep = analysis_service.run_report(
        scan_id,
        tumor_volume_cc=seg["tumor_volume_cc"],
        tumor_location_description=seg["tumor_location_description"],
    )

    result = {"scan_id": scan_id, "segmentation": seg, "gradcam": cam, "report": rep}

    # Best-effort callback so the Node backend can persist the analysis.
    # The backend route is NOT implemented yet — leave as a TODO marker.
    try:
        httpx.post(
            f"{BACKEND_CALLBACK_URL}/api/internal/scans/{scan_id}/analysis-complete",
            json=result,
            timeout=5,
        )
    except Exception:  # pragma: no cover — best-effort callback
        pass

    return result
