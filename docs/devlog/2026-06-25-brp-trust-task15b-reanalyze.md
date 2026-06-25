# 2026-06-25 — BRP trust T15 (cont.): wire Re-analyze

**Tag:** brp-trust · **Task:** 15/15 (completed)

## What
Closed out the Re-analyze half of T15:
- EpicRow: optional `onReanalyze` → a Re-analyze button in the variance cell.
  Emphasised red "Re-analyze to size" for story-less epics (frameResult/stories
  empty) so the load is never a naked number (INV6); subtle "Re-analyze" otherwise.
- PodView: `onReanalyzeEpic?(epic)` threaded to each row.
- BrpView: wizard state now carries {mode, epic}. Re-analyze opens the wizard in
  reanalyze mode scoped to the epic; onGenerate seeds the pipeline with the epic's
  existing body + the planner's added direction; onPublish routes through
  publishReanalyzedEpicAction.
- brpActions: `publishReanalyzedEpicAction` — updateEpicWithStories (T12) + refresh
  the epic in place with the confirmed decomposition (load = Σ points, INV2).

## Verification
- New tests: brpActions.reanalyze.test.ts (update-in-place, load=13, failure no-mutate);
  EpicRow.reanalyze.test.tsx (button presence/emphasis/click-not-select). All BRP
  tests: 452 pass. tsc clean (13 baseline).
- VISUAL LOOP (live app): story-less epic shows red "Re-analyze to size"; click →
  wizard opens "Re-analyze Epic" scoped to "Fraud rule engine" with the direction field.
