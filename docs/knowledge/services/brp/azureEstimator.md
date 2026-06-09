# Azure OpenAI BRP estimator

`src/services/brp/ai/azureEstimator.ts` — the Phase 7 LLM-backed
implementation of `AIEstimator`. Wraps the existing `callAzure` client
with prompt construction, response parsing, and schema validation.

## Contract

Implements `AIEstimator.analyzeEpic(epic, references, signal)`. Yields
exactly two events per call: `started` immediately, then either `done`
(with the validated `FrameResult`) or `error` (with a message).

## Pipeline

1. Yield `started` so the UI's progress banner can show "current: …"
   before the network call resolves.
2. Check `signal.aborted` — if true, yield `error` and return.
3. Call `callAzure` with:
   - System prompt: JSON-output contract (Fibonacci-only frameEstimate,
     breakdown shape, etc.)
   - User prompt: epic title + iid + description + references block
4. Check `signal.aborted` again — a slow response landing after Cancel
   should NOT write to the store.
5. `stripFence()` removes a ` ```json ... ``` ` wrapper if the model
   added one (defensive against models that ignore the prompt).
6. `JSON.parse` the content.
7. `FrameResultSchema.safeParse` (zod) validates the structure.
8. Yield `done` with the parsed result.

Any thrown / failed step short-circuits to `error` with a useful
message.

## Why the schema guard

LLM output is untrusted. A model returning `frameEstimate: 7` (not
Fibonacci) would silently corrupt downstream variance math. zod
validation catches the mismatch and turns it into an `error` event
that the audit log captures.

## Factory pattern

`createAzureEstimator(deps)` accepts `{ readConfig, call? }`:

- `readConfig` returns the active `AIClientConfig` (defaults: pulled
  from `configStore` via `estimatorProvider.getEstimator`)
- `call` defaults to the real `callAzure`; tests substitute

This keeps unit tests free of the live Azure client and lets a future
estimator provider (OpenAI direct, e.g.) reuse the prompt + parse
machinery while injecting its own transport.

## Live testing

Provide credentials via `useConfigStore`:

```
useConfigStore.setState((s) => ({
  config: {
    ...s.config,
    ai: { ...s.config.ai, provider: 'azure', azure: {...withKey} },
    endpoints: { ...s.config.endpoints, azureEndpoint: '...' },
  },
}));
```

Then click Run analysis on a Pod. The `estimatorProvider` swap (B-37)
will route through Azure automatically. Without those credentials the
swap returns the simulator — no crash, just heuristics.
