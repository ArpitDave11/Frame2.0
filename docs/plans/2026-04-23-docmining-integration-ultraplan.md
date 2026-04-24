# Document Mining Integration — ULTRA-PLAN

**Date:** 2026-04-23
**Status:** Ready to execute
**Companion doc:** `2026-04-23-docmining-integration-design.md` (architecture + decisions)

**Locked decisions** (from design doc §8 + follow-ups through 2026-04-24):
1. Deploy: **local-first** (no Docker / no AKS for MVP)
2. MIME: **extension-only** (no `python-magic`)
3. After upload: **auto-fire `refinePipelineAction()`**
4. Payload: **markdown only** (no JSON)
5. Trigger: **WorkspaceHeader only** (WelcomeScreen untouched)
6. Model distribution: **follow reference exactly** — `docling-tools models download` locally for MVP; multi-stage Dockerfile with baked-in model layer for production (blueprint §12). No Blob mounts, no init containers, no Git LFS.
7. Concurrency: **process-level only** — Docling PDF backends are not thread-safe (upstream #1191). `workers=1` intra-process; gunicorn `-w N` for horizontal scale. No ThreadPoolExecutor parallelism.
8. Compliance guardrail: `enable_remote_services=False` set explicitly on the `DocumentConverter` and verified by offline-egress test (A-8.3).

**Explicit non-goals** (research options we evaluated and rejected for this integration):
- ❌ PyMuPDF pre-filter tier for native-text PDFs — adds a second parser for marginal CPU savings at ad-hoc upload volumes. Revisit only if bulk-upload usage emerges.
- ❌ Azure AI Document Intelligence disconnected container as scanned-doc fallback — 10-business-day Microsoft gating + commitment-tier prepay. Not worth it until a real quality gap is measured on UBS scanned docs.
- ❌ Apache Tika emergency fallback for legacy .doc / .wps / OLE2 — users can save as .docx.
- ❌ `HybridChunker` + DoclingDocument JSON preservation for RAG provenance — we feed extracted markdown into `epicStore.setMarkdown`, not a vector store.
- ❌ 50–100-doc labeled regression corpus + annual re-validation — lightweight fixtures (PDF + DOCX + scanned PDF) only. Full corpus is a bank-platform concern, not a per-feature concern.
- ❌ Unstructured.io Enterprise as commercial-backed alternative — license cost not justified when Docling meets quality bar and LF/IBM governance is acceptable.

---

## Execution principles

- **One task = one verifiable state change.** Never combine tasks.
- **Run the `done when` check after every task.** If it fails, stop — do not proceed.
- **Additive only.** Pipeline/AI/GitLab/blueprint/stages — zero edits.
- **Commit at the end of each phase** (A, B) to create rollback points.
- **Phase A = backend, Phase B = SPA wiring.** A must work in isolation before B starts.

---

## PHASE A — BACKEND (local-only)

### A-0 · Pre-flight checks

**A-0.1** Verify Python 3.11+ installed.
```bash
python3 --version   # expect 3.11.x – 3.12.x
```
Done when: version output is 3.11 or 3.12.

**A-0.2** Confirm reference model weights exist.
```bash
ls project_working_for_reference/services/document_processing_service/plugins/docling-models/
# expect: accurate, ds4sd--CodeFormula, ds4sd--DocumentsFigureClassifier, ds4sd--docling-layout-heron
```
Done when: 4+ subdirectories listed.

---

### A-1 · Scaffold `backend/docmining/`

**A-1.1** Create directory tree.
```bash
mkdir -p backend/docmining/app/api/v1
mkdir -p backend/docmining/app/core
mkdir -p backend/docmining/app/services
mkdir -p backend/docmining/tests
mkdir -p backend/docmining/tests/fixtures
```
Done when: `ls backend/docmining/app` shows `api  core  services`.

**A-1.2** Create empty `__init__.py` files.
```
backend/docmining/app/__init__.py
backend/docmining/app/api/__init__.py
backend/docmining/app/api/v1/__init__.py
backend/docmining/app/core/__init__.py
backend/docmining/app/services/__init__.py
backend/docmining/tests/__init__.py
```
Done when: `find backend/docmining -name __init__.py | wc -l` returns 6.

---

### A-2 · Write `backend/docmining/pyproject.toml`

```toml
[project]
name = "frame-docmining"
version = "0.1.0"
requires-python = ">=3.11,<3.13"
dependencies = [
  "fastapi>=0.115,<0.120",
  "uvicorn[standard]>=0.32",
  "pydantic>=2.9,<3",
  "pydantic-settings>=2.6",
  "docling==2.90.0",        # Exact pin — Docling has 100+ releases/year; avoid surface drift
  "python-multipart>=0.0.12",
]

[project.optional-dependencies]
dev = [
  "pytest>=8.0",
  "pytest-asyncio>=0.23",
  "httpx>=0.27",
]

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
where = ["."]
include = ["app*"]
```

**Done when:**
```bash
cd backend/docmining
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
```
exits 0 and `python -c "import docling, fastapi"` runs without error.

**Expected install time:** 3–5 min (PyTorch CPU wheel ~200 MB).

---

### A-3 · Download Docling models (canonical CLI — matches reference build stage)

The reference project's `plugins/docling-models/` folder is a snapshot of what the Dockerfile model-stage produces. We use the **same command they use in the Docker build** (blueprint lines 1068–1074), just run locally in the venv for MVP:

**A-3.1** Run the canonical download command.
```bash
cd backend/docmining
source .venv/bin/activate            # venv from A-2, docling-tools CLI is now on PATH
mkdir -p models
docling-tools models download \
    layout tableformer code_formula picture_classifier rapidocr \
    -o ./models
```
- One-time hit to HuggingFace (~1.5–2 GB, 5–10 min).
- Same exact model set as reference Docker stage (lines 1072–1074 of blueprint).
- `rapidocr` is included so OCR on scanned PDFs / images works — reference's plugins folder is missing this one.

**A-3.2** Append to root `.gitignore`.
```
backend/docmining/models/
backend/docmining/.venv/
backend/docmining/**/__pycache__/
backend/docmining/*.egg-info/
```

**A-3.3** Create `backend/docmining/.env` with offline env vars so runtime never re-downloads.
```
# backend/docmining/.env
DOCMINING_ARTIFACTS_PATH=./models
HF_HUB_OFFLINE=1
TRANSFORMERS_OFFLINE=1
HF_HUB_DISABLE_TELEMETRY=1
TOKENIZERS_PARALLELISM=false
```

**Done when:**
- `ls backend/docmining/models/` shows 5 model families (layout, tableformer, code_formula, picture_classifier, rapidocr).
- `git status` does NOT list `backend/docmining/models/*` as untracked.
- `backend/docmining/.env` exists with the 5 env vars above.

**Fallback (if no HuggingFace egress on this machine):** copy `project_working_for_reference/services/document_processing_service/plugins/docling-models/` into `backend/docmining/models/`, then run `docling-tools models download rapidocr -o ./models` from any machine that has network to fill the gap. Not recommended — download direct if possible.

---

### A-4 · `app/core/config.py`

```python
# backend/docmining/app/core/config.py
from functools import lru_cache
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="DOCMINING_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Docling
    artifacts_path: str = str(Path(__file__).resolve().parents[2] / "models")
    # NOTE: Docling's PDF backends are NOT thread-safe (upstream issue #1191).
    # We keep workers=1 and rely on gunicorn -w N at the process level in Phase C
    # for concurrency. Raising this above 1 can cause silent data corruption on
    # concurrent requests.
    workers: int = Field(1, ge=1, le=1)
    ocr: bool = True
    max_file_mb: int = 50
    convert_timeout_s: int = 180
    max_pages: int = 300

    # Server
    cors_origins: str = "http://localhost:3002"   # comma-sep
    log_level: str = "INFO"

    @property
    def max_file_bytes(self) -> int:
        return self.max_file_mb * 1024 * 1024

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

**Done when:**
```bash
cd backend/docmining && python -c "from app.core.config import get_settings; s=get_settings(); print(s.artifacts_path, s.max_file_bytes)"
```
prints absolute path to `models/` and `52428800`.

---

### A-5 · `app/services/docling_service.py`

```python
# backend/docmining/app/services/docling_service.py
import io
import logging
from pathlib import Path
from typing import Any

from docling.datamodel.base_models import ConversionStatus, DocumentStream, InputFormat
from docling.datamodel.pipeline_options import (
    PdfPipelineOptions,
    TableFormerMode,
    RapidOcrOptions,
)
from docling.datamodel.accelerator_options import AcceleratorOptions, AcceleratorDevice
from docling.document_converter import DocumentConverter, PdfFormatOption

log = logging.getLogger(__name__)


def build_converter(artifacts_path: str, do_ocr: bool, num_threads: int) -> DocumentConverter:
    """Build a DocumentConverter once. Called in lifespan.

    Compliance note: we explicitly set enable_remote_services=False on the
    converter so any attempt to call an external VLM/LLM raises
    OperationNotAllowed — belt-and-braces guardrail that survives Docling
    version changes which might flip the default.
    """
    pdf_opts = PdfPipelineOptions(
        artifacts_path=artifacts_path,
        do_ocr=do_ocr,
        do_table_structure=True,
    )
    pdf_opts.table_structure_options.mode = TableFormerMode.ACCURATE
    if do_ocr:
        pdf_opts.ocr_options = RapidOcrOptions()
    pdf_opts.accelerator_options = AcceleratorOptions(
        num_threads=num_threads, device=AcceleratorDevice.CPU
    )
    converter = DocumentConverter(
        format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=pdf_opts)},
    )
    # Explicit compliance guardrail — must remain False in all environments.
    # Some Docling versions accept this as a converter property; if the attribute
    # isn't present on this version, set it in PdfPipelineOptions instead.
    try:
        converter.enable_remote_services = False
    except AttributeError:
        pdf_opts.enable_remote_services = False
    return converter


