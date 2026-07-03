"""Shared pytest fixtures for ai-service contract tests.

The tests use FastAPI's TestClient which drives ASGI in-process — no network,
no uvicorn, and no real external services needed. LLM and Chroma are patched
so the suite runs deterministically in CI without API keys or a running
Chroma container.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Iterator

import numpy as np
import pytest
from PIL import Image

# Make `import app.*` resolve when pytest is invoked from any directory.
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Contract tests must never reach out to Groq / Ollama / a remote Chroma.
os.environ.setdefault("GROQ_API_KEY", "test-key")
os.environ.setdefault("LLM_PROVIDER", "groq")
os.environ.setdefault("CHROMA_HOST", "")  # force embedded ephemeral client


@pytest.fixture(autouse=True)
def _patch_external_services(request, monkeypatch) -> Iterator[None]:
    """Stub out LLM + RAG so contract tests don't depend on network or
    on the heavyweight embedding model download."""
    from app.services import analysis_service, llm_service, rag_service

    def fake_generate_response(**_kwargs) -> str:
        return "stubbed LLM answer"

    def fake_retrieve(query: str, n_results: int = 3):
        return [
            {"term": "Stub Term", "text": f"Stub Term: match for '{query}'"}
        ][:n_results]

    if "real_llm" not in request.keywords:
        monkeypatch.setattr(llm_service, "generate_response", fake_generate_response)
    monkeypatch.setattr(rag_service, "retrieve", fake_retrieve)
    # The startup pre-warm hits rag_service._get_collection() — short-circuit it.
    monkeypatch.setattr(rag_service, "_get_collection", lambda: None)

    if "real_onnx" not in request.keywords:
        def fake_load_image(scan_id: str, dicom_path: str, dicom_url: str | None = None):
            img = Image.fromarray(np.zeros((224, 224, 3), dtype=np.uint8))
            return img, {"source_path": dicom_path}

        class _FakeSegmenter:
            def predict(self, image):
                mask = np.zeros(image.size[::-1], dtype=bool)
                return {"mask": mask, "mask_found": False}

        class _FakeOnnxStrategy:
            def __init__(self):
                self.pipeline = type("Pipeline", (), {"segmenter": _FakeSegmenter()})()

        monkeypatch.setattr(analysis_service, "_load_image", fake_load_image)
        monkeypatch.setattr(
            "app.services.inference_strategy.get_inference_strategy",
            lambda: _FakeOnnxStrategy(),
        )

    # Patch Celery run_full_analysis.delay to prevent Redis connections
    from app.worker.tasks import run_full_analysis
    class FakeTask:
        id = "mock-task-123"
    monkeypatch.setattr(run_full_analysis, "delay", lambda *args, **kwargs: FakeTask())

    yield


@pytest.fixture
def client():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        yield c
