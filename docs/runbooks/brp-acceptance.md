# BRP — Acceptance Criteria Check (B-42)

**Branch:** `feature/brp` · **Date:** 2026-05-27 · **State:** ready to PR

This file captures the explicit acceptance criteria from the BRP PRD
and confirms each is met by code that lives in this branch.

## P1 — Pure model + math

| Criterion | Where | Status |
|---|---|---|
| Crew → Pod → Epic hierarchy | `src/domain/brp.ts:152-220` | ✅ |
| `computeCapacity(inputs) → CapacityResult` | `domain/brp.ts:282` | ✅ |
| `computeDelta(epic) → number \| null` | `domain/brp.ts:299` | ✅ |
| `computeVariance(epic) → VarianceBand` | `domain/brp.ts:330` | ✅ |
| `computePodMetrics(pod) → PodMetrics` | `domain/brp.ts:382` | ✅ |
| Invariant: no STORED variance/delta/totalCapacity | enforced via interface shape | ✅ |
| Fibonacci-clamped frame estimates | `domain/brp.constants.ts:FIBONACCI_POINTS` | ✅ |

## P2 — Store

| Criterion | Where | Status |
|---|---|---|
| Zustand v5 brpStore | `src/stores/brpStore.ts` | ✅ |
| Loading actions (loadCrew, loadPods, loadEpicsIntoPod, reset) | brpStore L121-242 | ✅ |
| Capacity action (updatePodCapacity) | brpStore L127, 263 | ✅ |
| Estimate action (setHumanEstimate) | brpStore L130, 282 | ✅ |
| Analysis action (runAnalysis) with BrpProgress + onError | brpStore L133, 336 | ✅ |
| Selection actions (selectCrew/Pod/Epic) | brpStore L144-146, 522 | ✅ |
| Pod scoping via `RunAnalysisOptions.podId` (B-32 C2) | brpStore L122 | ✅ |
| Concurrency guard + AbortController | brpStore L340, currentRunController | ✅ |

## P3 — AI estimator seam

| Criterion | Where | Status |
|---|---|---|
| `AIEstimator` interface | `services/brp/ai/types.ts` | ✅ |
| `AnalysisEvent` discriminated union | `services/brp/ai/types.ts:40` | ✅ |
| Deterministic simulator | `services/brp/ai/simulatedEstimator.ts` | ✅ |
| Provider seam | `services/brp/ai/estimatorProvider.ts` | ✅ |
| zod schemas for runtime validation | `services/brp/ai/schemas.ts` | ✅ |

## P4 — GitLab service

| Criterion | Where | Status |
|---|---|---|
| `fetchCrews`, `fetchPods`, `fetchPodEpics`, `fetchReferenceEpics` | `services/brp/brpGitlabService.ts:241-319` | ✅ |
| `Result<T>` with `{ code, message }` error discriminant | `brpGitlabService.ts:62-91` | ✅ |
| Composes existing `gitlabClient` (no new transport) | confirmed via imports | ✅ |
| Live smoke test (env-gated) | `services/brp/brpGitlabService.live.test.ts` | ✅ |

## P5 — UI primitives

| Component | File | Status |
|---|---|---|
| VarianceBadge | `components/brp/VarianceBadge.tsx` | ✅ |
| CapacityDialog (+ AI Suggest, B-33) | `components/brp/CapacityDialog.tsx` | ✅ |
| MetricsModal (recharts) | `components/brp/MetricsModal.tsx` | ✅ |
| EpicRow (+ dup tag) | `components/brp/EpicRow.tsx` | ✅ |
| DetailPanel (+ variance message) | `components/brp/DetailPanel.tsx` | ✅ |
| CrewSelector | `components/brp/CrewSelector.tsx` | ✅ |
| PodLoader | `components/brp/PodLoader.tsx` | ✅ |
| EpicPicker (loading/error/ready) | `components/brp/EpicPicker.tsx` | ✅ |
| AnalysisProgress | `components/brp/AnalysisProgress.tsx` | ✅ |
| PortfolioView | `components/brp/PortfolioView.tsx` | ✅ |
| PodView | `components/brp/PodView.tsx` | ✅ |
| BrpView (router + modals) | `components/brp/BrpView.tsx` | ✅ |

