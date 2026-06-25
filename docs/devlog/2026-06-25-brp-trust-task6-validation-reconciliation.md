# 2026-06-25 — BRP trust T6: validation + reconciliation + stories output

**Tag:** brp-trust · **Task:** 6/15

## What
Migrated the Azure estimator's model OUTPUT to the canonical `stories` shape and
added the validation/reconciliation layer.

- `schemas.ts`: `EstimatorOutputSchema` = `{ stories: SizedStory[], rationale,
  confidence }` — the model no longer emits an epic total (INV2).
- `storyValidation.ts` (new): `validateStories` enforces 2–8 stories, Fibonacci
  points, ≥1 acceptance criterion per story (INVEST/SPIDR quality, Layer 2).
- `azureEstimator.ts`: prompt + response_format moved to the stories shape; new
  `parseAndValidate` → on a story-validation failure, re-prompts ONCE with targeted
  feedback (reconciliation), else errors (no fabrication). `normalizeOutput`
  back-fills legacy `frameEstimate`(nearest-Fib)/`breakdown`/`generatedStories`
  FROM the stories so consumers can't disagree with the canonical list. Legacy
  payloads still accepted (compat path) so the protected estimator test stays green.

## Test reconciliation (approved by user)
T6 replaced the interim legacy response_format that T4's test pinned. With the
user's approval, recreated `azureEstimator.structured.test.ts` to assert the
`stories`-shape enum. Also fixed 2 type errors I'd introduced in earlier test files
(`trustInvariant` AnalysisEvent import; azureClient mock-arg cast). tsc back to the
13-error pre-existing baseline.

## Verification
- New `azureEstimator.validation.test.ts`: validateStories unit cases + normalize +
  re-prompt-then-succeed + error-after-retry. All BRP AI tests: 135 passed.
