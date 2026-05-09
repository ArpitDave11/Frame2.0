# DocIntel Prompt Quality Upgrade — Design (Final)

**Date:** 2026-05-09
**Status:** Approved
**Research:** `docs/research/Production-Grade Prompt Engineering Patterns for Azure.md`

## Model Config

| Call | Model | reasoning_effort | verbosity | seed |
|---|---|---|---|---|
| Pre-classifier | gpt-5-nano | minimal | low | 42 |
| Summary | gpt-5.5 | medium | low | 42 |
| Insights | gpt-5.5 | high | medium | 42 |
| Visuals | gpt-5.5 | medium | low | 42 |

## Changes

1. **AIRequest** — add optional responseFormat, reasoningEffort, verbosity, seed
2. **aiClient** — pass new fields to API body when set
3. **schemas.ts** (new) — 4 strict JSON schemas with ceiling word budgets in descriptions
4. **validators.ts** (new) — word count + mermaid parse + array length
5. **lensPrompts.ts** — full rewrite: base_rules + 7 lens_specs + XML sandwich builders
6. **analyzeAction.ts** — gpt-5.5 hardcode, nano pre-classifier, schemas, validation + retry, warmSchemas()
7. **DocIntelView.tsx** — call warmSchemas() on first mount

## Key Patterns

- Schema description = ceiling ("at most 90 words"), final_instructions = target from nano ("Target: 75 words")
- Instructor-style retry: append prior response + validation errors, 1 retry max
- warmSchemas() fires 4 minimal calls on mount to prime CFG cache
- XML escape + cap (1000 chars) on user focus text
- Hierarchy: base_rules > lens_spec > user_focus > document
