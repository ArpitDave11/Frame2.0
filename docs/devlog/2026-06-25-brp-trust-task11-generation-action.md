# 2026-06-25 — BRP trust T11: headless epic generation action

**Tag:** brp-trust · **Task:** 11/15

## What
`generateEpicFromRequirement(requirement, opts)` in brpActions.ts: runs the PURE
6-stage pipeline orchestrator on the requirement (local sink — no epicStore
writes, INV5), then runs the FRAME estimator on the generated epic, returning a
`GeneratedEpicDraft { epicContent, frameResult }` for preview/publish. Powers both
Create New (blank requirement) and Re-analyze (epic + direction) — the wizard (T13)
will call it.

## Guards
- No AI provider → error (no pipeline call). Empty requirement → error.
- Pipeline failure and estimator error events both propagate as Result errors.
- INV5: never imports/touches epicStore; uses the orchestrator return value.

## Verification
- New `brpActions.generate.test.ts`: pipeline→estimator happy path, INV5
  (setMarkdown spy not called), no-provider, empty input, pipeline failure,
  estimator error. Existing brpActions tests still pass — 27/27. tsc clean (13 baseline).
