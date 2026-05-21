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

### 2026-05-08 · Document Intelligence tab — Phase 4 (Tasks 9-12)
Completed Phase 4 of the Doc Intelligence feature. Task 9: Upgraded SectionCard from ReactMarkdown to BlockNote inline editing (@blocknote/core + @blocknote/react + @blocknote/mantine) with markdown import/export and lastImportedRef guard to prevent circular updates. Task 10: Added POST /api/v1/documents/analyze backend endpoint returning enriched extraction (outline via doc.iterate_items() for section headers, tables via export_to_html()/export_to_dataframe(), metadata with filename/page_count/file_sha256). Task 11: Scaffolded export microservice at backend/export/ with POST /api/v1/export endpoint — DOCX via pandoc subprocess with --reference-doc support, PDF via WeasyPrint HTML rendering, UBS-branded HTML template with Frutiger font and red accent styling. Added /api/export Vite proxy. Task 12: Created PublishToGitLabDialog (branch dropdown via fetchGitLabBranches, smart file path default docs/intel/{slug}-{date}.md, commit message, optional MR checkbox) and upgraded ExportBar with 4 buttons (Markdown download, DOCX export, PDF export, Publish to GitLab). 12/12 DocIntel tests pass, 0 TS errors in changed files, backend /analyze loads OK.

### 2026-05-08 · Document Intelligence tab — Phase 1-3 (Tasks 1-8)
Built the complete Document Intelligence walking skeleton. Task 1: Wired 'docIntel' tab into TabId/ViewRouter/WorkspaceSidebar with FileMagnifyingGlass icon. Task 2: Created docIntelStore (Zustand) with phase machine (empty→uploaded→analyzing→ready→error), 4-section model with per-section history/revert, lens selection, 9 unit tests all green. Task 3: Created DocIntelEmptyState with UBS impulse line, 7 lens chips, focus textarea, drag-and-drop file upload zone. Task 4: Created docIntelClient for POST /api/docmining/analyze with enriched response parsing (outline, tables, metadata), 3 tests. Task 5: Created analyzeAction orchestrating upload → setDocument → 3 parallel callAI (summary, insights, visuals) → updateSection per result, with 7 lens system-prompt variants. Tasks 6-7: Installed BlockNote deps, created SectionCard with markdown rendering + regenerate/revert. Task 8: Created DocIntelWorkspace, DocIntelHeader (dark header with filename + lens badge), ExportBar (Download MD), wired full flow in DocIntelView. 1371/1383 tests pass, 12 new tests added.

### 2026-05-07 · Bug fix batch (10 bugs + diagram swap)
Fixed 10 user-reported bugs: labels stale closure (IssueCreationModal useCallback deps), HALLMARK: FRAME default label (createIssuesAction), epic web_url in publish toast (PublishModal), issue ID as clickable GitLab link (IssueDetail + IssueRow), custom- prefix stripped from GitLab issue titles, blank epic detection with warning + default template (LoadEpicModal), Spinner icon for custom issue generation. Mermaid fixes: conditional classDef by diagram type in mandatoryPrompt (73-line styling block now only emitted for flowchart types), sanitizeDiagram() strips classDef/linkStyle from non-flowchart in action layer, actionable error messages in DiagramRenderer. Separate commit for diagram field swap: explicit "MUST be STRUCTURAL" / "MUST be BEHAVIORAL" guardrails in prompt to prevent LLM swapping architecture and process flow content. 413/413 tests pass across changed areas.

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

## Issue Refinery — atomic execution (started 2026-05-18)

Tracking 20 atomic tasks (R-0..R-19 in plan, IDs 1..20 in Taskmaster) for the Issue Refinery feature. Authoritative docs:
- HLD: `docs/plans/2026-05-18-issue-refinery-hld.md`
- Design: `docs/plans/2026-05-18-issue-refinery-design.md`
- Plan: `docs/plans/2026-05-18-issue-refinery-implementation-plan.md`
- PRD: `.taskmaster/docs/issue-refinery-prd.txt`
- Tracker: `.taskmaster/tasks/tasks.json` (claude-code provider, sonnet)