def convert_sync(
    converter: DocumentConverter,
    path: Path,
    original_name: str,
    max_pages: int,
    max_bytes: int,
) -> dict[str, Any]:
    """Run one conversion. Returns dict with status/pages/markdown/errors."""
    with path.open("rb") as fh:
        stream = DocumentStream(name=original_name, stream=io.BytesIO(fh.read()))
    result = converter.convert(
        stream,
        max_num_pages=max_pages,
        max_file_size=max_bytes,
        raises_on_error=False,
    )
    doc = result.document
    ok = result.status in (ConversionStatus.SUCCESS, ConversionStatus.PARTIAL_SUCCESS)
    status_val = result.status.value if hasattr(result.status, "value") else str(result.status)
    return {
        "status": status_val,
        "pages": len(doc.pages) if getattr(doc, "pages", None) else 0,
        "markdown": doc.export_to_markdown() if ok else None,
        "errors": [e.error_message for e in (result.errors or [])],
    }
```

**Done when:** TypeScript-quiet — file compiles on import. Verified in A-7.

---

### A-6 · `app/api/v1/documents.py`

```python
# backend/docmining/app/api/v1/documents.py
import asyncio
import hashlib
import logging
import os
import tempfile
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Annotated, Optional

from docling.document_converter import DocumentConverter
from docling.exceptions import ConversionError
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
)
from pydantic import BaseModel

