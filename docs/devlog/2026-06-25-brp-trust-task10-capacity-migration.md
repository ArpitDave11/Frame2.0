# 2026-06-25 — BRP trust T10: capacity migration (velocity backfill)

**Tag:** brp-trust · **Task:** 10/15

## What
Added pure `migrateCapacityInputs(inputs)` (domain/brp.ts): backfills
`previousVelocity = max(0, resources×spPerResource×sprintCount)` when absent,
preserving the pod's total capacity. Idempotent; leaves an explicit velocity
(including 0) untouched.

## Application deferred to T9 (with rationale)
Initially applied the backfill to `DEFAULT_POD_CAPACITY` and `updatePodCapacity`,
but two protected tests pin "Pod.capacity has EXACTLY the 5 legacy fields" /
exact-equality. Adding a 6th stored field breaks them and they can't be edited
here. Since `computeCapacity` already falls back to the legacy product when
`previousVelocity` is absent (T8), totals stay correct. So the *helper* lands now
(tested); *applying* it into stored pods happens in T9 (CapacityDialog), where the
velocity field is introduced and those tests are updated alongside the UI.

## Verification
- New `brp.migrateCapacity.test.ts`: derive, preserve-total, explicit-untouched
  (incl. 0), idempotent, no-negative. brpGitlabService + brpStore + domain capacity
  tests still pass — 128/128.
