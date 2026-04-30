"""
Placeholder analysis pipeline.

The functions below return deterministic, plausible-looking results so the
rest of the stack (Celery worker, Node backend, frontend) can be integrated
end-to-end before the real U-Net / Grad-CAM / report-generation models are
wired in.

Swap each implementation for a real model call when those weights land.
"""
from __future__ import annotations

import hashlib
from typing import Any


_TUMOR_LOCATIONS = [
    "Left frontal lobe, parasagittal region",
    "Right temporal lobe, mesial aspect",
    "Left parietal lobe, posterior convexity",
    "Right occipital lobe, periventricular white matter",
    "Brainstem, pontine region",
]


def _seed_index(scan_id: str, bucket: int) -> int:
    """Deterministic index derived from the scan_id for reproducible stubs."""
    digest = hashlib.sha1(scan_id.encode("utf-8")).hexdigest()
    return int(digest, 16) % bucket


def _seed_float(scan_id: str, lo: float, hi: float) -> float:
    digest = hashlib.sha1(scan_id.encode("utf-8")).hexdigest()
    pct = (int(digest[:8], 16) % 10_000) / 10_000
    return round(lo + (hi - lo) * pct, 2)


def run_segmentation(scan_id: str, dicom_path: str) -> dict[str, Any]:
    volume = _seed_float(scan_id, 4.0, 18.0)
    location = _TUMOR_LOCATIONS[_seed_index(scan_id, len(_TUMOR_LOCATIONS))]
    return {
        "scan_id": scan_id,
        "mask_path": f"storage/masks/{scan_id}.nii.gz",
        "tumor_volume_cc": volume,
        "tumor_location_description": location,
        "inference_log": f"stub-segmentation v0.1 input={dicom_path}",
    }


def run_gradcam(scan_id: str, dicom_path: str) -> dict[str, Any]:
    location = _TUMOR_LOCATIONS[_seed_index(scan_id, len(_TUMOR_LOCATIONS))]
    return {
        "scan_id": scan_id,
        "gradcam_path": f"storage/heatmaps/{scan_id}.png",
        "activation_peak_region": location,
    }


def run_report(
    scan_id: str,
    tumor_volume_cc: float | None,
    tumor_location_description: str | None,
) -> dict[str, Any]:
    volume = tumor_volume_cc if tumor_volume_cc is not None else _seed_float(scan_id, 4.0, 18.0)
    location = tumor_location_description or _TUMOR_LOCATIONS[_seed_index(scan_id, len(_TUMOR_LOCATIONS))]

    draft = (
        "FINDINGS:\n"
        f"A {volume} cc enhancing mass is identified in the {location}. The\n"
        "lesion demonstrates heterogeneous signal on T2/FLAIR sequences with\n"
        "surrounding vasogenic edema. Peripheral contrast enhancement is noted\n"
        "on post-gadolinium T1-weighted images.\n\n"
        "IMPRESSION:\n"
        "Findings are concerning for an enhancing neoplastic process. Clinical\n"
        "correlation and multidisciplinary review are recommended.\n\n"
        "(Draft generated automatically by CuraVision AI — requires radiologist review.)"
    )
    return {"scan_id": scan_id, "ai_draft": draft}


def run_full_analysis(scan_id: str, dicom_path: str) -> dict[str, Any]:
    seg = run_segmentation(scan_id, dicom_path)
    cam = run_gradcam(scan_id, dicom_path)
    rep = run_report(
        scan_id,
        tumor_volume_cc=seg["tumor_volume_cc"],
        tumor_location_description=seg["tumor_location_description"],
    )
    return {"scan_id": scan_id, "segmentation": seg, "gradcam": cam, "report": rep}