## P6 — Action layer + AI assists + audit

| Criterion | Where | Status |
|---|---|---|
| brpActions module | `services/brp/brpActions.ts` | ✅ |
| Load/Capacity/Estimate flows | brpActions L46-300 | ✅ |
| Analysis flow with abort + failures collection | brpActions L218-307 | ✅ |
| CapacityAssistant seam + simulator + UI hook | `services/brp/ai/capacityAssistant.ts` | ✅ |
| VarianceInterpreter seam + simulator + UI hook | `services/brp/ai/varianceInterpreter.ts` | ✅ |
| DuplicateDetector seam + simulator + UI hook | `services/brp/ai/duplicateDetector.ts` | ✅ |
| Audit log (ring buffer + localStorage) | `services/brp/auditLog.ts` | ✅ |
| Audit wired through every mutating action | brpActions `recordAudit(...)` calls | ✅ |

## P7 — Azure swap + production polish

| Criterion | Where | Status |
|---|---|---|
| Azure OpenAI estimator | `services/brp/ai/azureEstimator.ts` | ✅ |
| Runtime provider swap (Azure ↔ simulator) | `estimatorProvider.ts` | ✅ |
| AbortSignal honored before AND after fetch | `azureEstimator.ts:start/post checks` | ✅ |
| zod validation on model output | `azureEstimator.ts:FrameResultSchema.safeParse` | ✅ |
| Defensive `stripFence()` for ```json wrappers | `azureEstimator.ts:71` | ✅ |
| Fallback to simulator when unconfigured | `estimatorProvider.ts:azureReady gate` | ✅ |
| 5-flow integration test | `test/integration/brpFiveFlows.test.tsx` | ✅ |
| Deep-review checkpoint passed | B-32 commit (4 criticals + 2 importants fixed) | ✅ |
| a11y contract suite | `components/brp/a11y.contract.test.tsx` | ✅ |
| Empty/loading/error UI states | EpicPicker.state, PodLoader, AnalysisProgress | ✅ |
| Knowledge docs + ADRs | `docs/adr/{0003,0004,0005}.md`, `docs/knowledge/services/brp/*` | ✅ |
| Devlogs | `docs/devlog/2026-05-{26,27}-brp-*.md` | ✅ |
| CLAUDE.md updated | top-level `CLAUDE.md` | ✅ |

## Test inventory

```
30 BRP test files, 411 passing tests + 1 skipped (live smoke)
- Component primitives:        14 files
- Action layer:                 2 files (brpActions + analysis)
- AI seams:                     4 files (estimator, capacity, variance, dup)
- Provider swap:                1 file
- Integration:                  1 file (brpFiveFlows)
- Store (unchanged from P2):    1 file
- a11y contract:                1 file
- Cancel + unmount + scoping:   1 file
- AI-assist UI wiring:          1 file
- EpicPicker state variants:    1 file
- Capacity dialog suggest UX:   1 file
- Audit log:                    1 file
tsc baseline: 55 (unchanged from session start)
```

## Known follow-ups (backlog)

These items were identified during deep-review and explicitly deferred:

- I2/I3: refactor `BrpView.onRunAnalysis` body into a `useBrpAnalysisRun`
  hook. Works correctly today; ~30 lines that could be reusable.
- L1: positive-delta color signal in EpicRow (gray vs cool blue).
- L2: dead-code prune for `runAnalysisAction` (no caller uses it; kept
  for symmetry with the scoped variant).
- L3: confirm Spinner CSS keyframes are defined in global stylesheet.
- L4: rename `BrpView.test.tsx:155` (now updated for the new loading state
  but the descriptive name could improve).
- OpenAI-direct estimator: sibling to the Azure adapter. Pattern is
  set; one more file when a caller wants it.
- Audit log UI: `subscribeAuditLog` is wired but no panel exists yet.
  A SettingsModal tab could render the entries.

## Verdict

**P1 through P7 complete.** Branch ready for PR review against `main`.
