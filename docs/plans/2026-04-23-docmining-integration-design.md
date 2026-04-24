# Document Mining Integration — Atomic Design & Implementation Plan

**Date:** 2026-04-23
**Status:** APPROVED 2026-04-23 — decisions locked (see §8)
**Objective:** Integrate document upload + text extraction (Docling) into Frame2.0 with **minimum viable changes**. User uploads a doc → backend extracts text → SPA auto-populates the editor → existing Refine pipeline runs unchanged.

---

## 1. Ground Truth (verified by code scan)

### 1.1 Frame2.0 (current main app)
| Concern | Current state | File |
|---|---|---|
| Architecture | Pure Vite SPA, no backend | `vite.config.ts` |
| AI calls | Browser-direct to OpenAI/Azure | `src/services/ai/aiClient.ts` |
| Vite proxies | Only `/gitlab-api` → UBS GitLab | `vite.config.ts:35-42` |
| Editor text state | `epicStore.markdown: string` | `src/stores/epicStore.ts:16` |
| Text setter | `setMarkdown(md: string)` parses + sets dirty | `src/stores/epicStore.ts:58` |
| Refine entry | `refinePipelineAction()` reads `epicStore.markdown` | `src/pipeline/refinePipelineAction.ts:17` |
| Modal system | `uiStore.openModal(id)` — ids: `publish \| loadEpic \| issueCreation \| critique \| pipeline \| settings` | `src/stores/uiStore.ts:16` |
| Modal host | Switch-case in `ModalHost.tsx` | `src/components/layout/ModalHost.tsx:24-64` |
| HTTP pattern | Native `fetch`, `{ ok, data?, error? }` return envelope | `src/services/gitlab/gitlabClient.ts:72-89` |
| File upload today | **None** — no `<input type="file">`, no drag-drop | — |
| Deployment | Helm chart → AKS (`frame-engg` ns) behind Istio | `charts/`, `infra/gateway-patch.yaml` |

### 1.2 Reference project (`project_working_for_reference/`)
| Asset | State | Reusable? |
|---|---|---|
| `services/document_processing_service/src/` | **Empty** | No code to copy — skeleton only |
| `services/document_processing_service/plugins/docling-models/` | **Pre-downloaded model weights** (5 subdirs: accurate, CodeFormula, DocumentsFigureClassifier, docling-layout-heron) | **YES — copy as-is** |
| `services/document_processing_service/plugins/rapidocr-models/` | Empty | N/A |
| `research/FRAME3 Backend Blueprint…md` (1,273 lines) | **Complete production-ready FastAPI+Docling code** with upload endpoint, MIME validation, streaming, ThreadPoolExecutor, timeouts, audit logging, Entra auth, OTel | **YES — copy/adapt** |
| `services/project_management_service/` | Python FastAPI service with upload-to-Blob pattern (Celery, Postgres) | Overkill for MVP; not reused |

**Critical finding:** the reference has NO runnable doc-mining service — just a blueprint document and pre-downloaded models. "Reuse, don't rebuild" means **copy the blueprint code + reuse the model weights**.

---

## 2. Architecture Decision

### Chosen shape (minimum viable)

```
┌──────────────────────────────────────────────────────────────┐
│  Frame2.0 SPA (unchanged deployment)                         │
│                                                              │
│  [DocUploadModal]  ──fetch POST /api/docmining/convert──┐    │
│      (new)              (multipart/form-data)            │   │
│         │                                                │   │
│         ▼                                                │   │
│  epicStore.setMarkdown(extractedText)                    │   │
│         │                                                │   │
│         ▼                                                │   │
│  [existing Refine flow — UNTOUCHED]                      │   │
└──────────────────────────────────────────────────────────┼───┘
                                                           │ Vite dev proxy
                                                           │ OR Istio VirtualService (prod)
                                                           ▼
                              ┌──────────────────────────────┐
                              │ frame-docmining (NEW)         │
                              │ FastAPI + Docling, CPU        │
                              │ POST /convert → {markdown}    │
                              └──────────────────────────────┘
```

**One new backend service. Zero changes to the pipeline, stores-except-opening-one-modal, AI clients, GitLab, or auth flow.**

### Rejected alternatives (with why)
- **Browser-only extraction (pdf.js / Mammoth in the browser).** Rejected: Docling quality (layout, tables, OCR) is the whole point; pdf.js loses structure and Docling ≠ browser-portable.
- **Sidecar container in existing Helm chart.** Rejected: couples frontend release cadence to backend release; harder to iterate on Docling independently. Keep it as a sibling Deployment.
- **Full blueprint (Entra auth, Blob staging, Celery workers, KEDA, Key Vault).** Rejected for MVP per "minimum viable changes". These slot in later without touching the SPA contract.

