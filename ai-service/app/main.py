from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import chatbot, analysis
from app.services import rag_service


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Pre-warm ChromaDB on startup so the first request isn't slow.
    rag_service._get_collection()
    yield


app = FastAPI(
    title="CuraVision AI Microservice",
    version="1.0.0",
    description="Brain MRI analysis — RAG chatbot, segmentation, and report generation.",
    lifespan=lifespan,
)

from app.core.config import settings

# Parse comma-separated origins from settings
allowed_origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


app.include_router(chatbot.router, prefix="/ai", tags=["Chatbot"])
app.include_router(analysis.router, prefix="/ai", tags=["Analysis"])


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "CuraVision AI Microservice",
        "model_versions": {
            "classification": "1.0",
            "segmentation": "1.0"
        }
    }