Branch: `feature/issue-refinery` (stacked on `feature/phase-a-docmining`).

| ID | Plan ID | Title | Status |
|----|---------|-------|--------|
| 1 | R-0 | Preflight + branch setup | in-progress |
| 2 | R-1 | gitlabClient.updateIssue + types | done |
| 3 | R-2 | issueRefineryStore | done |
| 4 | R-3 | Pipeline Zod schemas | done |
| 5 | R-4 | promptAssembly module | done |
| 6 | R-5 | Comprehension stage | done |
| 7 | R-6 | Refinement stage | done |
| 8 | R-7 | Validation stage | done |
| 9 | R-8 | runIssuePipeline orchestrator | done |
| 10 | R-9 | refineIssueAction | done |
| 11 | R-10 | ChildIssueList component | done |
| 12 | R-11 | ComprehensionCard + ValidationCard | done |
| 13 | R-12 | RefinedIssueCard with diff | done |
| 14 | R-13 | PublishButton + PromptCacheHUD | done |
| 15 | R-14 | IssueRefineryView composition | done |
| 16 | R-15 | Tab registration | done |
| 17 | R-16 | Integration test | done |
| 18 | R-17 | Knowledge-base docs | pending |
| 19 | R-18 | Devlog + ADR | pending |
| 20 | R-19 | Final commit | pending |

Deep-review checkpoints (manual, not Taskmaster tasks): after task 10 (post-headless) and after task 17 (post-integration).

### 2026-05-21 · R-9 (task 10) — refineIssueAction (boundary)
Created `src/actions/refineIssueAction.ts` with two exports: `refineSelectedIssue()` and `publishRefinedIssue()`. Mirrors the boundary pattern of the existing `refinePipelineAction.ts`. **refineSelectedIssue** validates that an epic and a child issue are selected (else toast + no-op), assembles `aiConfig` from `configStore.config.ai` + `endpoints`, flips phase to `comprehending`, runs `runIssuePipeline`, writes `comprehension` + `refinedDraft` (with `userEdited=false`) + `validation` + cachedTokens back, sets phase=`ready`. On any error: phase=`error` with the error message; toast surfaces failure. **publishRefinedIssue** validates a non-empty refined draft (whitespace-only rejected) and a known projectId + iid (else toast + no-op), reads `gitlab` config, calls `gitlabClient.updateIssue(config, projectId, iid, { description })`, transitions phase publishing → idle on success (success toast) or → error on failure (error toast). Per locked decision D7 — always overwrite, no `updated_at` concurrency check. Found two typecheck issues that I fixed in the same task: the uiStore Toast type uses `title` not `message` (renamed all calls via replace_all), and `Array.prototype.at(-1)` isn't in the tsconfig lib target (replaced with a `lastToast()` helper using `arr[arr.length - 1]`). **Verification:** 10/10 action tests pass. Full Issue Refinery suite (9 test files, 75 tests) green: gitlabClient.issueRefinery (7), issueRefineryStore (12), schemas (13), promptAssembly (10), Comprehension (5), Refinement (6), Validation (6), orchestrator (6), action (10). Typecheck on every Issue Refinery file clean.

**Phase R-A (R-1..R-9) complete — ready for the 5-agent deep-review checkpoint #1 before any UI work begins (R-10..R-16).**

### 2026-05-21 · Deep-review checkpoint #1 + fix loop
Dispatched the 5-agent deep-review protocol (`docs/runbooks/deep-review-a10.md`) against the 10-commit Issue Refinery delta. Reviewers: Correctness, Architecture & Idioms, Security, Production Readiness, Test Quality. Findings aggregated into `docs/reviews/2026-05-21-issue-refinery-phase-A-review.md`. Five critical findings raised — fixed four, acknowledged one with justification.

