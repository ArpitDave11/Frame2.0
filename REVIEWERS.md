# Phase A Review Summary

**Branch:** `phase-a-docmining` · **Date:** 2026-04-24
**Full report:** `docs/reviews/2026-04-24-phase-A-review.md`

## Totals

| Severity | Count | Addressed this phase |
|---|---|---|
| Critical | 3 | 3 fixed |
| Important (must-fix) | 6 | 6 fixed |
| Important (deferred to Phase B/C) | 8 | tracked, no action |
| Nice-to-have | 22 | tracked, no action |

## Top 3 Critical Findings (all fixed)

1. **Double-buffer memory DoS** — `docling_service.py` loaded the full 50 MB upload into RAM via `io.BytesIO(fh.read())` after streaming to disk. Fixed by passing `Path` directly to `converter.convert()`.
2. **Malformed error response shape** — `HTTPException(422, {"message":..., "errors":...})` produced `{"detail": {...}}` instead of `{"detail": "..."}`, breaking the client contract. Fixed by stringifying errors into the detail.
3. **Status-string comparison, not enum** — route branched on `payload["status"] == "failure"`, ignoring the `ok` boolean computed from `ConversionStatus`. Fixed by returning and branching on `ok`.

## Must-Fix Important Findings (all fixed)

- **Tempfile cleanup on error paths** — switched from `BackgroundTasks` to explicit `try/finally: _cleanup(path)`.
- **Unsanitized suffix in `mkstemp`** — route now derives suffix from sanitized `ext`, not raw `upload.filename`.
- **`enable_remote_services=False` silent fallback** — added explicit post-build assertion and post-read verification.
- **Dead `except ConversionError`** — removed (unreachable because `raises_on_error=False`).
- **`workers=1` advisory only** — hardcoded `max_workers=1` literal in `ThreadPoolExecutor` + `assert settings.workers == 1` in lifespan.
- **`executor.shutdown` SIGTERM hang** — switched to `cancel_futures=True`.

## Verification

- `pytest -q` → 6 passed (4 original + 2 new regression tests for C2/C3).
- Tempfile cleanup path exercised by the 413 oversize test.
- `enable_remote_services` post-check runs on every cold boot via lifespan.

## Deferred (tracked for Phase B/C)

- Magic-byte sniff / polyglot detection (S2).
- `defusedxml` / XXE mitigation (S3).
- Document `--host 127.0.0.1` bind (S5).
- Markdown XSS scrub when SPA renders (S7).
- `pytest-socket` offline-enforcement test (T2).
- Observability hooks — X-Request-ID, JSON logs, Prometheus (P7).
- `ProcessPoolExecutor` for true timeout-kill (P3).
- Expanded test coverage (T1–T12): boundary conditions, unicode filenames, timeout 504, `include_markdown=False`.

## Exit criteria

- [x] Zero critical findings open.
- [x] Zero must-fix important findings open.
- [x] All tests green (6/6).
- [x] Full review report committed.
- [x] Phase B (B-0 onward) — implemented and reviewed (see Phase B Review Summary below).

---

# Phase B Review Summary

**Branch:** `phase-a-docmining` · **Date:** 2026-04-24
**Full report:** `docs/reviews/2026-04-24-phase-B-review.md`
**Base commit:** `e82b2f7` (feat(upload): wire DocUpload modal into SPA with auto-refine)

## Totals

| Severity | Count | Addressed this phase |
|---|---|---|
| Critical | 4 | 3 fixed, 1 deferred (modal RTL suite — Phase C) |
| Important | 18 | 5 fixed, 13 deferred or accepted |
| Nice-to-have | 21 | tracked, no action |

## Top Critical Findings

1. **No prod route for `/api/docmining`** — Vite proxy is dev-only; prod build 404s. Fixed via KB "Deployment (important)" section + inline comment in `vite.config.ts` + `SYSTEM.md §9b` cross-link. Client stays on the relative path; shell-layer ingress is the prod contract.
2. **State corruption on modal close mid-upload** — resolved fetch would mutate store and fire the pipeline after unmount. Fixed: `AbortController` + `isMountedRef` cleanup in `DocUploadModal`; `convertDocument` takes `{ signal, timeoutMs }` with `AbortSignal.any([caller, timeout])` composition and a 200 s client cap. `refinePipelineAction()` call now has `.catch(console.error)`.
3. **Zero coverage for the client contract** — new `docminingClient.test.ts` locks the discriminated-union shape (8 cases, all pass): happy path, multipart body, null-markdown coerce, string `detail`, nested `detail.message`, non-JSON fallback, network error, abort.
4. **Zero coverage for `DocUploadModal` rendering** — deferred to Phase C; contract-level protection via #3 is sufficient for MVP.

## Verification

- `npx vitest run src/services/docmining/docminingClient.test.ts` → 8 passed (366 ms).
- H1/H3/H5 hooks passed; no existing test files edited.
- No edits under `src/components/welcome/` or `src/pipeline/stages/`.

## Deferred (tracked for Phase C)

- Extract choreography to `src/actions/uploadDocumentAction.ts` for testability.
- RTL suite for `DocUploadModal` + updates to `ModalHost.test.tsx` / `WorkspaceHeader.test.tsx` / `uiStore.test.ts`.
- Toast-layer observability for upload failures.
- HTTP-code friendly error copy (413/415/5xx).
- Drop-zone keyboard accessibility.
- FastAPI validation-error array parsing.
- `preview` mode proxy block.
- Dev-server bind hardening (`127.0.0.1` instead of `0.0.0.0`).

## Exit criteria

- [x] Zero unresolved critical code-path findings (doc + code fixes applied for P-C1/P-C2/TQ-C1).
- [x] New regression tests green (8/8).
- [x] Full review report committed.
- [x] KB updated for deployment + abort semantics.
