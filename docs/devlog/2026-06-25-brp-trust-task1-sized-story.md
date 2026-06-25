# 2026-06-25 — BRP trust T1: single canonical SizedStory

**Tag:** brp-trust · **Task:** 1/15 · **Plan:** docs/plans/2026-06-25-brp-create-epic-and-velocity-capacity.md

## What
Introduced the single canonical decomposition unit `SizedStory` (D14) to end the
dual `breakdown` + `generatedStories` split that let the displayed total drift from
the displayed stories.

- `src/domain/brp.ts`: added `SplitPattern` (SPIDR), `StoryProvenance`, `SizedStory`;
  added `FrameResult.stories?: SizedStory[]` as the canonical source of truth; marked
  `frameEstimate` (D7), `breakdown`, `generatedStories` `@deprecated` (transitional).
- `src/services/brp/ai/schemas.ts`: `SplitPatternSchema`, `StoryProvenanceSchema`,
  `SizedStorySchema` (points constrained to Fibonacci ladder), `FrameResultSchema.stories`.
- `src/services/brp/ai/simulatedEstimator.ts`: now populates `stories` from its breakdown
  so `Σ stories.points === Σ breakdown.points` by construction (INV2 holds for the simulator).

## Why phased (optional `stories`)
`breakdown`/`generatedStories`/`frameEstimate` are consumed across ~30 files. Making
`stories` optional + deprecating the legacy fields keeps the build green while consumers
migrate task-by-task; the dual-model cleanup task makes `stories` required and drops the
legacy fields.

## Verification
- `npx vitest run` schema + simulated estimator: 77 passed (incl. new `schemas.sizedStory.test.ts`).
- Full BRP suite: 302 passed, 1 skipped.
- `tsc -b`: no errors in changed files; remaining errors are pre-existing in unrelated
  areas (gitlab/initiative/issues/settings), not introduced here.

## Note
New tests added in a NEW file (`schemas.sizedStory.test.ts`) — existing test files are
protected by the H3 pre-edit hook (correctly blocked an attempt to edit `schemas.test.ts`).
