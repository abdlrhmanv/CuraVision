from fastapi import APIRouter, HTTPException

from app.models.analysis import (
    FullAnalysisResponse,
    GradCamRequest,
    GradCamResponse,
    ReportRequest,
    ReportResponse,
    SegmentationRequest,
    SegmentationResponse,
)
from app.services import analysis_service

router = APIRouter()


@router.post("/segmentation", response_model=SegmentationResponse)
async def segmentation(request: SegmentationRequest) -> SegmentationResponse:
    """Run U-Net tumor segmentation on a DICOM scan (stubbed)."""
    try:
        return analysis_service.run_segmentation(request.scan_id, request.dicom_path)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/gradcam", response_model=GradCamResponse)
async def gradcam(request: GradCamRequest) -> GradCamResponse:
    """Run Grad-CAM saliency for the classifier on a DICOM scan (stubbed)."""
    try:
        return analysis_service.run_gradcam(request.scan_id, request.dicom_path)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/report", response_model=ReportResponse)
async def report(request: ReportRequest) -> ReportResponse:
    """Generate an AI draft radiology report from analysis features (stubbed)."""
    try:
        return analysis_service.run_report(
            request.scan_id,
            tumor_volume_cc=request.tumor_volume_cc,
            tumor_location_description=request.tumor_location_description,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/analyze", response_model=FullAnalysisResponse)
async def analyze(request: SegmentationRequest) -> FullAnalysisResponse:
    """Run the full segmentation → Grad-CAM → report chain in one call."""
    try:
        return analysis_service.run_full_analysis(request.scan_id, request.dicom_path)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