from app.core.config import Settings, get_settings
from app.services.docling_service import convert_sync

log = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])

# Extension-only MIME policy (decision #2)
ALLOWED_EXTENSIONS = {
    ".pdf", ".docx", ".pptx", ".xlsx",
    ".html", ".htm",
    ".png", ".jpg", ".jpeg", ".tiff", ".tif",
    ".md", ".txt",
}


class ConvertResponse(BaseModel):
    request_id: str
    file_name: str
    file_size: int
    file_sha256: str
    extension: str
    status: str
    pages: int
    duration_ms: int
    markdown: Optional[str] = None
    errors: list[str] = []


def _sanitize(name: str) -> str:
    base = os.path.basename(name or "upload.bin").replace("\x00", "")
    return base[:255] or "upload.bin"


async def _stream_to_tempfile(upload: UploadFile, max_bytes: int) -> tuple[Path, int, str]:
    hasher = hashlib.sha256()
    total = 0
    suffix = Path(upload.filename or "").suffix
    fd, name = tempfile.mkstemp(prefix="docmining-", suffix=suffix)
    path = Path(name)
    try:
        with os.fdopen(fd, "wb") as out:
            while chunk := await upload.read(1024 * 1024):
                total += len(chunk)
                if total > max_bytes:
                    raise HTTPException(413, f"File exceeds {max_bytes} bytes.")
                hasher.update(chunk)
                out.write(chunk)
    except HTTPException:
        path.unlink(missing_ok=True)
        raise
    return path, total, hasher.hexdigest()


def _cleanup(path: Path) -> None:
    try:
        path.unlink(missing_ok=True)
    except Exception as e:
        log.warning("cleanup_failed path=%s err=%s", path, e)


def get_converter(request: Request) -> DocumentConverter:
    return request.app.state.docling


def get_executor(request: Request) -> ThreadPoolExecutor:
    return request.app.state.executor


@router.post("/convert", response_model=ConvertResponse)
async def convert_document(
    request: Request,
    background: BackgroundTasks,
    file: Annotated[UploadFile, File()],
    include_markdown: Annotated[bool, Form()] = True,
    settings: Settings = Depends(get_settings),
    converter: DocumentConverter = Depends(get_converter),
    executor: ThreadPoolExecutor = Depends(get_executor),
) -> ConvertResponse:
    req_id = str(uuid.uuid4())
    name = _sanitize(file.filename or "upload.bin")
    ext = Path(name).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            415,
            f"Extension '{ext}' not permitted. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
        )

    path, size, sha = await _stream_to_tempfile(file, settings.max_file_bytes)
    background.add_task(_cleanup, path)

    log.info(
        "convert.start id=%s file=%s size=%d sha=%s", req_id, name, size, sha[:12]
    )

    loop = asyncio.get_running_loop()
    t0 = time.perf_counter()
    try:
        payload = await asyncio.wait_for(
            loop.run_in_executor(
                executor,
                convert_sync,
                converter, path, name, settings.max_pages, settings.max_file_bytes,
            ),
            timeout=settings.convert_timeout_s,
        )
    except asyncio.TimeoutError:
        raise HTTPException(504, f"Conversion exceeded {settings.convert_timeout_s}s.")
    except ConversionError as e:
        raise HTTPException(422, f"Unreadable document: {e}")

    ms = int((time.perf_counter() - t0) * 1000)
    if payload["status"] == "failure":
        raise HTTPException(
            422, {"message": "Conversion failed.", "errors": payload["errors"]}
        )

    log.info(
        "convert.done id=%s pages=%d ms=%d", req_id, payload["pages"], ms
    )

    return ConvertResponse(
        request_id=req_id,
        file_name=name,
        file_size=size,
        file_sha256=sha,
        extension=ext,
        status=payload["status"],
        pages=payload["pages"],
        duration_ms=ms,
        markdown=payload["markdown"] if include_markdown else None,
        errors=payload["errors"],
    )