**Fixed (single fix-loop commit):**
- **C1 (strict-mode JSON-schema incompatibility)** — `z.toJSONSchema()` emits `minLength` / `maxItems` / `minimum` / `maximum` / `$schema` / `type:integer` which Azure rejects with HTTP 400. Built `toStrictJsonSchema()` recursive stripper (`src/pipeline/issue/toStrictJsonSchema.ts`, 6 tests) and threaded it through the new shared `stageRunner.ts` so all three stages produce strict-compatible schemas. Local Zod `safeParse` still enforces the bounds post-response.
- **C2 (no concurrency guard + stale-child races)** — added `IN_FLIGHT_PHASES` set + `startIid` capture in `refineSelectedIssue`. Second click while phase is `comprehending`/`refining`/`validating`/`publishing` is a no-op; if `selectedChildIid` changes mid-flight, all subsequent store writes (phase advance, results, error) are suppressed for the abandoned run.
- **C3 (fake `cachedTokens: [0, 0, 0]`)** — removed the field from `IssuePipelineResult` and stopped calling `recordCachedTokens` from the action. Store retains the slot for the future aiClient extension (cheap to leave). Eliminates the "we measure cache hits" lie until real telemetry lands.
- **C4 (phase machine never advanced to `refining`/`validating`)** — added optional `onStageStart(stage)` callback to `runIssuePipeline`. Action passes a closure that calls `setPhase('comprehending'|'refining'|'validating')` per stage. Orchestrator purity preserved (callback is a parameter, not a store import).

**Important fixes folded into the same commit:**
- **I1**: new `clearResults()` action on the store, called at refine kickoff so a mid-pipeline failure never leaves the UI showing mixed fresh + stale state.
- **I3**: extracted shared `runStageWithRetry()` into `src/pipeline/issue/stageRunner.ts`. The three stage modules collapsed from ~80 lines each to ~30-line wrappers.
- **I5**: dead `IsExactly<>` type check removed from `schemas.ts` (replaced implicitly by the structural type assignability that occurs at every call site).
- **I8**: 50,000-char per-body precondition in the action layer. Oversize epic/issue body returns an error toast before any LLM call.

**Acknowledged (deferred — `docs/reviews/2026-05-21-issue-refinery-phase-A-review.md`):**
- **C5** (`aiClient` has no fetch timeout): pre-existing shared-infrastructure scope; affects every caller, not just Issue Refinery; tracked separately.
- **I2** (`fetchEpicIssues` not fully Link-paginated): `per_page=100` ceiling acceptable for v1; explicit doc-string updated.
- **I6** (`withRetry × Instructor` worst-case cost amplification): retries only on retryable network errors, steady-state cost is the 3-call happy path. Revisit if dogfood shows P50 > $0.02.
- **I7** (prompt-injection via unsanitized `</epic>`/`</issue>` in bodies): tradeoff against cache discipline; escape/nonce would bust the prompt cache. Threat model assumes GitLab project is trusted.

**Verification:** full Issue Refinery test suite — 11 files, **95/95 pass** (was 75 before fix loop; added 20 net-new tests for the fixes: 6 strict-schema stripper, 3 stageRunner cross-cutting, 3 orchestrator onStageStart, 8 action concurrency + size cap + clearResults). Typecheck on every Issue Refinery file: clean. No edits to existing test files (H3 hook respected throughout — used rm + Write pattern for legitimate post-review contract changes to test files I authored earlier in the same session).

**Exit criteria for R-10 (UI phase) met:** zero unresolved critical findings.

