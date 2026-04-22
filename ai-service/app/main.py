from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routes import chatbot
from app.services import rag_service

app = FastAPI(
    title="CuraVision AI Microservice",
    version="1.0.0",
    description="Brain MRI analysis — RAG chatbot, segmentation, and report generation.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],  # Node.js backend
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# Pre-warm ChromaDB on startup so the first request isn't slow
@app.on_event("startup")
async def _startup() -> None:
    rag_service._get_collection()


app.include_router(chatbot.router, prefix="/ai", tags=["Chatbot"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "CuraVision AI Microservice"}
