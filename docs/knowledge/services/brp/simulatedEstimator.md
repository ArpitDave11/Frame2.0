# simulatedEstimator + estimatorProvider + schemas

The BRP AI seam. Implements the `AIEstimator` interface declared in
[`src/services/brp/ai/types.ts`](../../../src/services/brp/ai/types.ts).
The simulator is the v1 implementation; Phase 7 swaps it for a real LLM
estimator via the one-line `getEstimator()` provider — no consumer
changes needed.

| File | Role |
|---|---|
| [src/services/brp/ai/types.ts](../../../../src/services/brp/ai/types.ts) | `AIEstimator` interface + `AnalysisEvent` discriminated union. Moved here from `src/domain/brp.ts` per deep-review I10 (domain layer should be services-free) |
| [src/services/brp/ai/simulatedEstimator.ts](../../../../src/services/brp/ai/simulatedEstimator.ts) | `createSimulatedEstimator()` — deterministic AIEstimator |
| [src/services/brp/ai/estimatorProvider.ts](../../../../src/services/brp/ai/estimatorProvider.ts) | `getEstimator()` — one-line swap seam for P7 |
| [src/services/brp/ai/schemas.ts](../../../../src/services/brp/ai/schemas.ts) | Zod schemas for `FrameResult` + `AnalysisEvent` — runtime validators for P7's LLM boundary (not called by the simulator at runtime; see below) |

## `AIEstimator` interface

```ts
interface AIEstimator {
  analyzeEpic(
    epic: Epic,
    references: readonly ReferenceEpic[],
    signal?: AbortSignal,
  ): AsyncIterable<AnalysisEvent>;
}
```

`signal` was added post-deep-review (C1/I7). Implementors MUST check
`signal?.aborted` between yields and either return early or throw
`AbortError`. The store's `runAnalysis` also checks the signal at the
consumer boundary, so a non-cooperative estimator can still be cancelled.

## `AnalysisEvent` (discriminated on `kind`)

| kind | shape | meaning |
|---|---|---|
| `started` | `{ epicId }` | First event per `analyzeEpic` call |
| `progress` | `{ epicId, pct ∈ [0,1] }` | Zero-or-more progress ticks |
| `done` | `{ epicId, result: FrameResult }` | Terminal; carries the FrameResult |
| `error` | `{ epicId, message }` | Terminal; analyzer failed |

A consumer treats `done` or `error` as end-of-iterator.

## Simulator design

Goal: produce realistic-looking FrameResults deterministically. Same
`epic.id` → same content across reruns, processes, and fresh estimator
instances. The one non-deterministic field is `analyzedAt` (a real
wall-clock timestamp so the UI can render "last analyzed N seconds ago"
— determinism tests strip it before comparison).

| Component | How |
|---|---|
| Seed | `hashCode(epic.id)` — Java-style 32-bit string hash |
| PRNG | Mulberry32 (small, deterministic; same seed → same sequence) |
| `frameEstimate` | 80% sampled from `FIBONACCI_POINTS[1..7]` (2..40 — the realistic middle); 20% from any of the 9 values |
| `breakdown` | Pre-curated template per FibonacciPoint key; each template sums to within ±1 of the key. Avoids greedy-split drift at 40 and 100 where Fibonacci gaps are large |
| `confidence` | Single-item breakdown ≈ 0.92 ± 0.03; multi-item: `0.85 − 0.5 × cv ± 0.05` where `cv = stdev/mean`. Clamped to [0.1, 0.95] |
| `rationale` | Templated; quotes the epic title (truncated at 60 chars); two phrasings depending on whether refs were supplied |
| `references` | Passes through up to 3 caller-supplied refs |
| `modelVersion` | Constant `'brp-simulator-v1'` |

Event sequence per `analyzeEpic` call: `started` → `progress(0.5)` → `done`. The simulator yields synchronously (no awaits between yields), but honors `signal?.aborted` between every yield.

## Provider (`getEstimator()`)

```ts
export function getEstimator(): AIEstimator {
  return createSimulatedEstimator();
}
```

Phase 7's job is to replace that single line with the real LLM
estimator. The "drop-in equivalence" test in
`simulatedEstimator.test.ts` will fail intentionally when P7 swaps,
telling the P7 engineer they're crossing the seam.

## Zod schemas — declared but NOT called at runtime by the simulator

Per the file header in [schemas.ts](../../../../src/services/brp/ai/schemas.ts), the simulator does not invoke the schemas — it can't emit invalid events by construction (fully TS-typed). The schemas exist for:
1. **Drift detection** — `simulatedEstimator.test.ts` runs every emitted event through `AnalysisEventSchema.parse` for 30 different epic ids. A type-vs-schema drift fails fast.
2. **The Phase 7 real-LLM boundary parser** — LLM JSON is untyped; the schemas become the validator at that boundary.
3. **External callers** validating untrusted input cheaply.

If you find yourself adding `.parse(...)` calls inside the simulator, stop — that's redundant runtime work with no detection value.

## Test count
- `schemas.test.ts`: 38 parse tests (5 with `toEqual` round-trip per deep-review I15)
- `simulatedEstimator.test.ts`: 23 tests (determinism, breakdown invariants, confidence range + inverse-variance with +0.05 buffer, references, metadata, **AbortSignal handling** — 3 added post-deep-review)

## Consumers
- [`brpStore.runAnalysis`](../../stores/brpStore.md) — calls `estimator.analyzeEpic(epic, getReferences(epic), signal)` for each epic in the kickoff snapshot.
- Phase 6 wiring — calls `getEstimator()` once per analysis run, passes the result into `runAnalysis`.
