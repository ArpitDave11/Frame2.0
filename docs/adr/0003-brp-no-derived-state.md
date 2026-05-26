---
id: "0003"
title: BRP types — no derived state stored; AI seam in services, not domain
date: 2026-05-26
status: accepted
---

## Context

BRP (Breakdown & Re-groom Planning) introduces a new domain model for Crew → Pod → Epic capacity planning. The reference UI in [docs/Brp_plan/ui_sample_brp/](../Brp_plan/ui_sample_brp/) (a Figma-Make export) shipped a Zustand store and components that **stored** derived values (`variance`, `delta`, `totalCapacity`, `pod metrics`) as fields alongside their inputs. Every defect the user identified in that uploaded code traced back to a derived value drifting from its inputs: a `variance` field that didn't agree with the current `humanEstimate`, a `totalCapacity` that didn't reflect the latest `CapacityInputs`, a `frameEstimate` pre-filled in mock data that survived after analysis ran. The Phase 1 plan in [docs/Brp_plan/p1.md](../Brp_plan/p1.md) was explicit: get the data model right, and these defects cannot recur structurally.

Two related decisions also surfaced during the BRP headless build:
- Where should the `AIEstimator` interface live? Originally placed in `src/domain/brp.ts`, the deep-review's Architecture reviewer (I10) flagged that the domain module's own header claims to be services-free, while `AIEstimator` is a service seam.
- How should `runAnalysis` be cancellable? The deep-review's Correctness and Production Readiness reviewers independently flagged that the original implementation had no `AbortSignal`, no concurrency guard, and `reset()` mid-run could produce zombie writes (C1).

Forces:
- The PRD ([.taskmaster/docs/brp-headless-prd.txt](../../.taskmaster/docs/brp-headless-prd.txt)) and Phase 1 plan name the no-derived-state rule as architectural — not just stylistic.
- The reference UI's drift-bug class is well-known and avoidable: if the model can't represent a stored derived field, the bug literally cannot exist.
- A simple Zustand store with primitive setters is not enough — without enforcing the rule at the type level, it's a matter of time before a tired contributor adds `pod.totalCapacity` "because it's faster to read".
- Phase 6 (UI wiring) and Phase 7 (real LLM) need a clear seam to plug into. Without one, a half-dozen consumers would each handle estimator concerns differently.

## Decision

**Three architectural invariants, enforced by the TypeScript type shape itself in [src/domain/brp.ts](../../src/domain/brp.ts):**

1. **`Epic` has no top-level `variance`, `delta`, or `frameEstimate` field.** All FRAME outputs live inside the nullable `Epic.frameResult` sub-object — present (every field populated) after analysis, `null` before. No half-populated middle state.
2. **`Pod` stores `CapacityInputs` (5 raw inputs).** It does NOT store `totalCapacity`. The total is always `computeCapacity(pod.capacity).total` at the call site, so it can never drift from its inputs.
3. **`VarianceBand` is a return type of `computeVariance(epic)`.** Never a stored field anywhere in the model. Storing it is the exact bug class the reference UI fell into.

The four pure derivation functions (`computeCapacity`, `computeDelta`, `computeVariance`, `computePodMetrics`) live in the same file. They are dependency-free (no React, no Zustand, no services) and unit-tested with zero setup (40 tests in [src/domain/brp.test.ts](../../src/domain/brp.test.ts) covering all four).

**The AI seam (`AIEstimator` interface + `AnalysisEvent` discriminated union) lives in [src/services/brp/ai/types.ts](../../src/services/brp/ai/types.ts), NOT in the domain module.** The domain module's own header claims to be services-free; an interface that is consumed by a store and implemented by a service does not belong in it. Moving it post-deep-review (I10) keeps the boundary clean.

**`brpStore.runAnalysis` accepts an optional `AbortSignal` AND maintains a module-level `AbortController`.** The two compose: a caller's external signal aborts the internal controller; `reset()` also aborts the internal controller before clearing state. A second `runAnalysis` call while one is already running is a no-op (concurrency guard). The estimator's `analyzeEpic` also receives the signal so it can cooperatively cancel.

