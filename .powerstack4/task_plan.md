# BRP — Breakdown & Re-groom Planning (Headless Layer: P1 → P4)

## Goal
Ship the headless layer of BRP (types, store, AI seam, GitLab service) per
`.taskmaster/docs/brp-headless-prd.txt`. No UI in this PRD — Phase 5/6/7
are separate. Land on `feature/brp` branch, mergeable to `main` independently.

## Architecture
- Pure model + math: `src/domain/brp.ts` + `brp.constants.ts` (no React, no Zustand).
- Single Zustand store: `src/stores/brpStore.ts` (inputs/raw only, never derived).
- AI seam: `AIEstimator` interface in `domain/brp.ts`; deterministic simulator in
  `src/services/brp/ai/simulatedEstimator.ts`; provider for P7 swap-in.
- GitLab service: `src/services/brp/brpGitlabService.ts` composing `gitlabClient.ts`.

## Phases (per PRD §10)

| # | Task | Status |
|---|------|--------|
| B-0  | Preflight verification | in_progress |
| B-1  | P1 types + constants | pending |
| B-2  | computeCapacity + tests | pending |
| B-3  | computeDelta + computeVariance + tests | pending |
| B-4  | computePodMetrics + tests | pending |
| B-5  | brpStore state + Loading actions | pending |
| B-6  | brpStore Capacity + Estimates + Analysis actions | pending |
| B-7  | brpStore Navigation + UI actions | pending |
| B-8  | AIEstimator + Zod schemas | pending |
| B-9  | simulatedEstimator + provider | pending |
| B-10 | brpGitlabService skeleton + mocked tests | pending |
| B-11 | brpGitlabService live smoke (gated) | pending |
| —    | 5-agent deep-review checkpoint | pending |
| B-12 | Knowledge base docs | pending |
| B-13 | Devlog + ADR-0003 + final commit | pending |

## Key Decisions (locked)
- **D1** Pure layer at `src/domain/brp.ts` (NOT `src/types/` — matches codebase).
- **D2** Three invariants enforced by type shape: no top-level variance/delta on
  Epic, no totalCapacity on Pod, VarianceBand is a return type only.
- **D5** `AIEstimator` interface lives in `domain/brp.ts` (per p2's recommended option).
- **D9** Branch `feature/brp` from `main` via worktree at
  `/Users/arpit/Documents/FRAME_DEPLOYED-brp`, mergeable independent of IR.
- Chart library for P5: **recharts** (~200KB) — added in P5, not in this PRD.
- Variance UI labels deferred to P5; internal type names locked here.

## Error Log
(none yet)

---

## Journal

### B-0 — Preflight Verification (in_progress → done)

**Date:** 2026-05-24
**Branch:** feature/brp at 88ed7ca (main HEAD before IR work)
**Worktree:** /Users/arpit/Documents/FRAME_DEPLOYED-brp

**Commands run:**

```
$ git branch --show-current
feature/brp

$ git worktree list
/Users/arpit/Documents/FRAME_DEPLOYED      3cf6831 [feature/issue-refinery]
/Users/arpit/Documents/FRAME_DEPLOYED-brp  88ed7ca [feature/brp]

$ git status --short
 M .taskmaster/config.json                           # claude-code provider switch
?? .taskmaster/docs/brp-headless-prd.txt             # this PRD
?? .taskmaster/tasks/                                # parse_prd output

$ npm install
added 388 packages, audited 389 in 5s
13 vulnerabilities (pre-existing on main — not BRP's concern)

$ npx tsc -b --noEmit
23 errors in 4 pre-existing test files (uiStore.test.ts, crossFeature.test.ts,
gitlabFlow.test.ts, pipelineFlow.test.ts) — all TS2532/TS2345 strict-null
violations and a missing `totalDuration` property on PipelineResult fixture.
Exit code 0 (tsc -b doesn't fail on these in build mode).
NOT caused by BRP. Baseline must remain at 23 errors.

$ npm run test:run
Test Files  2 failed | 70 passed (72)
Tests       11 failed | 1297 passed (1308)
Duration    14.70s
Failing files (pre-existing, both about missing AuthProvider in test wrappers):
  - src/components/layout/WelcomeSidebar.test.tsx (9 failures)
  - src/components/views/WelcomeScreen.test.tsx   (2 failures)
NOT caused by BRP. Baseline must remain at 11 failures.
```

**Baseline locked:**
- tsc errors: 23 (pre-existing)
- test failures: 11 (pre-existing)
- BRP work must keep both numbers ≤ current (no regressions, fix nothing outside scope).

**Notes:**
- `.claude/hooks/stop-typecheck.py` is branch-scoped to `docmining*`/`phase-a*`/
  `phase-b*` — does NOT gate on `feature/brp`. Confirmed by reading hook source.
- `.powerstack4/task_plan.md` was reset for BRP (old content was stale
  Mermaid-diagnostics research from a prior session).
- Per CLAUDE.md `Active Work` section: still says DocMining. Will be updated
  in the wrap-up after P4, not now.

**Verification:** all 5 PRD steps for B-0 confirmed (worktree exists, branch
correct, npm install clean, tsc baseline captured, test baseline captured).

**Status: done**
