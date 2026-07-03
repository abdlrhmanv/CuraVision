from fastapi import APIRouter, HTTPException

from app.models.analysis import (
    FullAnalysisResponse,
    GradCamRequest,
    GradCamResponse,
    ReportRequest,
    ReportResponse,
    SegmentationRequest,
    SegmentationResponse,
    AsyncAnalysisResponse,
)
from app.services import analysis_service

router = APIRouter()


@router.post("/segmentation", response_model=SegmentationResponse)
async def segmentation(request: SegmentationRequest) -> SegmentationResponse:
    """Run ONNX tumor segmentation on a DICOM scan."""
    try:
        return analysis_service.run_segmentation(request.scan_id, request.dicom_path)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/gradcam", response_model=GradCamResponse)
async def gradcam(request: GradCamRequest) -> GradCamResponse:
    """Generate an ONNX saliency heatmap for a DICOM scan."""
    try:
        return analysis_service.run_gradcam(request.scan_id, request.dicom_path)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/report", response_model=ReportResponse)
async def report(request: ReportRequest) -> ReportResponse:
    """Generate an AI draft radiology report from analysis features."""
    try:
        return analysis_service.run_report(
            request.scan_id,
            tumor_volume_cc=request.tumor_volume_cc,
            tumor_location_description=request.tumor_location_description,
            confidence=request.confidence,
            processing_time_sec=request.processing_time_sec,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/analyze", response_model=AsyncAnalysisResponse)
async def analyze(request: SegmentationRequest) -> AsyncAnalysisResponse:
    """Run the full segmentation → Grad-CAM → report chain asynchronously in the background."""
    try:
        from app.worker.tasks import run_full_analysis
        task = run_full_analysis.delay(
            request.scan_id,
            request.dicom_path,
            dicom_url=request.dicom_url,
            mask_put_url=request.mask_put_url,
            gradcam_put_url=request.gradcam_put_url,
        )
        return AsyncAnalysisResponse(
            scan_id=request.scan_id,
            task_id=task.id,
            status="QUEUED"
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
