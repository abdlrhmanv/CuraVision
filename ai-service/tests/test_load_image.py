from __future__ import annotations

from pathlib import Path

import pytest
from PIL import Image

from app.services import analysis_service


@pytest.mark.real_load_image
def test_load_image_prefers_local_storage_over_http_path(tmp_path, monkeypatch):
    scan_id = "scan-local-first"
    image_path = tmp_path / "scan.jpg"
    Image.new("RGB", (32, 32), color=(10, 20, 30)).save(image_path)

    monkeypatch.setattr(analysis_service, "_storage_root", lambda: tmp_path)
    logical_path = "storage/scans/scan.jpg"
    (tmp_path / "scans").mkdir(parents=True)
    image_path.rename(tmp_path / "scans" / "scan.jpg")

    image, metadata = analysis_service._load_image(
        scan_id,
        logical_path,
        dicom_url="http://minio:9000/curavision/scans/scan.jpg?sig=abc",
    )

    assert image.size == (32, 32)
    assert metadata["source_path"] == logical_path


@pytest.mark.real_load_image
def test_load_image_downloads_http_url_when_local_missing(monkeypatch):
    scan_id = "scan-url"
    payload = Path(__file__).resolve().parent / "fixtures" / "tiny.jpg"
    if not payload.exists():
        payload.parent.mkdir(parents=True, exist_ok=True)
        Image.new("RGB", (16, 16), color=(1, 2, 3)).save(payload)

    class FakeResponse:
        def __init__(self, data: bytes):
            self.content = data

        @staticmethod
        def raise_for_status():
            return None

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def get(self, _url: str):
            return FakeResponse(payload.read_bytes())

    monkeypatch.setattr("httpx.Client", FakeClient)

    image, metadata = analysis_service._load_image(
        scan_id,
        "http://minio:9000/curavision/scans/scan.jpg?sig=abc",
    )

    assert image.size == (16, 16)
    assert metadata["modality"] == "Image"


@pytest.mark.real_load_image
def test_load_image_rejects_unresolvable_sources():
    with pytest.raises(ValueError, match="Failed to load scan image"):
        analysis_service._load_image("scan-missing", "storage/scans/does-not-exist.dcm")
