from pydantic import BaseModel, Field


class SegmentationRequest(BaseModel):
    scan_id: str = Field(..., description="Scan identifier supplied by the backend.")
    dicom_path: str = Field(..., description="Logical storage path to the DICOM file.")
    dicom_url: str | None = Field(None, description="Presigned GET URL for input DICOM file.")
    mask_put_url: str | None = Field(None, description="Presigned PUT URL for output mask file.")
    gradcam_put_url: str | None = Field(None, description="Presigned PUT URL for output gradcam overlay.")


class SegmentationResponse(BaseModel):
    scan_id: str
    mask_path: str
    tumor_volume_cc: float
    tumor_location_description: str
    inference_log: str


class GradCamRequest(BaseModel):
    scan_id: str
    dicom_path: str


class GradCamResponse(BaseModel):
    scan_id: str
    gradcam_path: str
    activation_peak_region: str


class ReportRequest(BaseModel):
    scan_id: str
    tumor_volume_cc: float | None = None
    tumor_location_description: str | None = None


class ReportResponse(BaseModel):
    scan_id: str
    ai_draft: str


class FullAnalysisResponse(BaseModel):
    scan_id: str
    segmentation: SegmentationResponse
    gradcam: GradCamResponse
    report: ReportResponse


class AsyncAnalysisResponse(BaseModel):
    scan_id: str
    task_id: str
    status: str