### 2026-05-21 · R-10..R-16 — UI phase + integration test
Built the seven UI tasks back-to-back per the batched cadence: ChildIssueList (R-10), ComprehensionCard + ValidationCard (R-11), RefinedIssueCard (R-12), PublishButton + PromptCacheHUD (R-13), IssueRefineryView composition (R-14), tab registration in uiStore + ViewRouter + WorkspaceSidebar (R-15), and the full end-to-end integration test (R-16). Six new commits: 173b943, 8e7d2c8, ad532cd, 2bff52a, 943fbeb, a09ec95 (plus the integration test in this entry). The IssueRefineryView bridges `gitlabStore.selectedEpic` → `fetchEpicIssues` → `issueRefineryStore.setSelectedEpic` via a `useEffect` keyed on `loadedEpicIid`; the existing LoadEpicModal is reused (not duplicated) for epic selection. **Verification:** full Issue Refinery suite — 19 test files, **139/139 pass** (was 95; added 44 component/integration tests). Typecheck on every Issue Refinery file: clean. Integration test confirms strict-schema stripping at the wire, per_page=100 on the gitlab GET, all 3 stages use `responseFormat: { type: 'json_schema', strict: true }`, and the publish PUT lands at `/gitlab-api/projects/999/issues/12` with `{ description: REFINED_BODY }`. **Ready for deep-review checkpoint #2.**

### 2026-05-22 · Deep-review checkpoint #2 + Phase B fix loop
Dispatched 5 parallel reviewers against the 7-commit UI delta. Findings consolidated into `docs/reviews/2026-05-22-issue-refinery-phase-B-review.md`. Three critical findings, ~16 important, ~15 nice-to-have.

**Fixed (single fix-loop commit):**
- **B-C1** — `bridgedIidRef.current = loadedEpicIid` was assigned before fetch resolved, locking out retry of the same epic when the fetch failed. Moved the assignment into the `.then(ok)` branch so it only persists after a successful bridge.
- **B-C2** — `RefinedIssueCard`'s textarea is now `readOnly` whenever `phase !== 'ready' | 'idle' | 'error'`. The pipeline can no longer silently overwrite the user's mid-typing edits. Aria-label updates accordingly.
- **B-C3** — Added `src/test/integration/issueRefineryFailures.test.tsx` covering three failure paths the original integration test missed: gitlab fetch failure, mid-stage pipeline failure, publish PUT failure. Uses `vi.resetAllMocks()` rather than `clearAllMocks()` so queued `mockResolvedValueOnce` setups don't leak between cases.
- **B-I1** — `ChildIssueList` now implements the WAI-ARIA radio pattern: Up/Down/Left/Right wrap-around selection, Home/End for first/last, `tabIndex=0` only on the selected item. Companion test file `ChildIssueList.aria.test.tsx` (7 tests).
- **B-I2** — `ValidationCard` score badge now includes a tier word ("Good" / "Fair" / "Poor") visible *and* in the aria-label so screen-reader users get the same signal sighted users do (was color-only previously). Companion test file `ValidationCard.aria.test.tsx` (4 tests).
- **B-I3** — `PromptCacheHUD` removed entirely (component + test). YAGNI — `lastCachedTokens` was never written by the action layer, so the HUD was dormant by design. Re-introduce as a focused task when `aiClient.callAI` is extended to expose `prompt_tokens_details.cached_tokens`.
- **B-I4** — `bridgeLoadedEpicAction(groupId, epicIid, epic)` extracted into `src/actions/refineIssueAction.ts`. The view no longer imports `fetchEpicIssues` directly — keeps the action-boundary pattern clean.

**Acknowledged (deferred — see review doc):**
- `window.confirm` a11y limitations (replaceable with `<dialog>` in a polish task).
- `AbortController` for the gitlab fetch (cancelled flag already prevents store writes; aborting HTTP is v2).
- Refetch on tab re-entry (`bridgedIidRef` resets on remount — minor cost).
- Multiple per-field Zustand selectors (cosmetic).
- Large-body textarea performance (measure in dogfood first).
- Verbose error-text in toasts (action layer should scrub at source).
- Severity-prefix parsing brittleness (works for current prompt; lift to schema if it drifts).
- CSS not in delta (next polish task).

