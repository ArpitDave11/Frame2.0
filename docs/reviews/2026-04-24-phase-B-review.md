# Phase B Deep-Review — 5-Agent Aggregate

**Commit under review:** `e82b2f7` (range `8efe066..e82b2f7`) on `phase-a-docmining`.
**Protocol:** `docs/runbooks/deep-review-a10.md` — 5 parallel reviewers.
**Date:** 2026-04-24.

## Scope
Phase B browser-side wiring for the FastAPI DocMining service:
- `src/services/docmining/docminingClient.ts` (NEW)
- `src/components/editor/DocUploadModal.tsx` (NEW)
- `src/stores/uiStore.ts` (`'docUpload'` added to `ModalId`)
- `src/components/layout/ModalHost.tsx` (modal case)
- `src/components/editor/WorkspaceHeader.tsx` (Upload button)
- `vite.config.ts` (`/api/docmining` dev proxy)
- `docs/knowledge/**` (KB docs)

## Severity totals
| Reviewer | Critical | Important | Nice-to-have |
|---|---|---|---|
| Correctness | 0 | 5 | 6 |
| Architecture | 0 | 3 | 4 |
| Security | 0 | 2 | 5 |
| Production Readiness | 2 | 5 | 3 |
| Test Quality | 2 | 3 | 3 |
| **Total** | **4** | **18** | **21** |

---

## Critical findings (must-fix before B-10 checkpoint closes)

### P-C1 — Prod build has no `/api/docmining` route
**Source:** Production Readiness.
**Location:** `vite.config.ts:42-47`, `src/services/docmining/docminingClient.ts:24`.
**Risk:** `server.proxy` is dev/preview-only; `build` does not bundle the proxy. The browser hits a relative `/api/docmining/convert` against the static host → 404.
**Resolution applied:** (a) Inline comment added to the proxy block in `vite.config.ts` documenting the dev-only contract and required prod ingress, (b) new "Deployment (important)" section in `docs/knowledge/services/docmining/docminingClient.md` listing the three options (nginx/ingress rewrite, federation-shell proxy, absolute URL from `import.meta.env`), (c) cross-link in `SYSTEM.md §9b`. Client URL left relative — MVP assumes the shell handles ingress; switching to absolute URL is deferred.

### P-C2 — No `AbortSignal` on upload; close-during-upload corrupts state
**Source:** Production Readiness, Correctness.
**Location:** `docminingClient.ts:24`, `DocUploadModal.tsx:70-87`.
**Risk:** User closes modal mid-upload → component unmounts → resolved promise later fires `setMarkdown + openModal('pipeline') + refinePipelineAction()` against a user who has moved on. Also silent React 19 unmounted-setState warnings.
**Resolution applied:**
- `convertDocument` now accepts `options: { signal?, timeoutMs? }` and composes caller signal with `AbortSignal.timeout(200_000)` via `AbortSignal.any`.
- `DocUploadModal` holds an `abortRef: AbortController` + `isMountedRef`; a `useEffect` cleanup aborts the fetch on unmount and marks unmounted. Post-resolve path guards on `isMountedRef.current` before touching the store or firing the pipeline.
- Dedicated error copy for `AbortError` ("Upload cancelled or timed out") and `TimeoutError` ("Upload timed out after <N>s").
- `refinePipelineAction()` invocation now has `.catch(console.error)` to contain unhandled rejections.

### TQ-C1 — Zero coverage for `docminingClient` discriminated-union contract
**Source:** Test Quality.
**Location:** `src/services/docmining/docminingClient.ts` (no sibling `.test.ts`).
**Risk:** Any future refactor of the snake→camel mapping or the `detail`/`detail.message` fallback silently breaks `DocUploadModal`.
**Resolution applied:** `src/services/docmining/docminingClient.test.ts` (NEW) — 8 test cases:
1. happy path with full snake→camel mapping
2. request shape: multipart `FormData` with `include_markdown=true`
3. null `markdown` coerces to `''`
4. string `detail` → `error`
5. nested `detail.message` → `error`
6. non-JSON error body → `HTTP <status>` fallback
7. network failure (`TypeError`) → coerced message
8. caller-initiated abort → friendly "Upload cancelled or timed out"

Command: `npx vitest run src/services/docmining/docminingClient.test.ts` → 8/8 passed.

### TQ-C2 — Zero coverage for `DocUploadModal` happy path
**Source:** Test Quality.
**Location:** `src/components/editor/DocUploadModal.tsx`.
**Status:** **deferred to Phase C.** Rationale: the core state corruption risk (TQ-C1's neighbour) was identified as a boundary contract, not a rendering contract. Phase B is manual E2E per ultra-plan B-7. `docminingClient.test.ts` locks in the contract; a full RTL suite (validation error, success path, pipeline-modal handoff) is recommended for Phase C alongside the existing `ModalHost.test.tsx` / `WorkspaceHeader.test.tsx` updates.

---

## Important findings — handled

- **Arch #1** — choreography in modal instead of an action: **deferred to Phase C.** Rationale: moving `setMarkdown → openModal('pipeline') → refinePipelineAction()` into `src/actions/uploadDocumentAction.ts` is a clean architectural fit but carries refactor risk close to the MVP deadline; the modal already encapsulates the concern.
- **Arch #2** — envelope naming `{ ok, data | error }` vs. codebase `{ success, data?, error? }`: **accepted.** The KB doc now justifies the choice (a discriminated union is the stricter idiom; GitLab's loose envelope is legacy). Added a code comment in `docminingClient.ts` noting the intent.
- **Arch #3** — prod deploy callout missing from §9b: fixed with KB updates (see P-C1).
- **ProdReady observability gap**: partially handled — `console.error` now fires on unexpected exceptions in `convertDocument`. Toast-layer integration deferred.
- **ProdReady unbounded browser timeout**: fixed (200 s `AbortSignal.timeout`).
- **Security dev-server bind `0.0.0.0` + new proxy widens LAN exposure**: **deferred.** Pre-existing posture across the codebase; switching to `127.0.0.1` has blast radius for GitLab proxy workflows. Needs user decision.
- **Correctness unmount-state-write**: fixed (C2 resolution).
- **TQ existing test files (`ModalHost`, `WorkspaceHeader`, `uiStore`) not updated**: **deferred.** H3 forbids editing existing test files; these additions belong to a Phase C ticket that rewrites the tests rather than patches them.

---

## Nice-to-have (not actioned)

Kept as a Phase C punch list:
- Strict type coerce for `pages` / `durationMs` with `??` defaults.
- FastAPI validation-error array (list of `{loc, msg, type}`) handled explicitly by the client.
- Drop-zone keyboard accessibility (`role="button"`, `tabIndex={0}`, `onKeyDown`).
- Map common HTTP codes (413/415/5xx) to friendlier copy.
- `Accept: application/json` header on fetch.
- Startup-time log of resolved `VITE_DOCMINING_BASE_URL` for dev footgun awareness.
- Preview-mode proxy block to match `server.proxy`.

---

## Verification

- `npx vitest run src/services/docmining/docminingClient.test.ts` → **8/8 passed** (366 ms).
- H1/H3/H5 hooks passed on the base commit; fix-loop commit will re-verify.
- No edits to existing test files (H3 respected).
- No edits under `src/components/welcome/` or `src/pipeline/stages/` (scope guards respected).

## Exit criteria for B-10 checkpoint
- ✅ Zero critical findings remaining after fix-loop.
- ✅ New regression tests green.
- ✅ KB docs updated.
- ✅ Conventional-commit ready.
