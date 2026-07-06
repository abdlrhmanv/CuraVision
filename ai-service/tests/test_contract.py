"""Contract tests for the AI service.

These tests:
- Validate the public HTTP contract (status codes + response shape) for every
  route exposed at `app/routes/*.py`.
- Exercise the request validation layer (Pydantic models).
- Do NOT depend on Groq, Ollama, or a running Chroma server — the shared
  fixture in ``conftest.py`` patches those out.
"""
from __future__ import annotations


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["service"] == "CuraVision AI Microservice"


def test_ai_routes_reject_missing_service_token():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as unauthenticated:
        res = unauthenticated.post(
            "/ai/chatbot",
            json={
                "report_text": "x",
                "patient_question": "hi",
                "chat_history": [],
            },
        )
    assert res.status_code == 401


# ---------- /ai/chatbot ----------


def test_chatbot_happy_path(client):
    payload = {
        "report_text": "Small T2 hyperintensity in the left frontal lobe.",
        "patient_question": "What does this mean for me?",
        "chat_history": [],
    }
    res = client.post("/ai/chatbot", json=payload)
    assert res.status_code == 200, res.text
    body = res.json()
    assert set(body.keys()) == {"answer", "sources"}
    assert body["answer"] == "stubbed LLM answer"
    assert isinstance(body["sources"], list)
    assert len(body["sources"]) == 1
    assert body["sources"][0].startswith("Medical Glossary:")


def test_chatbot_rejects_empty_question(client):
    res = client.post(
        "/ai/chatbot",
        json={"report_text": "x", "patient_question": "", "chat_history": []},
    )
    assert res.status_code == 422


def test_chatbot_rejects_unknown_role_in_history(client):
    res = client.post(
        "/ai/chatbot",
        json={
            "report_text": "x",
            "patient_question": "hi",
            "chat_history": [{"role": "system", "content": "ignored"}],
        },
    )
    assert res.status_code == 422


# ---------- /ai/segmentation ----------


def test_segmentation_contract(client):
    res = client.post(
        "/ai/segmentation",
        json={"scan_id": "scan-123", "dicom_path": "storage/x.dcm"},
    )
    assert res.status_code == 200
    body = res.json()
    expected = {
        "scan_id",
        "mask_path",
        "tumor_volume_cc",
        "tumor_location_description",
        "inference_log",
    }
    assert expected.issubset(body.keys())
    assert body["scan_id"] == "scan-123"
    assert isinstance(body["tumor_volume_cc"], (int, float))
    assert body["tumor_volume_cc"] >= 0


def test_segmentation_validates_missing_fields(client):
    res = client.post("/ai/segmentation", json={"scan_id": "scan-123"})
    assert res.status_code == 422


# ---------- /ai/gradcam ----------


def test_gradcam_contract(client):
    res = client.post(
        "/ai/gradcam",
        json={"scan_id": "scan-123", "dicom_path": "storage/x.dcm"},
    )
    assert res.status_code == 200
    body = res.json()
    assert set(body.keys()) >= {"scan_id", "gradcam_path", "activation_peak_region"}
    assert body["scan_id"] == "scan-123"


# ---------- /ai/report ----------


def test_report_contract(client):
    res = client.post(
        "/ai/report",
        json={
            "scan_id": "scan-123",
            "tumor_volume_cc": 12.3,
            "tumor_location_description": "Left frontal lobe",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["scan_id"] == "scan-123"
    assert isinstance(body["ai_draft"], str)
    assert body["ai_draft"]  # non-empty draft


def test_report_allows_nullable_metrics(client):
    """The PRD allows a report request without analysis metrics; ai-service
    should still respond with a usable draft."""
    res = client.post("/ai/report", json={"scan_id": "scan-123"})
    assert res.status_code == 200


# ---------- /ai/analyze (full chain) ----------


def test_analyze_full_chain(client):
    res = client.post(
        "/ai/analyze",
        json={"scan_id": "scan-123", "dicom_path": "storage/x.dcm"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["scan_id"] == "scan-123"
    assert "task_id" in body
    assert body["status"] == "QUEUED"


# ---------- 404 ----------


def test_unknown_route_returns_404(client):
    res = client.get("/ai/does-not-exist")
    assert res.status_code == 404
