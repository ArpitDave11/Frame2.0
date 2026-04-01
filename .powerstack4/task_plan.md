# Category Templates v7.0.0

## Goal
Replace categoryTemplates.json with v7.0.0 spec — compressed hints, Epic Status on all categories, section merges/renames/promotions, new _meta fields.

## Architecture
Pure data file replacement. Template loader reads sections dynamically — no structural code changes. Update JSON, update categoryConstants.ts, fix test assertions.

## Current Phase: Task 1 — Replace categoryTemplates.json

## Phases

| # | Task | Status |
|---|------|--------|
| 1 | Replace categoryTemplates.json with v7.0.0 | in_progress |
| 2 | Update categoryConstants.ts section lists | pending |
| 3 | Fix templateLoader.test.ts assertions | pending |
| 4 | Run full test suite and fix remaining breakage | pending |
| 5 | Verify build and final sanity check | pending |

## Key Decisions
- Full JSON replacement (Option A) — no incremental merge
- totalWordTarget.excludes is inert data — no code change needed

## Error Log
(none)
