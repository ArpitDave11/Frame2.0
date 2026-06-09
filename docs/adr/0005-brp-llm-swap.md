# ADR 0005 — BRP LLM swap mechanism

**Status:** Accepted · **Date:** 2026-05-27 · **Applies to:** B-36, B-37

## Context

BRP needed a path from "deterministic simulator" (Phase 3) to "real
LLM" (Phase 7) without rewriting consumers. The same swap pattern is
used for the three secondary AI assists — capacity prefill, variance
interpreter, duplicate detection — so the decision generalises.

Constraints:

1. The store loop (`brpStore.runAnalysis`) and the action layer must
   not change when the implementation flips. The seam is what they
   import.
2. Consumers must keep working when the LLM is unconfigured (no
   crash, no permanently-empty UI). A fresh dev workstation should
   still be able to size epics.
3. The simulator's determinism is valuable for tests and offline use
   — keep it as the default and the test fixture.

## Decision

Each AI capability gets three files in `src/services/brp/ai/`:

1. **`types.ts` / interface** — the contract consumers depend on.
2. **`simulated<X>.ts`** — deterministic stub used for tests and as
   the default at runtime.
3. **`<X>Provider.ts`** (or `getXxx()` exported from the simulator
   module) — runtime swap point. Calls `useConfigStore.getState()`
   to decide whether to return the Azure implementation or fall back
   to the simulator.

The fallback is the safe default: if the planner has set
`ai.provider === 'azure'` but no `apiKey` or `azureEndpoint`, the
swap returns the simulator. This means a misconfiguration cannot
take BRP offline; it just downgrades to heuristics with a model
version planners can identify.

For B-36/B-37 the contract is `AIEstimator`; the swap lives in
`estimatorProvider.ts`. The same pattern can apply to the capacity
assistant, variance interpreter, and duplicate detector when their
LLM-backed implementations land — currently those providers return
the simulator unconditionally because no LLM-backed variant exists
yet.

## Consequences

+ One-line swap per capability. No consumer changes.
+ Tests run against the simulator; live tests can flip the config and
  exercise the real provider.
+ Misconfiguration degrades gracefully — never blocks the planner.
- Two implementations live in the tree simultaneously per capability.
  Acceptable cost — the simulator stays valuable for tests.
- The swap check happens on every `getEstimator()` call (cheap
  config-store read). If contention becomes an issue, memoise per
  config change.

## Notes

- Live smoke for Azure: set `ai.provider`, `ai.azure.apiKey`,
  `endpoints.azureEndpoint` in `useConfigStore` (or the corresponding
  Vite env vars in `DEFAULT_CONFIG`) and run a Pod's "Run analysis"
  button. No code change required.
- `azureEstimator` uses `frameResultSchema` (zod) to validate model
  output before yielding the `done` event — this is the contract
  guard that lets us trust an LLM's JSON.