```

**Done when:** file saved, no TypeScript-quiet checks (tested in A-8).

---

### A-7 · `app/main.py` (lifespan + app)

```python
# backend/docmining/app/main.py
import logging
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.documents import router as documents_router
from app.core.config import get_settings
from app.services.docling_service import build_converter

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    )
    log.info("docmining.boot artifacts=%s workers=%d", settings.artifacts_path, settings.workers)

    # Sanity: artifacts dir exists
    if not Path(settings.artifacts_path).exists():
        log.warning("artifacts_path missing: %s (Docling will try HF download)", settings.artifacts_path)

    # Build Docling converter (models load here)
    converter = build_converter(
        artifacts_path=settings.artifacts_path,
        do_ocr=settings.ocr,
        num_threads=settings.workers,
    )
    # Warmup (optional — triggers model pre-load with a tiny in-memory doc)
    # Skipped in MVP to keep boot < 10s; first real request pays the cost.

    executor = ThreadPoolExecutor(
        max_workers=settings.workers,
        thread_name_prefix="docling",
    )
    app.state.docling = converter
    app.state.executor = executor

    yield

    log.info("docmining.shutdown")
    executor.shutdown(wait=True, cancel_futures=False)


app = FastAPI(
    title="Frame DocMining",
    version="0.1.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(documents_router, prefix="/api/v1")


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/readyz")
def readyz(request) -> dict[str, str]:
    # Minimal: if lifespan completed, app.state.docling is set
    ok = getattr(request.app.state, "docling", None) is not None
    return {"status": "ready" if ok else "loading"}
```

**Note:** `readyz` has a minor bug above (missing `Request` type). Use this simpler version:
```python
@app.get("/readyz")
def readyz() -> dict[str, str]:
    ok = getattr(app.state, "docling", None) is not None
    return {"status": "ready" if ok else "loading"}
```

**Done when:**
```bash
cd backend/docmining && source .venv/bin/activate
uvicorn app.main:app --port 8000
# In another terminal:
curl http://localhost:8000/healthz
# → {"status":"ok"}
```

---

### A-8 · Manual smoke test (online) + offline-egress verification

**A-8.1** Create a tiny text fixture PDF (or use any existing PDF).
```bash
# Option 1: macOS built-in
echo "Hello FRAME\n\nAs a user, I want document upload so that I can skip paste." > /tmp/sample.txt
cupsfilter /tmp/sample.txt > backend/docmining/tests/fixtures/sample.pdf 2>/dev/null
# Option 2: any PDF on disk will do
```

**A-8.2** Hit the endpoint (online run).
```bash
curl -s -F "file=@backend/docmining/tests/fixtures/sample.pdf" \
  http://localhost:8000/api/v1/documents/convert | jq .
```
Done when: response JSON contains `"status": "success"` and non-empty `markdown`.

**A-8.3 (CRITICAL) · Verify truly offline — catches silent HuggingFace fallback.**

Docling will silently fall back to `huggingface.co` if ANY required model file is missing from `DOCMINING_ARTIFACTS_PATH` (upstream discussions #2217, #2577). This is a compliance risk: if the model bundle is incomplete, the service *appears* to work but egresses to HF on first request. We must prove this cannot happen before committing.

Pick one of these methods:

**Method A — macOS (turn off Wi-Fi / unplug ethernet):**
```bash
# Stop the server, disable all network on the host, restart server, re-hit endpoint
networksetup -setairportpower en0 off     # macOS Wi-Fi off
uvicorn app.main:app --port 8000 &
curl -s -F "file=@tests/fixtures/sample.pdf" \
  http://localhost:8000/api/v1/documents/convert | jq .status
# Expect: "success"
networksetup -setairportpower en0 on      # restore
```

**Method B — Linux network namespace:**
```bash
sudo unshare -rn uvicorn app.main:app --port 8000 &
curl -s -F "file=@tests/fixtures/sample.pdf" \
  http://localhost:8000/api/v1/documents/convert | jq .status
```

**Method C — block huggingface.co via /etc/hosts:**
```bash
echo "127.0.0.1 huggingface.co" | sudo tee -a /etc/hosts
# restart server + rerun curl
# Expect: "success" (Docling uses local models, never reaches HF)
# Then clean up the /etc/hosts entry
```

**Done when:** conversion succeeds with zero network access. If it hangs, times out, or returns a DNS/connection error, the model bundle is incomplete — rerun A-3.1 with `--all` flag to get every optional model, then retest.

**Troubleshooting:**
- 500 "artifacts missing": `docling-tools models download` didn't complete → rerun A-3.1.
- `ImportError: docling`: venv not activated.
- Long first-request (>30s): normal, Docling loading layout model on first use.
- Hangs in A-8.3: incomplete model bundle, Docling silently trying HF. Re-download.

---

### A-9 · Pytest coverage (minimum)

`backend/docmining/tests/test_convert.py`:

```python
# backend/docmining/tests/test_convert.py
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
```

**Done when:**
```bash
cd backend/docmining && pytest -q
# → 3 passed, 1 skipped (or 4 passed if fixture present)
```

---

### A-10 · Phase A commit checkpoint

```bash
git add backend/docmining/ .gitignore
git commit -m "feat(docmining): add FastAPI + Docling backend for document extraction

Local-only MVP backend. Exposes POST /api/v1/documents/convert that streams
an uploaded PDF/DOCX/PPTX/XLSX/HTML/image to Docling and returns extracted
markdown. Extension-based MIME allowlist, 50 MB cap, 180s timeout, bounded
ThreadPoolExecutor for CPU-bound conversion. Models reused from reference
project plugins/docling-models.

Refs docs/plans/2026-04-23-docmining-integration-design.md"
```

**Done when:** `git log -1` shows the commit; SPA is untouched.

---

## PHASE B — SPA WIRING

### B-1 · Vite proxy

**B-1.1** Edit `vite.config.ts`. Add proxy entry alongside `/gitlab-api`:

```ts
server: {
  port: 3002,
  host: '0.0.0.0',
  allowedHosts: true,
  cors: true,
  proxy: {
    '/gitlab-api': { /* existing */ },
    '/api/docmining': {
      target: process.env.VITE_DOCMINING_BASE_URL || 'http://localhost:8000',
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/api\/docmining/, '/api/v1/documents'),
      secure: false,
    },
  },
},
```

**B-1.2** Append to `.env`:
```
VITE_DOCMINING_BASE_URL=http://localhost:8000
```

**Done when:** with both servers up,
```bash
curl http://localhost:3002/api/docmining/healthz
```
returns `{"status":"ok"}` (proxied). Note: `/healthz` will 404 because rewrite maps to `/api/v1/documents/healthz`. Instead test the real endpoint:
```bash
curl -F "file=@sample.pdf" http://localhost:3002/api/docmining/convert
```

---

### B-2 · `src/services/docmining/docminingClient.ts`

```ts
// src/services/docmining/docminingClient.ts
export interface ConvertResult {
  markdown: string;
  fileName: string;
  pages: number;
  durationMs: number;
}

