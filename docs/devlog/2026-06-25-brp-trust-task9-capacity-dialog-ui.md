# 2026-06-25 — BRP trust T9: velocity Capacity dialog UI

**Tag:** brp-trust · **Task:** 9/15 · Figma node 44:200

## What
`CapacityDialog.tsx` reworked to the velocity model (D1/D8):
- Lead field "Previous quarter velocity (SP)" (auto-focused) with hint; bound to
  `previousVelocity`. Seeds via `migrateCapacityInputs(initial)` so legacy pods
  backfill their velocity (no reset).
- Removed the "SP per resource / sprint" and "Sprints in PI" inputs.
- Kept Resources (holiday math), Holiday days, Leave.
- Breakdown row "Gross" → "Previous velocity"; total unchanged
  (computeCapacity already velocity-aware).

## Tests (user-approved update of 2 established files)
The velocity redesign removes spPerResource/sprintCount, so the established
CapacityDialog.test.tsx + CapacityDialog.suggest.test.tsx (which asserted those
fields) were rewritten to the velocity field set — same behaviors (seed,
live-update, clamp, save, suggest, a11y) + new cases (legacy backfill; removed
fields absent). User authorized the test edit.

## Verification
- All BRP component tests pass: 219/219 (incl. a11y contract + capacity breakdown).
- VISUAL LOOP: ran the app, opened Checkout Pod → Capacity; screenshot matches
  Figma 44:200 (real Frutiger): velocity 120 / Resources 6 / Holiday 2 / Leave 5
  → Previous velocity 120 − 12 − 5 = Total 103 SP. Focus ring + Escape + labels intact.
- tsc clean (13 pre-existing unrelated errors).

## Follow-up (minor)
PodView's inline CAPACITY BREAKDOWN still labels the first row "Gross" (value is
correct = velocity). Optional relabel to "Previous velocity" for consistency;
left as-is to avoid churning PodView.capacityBreakdown.test.tsx.
