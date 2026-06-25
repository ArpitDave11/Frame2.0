# 2026-06-25 — BRP trust T3: fix Fibonacci ladder in estimator prompt

**Tag:** brp-trust · **Task:** 3/15

## What
The azure estimator SYSTEM_PROMPT asked for `1|2|3|5|8|13|21|34|55|89`, but the
canonical ladder (FibonacciPoint / schema) is `1,2,3,5,8,13,21,40,100`. A
prompt-obedient model returned 34/55/89 → schema rejection → garbage. Fixed by
sourcing the ladder from `FIBONACCI_POINTS` (single constant) and interpolating it
into the prompt, so prompt + type + schema can never drift again.

## Verification
- New `azureEstimator.ladder.test.ts`: asserts the prompt advertises every canonical
  value and contains no 34/55/89. Existing azure estimator tests still pass (12/12).