---

## 3. Contract — the one API the SPA calls

### Request
```
POST /api/docmining/convert
Content-Type: multipart/form-data

form fields:
  file:              <File>        (required, PDF/DOCX/PPTX/XLSX/HTML/image)
  include_markdown:  "true"        (default true)
  include_json:      "false"       (default false for MVP — smaller payload)
```

### Response — success (HTTP 200)
```json
{
  "request_id": "uuid",
  "file_name": "requirement.pdf",
  "file_size": 482193,
  "mime_type": "application/pdf",
  "status": "success",
  "pages": 12,
  "duration_ms": 4210,
  "markdown": "# Title\n\n…",
  "errors": []
}
```

### Response — errors
| Code | Meaning | UI handling |
|---|---|---|
| 413 | File > 50 MB | Inline error in modal |
| 415 | Unsupported MIME | Inline error with allowed list |
| 422 | Conversion failed (unreadable doc) | Inline error with details |
| 504 | Conversion exceeded 180s | Inline error with "try smaller doc" |
| 5xx | Backend down | Generic "service unavailable, paste text manually" |

**Never throw** — always `{ ok: false, error: string }` at the SPA service layer (matches `gitlabClient` pattern).

---

## 4. Atomic Implementation Plan

Ordered so each step is independently verifiable. Every step has an explicit "done when" assertion. **Sequence is mandatory** — earlier steps unblock later ones.

### Phase A — Backend scaffolding (net-new)

**A1. Create `backend/docmining/` directory at repo root.**
   - Done when: `backend/docmining/` exists with subdirs `app/`, `app/api/v1/`, `app/core/`, `tests/`.
   - Why this path: adjacent to `src/` at repo root so one clone covers both. Not under `src/` because that's SPA territory.