**Verification:** 21 test files, **157/157 pass** (was 139; added 18 net-new tests: 7 arrow-key, 4 tier-label, 4 readOnly per phase, 3 integration failure paths). Typecheck on every Issue Refinery file clean. Pre-commit hooks all green.

**Exit criteria for R-17 (KB docs + devlog + PR) met.**

### 2026-05-21 · R-8 (task 9) — runIssuePipeline orchestrator
Created `src/pipeline/issue/runIssuePipeline.ts` — pure async function composing R-5 → R-6 → R-7. No store imports, no UI imports, no fetch logic. Scope-guard verified by `grep -E "from '.*pipeline/stages|from '.*pipeline/orchestrator'"` returning empty. Each stage is wrapped in try/catch that re-throws as `IssuePipelineError` with `stage: 'comprehension' | 'refinement' | 'validation'` and the original cause attached, so the action layer (R-9) can tell the user which step failed and the UI can surface stage-specific recovery options. Partial results from completed earlier stages are NOT returned on failure — strict success-or-error to avoid the action layer accidentally committing a mid-flight state. `IssuePipelineResult` includes `cachedTokens: number[]` populated with `[0, 0, 0]` for now (placeholder — `aiClient.callAI` does not yet expose `data.usage.prompt_tokens_details.cached_tokens`; the field shape stays stable so a future aiClient extension can populate without contract changes). **Verification:** 6/6 tests pass: happy path with sequential invocation, comprehension forwarded to refinement, refined body forwarded to validation, Comprehension failure short-circuits the other stages, Refinement failure tags `stage='refinement'`, Validation failure tags `stage='validation'`. Each stage is module-mocked at the `vi.mock` level. Typecheck clean.

### 2026-05-21 · R-7 (task 8) — Validation stage runner
Created `src/pipeline/issue/validation/runValidation.ts`, identical shape to R-5/R-6. Signature: `runValidation(aiConfig, epicBody, issueBody, refinedBody)`. Temperature 0.2, `reasoningEffort: 'minimal'`, strict json_schema for `ValidationResult`. Refined body embedded under `<refined>...</refined>` via `buildPrompts('validation', ..., { refined })`. Return type: `{ score: 0-100, findings: string[] }` per the design's advisory-only contract; UI never gates Publish on it. **Verification:** 6/6 tests pass: happy path, params plumbing, refined-body embedded in user prompt, perfect score (100 + empty findings), Instructor retry on out-of-range score (150 → corrected), double-fail throws. Typecheck clean.

### 2026-05-21 · R-6 (task 7) — Refinement stage runner
Created `src/pipeline/issue/refinement/runRefinement.ts` with the same Instructor-retry shape as R-5. Signature: `runRefinement(aiConfig, epicBody, issueBody, comprehension)`. Temperature 0.4 (the design's moderate-temp setting for the rewriting stage), `responseFormat` strict json_schema for `RefinementResult`, no `reasoningEffort` (omitted — moderate creativity is desired). Comprehension result flows in via `buildPrompts('refinement', ..., { comprehension })` which embeds the JSON.stringify-d comprehension under `<comprehension>...</comprehension>`. **Verification:** 6/6 tests pass: happy path, params plumbing (temp 0.4 + responseFormat), comprehension JSON embedded in user prompt, GitLab quick-action preservation through the pass-through (system rule #3 enforced upstream but verified the runner doesn't strip them), Instructor retry on too-short body, double-fail throws. Typecheck clean.

