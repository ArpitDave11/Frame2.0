# 2026-06-25 — BRP trust T4: structured output + seed

**Tag:** brp-trust · **Task:** 4/15

## What
- `azureClient.ts`: `callAzure` now forwards `responseFormat` (json_schema) and
  `seed` into the request body (it previously dropped them; only `callAI` forwarded).
- `azureEstimator.ts`: sends a strict `json_schema` response_format mirroring the
  current FrameResult shape with every `points`/`frameEstimate` constrained to the
  `FIBONACCI_POINTS` enum (trust Layer 2), plus a per-epic `seed` derived from
  `epic.id` for run-to-run reproducibility (research refuted temperature=0).

## Scope note
response_format mirrors the CURRENT (legacy) FrameResult shape so prompt +
schema + parser (`FrameResultSchema`) stay consistent. Migrating the model OUTPUT
to the canonical `stories` shape happens in T6, where prompt + response_format +
parser move together (the protected existing estimator test still feeds the legacy
shape, so the parser must keep accepting it via normalization).

## Verification
- New `azureClient.structured.test.ts` (forwards/omits response_format + seed) and
  `azureEstimator.structured.test.ts` (strict schema, Fibonacci enum, reproducible
  per-epic seed). Existing azure tests still pass — 33/33.