**A2. Write `backend/docmining/pyproject.toml`.**
   - Pin: `python>=3.11,<3.13`, `fastapi>=0.115`, `uvicorn[standard]>=0.32`, `docling==2.90.*`, `python-multipart>=0.0.12`, `pydantic>=2.9`.
   - **No `python-magic`** (decision #2 — extension-only MIME check).
   - Dev deps: `pytest`, `httpx` (for TestClient).
   - Done when: `pip install -e backend/docmining` succeeds in a fresh venv.

**A3. Copy Docling model weights.**
   - `cp -r project_working_for_reference/services/document_processing_service/plugins/docling-models  backend/docmining/models/`
   - Add `backend/docmining/models/` to `.gitignore` (weights are large) — optionally keep a README pointing to source.
   - Done when: `backend/docmining/models/ds4sd--docling-layout-heron/` exists.

**A4. Write `backend/docmining/app/core/config.py`.**
   - `pydantic-settings` with env vars: `DOCMINING_WORKERS` (default 2), `DOCMINING_MAX_FILE_MB` (50), `DOCMINING_ARTIFACTS_PATH` (`./models`), `DOCMINING_CONVERT_TIMEOUT_S` (180), `DOCMINING_CORS_ORIGINS` (comma-sep).
   - Done when: `from app.core.config import get_settings; get_settings()` works.

**A5. Write `backend/docmining/app/main.py` with lifespan.**
   - Adapt lines 176-246 of the blueprint (the lifespan fn). Strip: Key Vault, Azure OpenAI client, Entra auth, OTel. Keep: Docling converter build, warmup, ThreadPoolExecutor on `app.state`.
   - CORS middleware allowing `http://localhost:3002` (SPA dev) + prod hosts from env.
   - Mount `/api/v1/documents` router.
   - Done when: `uvicorn app.main:app --port 8000` starts and `GET /healthz` returns 200.

**A6. Write `backend/docmining/app/api/v1/documents.py` — the `/convert` endpoint.**
   - Adapt lines 662-800 of the blueprint. Strip: `AdvisorUser` Entra dep, AUDIT log (keep basic logging), async-job variant, **python-magic sniff**.
   - Keep: streaming `_stream_to_tempfile`, byte cap, SHA256, **extension-only** MIME validation (check file extension against `ALLOWED` set), `BackgroundTasks` cleanup, `loop.run_in_executor`, `asyncio.wait_for` outer timeout, `ConvertResponse` schema.
   - `_validate_mime` simplifies to: `if ext not in ALLOWED: raise HTTPException(415)`; no libmagic call.
   - Response omits `document` field (markdown-only per decision #4); Pydantic model drops it.
   - Change route from `/documents/convert` to `/convert` (mounted at `/api/v1/documents`).
   - Done when: `curl -F file=@sample.pdf http://localhost:8000/api/v1/documents/convert` returns 200 with `markdown` field populated.

**A7. Write `backend/docmining/tests/test_convert.py`.**
   - Fixtures: a 1-page text PDF, a 5-row DOCX, an oversized file (51 MB), a fake PDF (`.pdf` ext, `text/plain` bytes).
   - Assertions: 200 + non-empty markdown for happy path; 413 for oversized; 415 for MIME mismatch; 504 simulated via monkeypatching converter timeout.
   - Done when: `pytest backend/docmining/tests` passes.

**A8. (DEFERRED to Phase C)** Write `backend/docmining/Dockerfile`.
   - Not needed for local-first MVP (decision #1). Local `uvicorn app.main:app --port 8000` is the MVP runtime.
   - When added: base `python:3.11-slim`, no `libmagic1` needed (no python-magic), copy `models/` → `/opt/docling-models`, env `HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1`, gunicorn entrypoint with `--max-requests 100`.

---

### Phase B — SPA wiring (minimal diff)

**B1. Add Vite dev proxy — `vite.config.ts`.**
   ```ts
   proxy: {
     '/gitlab-api': { ...existing... },
     '/api/docmining': {
       target: process.env.VITE_DOCMINING_BASE_URL || 'http://localhost:8000',
       changeOrigin: true,
       rewrite: (p) => p.replace(/^\/api\/docmining/, '/api/v1/documents'),
       secure: false,
     },
   },
   ```
   - Add `VITE_DOCMINING_BASE_URL=http://localhost:8000` to `.env`.
   - Done when: `curl http://localhost:3002/api/docmining/healthz` reaches the backend through the proxy.

**B2. Create `src/services/docmining/docminingClient.ts`.**
   ```ts
   export interface ConvertResult {
     markdown: string;
     fileName: string;
     pages: number;
     durationMs: number;
   }
   export async function convertDocument(
     file: File
   ): Promise<{ ok: true; data: ConvertResult } | { ok: false; error: string }> {
     const fd = new FormData();
     fd.append('file', file);
     fd.append('include_markdown', 'true');
     fd.append('include_json', 'false');
     try {
       const res = await fetch('/api/docmining/convert', { method: 'POST', body: fd });
       if (!res.ok) {
         const body = await res.json().catch(() => ({}));
         return { ok: false, error: body?.detail || `HTTP ${res.status}` };
       }
       const json = await res.json();
       return { ok: true, data: {
         markdown: json.markdown ?? '',
         fileName: json.file_name,
         pages: json.pages,
         durationMs: json.duration_ms,
       } };
     } catch (e) {
       return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
     }
   }
   ```
   - Mirrors `gitlabClient` envelope pattern exactly.
   - Done when: unit test with `vi.stubGlobal('fetch', ...)` covers ok + error paths.

**B3. Add modal id `'docUpload'` to `uiStore.ts`.**
   - One-line change: `export type ModalId = 'publish' | 'loadEpic' | ... | 'docUpload';`
   - Done when: TS compiles.

**B4. Create `src/components/editor/DocUploadModal.tsx`.**
   - Structure (copy the visual language from `LoadEpicModal.tsx`):
     - Header: "Upload Requirement Document"
     - Drop-zone `<div>` with dashed border + `<input type="file" accept=".pdf,.docx,.pptx,.xlsx,.html,.png,.jpg,.jpeg,.tiff">` (hidden, triggered by label click and drop-zone click).
     - On-drop / on-change → single-file state `selectedFile`.
     - States: `idle | uploading | error | done`.
     - "Extract & Refine" button → calls `convertDocument(file)` → on success (decision #3 — auto-refine):
       ```ts
       useEpicStore.getState().setMarkdown(data.markdown);
       useUiStore.getState().closeModal();
       useUiStore.getState().openModal('pipeline');
       refinePipelineAction(); // fire-and-forget, same pattern as WorkspaceHeader.handleRefine
       ```
     - On error: inline red banner with `error` text; "Try Again" clears.
     - Progress indicator: indeterminate spinner during `uploading` (Docling is sync — no granular progress available).
     - Size/extension validation client-side before POST: ≤50 MB, extension in allowed list.
     - Footer: Cancel + Extract & Refine (disabled when no file or uploading).
   - Imports: `epicStore.setMarkdown`, `uiStore.closeModal`/`openModal`, `refinePipelineAction`.
   - Done when: manual test — drag PDF, watch pipeline modal open automatically, refined epic appears.

**B5. Register modal in `ModalHost.tsx`.**
   - Add `case 'docUpload': return <DocUploadModal />` in the switch.
   - Done when: `uiStore.openModal('docUpload')` renders the modal.

**B6. Add "Upload Document" trigger in `WorkspaceHeader.tsx` only** (decision #5).
   - Small icon button next to the Refine button, same visual weight as Publish/Load buttons.
   - Icon: `Upload` from `@phosphor-icons/react`.
   - Handler: `useUiStore.getState().openModal('docUpload')`.
   - Label: "Upload" (tooltip: "Upload requirement document").
   - WelcomeScreen untouched.
   - Done when: clicking Upload in the header opens the modal.

**B7. No changes to the pipeline.**
   - Explicitly verify: `refinePipelineAction()`, `runPremiumPipeline()`, all 6 stages, all prompts, all stores except `uiStore.ModalId` and (transiently) `epicStore.markdown` — **untouched**.
   - Done when: `git diff src/pipeline src/stores/epicStore.ts src/stores/blueprintStore.ts src/services/ai` is empty (aside from any trivial formatting) after Phase B.

---

### Phase C — Production deployment (post-MVP, optional for first ship)

These can ship later without breaking MVP behavior.

**C1. Helm chart for `frame-docmining`.**
   - Separate Helm release (not bundled with frame SPA chart) so release cadence is independent.
   - Values: `replicas: 1` (RAM-heavy), `resources.requests.memory: 2Gi`, `limits.memory: 4Gi`, `resources.requests.cpu: 1000m`.
   - No HPA initially (memory-bound, not CPU); consider KEDA on queue depth if moving to async jobs.

**C2. Istio VirtualService + DestinationRule.**
   - Host: `frame-docmining.dmeshdev.azpriv-cloud.ubs.net` (add to `infra/gateway-patch.yaml`).
   - Pod-to-pod from `frame-engg` namespace via mTLS — no public exposure needed if SPA does a client-side call directly.
   - **Alternative:** expose via SPA's own VirtualService path (`/api/docmining/*` → rewrite → `frame-docmining` service) so SPA stays single-origin.

**C3. Replace Vite dev proxy with runtime config.**
   - In prod build the `/api/docmining` prefix hits same origin, routed by Istio → backend service. Dev continues using Vite proxy.
   - Done when: prod build fetches from `/api/docmining` without needing `VITE_DOCMINING_BASE_URL`.

**C4. Add Entra auth (defer until SPA has Entra).**
   - Today SPA uses `MockAuthProvider`. When Entra lands on the SPA, bolt `fastapi-azure-auth` onto backend following blueprint §5–6. Until then backend stays inside the cluster and relies on Istio mTLS + namespace isolation.

**C5. Observability.**
   - Add `structlog` JSON logs, OTel FastAPI instrumentation, Application Insights connection string via env.
   - Emit one audit line per conversion: `{request_id, file, size, sha256, mime, duration_ms, status}`.

---

## 5. Change Inventory (exact file diff)

### New files (zero-risk)
- `backend/docmining/pyproject.toml`
- `backend/docmining/app/__init__.py`
- `backend/docmining/app/main.py`
- `backend/docmining/app/core/config.py`
- `backend/docmining/app/api/__init__.py`
- `backend/docmining/app/api/v1/__init__.py`
- `backend/docmining/app/api/v1/documents.py`
- `backend/docmining/app/services/docling_service.py` (wraps `DocumentConverter` build + `_convert_sync`)
- `backend/docmining/tests/test_convert.py`
- `backend/docmining/models/…` (copied weights; gitignored)
- `src/services/docmining/docminingClient.ts`
- `src/components/editor/DocUploadModal.tsx`
- `docs/knowledge/services/docmining/docminingClient.md` (knowledge-base doc)
- `docs/knowledge/components/editor/DocUploadModal.md` (knowledge-base doc)
- *Dockerfile deferred to Phase C*

### Modified files (≤5 lines each)
- `vite.config.ts` — add `/api/docmining` proxy (6 lines)
- `.env` — add `VITE_DOCMINING_BASE_URL=http://localhost:8000` (1 line)
- `.gitignore` — add `backend/docmining/models/` (1 line)
- `src/stores/uiStore.ts` — add `'docUpload'` to `ModalId` union (1 line)
- `src/components/layout/ModalHost.tsx` — add one `case 'docUpload'` (2 lines)
- `src/components/editor/WorkspaceHeader.tsx` — add Upload button next to Refine (~8 lines)
- **`WelcomeScreen.tsx` unchanged** (decision #5)

### Untouched
- All pipeline stages and prompts
- All stores other than `uiStore` (+1 string literal) and `epicStore` (only via existing public `setMarkdown`)
- All AI clients, GitLab clients, blueprint/chat flows
- Helm chart of the SPA (no new envs, no new containers)
- Istio Gateway (until Phase C)
- Tests in `src/**/*.test.ts` (no existing test should need change)

---

## 6. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Docling first-run model load slow (5–30 s) | High | Cold-start latency | Lifespan warmup with a tiny PDF; keep 1 warm replica |
| Docling not thread-safe at high concurrency | Medium | 500s under load | Bounded ThreadPoolExecutor (workers=2), one request-at-a-time per worker |
| PyTorch allocator grows over time | Medium | OOM | `--max-requests 100 --max-requests-jitter 20` gunicorn recycle |
| Large PDF > 60 s sync timeout | Medium | 504 to client | Doc size guard client-side (50 MB); clear 504 message; defer async-jobs pattern to Phase C |
| Python-magic requires libmagic system lib | Low | Build fail | Install via apt in Dockerfile; locally document `brew install libmagic` |
| SPA deployed behind strict CSP | Low | Blocked fetch | CORS allowlist in backend config; preflight tested |
| User uploads sensitive doc | High | Compliance | Temp files deleted on exit; no disk persistence; no external egress (`HF_HUB_OFFLINE=1`) |
| Reference model weights licensing | Low | Legal | Docling models are MIT / ds4sd published weights — confirmed in blueprint §9.1 |
| Existing tests break | Low | CI red | Phase B changes are additive; run `pnpm test:run` before/after |

---

## 7. Success Criteria (MVP acceptance)

1. `docker run frame-docmining` exposes `POST /api/v1/documents/convert` and `GET /healthz`.
2. `curl -F file=@fixture.pdf localhost:8000/api/v1/documents/convert` returns 200 with non-empty markdown for each supported type (PDF, DOCX, PPTX, XLSX, HTML, PNG).
3. With SPA + backend running locally, user can: click **Upload Document** → pick a PDF → see editor populated with extracted markdown → click **Refine** → 6-stage pipeline runs unchanged and produces refined epic.
4. `git diff` on `src/pipeline/**`, `src/stores/*.ts` (except the two ModalId + `epicStore.markdown` via public API), `src/services/ai/**`, `src/services/gitlab/**` is empty.
5. Existing test suite (`pnpm test:run`) passes with **zero** deltas in test count or outcomes.
6. Prod SPA built with `pnpm build` still works when backend is unreachable (modal shows graceful error, user can fall back to paste-text).

---

## 8. Decisions (locked 2026-04-23)

| # | Question | Decision | Impact on plan |
|---|---|---|---|
| 1 | Deploy scope | **Local-first.** Backend runs on `localhost:8000`; ship to AKS in Phase C later. | Phase A + B only for MVP; Phase C deferred |
| 2 | MIME validation | **Extension-only** (no `python-magic`). | Drop `python-magic` dep + `libmagic` system install; `_validate_mime` shrinks to ext-set check |
| 3 | Auto-refine after upload | **Yes — auto-fire `refinePipelineAction()`** immediately after `setMarkdown`. | Modal success handler chains: `setMarkdown(md)` → `closeModal()` → `openModal('pipeline')` → `refinePipelineAction()` (fire-and-forget) |
| 4 | Response payload | **Markdown only.** `include_json=false` default; `document` field omitted. | Response schema slimmed; smaller payload |
| 5 | Trigger location | **WorkspaceHeader only** (NOT WelcomeScreen). | `WelcomeScreen.tsx` untouched; add upload button next to Refine in `WorkspaceHeader.tsx` |

---

## 9. Definition of Done (this design doc)

- [x] Ground truth verified against live code
- [x] Architecture decision documented with rejected alternatives
- [x] API contract defined with response shape + error codes
- [x] Atomic task list, each step independently verifiable
- [x] Complete file-level change inventory
- [x] Risk register with mitigations
- [x] MVP success criteria
- [ ] **User approval of this design**
- [ ] Writing-plans skill invoked to produce implementation plan with task IDs
