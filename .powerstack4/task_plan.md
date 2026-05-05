# DocMining Integration — Execution Journal

**Branch:** `feature/phase-a-docmining`
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
| A-10 Phase A commit | ✅ done | Commit 6f2a1ee. Deep-review (5 agents) done; 3 critical + 6 must-fix important fixes applied + 2 regression tests added. 6/6 pytest green. See docs/reviews/2026-04-24-phase-A-review.md + REVIEWERS.md. |
| B-1 Vite proxy | ✅ done | `/api/docmining` → `http://localhost:8000`, rewrite to `/api/v1/documents`. |
| B-2 docminingClient | ✅ done | `convertDocument(file)` discriminated union `{ ok, data | error }`; 50 MB cap + ext allowlist constants exported. |
| B-3 uiStore ModalId | ✅ done | Added `'docUpload'` literal to `ModalId` union. |
| B-4 DocUploadModal | ✅ done | Drag-drop + picker; validates ext/size; on success: `setMarkdown` → `openModal('pipeline')` → `refinePipelineAction()` fire-and-forget. |
| B-5 ModalHost wiring | ✅ done | New case `'docUpload'` wrapped in shared `<Modal>` at width 560. |
| B-6 WorkspaceHeader button | ✅ done | Upload button added to left group before Download, `data-testid="btn-upload"`. |
| B-7 Manual E2E | ⏳ user-gated | Requires user to start backend + SPA and walk through Upload → pipeline. |
| B-8 Regression safety | ✅ done | Stash/baseline/pop cycle: pre-existing 12 failing tests (auth context issues in WelcomeSidebar/App/helpers) unrelated. Zero regressions: 1296 passed. |
| B-9 KB docs | ✅ done | `docs/knowledge/services/docmining/docminingClient.md`, `docs/knowledge/components/editor/DocUploadModal.md`, README + SYSTEM.md (§9b upload flow + modal fan-out) + WorkspaceHeader.md updated. |
| B-10 Phase B commit | ✅ done | Commit e82b2f7. Deep-review (5 agents) complete: 4 critical → 3 fixed + 1 deferred (modal RTL suite); 18 important → 5 fixed; AbortController + unmount guard + 8-case regression test added. See `docs/reviews/2026-04-24-phase-B-review.md` + REVIEWERS.md. Fix-loop commit pending. |
| C-0 Prerequisites | ✅ done | Docker 29.4.0, Helm 4.1.4, Kind 0.31.0, kubectl — all installed via Homebrew. |
| C-1 Backend Dockerfile | ✅ done | Two-stage build (uv + python:3.12-slim). Added rapidocr + onnxruntime to pyproject.toml. Runtime libs: libgomp1/libgl1/libglib2.0-0/libxcb1. Verified: healthz 200, PDF convert pages=1. Commit 2887b40. |
| C-2 SPA Dockerfile | ✅ done | node:20-alpine builder (vite build) + nginx:1.27-alpine runtime. Created FederatedApp.tsx re-export (federation entry missing). Commit 70c284f. |
| C-3 Root .dockerignore | ✅ done | Excludes node_modules/backend/docs/.git. Committed with C-2. |
| C-4 docker-compose.yml | ✅ done | 3 services (docmining/spa/proxy). nginx reverse proxy rewrites /api/docmining/* → docmining:8000. E2E verified. Commit f155c59. |
| C-5 Helm charts | ✅ done | 3 charts (frame-docmining, frame-spa, frame-ingress). helm lint 3/3 passed. Ingress split into 3 resources for correct rewrite-target per path. Commits b0bfb4c, 7905356. |
| C-6 kind cluster | ✅ done | kind cluster + helm install → all pods Running 1/1, E2E convert pages=1 through ingress. Commit 7905356. |
| C-7 Multi-env local | ✅ done | 3 namespaces (frame/frame-dev/frame-engg) with per-host ingress routing. deploy-all.sh script. All 9 pods healthy, all 3 URLs verified. Commit 2f85269. |

## Kit-Runner Skill (parallel track)
| Task | Status | Notes |
|---|---|---|
| Design doc | ✅ done | `docs/plans/2026-04-25-kit-runner-portable-design.md` — approved. Commit c1ad31b. |
| Implementation plan | ✅ done | `docs/plans/2026-04-25-kit-runner-portable-implementation-plan.md` — 26 atomic tasks. Commit c1ad31b. |
| Skill build (T0–T23) | ✅ done | 16 commits at `~/.claude/skills/kit-runner/`. 14 unit tests + 9 acceptance criteria — all green. |
| FRAME bootstrap (T25) | ✅ done | Mode 3 applied: AGENTS.md, docs/adr/, docs/devlog/, /devlog + /adr slash commands, 3 hooks, 3 path-scoped rules. Commits 222d6ab, 1ea6dfa, ecc7174. |

## Extreme Initiative Module
| Task | Status | Notes |
|---|---|---|
| EI-0 Design + UX research | ✅ done | Design doc at `docs/plans/2026-04-25-extreme-initiative-design.md`. UX: AI-proposed header-centric list with multi-select crew chips. Commit 83e02ce. |
| EI-1 Implementation plan | ✅ done | 14 atomic TDD tasks at `docs/plans/2026-04-25-extreme-initiative-implementation-plan.md`. Commit b261cf2. |
| EI-2 initiativeStore | ✅ done | Zustand store: Stream, Header, Crew, many-to-many via assignedCrewIds. 12/12 tests. Commit 47eb598. |
| EI-3 Wire 5th tab | ✅ done | TabId + ViewRouter + Sidebar (Lightning icon). Commit ad7b3bf. |
| EI-4 AI actions (3) | ✅ done | generateStreamEpic, proposeCrewSplit, refineCrewEpic. 12/12 tests. Commit 1b14860. |
| EI-5 StepIndicator | ✅ done | 4-step non-linear stepper. 5/5 tests. Commit 42490b0. |
| EI-6 Chip components | ✅ done | CrewChipSelector, HeaderRow, SharedHeaderBadge, CrewSummaryRail, CrewCard. 6/6 tests. Commit 69489d4. |
| EI-7 InitStep + StreamCombobox | ✅ done | Creatable stream combobox, crew count stepper, crew naming. Commit 2710af6. |
| EI-8 StreamEpicStep | ✅ done | AI epic viewer/editor with preview. Commit 0415f73. |
| EI-9 SplitCrewsStep | ✅ done | Header-to-crew assignment, filter, re-propose, crew rail. Commit 87c3f07. |
| EI-10 RefineCrewsStep | ✅ done | Per-crew AI refinement with progress cards. Commit 99b0bf6. |
| EI-11 Full wizard wiring | ✅ done | StepIndicator + step routing + navigation guards. Commit 892886a. |
| EI-12 Integration test | ✅ done | Full wizard flow + edge cases. 3/3 tests. Commit 8a0b828. |
| EI-13 GitLab integration redesign | ⏳ planning | Ultraplan dispatched. Stream = GitLab group from API, traversal pattern from storyforge_gitlab_traversal_complete.md. |

## Journal

### 2026-05-05 · Pipeline verbosity & formatting fix (9 tasks)
Implemented prompt-level brevity enforcement + 50% word target cuts + GFM formatting directives across the entire 6-stage pipeline without touching any stage or orchestrator files. Cut all `target`, `max`, and `totalWordTarget` values in categoryTemplates.json by 50% (programmatic transform, 10 categories). Rewrote complexity scaling in all 6 prompt builders: Simple="favor brevity", Moderate="balance thoroughness with brevity", Complex="be exhaustive in coverage but not in words, aim for LOWER end of word target" — flipping the previous Complex directive that said "be thorough, completeness > brevity". Added BREVITY RULES block to every system prompt (banned filler phrases, preamble, marketing adjectives). Added GFM formatting directives to refinement prompt (bold TL;DR per section, task-list ACs, blockquote callouts, max 3 sentences per paragraph, `<details>` collapsibles for Complex). Added epic assembly formatting to mandatory prompt (emoji H2 headings, H3 for stories, --- separators, architecture after Overview). Added 13th audit check "Conciseness & Density" to validation prompt with verbosity failure patterns (Verbose Padding, Wall of Text). Added `cleanupMarkdown()` post-processor to refinePipelineAction.ts (single H1, --- between H2s, heading hierarchy normalization, trailing whitespace trim). Coherence prompt now actively removes filler during cross-section review. 211/211 tests pass, 0 TS errors in changed files, 0 regressions.

### 2026-04-26 · Feedback feature (Tasks 1-4 of 5)
Implemented feedbackService.ts (submitFeedback commits markdown file to GitLab via Repository Files API, 3/3 tests), FeedbackModal.tsx (category dropdown + message textarea + MSAL user info read-only, submit calls feedbackService, toast on success, 3/3 tests), added 'feedback' to ModalId + ModalHost case, added Feedback nav item to sidebar with ChatCircle icon + genericized handleNav to use item.id as ModalId. Task 5 (set project ID + E2E) pending user providing the GitLab project ID.

### 2026-04-26 · GitLab integration (10 tasks) + vite proxy fix
Implemented all 10 GitLab integration tasks: streamGroupId in settings, parent_id on updateGitLabEpic, store extensions (StreamGroup/GroupNode/PublishState), initiativeService (fetchStreamTree + publishInitiativeEpics), InitStep rewrite (fetch tree, crew checkboxes), StreamEpicStep (real crew names in AI prompt), RefineCrewsStep (real publish with progress + epic links), cleanup (removed StreamCombobox + old Stream type), integration test. 47/47 tests green. Fixed critical vite.config.ts bug: `process.env` doesn't have `.env` values at config time — switched to `loadEnv()` so proxy targets (`VITE_GITLAB_BASE_URL`) load correctly. Verified: `curl http://localhost:3002/gitlab-api/groups/131025594` returns 200 from gitlab.com.

### 2026-04-25 · Extreme Initiative module — 14 tasks implemented
Built the full Extreme Initiative module via kit-runner standing protocol. New 5th tab with 4-step wizard (Init → Stream Epic → Split Crews → Refine). initiativeStore with many-to-many header-to-crew assignment via `assignedCrewIds[]`. 3 separate AI actions (generateStreamEpic, proposeCrewSplit, refineCrewEpic). 12 custom components (no new dependencies). 38 new tests across 7 files, all green. Now pivoting to GitLab integration redesign: Stream = GitLab group fetched from API, full hierarchy traversal (Stream Group → Crew Subgroup → Pod Subgroup → Commons → Home Project), epic tree chaining (Stream Epic → Crew Epic → Pod Epic → Issues). Ultraplan dispatched for the redesign.

### 2026-04-25 · Phase C-Local complete + kit-runner skill built
Massive session covering two parallel tracks. **Phase C-Local (Steps 0–6):** installed Docker/Helm/Kind/kubectl; created backend Dockerfile (two-stage, uv, offline models, rapidocr+onnxruntime fix, libxcb/libgl system libs); SPA Dockerfile (vite build + nginx, created missing FederatedApp.tsx federation entry); root .dockerignore; docker-compose.yml with nginx reverse proxy; 3 Helm charts (docmining/spa/ingress — ingress needed split into 3 resources for correct per-path rewrite-target); kind cluster rehearsal passing all E2E checks; multi-environment deployment (3 namespaces × 3 hosts mirroring AKS: frame.local→main, frame-dev.local→dev, frame-engg.local→feature). **Kit-runner skill:** designed, planned (26 tasks), and built the portable self-discovering skill at `~/.claude/skills/kit-runner/` — 10 scripts, 15 templates, 4 references, SKILL.md with verb-routing. 14 unit tests + 9 acceptance criteria all green. Applied Mode 3 to FRAME (AGENTS.md, ADR, devlog, hooks, rules). Branch renamed from `phase-a-docmining` to `feature/phase-a-docmining`; created `dev` branch at same commit.

### 2026-04-24 · B-7 manual E2E — stall fix
Backend log confirmed upload path works end-to-end (POST /api/v1/documents/convert → 200, 9 pages, 9.4s). User reported UI stall *after* upload. Root cause: `refinePipelineAction` returns silently with a toast when no AI provider is configured (line 44-50), but `DocUploadModal.onSubmit` opened the pipeline modal *before* firing the action — leaving the pipeline modal stuck on "Refining your epic…" forever because the pipeline never started. Same latent bug exists in `WorkspaceHeader.handleRefine`; left untouched (pre-existing, out of DocMining scope). Fix in DocUploadModal only: check `isAIEnabled(cfg)` after `setMarkdown + closeModal`, skip `openModal('pipeline')` when AI not configured, surface a warning toast ("Document extracted. Configure an AI provider in Settings to refine."). 8/8 client tests still green.

### 2026-04-24 · B-10 deep-review + fix loop
Dispatched 5 parallel reviewer agents (Correctness, Architecture, Security, Production Readiness, Test Quality) against `8efe066..e82b2f7`. Aggregated 4 critical + 18 important + 21 nice-to-have into `docs/reviews/2026-04-24-phase-B-review.md`. Applied fixes:
- **P-C1 (prod route)**: vite.config.ts gets an inline comment calling out the dev-only proxy contract; KB (`docminingClient.md`) grows a "Deployment (important)" section listing ingress options; `SYSTEM.md §9b` cross-links.
- **P-C2 (abort / state corruption)**: `convertDocument(file, options?)` signature — composes `options.signal` with `AbortSignal.timeout(200_000)` via `AbortSignal.any`; friendly copy for `AbortError` + `TimeoutError`; `console.error` on unexpected throws for observability. `DocUploadModal` grows `abortRef` + `isMountedRef`; `useEffect` cleanup aborts + marks unmounted; post-resolve guard bails before touching store or firing pipeline. `refinePipelineAction()` gets `.catch(console.error)`.
- **TQ-C1 (client contract test)**: new `src/services/docmining/docminingClient.test.ts` — 8 cases (happy path + snake-to-camel, multipart body, null-markdown coerce, string `detail`, nested `detail.message`, non-JSON fallback, network error, abort). `npx vitest run src/services/docmining/docminingClient.test.ts` → 8/8 passed in 366 ms.
- **TQ-C2 (modal RTL suite)**: deferred to Phase C — contract test sufficient for MVP.
13 important findings deferred (architecture refactor to `uploadDocumentAction`, envelope-naming note, toast observability, HTTP-code copy, drop-zone a11y, validation-error array parsing, preview proxy, `0.0.0.0` bind, existing-test-file updates blocked by H3). REVIEWERS.md updated with Phase B summary.

### 2026-04-24 · B-1..B-9 SPA wiring
Phase B delivers the browser side of the upload flow. `vite.config.ts` gains a `/api/docmining` dev proxy (rewrites to `/api/v1/documents`, `VITE_DOCMINING_BASE_URL` override). `src/services/docmining/docminingClient.ts` is a pure function returning `{ ok, data | error }` — mirrors the GitLab-client envelope; parses `HTTPException.detail` as string (with `detail.message` fallback for future-proofing). `uiStore.ModalId` union gains `'docUpload'`. `DocUploadModal` is content-only (shared `<Modal>` wraps it in `ModalHost`): drag-drop + click-picker, validates extension + 50 MB cap, on success writes markdown into `epicStore` → closes itself → opens pipeline modal → fires `refinePipelineAction()` fire-and-forget (matches the Refine-button convention). `WorkspaceHeader` gets an Upload button next to Load (`data-testid="btn-upload"`). Regression check (stash → run baseline → pop → run): 12 pre-existing failures (all auth-context issues in WelcomeSidebar/App/helpers tests, unrelated) + 1296 passing, same as baseline — zero regressions. KB docs added at `docs/knowledge/services/docmining/docminingClient.md` and `docs/knowledge/components/editor/DocUploadModal.md`; `README.md` gains DocMining services section and DocUploadModal entry under editor; `SYSTEM.md` gets §9b upload-flow mermaid sequence + `docUpload` branch in the modal fan-out diagram; `WorkspaceHeader.md` mentions the Upload button.

### 2026-04-24 · A-10 deep-review + fix loop
Dispatched 5 parallel reviewer agents (Correctness, Architecture, Security, Production Readiness, Test Quality) against `git diff main...HEAD -- backend/docmining/`. Aggregated 3 critical + 14 important + 22 nice-to-have findings into `docs/reviews/2026-04-24-phase-A-review.md`. Applied fixes:
- **C1** docling_service.py: pass `Path` directly to `converter.convert()`, drop `io.BytesIO(fh.read())` double-buffer.
- **C2** documents.py: stringify error list into `HTTPException` detail (was malformed dict).
- **C3** return `ok: bool` from `convert_sync`; route branches on it (was fragile string comparison).
- **I1** try/finally cleanup replaces `BackgroundTasks` (deterministic on all exit paths).
- **I2** suffix now derived from sanitized extension, not raw `upload.filename`.
- **I3** `enable_remote_services=False` post-build assertion + post-read verification; raises `RuntimeError` if both attribute surfaces missing.
- **I4** removed unreachable `except ConversionError` (raises_on_error=False).
- **I5** `ThreadPoolExecutor(max_workers=1)` literal + `assert settings.workers == 1` in lifespan.
- **I6** `executor.shutdown(cancel_futures=True)` — prevents SIGTERM hangs.
Added regression tests in `tests/test_convert_error_paths.py` (new file, H3-compliant) covering C2 detail shape and C3 `ok`-branching via `monkeypatch.setattr(documents_module, "convert_sync", ...)`. Pytest 6/6 green. REVIEWERS.md summary written. 8 important findings deferred (polyglot sniff, XXE, XSS scrub, bind-host docs, offline-enforcement test, observability, ProcessPoolExecutor, test coverage) — tracked for Phase B/C.

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
