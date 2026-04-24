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
- [ ] Phase B (B-0 onward) — gated on user go-ahead.
