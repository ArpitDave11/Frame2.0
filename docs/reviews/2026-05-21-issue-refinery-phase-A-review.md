# Issue Refinery — Phase A Deep Review (Checkpoint #1)

**Date**: 2026-05-21
**Reviewers**: 5 parallel agents (Correctness, Architecture & Idioms, Security, Production Readiness, Test Quality)
**Target**: 10 commits on `feature/issue-refinery` (R-0..R-9), `git diff feature/phase-a-docmining...HEAD`
**Runbook**: [docs/runbooks/deep-review-a10.md](../runbooks/deep-review-a10.md)

---

## Summary

| Severity | Count | Disposition |
|---|---|---|
| **CRITICAL** | 5 (after dedup) | 4 to fix in this loop, 1 acknowledged (pre-existing aiClient scope) |
| **IMPORTANT** | ~12 (after dedup) | 6 to fix in this loop, 6 acknowledged or deferred |
| **NICE-TO-HAVE** | ~20 | Logged, not auto-fixed |

**Three top findings to fix before R-10:**
1. **Strict JSON-schema incompatibility** — `z.toJSONSchema()` emits keywords (`minLength`, `maxItems`, `minimum`, `maximum`, `type: "integer"`, `$schema`) that Azure/OpenAI strict mode rejects. Pipeline would 400 on every real call.
2. **No concurrency guard / stale-child writes** — Double-click on Refine spawns racing pipelines; switching child mid-refine writes stale results onto the new child's state.
3. **Fake `cachedTokens` observability** — Field hardcoded to `[0, 0, 0]` regardless of actual cache behavior; lies to the dev HUD.

---

## CRITICAL findings (must fix)

### C1. Zod-emitted JSON schema is rejected by strict mode
**Source**: Correctness #1, indirectly Architecture #1, Test #11
**Files**: [src/pipeline/issue/schemas.ts](../../src/pipeline/issue/schemas.ts), all 3 stage runners
**Symptom**: Every `callAI` invocation with `response_format: { type: 'json_schema', strict: true }` will return HTTP 400 from Azure because the schema contains:
- `$schema` (top-level)
- `minLength` (epicIntent, issueIntent, refinedBody)
- `maxItems` (gaps, ambiguities, alignmentNotes, findings)
- `minimum` / `maximum` (score)
- `"type": "integer"` (score — strict mode only allows `"number"`)

Per OpenAI's strict-mode spec the allowed keywords are: `type, properties, required, additionalProperties, enum, items, anyOf, oneOf, not, $ref, $defs, description, title`.

**Fix**: Write `toStrictJsonSchema(zodSchema)` helper that strips unsupported keywords and downcasts `integer → number`. Local Zod `safeParse` already enforces the bounds post-response, so the constraints survive — they just move out of the Azure-side validator.

### C2. No concurrency guard in `refineSelectedIssue`
**Source**: Correctness #3+#4, ProdReady #1+#2+#4, Test #5
**File**: [src/actions/refineIssueAction.ts](../../src/actions/refineIssueAction.ts) lines 33-76
**Symptom**: Two rapid clicks on Refine spawn two parallel pipelines; their `setComprehension/setRefinedDraft/setValidation` writes interleave. Worse, if the user switches `selectedChildIid` mid-refine, the late completion writes results bound to the **old** child onto the **new** child's state.

**Fix (two parts)**:
1. In-flight guard: return early if `phase !== 'idle' && phase !== 'ready' && phase !== 'error'`.
2. Stale-child check: capture `selectedChildIid` at action start; before each store write, verify `getState().selectedChildIid === capturedIid`. Discard the run silently if it changed.

### C3. Fake `cachedTokens: [0, 0, 0]`
**Source**: Architecture #1, Correctness #8, ProdReady #9
**File**: [src/pipeline/issue/runIssuePipeline.ts](../../src/pipeline/issue/runIssuePipeline.ts) line 88
**Symptom**: Field contracted in `IssuePipelineResult` but always returns three zeros — the dev HUD will show "cache miss" forever regardless of reality. Future UI work won't notice when caching breaks.

**Fix**: Drop the field from the contract until `aiClient.AIResponse.usage` exposes `cachedTokens`. Remove `recordCachedTokens` calls from the action. The HUD task (R-13) can re-add the wiring once `aiClient` is extended (separate follow-up task). Less code, no lying.

### C4. Phase machine skips `refining` and `validating`
**Source**: Correctness #7, Architecture #2
**File**: [src/actions/refineIssueAction.ts](../../src/actions/refineIssueAction.ts) lines 56, 69
**Symptom**: Action sets `phase='comprehending'` once then jumps to `'ready'`. UI bound to `refining` / `validating` will never render those states.

**Fix**: Have the orchestrator accept an optional `onStageStart(stage: StageId)` callback; the action passes a function that calls `setPhase(stage === 'refinement' ? 'refining' : stage === 'validation' ? 'validating' : 'comprehending')`. Pure-function purity preserved (no store imports in pipeline) — callback is just a parameter.