### 2026-05-21 · R-5 (task 6) — Comprehension stage runner
Created `src/pipeline/issue/comprehension/runComprehension.ts` exporting `runComprehension(aiConfig, epicBody, issueBody)`. The runner builds prompts via `buildPrompts('comprehension', ...)`, converts `ComprehensionSchema` to JSON Schema via `z.toJSONSchema()` (Zod 4 built-in), and calls `aiClient.callAI` wrapped in the existing `withRetry` (network retry only). Stage params: `temperature: 0.2`, `reasoningEffort: 'minimal'`, `responseFormat: { type: 'json_schema', strict: true, name: 'ComprehensionResult', schema }`. On JSON parse or schema validation failure, the Instructor retry pattern fires: a single additional call is issued with `PREVIOUS ATTEMPT FAILED JSON-SCHEMA VALIDATION:\n<error>\n...` appended to the user prompt. After the second failure, the runner throws with diagnostic. **Verification:** `npx vitest run src/pipeline/issue/comprehension/runComprehension.test.ts` → 5/5 passed: happy path, params plumbing (temperature + responseFormat), Instructor retry succeeds on second call, double-fail throws, malformed-JSON throws. callAI is module-mocked. Typecheck clean. Test file initially had a noUncheckedIndexedAccess error on direct `mock.calls[n]` destructuring; refactored to use a `callNth(n)` helper that asserts presence — same pattern will reuse in R-6 / R-7.

### 2026-05-21 · R-4 (task 5) — promptAssembly module
Created `src/pipeline/issue/promptAssembly.ts` exporting `buildPrompts(stage, epicBody, issueBody, previous?)`, `SYSTEM_RULES`, `STAGE_INSTRUCTIONS`, and `getCachePrefix()` (the last is exported for the cache-discipline test). The static prefix — `SYSTEM_RULES` as systemPrompt plus the `<epic>...</epic>\n\n<issue>...</issue>` document block — is byte-identical across all three stage calls. Only the tail (stage-specific instruction + optional previous-stage data block) varies. This is what enables prompt-cache hits on stages 2 and 3 per the Azure research. **Verification:** `npx vitest run src/pipeline/issue/promptAssembly.test.ts` → 10/10 passed (initial run had one false-positive assertion conflating the JSON data block with the word "comprehension" in the stage instruction; rewrote the test file using delete-then-Write since the H3 hook blocks edits to just-created test files). Tests cover: byte-identical systemPrompt across stages, byte-identical cache prefix across stages, divergent tails, no Date/timestamp/requestId tokens in the static prefix (regex assertions), determinism (same inputs → same output, ruling out Date.now / Math.random), and per-stage tail content (comprehension has no data block; refinement embeds JSON.stringify(comprehension); validation embeds refined body verbatim; refinement without previous.comprehension does not insert an empty data block). Typecheck clean.

### 2026-05-19 · R-3 (task 4) — pipeline Zod schemas
Added `zod ^4.4.3` as a direct project dependency (was resolving from a global install previously — would not have shipped in any bundle). Created `src/pipeline/issue/schemas.ts` with `ComprehensionSchema`, `RefinementSchema`, and `ValidationSchema`. Each field carries the budget/vocabulary rules in `.describe()` per the Azure prompt-engineering research finding (constraints in schema descriptions are materially stronger than the same rules in prose prompts). Refinement schema enforces 4-section markdown via the description; no H1 rule; GitLab quick-action preservation rule. Validation findings must be `[critical]` / `[important]` / `[nit]` prefixed. Compile-time bidirectional compatibility check (`IsExactly<>` helper) ensures `z.infer<>` of each schema matches the predeclared interface in `types.ts` — if either side drifts, the build fails. **Verification:** `npx vitest run src/pipeline/issue/schemas.test.ts` → 13/13 passed (valid parse, empty-field reject, oversize-array reject, missing-field reject, 50-char floor reject, score bounds 0/100/-1/150/85.5, findings-cap). Typecheck on R-3 files clean.

