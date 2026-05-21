# promptAssembly

[src/pipeline/issue/promptAssembly.ts](../../../../src/pipeline/issue/promptAssembly.ts)

Builds the `{ systemPrompt, userPrompt }` pair sent to `aiClient.callAI` for each pipeline stage.

## Exports
- `buildPrompts(stage, epicBody, issueBody, previous?)` — main entry point.
- `SYSTEM_RULES` — the static system-message constant.
- `STAGE_INSTRUCTIONS` — per-stage final instruction strings.
- `getCachePrefix(epicBody, issueBody)` — exported for the byte-equality test only.

## Sandwich structure
Every call's `userPrompt` begins with the same `<epic>...</epic>\n\n<issue>...</issue>` document block. Stage-specific data follows:

- Comprehension: only the stage instruction.
- Refinement: + `<comprehension>${JSON.stringify(comp)}</comprehension>` + instruction.
- Validation: + `<refined>${refinedBody}</refined>` + instruction.

The `systemPrompt` is byte-identical across stages.

## Cache discipline
The byte-identical prefix is the entire point of this module. Azure's prompt cache hits when the prefix matches a previous request; stage 2 and stage 3 therefore re-use the document portion at ~75% cost discount.

The companion test (`promptAssembly.test.ts`) asserts:
- `systemPrompt` is identical across the 3 stages.
- `getCachePrefix(e, i)` is a prefix of every stage's `userPrompt`.
- The static prefix contains no Date / timestamp / requestId / UUID patterns (regex scans).

If the byte-equality test ever turns red, the prompt cache is silently busted and stage 2+3 cost will balloon ~4x. Treat it as a high-priority red.

## No XSS-escape on `<epic>` / `<issue>`
Locked tradeoff (B-I7 acknowledged in Phase A review): an issue body containing `</issue>` literally could break out of its tag, but escaping or nonce-wrapping would bust the cache. Threat model assumes the GitLab project is trusted by the FRAME user.
