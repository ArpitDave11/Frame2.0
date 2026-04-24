import io
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app


FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_healthz(client):
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_rejects_disallowed_extension(client):
    r = client.post(
        "/api/v1/documents/convert",
        files={"file": ("evil.exe", b"MZ\x90\x00", "application/octet-stream")},
    )
    assert r.status_code == 415


def test_rejects_oversized(client, tmp_path):
    big = tmp_path / "huge.pdf"
    big.write_bytes(b"%PDF-1.4\n" + b"0" * (51 * 1024 * 1024))
    with big.open("rb") as fh:
        r = client.post(
            "/api/v1/documents/convert",
            files={"file": ("huge.pdf", fh, "application/pdf")},
        )
    assert r.status_code == 413


@pytest.mark.skipif(not (FIXTURES / "sample.pdf").exists(), reason="fixture missing")
def test_converts_pdf(client):
    with (FIXTURES / "sample.pdf").open("rb") as fh:
        r = client.post(
            "/api/v1/documents/convert",
            files={"file": ("sample.pdf", fh, "application/pdf")},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "success"
    assert body["markdown"]
    assert body["pages"] >= 1
