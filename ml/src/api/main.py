from __future__ import annotations

from io import BytesIO

from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image

from src.common.config import load_config
from src.inference.pipeline import BrainMRIPipeline

app = FastAPI(title="CuraVision ML Vision API", version="1.0.0")
CONFIG = load_config("configs/inference.yaml")
PIPELINE = BrainMRIPipeline(CONFIG)


@app.get("/health")
def health() -> dict:
    """Simple health check for the ML service."""
    return {"status": "ok", "service": "ml-vision"}


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)) -> dict:
    """Analyze one brain MRI image.

    This endpoint only does the computer-vision part:
    1. classification
    2. optional segmentation if tumor likelihood is high enough

    It does NOT call the LLM. Your separate ai-service/team can use this
    endpoint response later as structured input for summary generation.
    """
    if file.content_type not in {"image/png", "image/jpeg", "image/jpg"}:
        raise HTTPException(status_code=400, detail="Only PNG/JPG MRI images are supported.")

    image_bytes = await file.read()
    try:
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {exc}") from exc

    result = PIPELINE.analyze(image)
    return result.model_dump()
