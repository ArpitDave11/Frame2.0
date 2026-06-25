# 2026-06-25 — BRP trust T8: velocity-based capacity formula

**Tag:** brp-trust · **Task:** 8/15

## What
`CapacityInputs.previousVelocity?` added (D1). `computeCapacity` gross is now the
measured previous-quarter velocity when set: `total = max(0, previousVelocity −
holidayDays×resources − leaveDays)` (D2 flat subtraction). `spPerResource`/
`sprintCount` deprecated (D8). Negative velocity treated as 0.

## Migration safety
`previousVelocity` is optional; when undefined, gross falls back to the legacy
`resources×spPerResource×sprintCount` product — keeping pre-migration pods and the
protected legacy `computeCapacity` tests correct. Task 10 backfills previousVelocity.

## Verification
- New `brp.velocityCapacity.test.ts`: 6 cases (velocity gross, deductions, clamp,
  negative→0, zero, legacy fallback). Protected capacity + CapacityDialog +
  PodView breakdown tests still pass — 67/67.
