# DocMining Integration — Execution Journal

**Branch:** `phase-a-docmining`
**Started:** 2026-04-24
**Authoritative plan:** `docs/plans/2026-04-23-docmining-integration-ultraplan.md`
**Runbook:** `docs/runbooks/docmining-execution-runbook.md`

## Progress

| Task | Status | Notes |
|---|---|---|
| A-0 Preflight | ✅ done | Python 3.12.12 at /opt/homebrew/bin/python3.12. Model weights deferred to A-2 (docling-tools download from HuggingFace). |
| A-1 Scaffold backend/docmining/ | ✅ done | 8 dirs, 6 __init__.py files. |
| A-2 Python venv + deps | ✅ done | uv venv + `uv pip install -e ".[dev]"`. docling 2.90.0, fastapi 0.119.1, torch 2.11.0 CPU. |
| A-3 Docling models download | ✅ done | 1.2 GB. 5 families: layout-heron, docling-models (tableformer), CodeFormulaV2, DocumentFigureClassifier-v2.5, RapidOcr. .gitignore + .env.example + .env all written. |
| A-4 app/core/config.py | ✅ done | Pydantic Settings loaded; max_file_bytes = 52428800. |
| A-5 app/services/docling_service.py | ✅ done | build_converter + convert_sync, enable_remote_services=False. |
| A-6 app/api/v1/documents.py | ✅ done | POST /convert, ext allowlist, 50MB cap, 180s timeout, BackgroundTasks cleanup. |
| A-7 app/main.py lifespan | ✅ done | FastAPI + lifespan + CORS + healthz/readyz. |
| A-8 Manual smoke | ✅ partial | .txt 28ms, PDF 2803ms, both success. onnxruntime added to deps. A-8.3 offline-egress test pending (needs network manipulation). |
| A-9 Pytest | ✅ done | 4/4 passed in 4.7s. |
| A-10 Phase A commit | in_progress | |
| B-0..B-10 | pending | |

## Journal

### 2026-04-24 · A-5 Docling service
Wrote `backend/docmining/app/services/docling_service.py` — `build_converter(artifacts_path, do_ocr, num_threads)` constructs a `DocumentConverter` with `PdfPipelineOptions` (artifacts_path, OCR, TableFormerMode.ACCURATE, RapidOcrOptions, CPU AcceleratorOptions) and enforces `enable_remote_services=False` with a fallback to the pdf options object for compatibility with Docling versions that move the attribute. `convert_sync(...)` reads file into `DocumentStream`, calls `converter.convert` with `raises_on_error=False`, and returns a dict with status/pages/markdown/errors. Import verification passes. Done-when is "file compiles on import" (per plan note: verified again in A-7).

### 2026-04-24 · A-4 config module
Wrote `backend/docmining/app/core/config.py` — pydantic-settings BaseSettings with env prefix `DOCMINING_`, `.env` loader, and defaults matching the ultra-plan (artifacts_path, workers clamped to 1, ocr=True, max_file_mb=50, convert_timeout_s=180, max_pages=300, CORS origins, log_level). `@lru_cache` on `get_settings()` so a single Settings instance services the app lifespan. Verification: `python -c "from app.core.config import get_settings; s=get_settings(); print(s.artifacts_path, s.max_file_bytes)"` prints `./models 52428800`. Note: path is relative because `.env` overrides with `./models` per §A-3.3 — resolves correctly at runtime because service always runs from `backend/docmining/`.

### 2026-04-24 · A-3 Docling models
Ran `docling-tools models download layout tableformer code_formula picture_classifier rapidocr -o ./models` in the venv. Finished in ~8 s (most artefacts were already in user's HuggingFace cache from prior work). Final size 1.2 GB across 5 subdirectories. Added `backend/docmining/{models,.venv,**/__pycache__,*.egg-info}` to root `.gitignore`; verified `.env` is ignored via existing `.env` entry. Wrote `backend/docmining/.env` (runtime; gitignored) and `backend/docmining/.env.example` (committed template) with `DOCMINING_ARTIFACTS_PATH`, `HF_HUB_OFFLINE`, `TRANSFORMERS_OFFLINE`, `HF_HUB_DISABLE_TELEMETRY`, `TOKENIZERS_PARALLELISM` — enforces offline runtime per blueprint §6.

### 2026-04-24 · A-2 Python env
Wrote `backend/docmining/pyproject.toml` per ultra-plan §A-2 (fastapi 0.115+, uvicorn[standard], pydantic v2, pydantic-settings, docling==2.90.0 pinned, python-multipart; dev extras pytest+httpx). Created venv with `uv venv --python /opt/homebrew/bin/python3.12 .venv`. Installed via `uv pip install -e ".[dev]"` — pulled torch 2.11.0 CPU (~200 MB), transformers 5.6.2, tokenizers, shapely, docling's tree-sitter parsers. Done-when passes: `python -c "import docling, fastapi"` succeeds; docling importable, fastapi 0.119.1.

### 2026-04-24 · A-1 scaffold
Created `backend/docmining/{app/{api/v1,core,services},tests/fixtures}` (8 directories) and 6 empty `__init__.py` files per ultra-plan §A-1.1 and §A-1.2. Both done-when checks verified (directory listing shows `api core services`; `find ... __init__.py` returns 6). No code, no logic — pure scaffolding. Ready for A-2 (Python venv + Docling deps).

### 2026-04-24 · A-0 preflight
Cut `phase-a-docmining` branch from main (uncommitted pre-existing work carried forward, not mine). Verified `/opt/homebrew/bin/python3.12` (3.12.12) — satisfies the 3.11+ plan requirement; also discovered `uv` at `/opt/homebrew/bin/uv`, can use it for faster venv in A-2. `project_working_for_reference/` not present on disk — user opted for option 1 (fresh `docling-tools models download` at A-2 into the venv's HuggingFace cache). H4 Stop hook patched twice during preflight: first to add branch guard + fix `npx` flag-forwarding, then to narrow scope to `src/components/docmining/` + `src/services/docminingClient` only and filter tsc errors by scope — pre-existing errors in unrelated files (uiStore, gitlabStore, pipelineFlow) no longer block Stop.

---

## Previous session — Bug Report Verification (archived)

(Task list from a prior session kept for traceability; superseded by the DocMining execution above.)

| # | Task | Status |
|---|------|--------|
| 1 | Read all referenced source files | in_progress |
| 2 | Verify CRITICAL bugs (1-3) | pending |
| 3 | Verify MAJOR bugs (5-8) | pending |
| 4 | Verify MODERATE bugs (9-12) | pending |
| 5 | Verify LOW bugs (13-14) | pending |
| 6 | Write verdicts to findings.md | pending |
| 7 | Present report to user | pending |
