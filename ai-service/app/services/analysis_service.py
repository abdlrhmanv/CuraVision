"""MRI analysis service.

Loads DICOM scans, runs ONNX classification/segmentation, persists derived
artifacts, computes image-derived metrics, and formats the LLM report draft.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

from app.services import llm_service


_REPO_ROOT = Path(__file__).resolve().parents[3]
_AI_ROOT = Path(__file__).resolve().parents[2]

HUMAN_REVIEW_CONFIDENCE = "Not available — human review required"
UNCLASSIFIED_TUMOR_TYPE = "Unclassified — requires radiologist review"


def _safe_scan_id(scan_id: str) -> str:
    return "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in scan_id)


def _format_tumor_type(volume: float | None, predicted_class: str | None) -> str | None:
    if volume is None or volume == 0.0:
        return "None"
    if not predicted_class or predicted_class.lower().replace(" ", "_") in ("no_tumor", "none"):
        return UNCLASSIFIED_TUMOR_TYPE
    label = predicted_class.replace("_", " ").strip().title()
    return f"{label} (Model Prediction)"


def _indicates_no_tumor(volume: float | None, location: str | None) -> bool:
    if volume is not None and volume == 0.0:
        return True
    loc = (location or "").lower()
    return any(
        phrase in loc
        for phrase in ("no tumor", "no anomaly", "no focal", "not detected")
    )


def _storage_root() -> Path:
    configured = os.getenv("STORAGE_PATH", "").strip()
    if configured:
        return Path(configured).resolve()

    # Docker compose mounts the shared backend storage at /app/storage.
    if Path("/app").exists():
        return Path("/app/storage")

    return _REPO_ROOT / "backend" / "storage"


def _is_http_url(value: str) -> bool:
    return value.startswith(("http://", "https://"))


def _resolve_scan_path(logical_path: str) -> Path:
    if _is_http_url(logical_path):
        raise ValueError(f"Refusing to resolve HTTP URL as a local path: {logical_path}")

    path = Path(logical_path)
    if path.is_absolute() and path.exists():
        return path

    candidates = []
    if path.parts and path.parts[0] == "storage":
        candidates.append(_storage_root() / Path(*path.parts[1:]))
    candidates.extend([
        Path.cwd() / path,
        _AI_ROOT / path,
        _REPO_ROOT / path,
        _REPO_ROOT / "backend" / path,
    ])

    for candidate in candidates:
        if candidate.exists():
            return candidate

    return candidates[0] if candidates else path


def _resolve_path(logical_path: str) -> Path:
    return _resolve_scan_path(logical_path)


def _artifact_path(kind: str, scan_id: str, suffix: str) -> tuple[Path, str]:
    safe_id = _safe_scan_id(scan_id)
    abs_path = _storage_root() / kind / f"{safe_id}{suffix}"
    abs_path.parent.mkdir(parents=True, exist_ok=True)
    return abs_path, f"storage/{kind}/{safe_id}{suffix}"


def load_dicom_as_image(dicom_path: str) -> Image.Image:
    """Load a DICOM or generic image pixel array as an RGB PIL image."""
    import pydicom

    actual_path = _resolve_scan_path(dicom_path)
    
    try:
        img = Image.open(actual_path)
        img.load()
        return img.convert("RGB")
    except Exception:
        pass
        
    ds = pydicom.dcmread(actual_path)
    arr = ds.pixel_array.astype(np.float32)
    arr = (arr - arr.min()) / (arr.max() - arr.min() + 1e-8) * 255
    return Image.fromarray(arr.astype(np.uint8)).convert("RGB")


def _dicom_metadata(dicom_path: str) -> dict[str, Any]:
    try:
        import pydicom

        actual_path = _resolve_scan_path(dicom_path)
        
        try:
            img = Image.open(actual_path)
            img.verify() # fast check
            return {
                "source_path": dicom_path,
                "modality": "Image",
                "rows": img.height,
                "columns": img.width,
                "body_part": "Unknown",
                "study_description": f"{img.format} Image",
                "series_description": f"{img.format} Image",
                "slice_thickness_mm": "0",
                "pixel_spacing_mm": "0",
            }
        except Exception:
            pass
            
        ds = pydicom.dcmread(actual_path, stop_before_pixels=True)
    except Exception as exc:
        return {
            "source_path": dicom_path,
            "load_warning": str(exc),
        }

    def read(name: str) -> Any:
        value = getattr(ds, name, None)
        if value is None:
            return None
        if isinstance(value, (str, int, float)):
            return value
        return str(value)

    return {
        "source_path": dicom_path,
        "modality": read("Modality"),
        "rows": read("Rows"),
        "columns": read("Columns"),
        "body_part": read("BodyPartExamined"),
        "study_description": read("StudyDescription"),
        "series_description": read("SeriesDescription"),
        "slice_thickness_mm": read("SliceThickness"),
        "pixel_spacing_mm": read("PixelSpacing"),
    }


def _download_scan_to_temp(scan_id: str, url: str) -> Path:
    import tempfile
    import httpx

    suffix = ".jpg" if ".jpg" in url.lower() or ".jpeg" in url.lower() else ".dcm"
    local_path = Path(tempfile.gettempdir()) / f"{_safe_scan_id(scan_id)}{suffix}"
    with httpx.Client(timeout=30.0, follow_redirects=True) as client:
        resp = client.get(url)
        resp.raise_for_status()
        local_path.write_bytes(resp.content)
    return local_path


def _read_scan_image(path_to_read: str) -> tuple[Image.Image, dict[str, Any]]:
    metadata = _dicom_metadata(path_to_read)
    return load_dicom_as_image(path_to_read), metadata


def _load_image(scan_id: str, dicom_path: str, dicom_url: str | None = None) -> tuple[Image.Image, dict[str, Any]]:
    errors: list[str] = []

    if dicom_path and not _is_http_url(dicom_path):
        try:
            return _read_scan_image(dicom_path)
        except Exception as exc:
            errors.append(f"local path {dicom_path}: {exc}")

    for url in (dicom_url, dicom_path if _is_http_url(dicom_path) else None):
        if not url:
            continue
        try:
            local_path = _download_scan_to_temp(scan_id, url)
            return _read_scan_image(str(local_path))
        except Exception as exc:
            errors.append(f"download {url.split('?', 1)[0]}: {exc}")

    detail = "; ".join(errors) if errors else "no readable source provided"
    raise ValueError(f"Failed to load scan image for {scan_id}: {detail}")


def _estimate_volume_cc(mask: np.ndarray, metadata: dict[str, Any], scan_id: str) -> float:
    area_pixels = int(mask.sum())
    if area_pixels < 50:
        return 0.0

    spacing = metadata.get("pixel_spacing_mm")
    row_spacing = col_spacing = 1.0
    if isinstance(spacing, str):
        cleaned = spacing.replace("[", "").replace("]", "").replace(",", " ")
        values = [part for part in cleaned.split() if part]
        if len(values) >= 2:
            try:
                row_spacing = float(values[0])
                col_spacing = float(values[1])
            except ValueError:
                pass

    try:
        slice_thickness = float(metadata.get("slice_thickness_mm") or 5.0)
    except (TypeError, ValueError):
        slice_thickness = 5.0

    volume_cc = area_pixels * row_spacing * col_spacing * slice_thickness / 1000
    return round(max(volume_cc, 0.1), 2)


def _describe_location(mask: np.ndarray, scan_id: str) -> str:
    ys, xs = np.where(mask)
    if xs.size < 50:
        return "No tumor detected"

    x_pct = float(xs.mean() / max(mask.shape[1] - 1, 1))
    y_pct = float(ys.mean() / max(mask.shape[0] - 1, 1))

    side = "left" if x_pct < 0.48 else "right" if x_pct > 0.52 else "midline"
    if y_pct < 0.38:
        region = "frontal lobe"
    elif y_pct < 0.68:
        region = "parietal-temporal region"
    else:
        region = "occipital lobe"
    return f"{side} {region}"


def _save_mask(mask: np.ndarray, scan_id: str, put_url: str | None = None) -> str:
    abs_path, logical_path = _artifact_path("masks", scan_id, ".png")
    Image.fromarray((mask.astype(np.uint8) * 255)).save(abs_path)
    
    if put_url:
        import httpx
        try:
            with open(abs_path, "rb") as f:
                data = f.read()
            with httpx.Client(timeout=30.0) as client:
                resp = client.put(put_url, content=data, headers={"Content-Type": "image/png"})
                resp.raise_for_status()
        except Exception as e:
            pass
            
    return logical_path


def _save_heatmap(image: Image.Image, mask: np.ndarray, scan_id: str, put_url: str | None = None) -> str:
    abs_path, logical_path = _artifact_path("heatmaps", scan_id, ".png")
    base = np.asarray(image.resize((512, 512)).convert("RGB"), dtype=np.float32) / 255
    resized_mask = Image.fromarray((mask.astype(np.uint8) * 255)).resize((512, 512))
    intensity = np.asarray(resized_mask, dtype=np.float32) / 255

    heat = np.zeros_like(base)
    heat[..., 0] = np.clip(intensity * 1.4, 0, 1)
    heat[..., 1] = np.clip((1 - np.abs(intensity - 0.5) * 2) * 0.9, 0, 1)
    heat[..., 2] = np.clip((1 - intensity) * 0.35, 0, 1)

    overlay = np.clip(base * 0.62 + heat * 0.38, 0, 1)
    Image.fromarray((overlay * 255).astype(np.uint8)).save(abs_path)
    
    if put_url:
        import httpx
        try:
            with open(abs_path, "rb") as f:
                data = f.read()
            with httpx.Client(timeout=30.0) as client:
                resp = client.put(put_url, content=data, headers={"Content-Type": "image/png"})
                resp.raise_for_status()
        except Exception as e:
            pass
            
    return logical_path


def compute_derived_metrics(
    volume: float | None,
    location: str | None,
    confidence: float | None = None,
    predicted_class: str | None = None,
    processing_time_sec: float | None = None,
) -> dict[str, Any]:
    import math

    if confidence is not None and confidence <= 1.0:
        confidence = round(confidence * 100, 1)

    if volume is None:
        return {
            "confidence": confidence,
            "tumor_type": _format_tumor_type(None, predicted_class),
            "risk_level": None,
            "estimated_diameter": None,
            "brain_hemisphere": None,
            "lobe": None,
            "segmentation_quality": None,
            "suggested_action": "Radiologist review recommended",
            "processing_time_sec": processing_time_sec,
        }

    diameter = round(2 * math.pow((3 * volume) / (4 * math.pi), 1 / 3), 1)

    loc_lower = (location or "").lower()
    hemisphere = (
        "Left" if "left" in loc_lower
        else "Right" if "right" in loc_lower
        else "Bilateral" if ("midline" in loc_lower or "stem" in loc_lower)
        else "Unspecified"
    )

    lobe = "Brain"
    if "frontal" in loc_lower:
        lobe = "Frontal"
    elif "temporal" in loc_lower:
        lobe = "Temporal"
    elif "parietal-temporal" in loc_lower:
        lobe = "Parietal-Temporal"
    elif "parietal" in loc_lower:
        lobe = "Parietal"
    elif "occipital" in loc_lower:
        lobe = "Occipital"
    elif "brainstem" in loc_lower:
        lobe = "Brainstem"

    tumor_type = _format_tumor_type(volume, predicted_class)

    if volume == 0.0:
        risk_level = "None"
        suggested_action = "No action required"
    else:
        risk_level = (
            "High" if volume > 8.0 or lobe == "Brainstem"
            else "Moderate" if volume > 3.0
            else "Low"
        )
        suggested_action = (
            "Urgent Radiologist Review" if risk_level == "High"
            else "Standard Radiologist Review"
        )

    seg_quality = None
    if confidence is not None:
        seg_quality = "Excellent" if confidence >= 97.0 else "Good"

    return {
        "confidence": confidence,
        "tumor_type": tumor_type,
        "risk_level": risk_level,
        "estimated_diameter": diameter if volume > 0 else None,
        "brain_hemisphere": hemisphere if volume > 0 else None,
        "lobe": lobe if volume > 0 else None,
        "segmentation_quality": seg_quality,
        "suggested_action": suggested_action,
        "processing_time_sec": processing_time_sec,
    }


def _interim_segmentation_mask(image: Image.Image) -> np.ndarray:
    """Coarse intensity-based mask for dev/CI when ONNX models are unavailable."""
    gray = np.asarray(image.convert("L"), dtype=np.float32)
    if gray.size == 0:
        return np.zeros((1, 1), dtype=bool)

    threshold = float(np.percentile(gray, 92))
    mask = gray >= threshold
    if int(mask.sum()) < 50:
        return np.zeros(gray.shape, dtype=bool)
    return mask


def run_segmentation(scan_id: str, dicom_path: str, dicom_url: str | None = None, put_url: str | None = None) -> dict[str, Any]:
    import time
    start_time = time.time()

    image, metadata = _load_image(scan_id, dicom_path, dicom_url)

    from app.services.inference_strategy import get_inference_strategy
    strategy = get_inference_strategy()

    if hasattr(strategy, "pipeline"):
        seg_raw = strategy.pipeline.segmenter.predict(image)
        mask = seg_raw["mask"]
        if mask.sum() < 50:
            mask = np.zeros_like(mask)
            seg_raw["mask_found"] = False
        inference_log = f"onnx-segmenter-analysis mask_found={seg_raw['mask_found']}"
    else:
        mask = _interim_segmentation_mask(image)
        mask_found = int(mask.sum()) >= 50
        inference_log = f"interim-heuristic mask_found={mask_found}"

    volume = _estimate_volume_cc(mask, metadata, scan_id)
    location = _describe_location(mask, scan_id)
    mask_path = _save_mask(mask, scan_id, put_url)

    elapsed = round(time.time() - start_time, 2)
    metrics = compute_derived_metrics(
        volume,
        location,
        processing_time_sec=elapsed,
    )

    res = {
        "scan_id": scan_id,
        "mask_path": mask_path,
        "tumor_volume_cc": volume,
        "tumor_location_description": location,
        "inference_log": inference_log,
    }
    res.update(metrics)
    return res


def run_gradcam(scan_id: str, dicom_path: str, dicom_url: str | None = None, put_url: str | None = None) -> dict[str, Any]:
    image, _metadata = _load_image(scan_id, dicom_path, dicom_url)

    from app.services.inference_strategy import get_inference_strategy
    strategy = get_inference_strategy()

    if hasattr(strategy, "pipeline"):
        seg_raw = strategy.pipeline.segmenter.predict(image)
        mask = seg_raw["mask"]
    else:
        mask = _interim_segmentation_mask(image)
        
    location = _describe_location(mask, scan_id)
    return {
        "scan_id": scan_id,
        "gradcam_path": _save_heatmap(image, mask, scan_id, put_url),
        "activation_peak_region": location,
    }


def format_draft_report_template(
    volume: float | None,
    location: str | None,
    confidence: float | None = None,
    processing_time_sec: float | None = None,
) -> str:
    vol_val = f"{volume:.1f} cc" if volume is not None else "— cc"
    loc_val = location or "unspecified region"

    if confidence is not None and confidence <= 1.0:
        confidence = confidence * 100

    conf_val = (
        f"{confidence:.1f}%"
        if confidence is not None
        else HUMAN_REVIEW_CONFIDENCE
    )
    time_val = (
        f"{processing_time_sec:.1f} seconds"
        if processing_time_sec is not None
        else "—"
    )

    if _indicates_no_tumor(volume, location):
        findings = (
            "No focal abnormality was segmented in the analyzed dataset.\n\n"
            f"Estimated lesion volume: {vol_val}."
        )
        impression = (
            "1. No segmented intracranial lesion identified on AI-assisted review.\n"
            "2. Correlation with the complete MRI examination, clinical history, and "
            "radiologist interpretation is recommended before establishing a final diagnosis."
        )
    else:
        findings = (
            f"An abnormal region of interest is identified within the {loc_val}.\n\n"
            f"Estimated lesion volume: {vol_val}.\n\n"
            "The AI segmentation highlights a focal area corresponding to the suspected "
            "lesion. No additional image-derived abnormalities were identified within the "
            "limits of the analyzed dataset."
        )
        impression = (
            f"1. Focal intracranial lesion involving the {loc_val}.\n"
            f"2. Estimated lesion volume of approximately {vol_val}.\n"
            "3. Correlation with the complete MRI examination, clinical history, and "
            "radiologist interpretation is recommended before establishing a final diagnosis."
        )

    return (
        "MRI BRAIN REPORT (DRAFT)\n\n"
        "Clinical Information\n"
        "Evaluation of an intracranial lesion.\n\n"
        "Technique\n"
        "Brain MRI reviewed using AI-assisted image analysis. This draft is generated "
        "from the available uploaded study and is intended to support radiologist review.\n\n"
        "Comparison\n"
        "No prior imaging available for comparison.\n\n"
        "Findings\n"
        f"{findings}\n\n"
        "Impression\n"
        f"{impression}\n\n"
        "AI Analysis Summary\n"
        f"AI Confidence: {conf_val}\n"
        f"Processing Time: {time_val}\n\n"
        "This report is an AI-generated draft intended for radiologist review only and "
        "must not be considered a final medical interpretation."
    )


def run_report(
    scan_id: str,
    tumor_volume_cc: float | None,
    tumor_location_description: str | None,
    dicom_path: str | None = None,
    confidence: float | None = None,
    processing_time_sec: float | None = None,
) -> dict[str, Any]:
    draft = format_draft_report_template(
        volume=tumor_volume_cc,
        location=tumor_location_description,
        confidence=confidence,
        processing_time_sec=processing_time_sec,
    )

    return {"scan_id": scan_id, "ai_draft": draft}


def run_full_analysis(
    scan_id: str,
    dicom_path: str,
    dicom_url: str | None = None,
    mask_put_url: str | None = None,
    gradcam_put_url: str | None = None,
) -> dict[str, Any]:
    from app.services.inference_strategy import get_inference_strategy
    strategy = get_inference_strategy()
    return strategy.run_full_analysis(
        scan_id,
        dicom_path,
        dicom_url=dicom_url,
        mask_put_url=mask_put_url,
        gradcam_put_url=gradcam_put_url,
    )
