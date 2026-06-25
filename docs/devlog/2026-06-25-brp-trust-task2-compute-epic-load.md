# 2026-06-25 — BRP trust T2: computeEpicLoad + pod-metrics rewire

**Tag:** brp-trust · **Task:** 2/15 · Plan: docs/plans/2026-06-25-brp-create-epic-and-velocity-capacity.md

## What
The core trust fix (D5/INV2): epic load is now derived as the sum of the visible
stories, not a standalone model number.

- `src/domain/brp.ts`: added pure `computeEpicLoad(epic)` with precedence
  null→0, stories→Σ points, else legacy `frameEstimate`. Rewired
  `computePodMetrics` `frameLoad` to accumulate via `computeEpicLoad` (keeps the
  `analysisStatus==='done'` gate + flagged exclusion).

## Migration note
The existing (hook-protected) `computePodMetrics` tests override `frameEstimate`
WITHOUT a matching breakdown and assert `frameLoad === Σ frameEstimate`. They carry
no `stories`, so the legacy fallback path keeps them exactly correct. Production
estimators (simulator now; Azure in T3-T6) always populate `stories`, so the live
path is the canonical sum. The fallback is removed in the dual-model cleanup task.

## Verification
- New `src/domain/brp.computeEpicLoad.test.ts`: 6 cases (empty, multi-sum,
  sum-overrides-frameEstimate, single, legacy fallback, empty-array fallback).
- Full BRP suite: 308 passed, 1 skipped.
- `tsc -b`: 0 errors in changed files (13 pre-existing unrelated errors unchanged).