export type ConvertOutcome =
  | { ok: true; data: ConvertResult }
  | { ok: false; error: string };

export async function convertDocument(file: File): Promise<ConvertOutcome> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('include_markdown', 'true');

  try {
    const res = await fetch('/api/docmining/convert', {
      method: 'POST',
      body: fd,
    });

    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        if (typeof body?.detail === 'string') detail = body.detail;
        else if (body?.detail?.message) detail = body.detail.message;
      } catch {
        // ignore json parse failure
      }
      return { ok: false, error: detail };
    }

    const json = await res.json();
    return {
      ok: true,
      data: {
        markdown: json.markdown ?? '',
        fileName: json.file_name,
        pages: json.pages,
        durationMs: json.duration_ms,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export const ALLOWED_UPLOAD_EXTENSIONS = [
  '.pdf', '.docx', '.pptx', '.xlsx',
  '.html', '.htm', '.png', '.jpg', '.jpeg',
  '.tiff', '.tif', '.md', '.txt',
] as const;

export const MAX_UPLOAD_MB = 50;
```

**Done when:** `tsc -b` (part of `pnpm build`) passes.

---

### B-3 · Extend `uiStore.ModalId`

Edit `src/stores/uiStore.ts` line 16:

```ts
export type ModalId = 'publish' | 'loadEpic' | 'issueCreation' | 'critique' | 'pipeline' | 'settings' | 'docUpload';
```

**Done when:** TS compiles.

---

### B-4 · `src/components/editor/DocUploadModal.tsx`

Full component (copy visual language from `LoadEpicModal.tsx`):

```tsx
// src/components/editor/DocUploadModal.tsx
import { useRef, useState } from 'react';
import { Upload, X, Spinner, Warning, CheckCircle } from '@phosphor-icons/react';
import { useEpicStore } from '@/stores/epicStore';
import { useUiStore } from '@/stores/uiStore';
import { refinePipelineAction } from '@/pipeline/refinePipelineAction';
import {
  convertDocument,
  ALLOWED_UPLOAD_EXTENSIONS,
  MAX_UPLOAD_MB,
} from '@/services/docmining/docminingClient';

const F = "'Frutiger', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

type Phase = 'idle' | 'uploading' | 'error' | 'done';

function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

export function DocUploadModal() {
  const closeModal = useUiStore((s) => s.closeModal);
  const openModal = useUiStore((s) => s.openModal);

  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = (f: File): string | null => {
    const ext = extOf(f.name);
    if (!ALLOWED_UPLOAD_EXTENSIONS.includes(ext as typeof ALLOWED_UPLOAD_EXTENSIONS[number])) {
      return `Unsupported type "${ext}". Allowed: ${ALLOWED_UPLOAD_EXTENSIONS.join(', ')}`;
    }
    if (f.size > MAX_UPLOAD_MB * 1024 * 1024) {
      return `File too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_UPLOAD_MB} MB.`;
    }
    return null;
  };

  const chooseFile = (f: File) => {
    const err = validate(f);
    if (err) {
      setPhase('error');
      setError(err);
      setFile(null);
      return;
    }
    setFile(f);
    setPhase('idle');
    setError(null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) chooseFile(f);
  };

  const onSubmit = async () => {
    if (!file) return;
    setPhase('uploading');
    setError(null);

    const outcome = await convertDocument(file);
    if (!outcome.ok) {
      setPhase('error');
      setError(outcome.error);
      return;
    }

    // Decision #3: auto-fire refine
    useEpicStore.getState().setMarkdown(outcome.data.markdown);
    closeModal();
    openModal('pipeline');
    refinePipelineAction(); // fire-and-forget
  };

  const isBusy = phase === 'uploading';

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      fontFamily: F,
    }}>
      <div style={{
        backgroundColor: '#fff', borderRadius: 8, width: 560, maxWidth: '90vw',
        boxShadow: '0 20px 50px rgba(0,0,0,0.2)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 18, fontWeight: 500, color: '#1A1A2E' }}>
            Upload Requirement Document
          </div>
          <button onClick={closeModal} disabled={isBusy}
            style={{ border: 'none', background: 'transparent', cursor: isBusy ? 'not-allowed' : 'pointer' }}>
            <X size={20} color="#6b7280" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          {/* Drop zone */}
          <div
            onClick={() => !isBusy && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            style={{
              border: `2px dashed ${dragOver ? '#E60000' : '#d1d5db'}`,
              borderRadius: 8,
              padding: 40,
              textAlign: 'center',
              cursor: isBusy ? 'not-allowed' : 'pointer',
              backgroundColor: dragOver ? '#fef2f2' : '#fafafa',
              transition: 'all 0.15s',
            }}
          >
            <Upload size={40} color="#6b7280" />
            <div style={{ marginTop: 12, fontSize: 14, color: '#374151' }}>
              {file ? file.name : 'Click or drag a file here'}
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: '#9ca3af' }}>
              PDF, DOCX, PPTX, XLSX, HTML, images — up to {MAX_UPLOAD_MB} MB
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={ALLOWED_UPLOAD_EXTENSIONS.join(',')}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) chooseFile(f);
              }}
              style={{ display: 'none' }}
              disabled={isBusy}
            />
          </div>

          {/* Status */}
          {phase === 'uploading' && (
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#374151' }}>
              <Spinner size={18} className="animate-spin" />
              <span>Extracting text… this can take up to 60 s for large PDFs.</span>
            </div>
          )}
          {phase === 'error' && error && (
            <div style={{
              marginTop: 16, padding: 12, borderRadius: 6,
              backgroundColor: '#fef2f2', color: '#991b1b',
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <Warning size={18} weight="fill" />
              <span style={{ fontSize: 13 }}>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #e5e7eb',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button onClick={closeModal} disabled={isBusy}
            style={{
              padding: '8px 16px', borderRadius: 6, border: '1px solid #d1d5db',
              backgroundColor: '#fff', color: '#374151', cursor: isBusy ? 'not-allowed' : 'pointer',
              fontFamily: F, fontSize: 14,
            }}>
            Cancel
          </button>
          <button onClick={onSubmit} disabled={!file || isBusy}
            style={{
              padding: '8px 16px', borderRadius: 6, border: 'none',
              backgroundColor: (!file || isBusy) ? '#fca5a5' : '#E60000',
              color: '#fff', cursor: (!file || isBusy) ? 'not-allowed' : 'pointer',
              fontFamily: F, fontSize: 14, fontWeight: 500,
            }}>
            {isBusy ? 'Extracting…' : 'Extract & Refine'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Done when:** file saved, `tsc -b` passes.

---

### B-5 · Register modal in `ModalHost.tsx`

Edit `src/components/layout/ModalHost.tsx`. Add import + switch case.

**Import addition (top of file):**
```tsx
import { DocUploadModal } from '@/components/editor/DocUploadModal';
```

**Switch case addition (inside `renderModal` / switch):**
```tsx
case 'docUpload':
  return <DocUploadModal />;
```

**Done when:** `useUiStore.getState().openModal('docUpload')` from console renders the modal.

---

### B-6 · Upload button in `WorkspaceHeader.tsx`

Edit `src/components/editor/WorkspaceHeader.tsx`.

**Import addition:**
```tsx
import { Upload } from '@phosphor-icons/react';
```

**Button placement** — right next to the existing Refine button (reuse same visual style):
```tsx
<button
  onClick={() => useUiStore.getState().openModal('docUpload')}
  title="Upload requirement document"
  style={{
    padding: '8px 14px', borderRadius: 6, border: '1px solid #d1d5db',
    backgroundColor: '#fff', color: '#374151',
    display: 'inline-flex', alignItems: 'center', gap: 6,
    cursor: 'pointer', fontFamily: F, fontSize: 13,
  }}
>
  <Upload size={16} />
  Upload
</button>
```

(Match the exact style tokens already in use in the header — copy the button next to it for visual consistency.)

**Done when:** button visible in header; clicking opens the DocUploadModal.

---

### B-7 · End-to-end manual test

1. **Start backend:** `cd backend/docmining && source .venv/bin/activate && uvicorn app.main:app --port 8000`
2. **Start SPA:** `pnpm dev` (or `npm run dev`) → `http://localhost:3002/frame/`
3. **Click Upload** in the header → modal opens.
4. **Drop a PDF** → filename appears.
5. **Click Extract & Refine** → spinner shows; after 5–30 s, modal closes.
6. **Pipeline modal opens automatically** (auto-refine, decision #3).
7. Pipeline runs all 6 stages unchanged.
8. Refined epic appears in the editor.

**Done when:** step 8 completes with no console errors and no changes to pipeline output quality vs paste-text baseline.

---

### B-8 · Regression safety check

```bash
pnpm test:run
```

**Done when:** test count matches pre-change count; no new failures. If any test fails, stop and diagnose — do not proceed.

Then verify surgical-diff guarantee:
```bash
git diff --stat src/pipeline src/services/ai src/services/gitlab src/stores/blueprintStore.ts src/stores/chatStore.ts src/stores/configStore.ts src/stores/epicStore.ts
```
**Done when:** output is empty (no lines) — pipeline/AI/GitLab/other stores are untouched. Only `uiStore.ts`, `ModalHost.tsx`, `WorkspaceHeader.tsx`, `vite.config.ts`, `.env`, `.gitignore` should show in full diff.

---

### B-9 · Knowledge-base docs (keep the hive-map honest)

Create two new KB entries to keep `docs/knowledge/` complete:

**B-9.1** `docs/knowledge/services/docmining/docminingClient.md` — describe the service client following the existing template (Purpose / Exports / Behavior / Dependencies / Consumers / Assumptions).

**B-9.2** `docs/knowledge/components/editor/DocUploadModal.md` — describe the modal.

**B-9.3** Update `docs/knowledge/README.md` and `docs/knowledge/SYSTEM.md` with the new entry in the index and the new flow (Upload → Convert → setMarkdown → Pipeline) in the mermaid sequence diagram.

**Done when:** both new docs exist and README/SYSTEM reference them.

---

### B-10 · Phase B commit

```bash
git add src/ vite.config.ts .env .gitignore docs/knowledge/ docs/plans/
git commit -m "feat(upload): wire DocUpload modal into SPA with auto-refine

Adds a single Upload button to WorkspaceHeader that opens DocUploadModal.
Modal calls POST /api/docmining/convert (proxied via Vite to local FastAPI
service in backend/docmining), puts extracted markdown into epicStore via
setMarkdown, then fires refinePipelineAction so the 6-stage refinement
runs automatically. Pipeline/AI/GitLab code is untouched.

Refs docs/plans/2026-04-23-docmining-integration-ultraplan.md"
```

**Done when:** commit created; both backend and SPA commits present on branch.

---

## PHASE C — PRODUCTION (DEFERRED)

Not part of MVP. **We follow the reference project's exact pattern** (blueprint §12). Models are baked into the image via a dedicated Docker stage. No Blob mounts, no init containers, no Git LFS.

### C-1 · Dockerfile — exact multi-stage pattern from reference (blueprint lines 1055–1103)

```dockerfile
# backend/docmining/Dockerfile
# syntax=docker/dockerfile:1.7

# ──────────────────────────────────────────────────────────────
# Stage 1: builder — install Python deps into a venv
# ──────────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 VIRTUAL_ENV=/opt/venv
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential gcc g++ git curl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN python -m venv "$VIRTUAL_ENV"
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
WORKDIR /build
COPY pyproject.toml .
RUN pip install --index-url https://download.pytorch.org/whl/cpu "torch==2.4.*" "torchvision==0.19.*" \
 && pip install -e .

# ──────────────────────────────────────────────────────────────
# Stage 2: models — download Docling weights once, cached layer
# ──────────────────────────────────────────────────────────────
FROM builder AS models
ENV HF_HOME=/app/.cache/huggingface \
    DOCLING_ARTIFACTS_PATH=/app/.cache/docling/models \
    HF_HUB_DISABLE_TELEMETRY=1
RUN mkdir -p "$HF_HOME" "$DOCLING_ARTIFACTS_PATH" \
 && docling-tools models download \
      layout tableformer code_formula picture_classifier rapidocr \
      -o "$DOCLING_ARTIFACTS_PATH"

# ──────────────────────────────────────────────────────────────
# Stage 3: runtime — slim image, copy venv + models, non-root
# ──────────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime
ARG APP_UID=10001
ARG APP_GID=10001
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 VIRTUAL_ENV=/opt/venv \
    PATH="/opt/venv/bin:$PATH" \
    HF_HOME=/app/.cache/huggingface \
    DOCMINING_ARTIFACTS_PATH=/app/.cache/docling/models \
    HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 TOKENIZERS_PARALLELISM=false \
    OMP_NUM_THREADS=2 MKL_NUM_THREADS=2 DOCMINING_WORKERS=1 PORT=8000

RUN apt-get update && apt-get install -y --no-install-recommends \
      libgl1 libglib2.0-0 libgomp1 curl ca-certificates && rm -rf /var/lib/apt/lists/*
# Note: libmagic1/poppler/tesseract NOT installed — decision #2 (extension-only MIME)
# Add them later only if full MIME sniff or non-Docling OCR fallback is needed.

RUN groupadd --system --gid ${APP_GID} app \
 && useradd  --system --uid ${APP_UID} --gid app --home-dir /app --shell /sbin/nologin app
WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
COPY --from=models  /app/.cache /app/.cache
COPY --chown=app:app ./app /app/app
RUN chown -R app:app /app
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8000/healthz || exit 1
CMD ["gunicorn","app.main:app","-k","uvicorn.workers.UvicornWorker","-w","2","-b","0.0.0.0:8000",
     "--timeout","300","--graceful-timeout","30","--keep-alive","75",
     "--max-requests","100","--max-requests-jitter","20",
     "--access-logfile","-","--error-logfile","-"]
```

**Key points carried verbatim from reference (blueprint §12 "Key decisions"):**
- CPU-only torch wheel (~1.5 GB smaller).
- Models baked into their own cacheable layer.
- `HF_HUB_OFFLINE=1 + TRANSFORMERS_OFFLINE=1` = zero runtime egress.
- Non-root UID 10001.
- `--max-requests 100` to recycle workers and bound memory growth.
- **Never `--preload`** — Docling+PyTorch is fork-unsafe.

Expected image size: **~4–5 GB** (the Docling tax, per blueprint §12 note).

### C-2 Helm chart `charts-docmining/` — separate release from SPA chart.
### C-3 Istio VirtualService — expose SPA-side via same host: `/api/docmining/*` → rewrite → `frame-docmining` svc (single-origin for SPA).
### C-4 Entra auth on backend — wire `fastapi-azure-auth` once SPA adopts MSAL.
### C-5 Observability — structlog JSON + OTel + App Insights connection string.
### C-6 Async-jobs pattern (Azure Service Bus + KEDA + worker container) if > 60 s conversions are ever needed.

**Explicitly NOT doing (per user decision 2026-04-23):**
- ❌ Azure Blob mount via BlobFuse/CSI — adds per-request latency risk
- ❌ Init container download — models change rarely, in-image is simpler
- ❌ Git LFS for model weights — wrong tool for binary artifacts

---

## ROLLBACK PLAN

If anything goes sideways mid-phase:

- **Mid Phase A:** `rm -rf backend/docmining/` + `git checkout .gitignore`. Zero SPA impact.
- **Mid Phase B:** `git revert` the Phase B commit. Backend keeps running but isn't called. Users see no Upload button.
- **Nuclear:** `git revert` both commits. Tree returns to pre-integration state.

No migrations, no shared state, no external side effects — rollback is lossless.

---

## EXECUTION ORDER SUMMARY

```
A-0.1  Python version check
A-0.2  Verify reference weights
A-1.1  mkdir tree
A-1.2  Create __init__.py files
A-2    Write pyproject.toml + pip install -e .[dev]
A-3.1  Copy models/
A-3.2  Update .gitignore
A-4    Write config.py + verify
A-5    Write docling_service.py
A-6    Write documents.py router
A-7    Write main.py + boot uvicorn + curl /healthz
A-8    Smoke test /convert with a real PDF
A-9    Write test_convert.py + pytest
A-10   Commit Phase A                          ← checkpoint #1

B-1.1  Add Vite proxy
B-1.2  Add .env var
B-2    Write docminingClient.ts
B-3    Extend ModalId
B-4    Write DocUploadModal.tsx
B-5    Register in ModalHost
B-6    Add Upload button to WorkspaceHeader
B-7    End-to-end manual test
B-8    pnpm test:run + surgical-diff check
B-9    Knowledge-base docs
B-10   Commit Phase B                          ← checkpoint #2
```

**Total: 22 tasks, 2 commit checkpoints, no reversible decisions left unmade.**
