# 2026-06-25 — BRP trust T7: self-consistency invariant CI gate

**Tag:** brp-trust · **Task:** 7/15

## What
Added `src/domain/brp.trustInvariant.test.ts` — the CI gate proving
`computeEpicLoad(epic) === Σ stories[].points`. Dependency-free (seeded PRNG, no
fast-check): 200 random decompositions, an explicit "ignores frameEstimate &
breakdown" case, and 50 runs against the real simulated estimator (also asserting
the producer never yields an empty decomposition — INV6 at the source).

## Why it matters
This is the machine-checked form of the trust guarantee: if it fails, the UI could
show a total that contradicts its own stories. Do not weaken or skip.

## Verification
- `npx vitest run brp.trustInvariant.test.ts`: 3 passed.