## Consequences

- **Drift bugs are structurally impossible at the type level.** No code path can write a `variance` field on an `Epic` — TypeScript rejects it. The reference UI's defect class cannot recur.
- **Render-time derivation is cheap because the four functions are pure.** Phase 5 components call them on every render without memoization gymnastics; same inputs always produce same outputs.
- **The store's API is narrower than the reference UI's.** No `updateVariance`, no `recalculateMetrics`, no "refresh derived state" actions. The action list ([brpStore.md](../knowledge/stores/brpStore.md)) is 15 actions across 5 groups — all of them write inputs/raw data only.
- **`AIEstimator` is a single seam.** Phase 7 swaps `getEstimator()`'s body — one line — to return a real LLM-backed estimator. No consumer changes. The "drop-in equivalence" test in `simulatedEstimator.test.ts` will intentionally fail at that swap, telling the P7 engineer they're crossing the seam.
- **Cancellation is a contract at the interface, not an afterthought.** The `signal` parameter is optional but documented; any future estimator implementation can be cancelled cooperatively via the signal AND non-cooperatively via the consumer (`brpStore` checks `signal.aborted` between events and between epics).
- **Re-runs preserve the prior `frameResult`** while flipping `analysisStatus` back to `'analyzing'`. This keeps the UI showing the prior result during a re-run. The cost: `computePodMetrics` must filter `frameLoad` + `avgConfidence` by `analysisStatus === 'done'` (deep-review I4) so stale values don't skew metrics for the duration of every re-run.
- **A boundary coercion in `brpGitlabService`** (`toIdString` + `toNumericId`) absorbs a real drift between `src/services/gitlab/types.ts` (declares subgroup `id` as string) and what GitLab returns at runtime (a number). The live smoke against gitlab.com caught it. The fix lives in BRP code, not in shared `types.ts`, because BRP shouldn't modify shared modules to accommodate its own integration.

## Alternatives considered

- **Allow derived fields in state with a "refresh" action** — rejected. This is the bug class the reference UI fell into. Every derived field becomes a potential drift source; every consumer has to remember which fields are stored vs. computed.
- **Use Immer or a reactive computed-property library** — rejected. Adds a dependency and a layer of indirection for a problem the type system solves cheaper. Zustand v5 + pure functions is sufficient.
- **Keep `AIEstimator` in `src/domain/brp.ts`** — rejected per I10. The domain module's "no services" header would have to be loosened, or the header would have to be a lie. Moving the interface to `src/services/brp/ai/types.ts` keeps both true.
- **No concurrency guard, just rely on UI buttons being disabled while `analysisStatus === 'running'`** — rejected. The store is a contract for any consumer, not just Phase 5's UI. A Phase 6 callsite that calls `runAnalysis` from a non-button context (e.g., a background revalidation) would silently corrupt state.
- **Single-flight via mutex/promise lock instead of `AbortController`** — rejected. `AbortController` is the standard JS primitive for this, composes with the caller's `signal`, and gives the future Phase 7 estimator a way to cancel its `fetch()` calls for free.

## References

- Phase 1 plan: [docs/Brp_plan/p1.md](../Brp_plan/p1.md)
- PRD: [.taskmaster/docs/brp-headless-prd.txt](../../.taskmaster/docs/brp-headless-prd.txt)
- Deep-review report: [docs/reviews/2026-05-25-brp-headless-deep-review.md](../reviews/2026-05-25-brp-headless-deep-review.md)
- Acknowledged deferrals (Phase 5/6 wiring): [docs/reviews/acknowledged.md](../reviews/acknowledged.md)
- Source: [src/domain/brp.ts](../../src/domain/brp.ts), [src/stores/brpStore.ts](../../src/stores/brpStore.ts), [src/services/brp/](../../src/services/brp/)
- Knowledge: [docs/knowledge/domain/brp.md](../knowledge/domain/brp.md), [docs/knowledge/stores/brpStore.md](../knowledge/stores/brpStore.md), [docs/knowledge/services/brp/README.md](../knowledge/services/brp/README.md)
