# Phase A Deep Review — DocMining Backend

**Date:** 2026-04-24
**Branch:** `phase-a-docmining`
**Commit reviewed:** `6f2a1ee`
**Scope:** `git diff main...HEAD -- backend/docmining/` (9 files, ~430 LOC)
**Reviewers:** 5 parallel agents (Correctness, Architecture, Security, Production Readiness, Test Quality)

---

## Severity Summary

| Severity | Count | Must fix this phase |
|---|---|---|
| Critical | 3 | yes |
| Important | 14 (after dedup) | 6 this phase, 8 deferred to Phase B/C |
| Nice-to-have | 22 | deferred |

---

## Critical

### C1 — Double-buffer defeats streaming cap (memory DoS)
**Where:** `backend/docmining/app/services/docling_service.py:58-59`
**Raised by:** Security, Production Readiness, Correctness, Architecture
**Issue:** `io.BytesIO(fh.read())` loads the full 50 MB tempfile into RAM after `_stream_to_tempfile` already wrote it to disk. Docling's `max_file_size` parameter becomes redundant, and per-request RSS doubles.
**Fix:** Pass `Path` directly to `converter.convert(path, ...)`. Remove the `DocumentStream` + `io.BytesIO` wrapping.

### C2 — Malformed `HTTPException` detail dict
**Where:** `backend/docmining/app/api/v1/documents.py:139-141`
**Raised by:** Architecture, Production Readiness
**Issue:** `raise HTTPException(422, {"message": ..., "errors": ...})` passes a dict where FastAPI expects `detail=...`. Response body renders as `{"detail": {"message": "...", "errors": [...]}}`, breaking the `ConvertResponse.errors` contract clients expect.
**Fix:** Use `detail=` kwarg with string, or return 200 with `status="failure"` matching the Pydantic schema.

### C3 — Status string comparison, not enum
**Where:** `backend/docmining/app/api/v1/documents.py:138`
**Raised by:** Correctness
**Issue:** Route branches on `payload["status"] == "failure"` — a raw string. `convert_sync` already computes a proper `ok` boolean from `ConversionStatus.{SUCCESS, PARTIAL_SUCCESS}` but discards it. A new Docling status value would silently pass as success.
**Fix:** Have `convert_sync` return `ok: bool`; branch the route on that.

---

## Important (must fix this phase)

### I1 — Tempfile leaks on error paths
**Where:** `documents.py:114-135`
**Raised by:** Correctness (#1, #3), Security (#8), Production Readiness (#5, #9), Architecture (#3)
**Issue:** `BackgroundTasks` registered via `background.add_task(_cleanup, path)` does run on HTTPException responses (FastAPI does execute background tasks after exceptions in recent versions), but non-HTTPException failures (OSError, CancelledError) before registration leak the tempfile. Also: if the process crashes mid-conversion, `/tmp/docmining-*` accumulates with no sweeper.
**Fix:** Wrap everything after `_stream_to_tempfile` in `try/finally: _cleanup(path)`. Drop `BackgroundTasks`. Deterministic cleanup.

### I2 — `_stream_to_tempfile` uses unsanitized suffix
**Where:** `documents.py:62`
**Raised by:** Correctness (#7)
**Issue:** `suffix = Path(upload.filename or "").suffix` runs on the raw uploaded filename before sanitization. A crafted `"foo.pdf/../evil"` raises on `tempfile.mkstemp` (DoS).
**Fix:** Compute suffix from the sanitized `name` in the route, pass it in as a parameter.

### I3 — Silent fallback on `enable_remote_services` guardrail
**Where:** `docling_service.py:43-46`
**Raised by:** Security (#4), Architecture (#5), Production Readiness (#8)
**Issue:** `try/except AttributeError` silently no-ops if neither attribute exists in a future Docling version, allowing remote VLM/LLM calls.
**Fix:** After build, read back the effective value and `assert` / `raise RuntimeError`.

### I4 — Dead `except ConversionError` branch
**Where:** `documents.py:134-135`
**Raised by:** Architecture (#2)
**Issue:** `convert_sync` passes `raises_on_error=False`, so `ConversionError` never escapes the executor. The except clause is unreachable.
**Fix:** Remove it.

### I5 — `workers=1` is advisory only
**Where:** `config.py:21`, `main.py:39`
**Raised by:** Production Readiness (#4)
**Issue:** Pydantic's `Field(1, ge=1, le=1)` enforces the env-derived value, but `ThreadPoolExecutor(max_workers=settings.workers)` reuses the same knob. Nothing prevents a future refactor from passing a larger value. The comment warns of silent data corruption — make it an invariant.
**Fix:** Pin `ThreadPoolExecutor(max_workers=1)` as a literal in `main.py`; add `assert settings.workers == 1` in lifespan.

### I6 — `executor.shutdown(wait=True, cancel_futures=False)` blocks SIGTERM
**Where:** `main.py:48`
**Raised by:** Production Readiness (#6)
**Issue:** On SIGTERM with a 180 s conversion in flight, shutdown blocks the full duration. Kubernetes `terminationGracePeriodSeconds` (default 30 s) will SIGKILL, orphaning tempfiles.
**Fix:** `cancel_futures=True` + `wait=True`. Pending futures are cancelled, running one completes best-effort.

---

## Important (deferred — Phase B/C)

- **S2** Magic-byte sniff for polyglot detection (add `python-magic` or 16-byte header check) — not MVP-critical for local-only service.
- **S3** `defusedxml` for XXE / billion-laughs — pin in Phase B when DOCX/XLSX inputs arrive in practice.
- **S5** Document `--host 127.0.0.1` binding requirement in README / `.env.example`.
- **S6** Filename scrubbing beyond null-byte removal before it flows into GitLab issue bodies — Phase B concern.
- **S7** Markdown XSS via `<script>` preserved by `export_to_markdown()` — client-side DOMPurify when SPA renders; Phase B.
- **P3** `asyncio.wait_for` can't kill the executor thread; document the process-restart requirement or swap to `ProcessPoolExecutor` in Phase C.
- **P7** Observability (X-Request-ID header, JSON logs, Prometheus) — Phase C.
- **T2** `HF_HUB_OFFLINE=1` enforcement test with `pytest-socket` — Phase B.

---

## Nice-to-have (deferred)

Full list in reviewer outputs at `/private/tmp/claude-501/.../tasks/a{8e2,853,512,ded,2a0}*.output`. Highlights:
- **Correctness #5** `e.error_message` may be `None` — coerce with `str(... or "")`.
- **Architecture #6** Rename `workers` knob (two concepts sharing one name).
- **Architecture #11** Use `str | None` (3.11+ idiomatic) instead of `Optional[str]`.
- **Production Readiness #10** `max_pages=300` + `convert_timeout_s=180` ≈ 600 ms/page — tight for OCR'd scans.
- **Test Quality** — coverage ~18% of branches; add tests for 504 timeout, 422 conversion error, `include_markdown=False`, boundary conditions, unicode filenames.

---

## Exit criteria for Phase A

- [x] Critical: 3 findings → fix all 3
- [x] Important (must-fix): 6 findings → fix all 6
- [x] Important (deferred): 8 findings → tracked; no action this phase
- [x] Nice-to-have: 22 findings → tracked; no action this phase
- [ ] All 4 pytest cases still green after fixes
- [ ] New regression test for the status/ok branch (C3) if cheap to add
