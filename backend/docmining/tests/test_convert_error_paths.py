"""Regression tests for A-10 review findings C2 and C3.

- C2: Conversion failure must return a well-formed {"detail": "..."} body,
      not a nested dict inside detail.
- C3: Route must branch on the `ok` boolean from convert_sync, not on a
      string comparison against "failure".
"""
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.api.v1 import documents as documents_module


FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def _fake_convert_failure(*_args, **_kwargs):
    return {
        "ok": False,
        "status": "failure",
        "pages": 0,
        "markdown": None,
        "errors": ["boom: synthetic failure"],
    }


def _fake_convert_partial(*_args, **_kwargs):
    return {
        "ok": True,
        "status": "partial_success",
        "pages": 1,
        "markdown": "# partial",
        "errors": ["partial: some pages failed"],
    }


def test_failure_returns_well_formed_detail(client, monkeypatch, tmp_path):
    """C2 regression: detail must be a string, not a dict."""
    monkeypatch.setattr(documents_module, "convert_sync", _fake_convert_failure)
    r = client.post(
        "/api/v1/documents/convert",
        files={"file": ("x.txt", b"hello", "text/plain")},
    )
    assert r.status_code == 422
    body = r.json()
    # FastAPI contract: detail is top-level and a string for our shape.
    assert "detail" in body
    assert isinstance(body["detail"], str)
    assert "boom" in body["detail"]


def test_partial_success_treated_as_success(client, monkeypatch):
    """C3 regression: route branches on `ok`, not string == "failure".

    partial_success has ok=True and must return 200 with markdown populated —
    previously the raw status string bypass could have let new status values
    silently pass or fail.
    """
    monkeypatch.setattr(documents_module, "convert_sync", _fake_convert_partial)
    r = client.post(
        "/api/v1/documents/convert",
        files={"file": ("x.txt", b"hello", "text/plain")},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "partial_success"
    assert body["markdown"] == "# partial"
    assert body["pages"] == 1
    assert "partial: some pages failed" in body["errors"]