### C5. No `fetch` timeout in `aiClient.callAI` (ACKNOWLEDGED)
**Source**: ProdReady #5
**File**: [src/services/ai/aiClient.ts](../../src/services/ai/aiClient.ts) line 68
**Symptom**: A hung Azure connection blocks the stage indefinitely; no AbortSignal threaded through.

**Disposition**: **Acknowledged — out of Phase A scope.** This is pre-existing aiClient behavior that affects every consumer (DocIntel, refinePipelineAction, refineIssueAction). Fixing it requires touching `aiClient.ts` which is shared infrastructure; a separate task. Captured in `docs/reviews/acknowledged.md` with timestamp.

---

## IMPORTANT findings (selected fixes)

### I1. Misleading "clear stale results" comment that doesn't actually clear
**Source**: Correctness/Arch/ProdReady
**File**: refineIssueAction.ts:56 — comment says "Clear any stale per-child results before kicking off" but `setPhase('comprehending', null)` only flips phase; existing `comprehension`, `refinedDraft`, `validation` survive into the next run.
**Fix**: Add `clearResults()` action to the store and call it before kickoff.

### I2. `fetchEpicIssues` "pagination" is just `per_page=100`
**Source**: Correctness #6, Architecture #6, ProdReady #19
**Disposition**: **Acknowledge in commit and doc.** Real Link-following pagination is a separate task. The R-1 commit message overstated the fix. Document the 100-child ceiling explicitly in the design doc + an inline code comment. Issue Refinery v1 ships with the ceiling.

### I3. Duplicate `safeParseContent` across 3 stage runners
**Source**: Architecture #4
**Fix**: Extract a shared `runStageWithRetry(stageName, schema, baseRequest, userPrompt)` helper into `src/pipeline/issue/stageRunner.ts`. Each stage shrinks to ~20 lines of config.

### I4. `recordCachedTokens` grows unbounded
**Source**: Correctness #12, ProdReady #14, Test #16
**Disposition**: Resolved by C3 (dropping the field entirely).

### I5. `IsExactly` type assertion may silently fail
**Source**: Correctness #2
**Fix**: Replace the `IsExactly<>` runtime check with a direct `type R = z.infer<typeof RefinementSchema> & RefinementResult` ambient assignment — TS will error if assignability is broken.

### I6. `withRetry` × Instructor retry call amplification
**Source**: ProdReady #7
**Symptom**: Worst case 6 calls per stage = 18 LLM calls per pipeline, blowing the $0.02 P50 cost budget.
**Disposition**: **Acknowledged — design tradeoff.** `withRetry` only fires on retryable network errors (`isRetryable` filter); steady-state cost is dominated by the 3 happy-path calls. The 18-call worst case requires repeated 5xx/429 + schema fails, which is degenerate. Will revisit if observed in dogfood.

### I7. Prompt-injection via unsanitized `</epic>` / `</issue>` in bodies
**Source**: Security #1
**Disposition**: **Acknowledged — design tradeoff with cache discipline.** Per the locked sandwich prompt design, the document block must be byte-identical across stages for prompt-cache hits. Inserting a per-request nonce or escaping would bust the cache. The threat model assumes the GitLab project is trusted by the FRAME user; an attacker who can write epic/issue bodies in GitLab can already affect the LLM output through prompt content directly. Documented in design risk register.

### I8. No body size cap before AI call
**Source**: Security #2
**Fix**: Add a 50KB-per-body precondition in the action layer (before calling the orchestrator), returning a typed error toast.

---

## NICE-TO-HAVE findings (logged, not fixed in this loop)

- Children stored by reference, not defensive-copied (Correctness #9)
- `tagError` doesn't use the standard `Error.cause` constructor option (Correctness #14)
- `getCachePrefix` duplicates the `documentBlock` template literal (Architecture #5)
- Hand-roll vs Zod schemas mirror DocIntel (Architecture #9)
- Error message UX improvements (multiple reviewers)
- More test edge cases: code-fenced JSON wrapper, very-long body, string-throw at aiClient layer (Test #4, #12, #15)
- GitLab error 401/403/404/409 mapping to user-friendly messages (ProdReady #12)
- 429 retry sleep amplification (ProdReady #8)

---

## Fix-loop summary

After this loop, expected state:
- 4 critical findings fixed (C1, C2, C3, C4); 1 acknowledged (C5 — pre-existing scope).
- 4 important findings fixed (I1, I3, I5, I8); 3 acknowledged or merged into criticals (I2, I4, I6, I7).
- All Phase A tests must remain green after fixes.
- New tests added for the fixes (concurrency guard, strict-schema stripper, etc).

**Exit criteria for proceeding to R-10:** zero unresolved critical findings, all important findings either fixed or in `docs/reviews/acknowledged.md`, full test suite green.
