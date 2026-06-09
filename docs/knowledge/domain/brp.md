# BRP — Domain types + pure derivation functions

[src/domain/brp.ts](../../../src/domain/brp.ts) · [src/domain/brp.constants.ts](../../../src/domain/brp.constants.ts) · [src/domain/brp.test.ts](../../../src/domain/brp.test.ts)

The dependency-free foundation for BRP (Breakdown & Re-groom Planning).
Only TypeScript types and pure functions live here — no React, no Zustand,
no FRAME services. Importable from anywhere; unit-testable with zero setup.

## What BRP is

A capacity-driven epic-sizing surface for Scrum teams. A Scrum Master
loads a **Crew** (GitLab root group) → its **Pods** (subgroups) → each pod's
**Epics**. The planner sets a pod's **CapacityInputs** (5 numbers) and
types a `humanEstimate` per epic. FRAME (via `AIEstimator` — Phase 3
simulator today, real LLM in Phase 7) produces a `FrameResult` per epic.
Variance, deltas, and pod metrics are **derived** at render time —
never stored — so they can't drift from their inputs.

## Three architectural invariants

| # | Rule | Enforced by |
|---|---|---|
| 1 | `Epic` has no top-level `variance` / `delta` / `frameEstimate`. All FRAME outputs live in nullable `Epic.frameResult`. | Type shape |
| 2 | `Pod` stores `CapacityInputs` only. Total is always `computeCapacity(...)`. | Type shape — no `totalCapacity` field |
| 3 | `VarianceBand` is a return type of `computeVariance`. Never a stored field anywhere. | Type shape + reviewer grep |

Reviewer gate: `grep -nE 'variance:|delta:|totalCapacity:' src/{domain,stores}/brp*` must return zero matches for stored fields.

## Types (14)

| Type | Shape (key fields) |
|---|---|
| `FibonacciPoint` | Literal union `1 \| 2 \| 3 \| 5 \| 8 \| 13 \| 21 \| 40 \| 100` |
| `AnalysisStatus` | `'raw' \| 'analyzing' \| 'done' \| 'error'` (per-epic lifecycle) |
| `VarianceBand` | `'agree' \| 'caution' \| 're-groom' \| 'flagged' \| 'pending'` (return type only) |
| `CapacityInputs` | 5 raw numbers: `resources`, `spPerResource`, `sprintCount`, `holidayDays`, `leaveDays` |
| `CapacityResult` | `{ gross, holidayDeduction, leaveDeduction, total }` returned by `computeCapacity` |
| `BreakdownItem` | `{ title; points: FibonacciPoint }` |
| `ReferenceEpic` | `{ epicId; title; similarity ∈ [0,1]; actualSp }` |
| `GeneratedStory` | `{ title; points: FibonacciPoint; acceptanceCriteria: string[] }` |
| `FrameResult` | All FRAME outputs grouped — non-null only when analysis is `'done'` |
| `Epic` | `{ id, iid, title, description, gitlabWebUrl, podId, source: 'gitlab', humanEstimate, analysisStatus, frameResult }` |
| `Pod` | `{ id, name, gitlabSubgroupId, capacity, epics }` |
| `Crew` | `{ id, name, gitlabGroupId, pods }` |
| `PI` | `{ id, name, startDate, endDate, sprintCount }` |
| `PodMetrics` | Return type of `computePodMetrics` |

The AI seam (`AIEstimator` interface + `AnalysisEvent` discriminated union) used to live here too; it moved to [`src/services/brp/ai/types.ts`](../services/brp/simulatedEstimator.md) per the deep-review I10 finding (domain claimed to be services-free).

## Pure functions (4)

### `computeCapacity(inputs)`
```
gross   = resources × spPerResource × sprintCount
holiday = holidayDays × resources       // holidays hit everyone
leave   = leaveDays                     // already total person-days
total   = max(0, gross − holiday − leave)
```
PRD-named example: `6 × 10 × 6 − (2 × 6) − 5 = 343`. `total` clamps at 0.

### `computeDelta(epic): number | null`
`frameResult.frameEstimate − humanEstimate`. `null` if either side is missing. Positive means FRAME estimated higher than the planner.

### `computeVariance(epic): VarianceBand` — order of checks
1. `status !== 'done'` OR `frameResult === null` → `'flagged'` if `description.length < FLAGGED_DESCRIPTION_MIN_CHARS` (80), else `'pending'`.
2. `computeDelta === null` → `'pending'`.
3. `ratio = |delta| / max(human, frame)`:
   - `≤ 0.20` → `'agree'` (boundary inclusive)
   - `≤ 0.50` → `'caution'` (boundary inclusive)
   - else → `'re-groom'`
4. If band would be `'agree'` and `frameResult.confidence < CONFIDENCE_BUMP_THRESHOLD` (0.40) → bump to `'caution'`.

### `computePodMetrics(pod): PodMetrics`
Roll-up: `totalCapacity, humanLoad, frameLoad, balance, avgConfidence, epicCount, flaggedCount, reGroomCount`.

Two non-obvious rules:
- **Flagged epics are excluded from `humanLoad` AND `frameLoad`.** A flagged epic is one FRAME couldn't estimate; including it in either load would misrepresent the comparison (regression guard for p1.md's stated past bug).
- **`frameLoad` + `avgConfidence` require `analysisStatus === 'done'`.** A re-run preserves the prior `frameResult` while flipping status back to `'analyzing'` — without this filter, the stale value would skew metrics for the duration of every re-run (deep-review I4). `humanLoad` is NOT status-gated: the planner's number is valid regardless of analysis lifecycle.

## Constants

[src/domain/brp.constants.ts](../../../src/domain/brp.constants.ts):

| Constant | Value | Used by |
|---|---|---|
| `FIBONACCI_POINTS` | `[1, 2, 3, 5, 8, 13, 21, 40, 100]` (readonly) | Simulator (picks frameEstimate from this scale) |
| `DEFAULT_SP_PER_RESOURCE` | `10` | `brpGitlabService.DEFAULT_POD_CAPACITY` |
| `VARIANCE_AGREE_THRESHOLD` | `0.20` | `computeVariance` |
| `VARIANCE_CAUTION_THRESHOLD` | `0.50` | `computeVariance` |
| `CONFIDENCE_BUMP_THRESHOLD` | `0.40` | `computeVariance` step 4 |
| `FLAGGED_DESCRIPTION_MIN_CHARS` | `80` | `computeVariance` step 1 |

## Consumers
- [`brpStore`](../stores/brpStore.md) — domain types via `import type`; calls `computeCapacity`/`Variance`/`PodMetrics` indirectly through components.
- [`simulatedEstimator`](../services/brp/simulatedEstimator.md) — produces `FrameResult` shape.
- [`brpGitlabService`](../services/brp/brpGitlabService.md) — produces `Crew`/`Pod`/`Epic` from GitLab responses.
- Components (Phase 5) — call the pure functions at render time.