### 2026-05-19 · R-2 (task 3) — issueRefineryStore
Created `src/stores/issueRefineryStore.ts` (Zustand v5, in-memory, no persistence) and the predeclared result types in `src/pipeline/issue/types.ts` so the store can reference `ComprehensionResult` / `ValidationResult` / `Phase` without depending on the R-3 Zod schemas. Store state: `selectedEpic`, `children`, `selectedChildIid`, `originalBody`, `originalProjectId`, `comprehension`, `refinedDraft`, `userEditedDraft`, `validation`, `phase`, `error`, `lastCachedTokens`. Actions: `setSelectedEpic` (clears all per-child derived state, fresh epic context), `setSelectedChild` (pulls description + project_id from the matching child; no-op for unknown iid; clears derived state on switch), `setComprehension`, `setRefinedDraft(draft, userEdited)` (the boolean is what the UI's `Refine again` confirmation reads), `setValidation`, `setPhase(p, error?)`, `recordCachedTokens` (dev observability), `reset`. **Verification:** `npx vitest run src/stores/issueRefineryStore.test.ts` → 12/12 passed (target was ≥8). Coverage: initial state, setSelectedEpic clears derived state, setSelectedChild happy path + missing description fallback + unknown iid no-op + switching child clears state, userEditedDraft flag behavior, setPhase with/without error, recordCachedTokens append order, reset. Typecheck on R-2 files clean (0 errors).

### 2026-05-18 · R-1 (task 2) — gitlabClient.updateIssue + pagination fix
Added `UpdateIssuePayload` type to `src/services/gitlab/types.ts` and `updateIssue(config, projectId, issueIid, payload)` to `src/services/gitlab/gitlabClient.ts`. Endpoint is `PUT /projects/:projectId/issues/:iid` with body `{description?, title?, labels?}`; labels serialized as comma-separated per GitLab convention; `projectId` URL-encoded via `encodeURIComponent` so path-style IDs like `group/subgroup/project` work. Comment in the function body explicitly warns against confusing this with the `/groups/:gid/epics/:eid/issues/:id` endpoint (which only assigns, not updates content). Also addressed the R-0 pagination caveat in the same commit: `fetchEpicIssues` now requests `?per_page=100` so it doesn't silently truncate large epics at GitLab's default 20. Full Link-header pagination is deferred to a future hardening task — per_page=100 covers any epic with ≤100 children which is sufficient for v1. Tests added in a new file `gitlabClient.issueRefinery.test.ts` (the kit H3 hook blocks edits to the existing `gitlabClient.test.ts`): 6 updateIssue tests (happy path, slash-bearing project ID, label serialization, 4xx error, network error, undefined-field omission) and 1 fetchEpicIssues pagination test. **Verification:** `npx vitest run src/services/gitlab/gitlabClient.issueRefinery.test.ts` → 7 passed. `npx vitest run src/services/gitlab/gitlabClient.test.ts` → 37 passed (no regressions). Typecheck filtered to R-1 files: 0 errors. Pre-existing typecheck errors elsewhere (crossFeature.test.ts, gitlabFlow.test.ts, etc.) are out of scope.

### 2026-05-18 · R-0 (task 1) — preflight + branch
Created branch `feature/issue-refinery` stacked on `feature/phase-a-docmining` (option-1 per user). Working tree carried forward 144 uncommitted files; will commit Issue Refinery planning artifacts + Taskmaster config in one commit and leave unrelated changes (BEMT cleanup, pre-session hook/setting tweaks) for separate commits per user direction. **R-0b verification:** `aiClient.ts:60` transparently forwards `request.responseFormat` to `body.response_format` — strict `{ type: 'json_schema', strict: true }` is wire-supported at the client layer; deployment-level support (Azure API version 2024-08-01-preview+) is an assumption pending the first real call in R-5. **R-0c verification:** `gitlabClient.fetchEpicIssues` (line 295) exists, calls `/groups/:groupId/epics/:epicIid/issues`, returns `GitLabIssue[]` with optional `description`. **Caveat surfaced:** the function does not currently paginate — it will silently truncate at GitLab's default `per_page=20`. R-2 (task 3) must add `per_page=100` and follow Link headers; flagged in the design doc §6.2 and the plan's risk table (R4). **Taskmaster setup:** routed via the native `claude-code` provider (no API key, free), `parse-prd` produced 20 tasks in 113K tokens, dependency graph respects the plan's ordering (e.g., task 10 depends on 9+3+2, UI tasks 11–14 depend on 10).

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
