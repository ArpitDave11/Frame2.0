# src/services/docmining/docminingClient.ts

## Purpose
Browser-side client for the DocMining FastAPI backend. POSTs a single file to `/api/docmining/convert` (Vite dev proxy rewrites to `http://localhost:8000/api/v1/documents/convert`) and returns extracted markdown. Mirrors the GitLab client convention: returns a `{ ok, data | error }` discriminated union — never throws.

## Exports

### Types
- `ConvertResult` — `{ markdown: string; fileName: string; pages: number; durationMs: number }`.
- `ConvertOutcome = { ok: true; data: ConvertResult } | { ok: false; error: string }`.

### Functions
- `convertDocument(file: File): Promise<ConvertOutcome>` — builds a `FormData` with the file and `include_markdown=true`, POSTs to `/api/docmining/convert`. On `res.ok`, maps the JSON body (`markdown`, `file_name`, `pages`, `duration_ms`) into `ConvertResult`. On non-ok, parses `detail` (string or `{message}`) for the error; falls back to `HTTP <status>`. Network/parse failures → `{ ok: false, error: <message> }`.

### Constants
- `ALLOWED_UPLOAD_EXTENSIONS` — readonly tuple: `.pdf .docx .pptx .xlsx .html .htm .png .jpg .jpeg .tiff .tif .md .txt`. Mirrors the backend allowlist.
- `MAX_UPLOAD_MB = 50` — client-side size cap; also enforced server-side at `backend/docmining/app/core/config.py` (`max_file_mb`).

## Behavior
1. Build `FormData` with `file` + `include_markdown=true`.
2. `fetch('/api/docmining/convert', { method: 'POST', body: fd })` — no `Content-Type` header (browser sets multipart boundary).
3. If `!res.ok`: attempt `res.json()`; pull string from `detail` or `detail.message`; else use `HTTP <status>`.
4. Else: `res.json()` → snake_case → camelCase mapping into `ConvertResult`.
5. Catches `TypeError` (network), `SyntaxError` (non-JSON) → `{ ok: false, error }`.

## Dependencies
- Browser `fetch`, `FormData`.
- Vite dev proxy declared in `vite.config.ts` (`/api/docmining` → `VITE_DOCMINING_BASE_URL || http://localhost:8000`, with rewrite stripping the prefix and re-prepending `/api/v1/documents`).
- No store imports — pure function, reusable from anywhere.

## Consumers
- `src/components/editor/DocUploadModal.tsx` — sole caller today. On `ok:true`, writes `outcome.data.markdown` into `epicStore` via `setMarkdown`, then auto-opens the pipeline modal and fires `refinePipelineAction()`.

## Assumptions & edge cases
- **Dev-only proxy**: `/api/docmining` is defined in `vite.config.ts`; production deploys must either expose the FastAPI service under the same origin or add CORS support on the backend.
- **Backend contract**: backend returns `{ file_name, pages, duration_ms, markdown, ... }` on success and `HTTPException.detail` (string) on failure. The fallback `detail.message` lookup exists to stay resilient if FastAPI is ever reconfigured to return a dict-shaped detail.
- **Empty markdown**: if the backend returns `markdown: null` the client coerces to `''` — the caller decides whether to treat that as a soft error.
- **No retry / no abort**: a single attempt per call; no `AbortSignal` plumbing today. Long PDF conversions (≥60 s) will hit the user's default browser timeout before the 180 s backend timeout fires.
- **No auth**: the backend is an internal service with no auth layer today. Do not proxy this client to internet-facing hosts.

## Test coverage
None yet — Phase B manual E2E only. A unit test using `vi.spyOn(global, 'fetch')` to cover the discriminated-union branches is a candidate for Phase C.
