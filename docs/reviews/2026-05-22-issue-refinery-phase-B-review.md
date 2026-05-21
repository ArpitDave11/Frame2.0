# Issue Refinery — Phase B Deep Review (Checkpoint #2)

**Date**: 2026-05-22
**Reviewers**: 5 parallel agents (Correctness, Architecture & Idioms, Security, Production Readiness, Test Quality)
**Target**: 7-commit UI delta on `feature/issue-refinery` between `86f5d27` (post Phase A fix loop) and `HEAD`
**Runbook**: [docs/runbooks/deep-review-a10.md](../runbooks/deep-review-a10.md)

---

## Summary

| Severity | Count | Disposition |
|---|---|---|
| **CRITICAL** | 3 | All to fix in this loop |
| **IMPORTANT** | ~16 | 5 to fix in this loop, ~11 acknowledged or deferred |
| **NICE-TO-HAVE** | ~15 | Logged, not auto-fixed |

**Top 3 fixes:**
1. **Bridged-iid ref locks out retry on failed fetch** — `bridgedIidRef.current = loadedEpicIid` is assigned *before* `fetchEpicIssues` resolves. If the fetch fails, the user cannot retry the same epic without first loading a different one.
2. **Stale-pipeline overwrite of user textarea edits** — no UI-level test guards against the case where a slow pipeline completion calls `setRefinedDraft(newOutput, false)` while the user is mid-typing. (C2 stale-child only covers child switching, not concurrent in-place writes.)
3. **Integration test only covers happy path** — needs gitlab-fetch failure, mid-stage pipeline failure, and publish failure variants.

---

## CRITICAL findings (fix in this loop)

### B-C1. `bridgedIidRef` set before fetch resolves → retry lockout on failure
**Source**: Correctness Reviewer #4
**File**: [src/components/issueRefineryView.tsx:57](../../src/components/issueRefinery/IssueRefineryView.tsx)
**Symptom**: When `fetchEpicIssues` fails, the toast says "Failed to load child issues" but the next attempt by clicking Load Epic + selecting the same epic from `LoadEpicModal` does nothing — `loadedEpicIid` is unchanged, the ref short-circuits the effect.

**Fix**: Move `bridgedIidRef.current = loadedEpicIid` into the `.then` success branch, and clear it in the `.catch`. Also clear on epic unload.

### B-C2. Stale-pipeline overwrite of user textarea edits (UI-level)
**Source**: Test Quality Reviewer #5, Correctness #6
**File**: [src/components/issueRefinery/RefinedIssueCard.tsx](../../src/components/issueRefinery/RefinedIssueCard.tsx)
**Symptom**: If the user starts editing the refined textarea while a re-run of the pipeline is in `validating` phase, an in-flight stage's `setRefinedDraft(newOutput, false)` clobbers the user's keystrokes. The C2 fix in Phase A only handles the child-switch race, not concurrent in-place pipeline writes.

**Fix**: Make the textarea `readOnly` while `phase !== 'ready'`. Add a UI test that asserts user content survives a stale completion.

### B-C3. Integration test missing failure paths
**Source**: Test Quality Reviewer #15
**File**: [src/test/integration/issueRefineryFlow.test.tsx](../../src/test/integration/issueRefineryFlow.test.tsx)
**Symptom**: Only the happy path is exercised. Missing:
- gitlab fetch failure → error toast, no card render
- pipeline mid-stage failure → `phase === 'error'`, error banner, refine re-enabled
- publish failure → error toast, phase returns to `ready`

**Fix**: Add 3 new integration tests for these failure paths.

---

## IMPORTANT findings (selected fixes)

### B-I1. ChildIssueList missing arrow-key navigation for radiogroup
**Source**: ProdReady Reviewer #6
**File**: [src/components/issueRefinery/ChildIssueList.tsx](../../src/components/issueRefinery/ChildIssueList.tsx)
**Fix**: Implement Up/Down/Home/End handlers per WAI-ARIA radio pattern.

### B-I2. ValidationCard tier conveyed by color only (a11y)
**Source**: ProdReady Reviewer #8
**File**: [src/components/issueRefinery/ValidationCard.tsx](../../src/components/issueRefinery/ValidationCard.tsx)
**Fix**: Include tier word in the aria-label and a visible text label alongside the badge ("Good · 82").

### B-I3. Drop dormant `PromptCacheHUD` (YAGNI)
**Source**: Architecture Reviewer #3
**File**: [src/components/issueRefinery/PromptCacheHUD.tsx](../../src/components/issueRefinery/PromptCacheHUD.tsx)
**Symptom**: `lastCachedTokens` is never appended in production code (per the Phase A fix loop dropping `recordCachedTokens` from the action). Shipping dead UI fails YAGNI.
**Fix**: Remove the HUD component + tests + view import. When aiClient is extended to expose `cached_tokens`, re-introduce the HUD as a focused new task.

### B-I4. View calls `fetchEpicIssues` directly (layering)
**Source**: Architecture Reviewer #1
**File**: [src/components/issueRefinery/IssueRefineryView.tsx](../../src/components/issueRefinery/IssueRefineryView.tsx)
**Symptom**: The view directly imports `fetchEpicIssues` from the gitlab client — a layering violation. The bridge belongs in an action so the view stays presentational.
**Fix**: Extract `bridgeLoadedEpicAction()` into `src/actions/refineIssueAction.ts`; view calls the action.

### B-I5. Strengthen integration test fixtures + a few weak assertions
**Source**: Test Quality #11, #17, #22
**Fix**: Tighten regex matches; richer GitLab fixtures; locked-tier boundary tests in ValidationCard.

---

## ACKNOWLEDGED (not fixed in this loop)

- **`window.confirm` a11y limitations** (ProdReady #12) — acceptable for v1; replaceable with `<dialog>` in a polish task.
- **No `AbortController` on the gitlab fetch** (ProdReady #1) — the `cancelled` flag covers React-side correctness; aborting the actual HTTP request is a perf/cost optimization for v2.
- **Refetch on tab re-entry** (ProdReady #4) — current children cache lives in store; tab switch keeps it. Effect refires but is short-circuited by the post-fix `bridgedIidRef` discipline. Negligible.
- **Multiple per-field Zustand selectors** (Correctness #13, Arch #14) — granular by design; `useShallow` migration is cosmetic.
- **Large-body textarea performance** (ProdReady #10) — measure in dogfood first; debounce / uncontrolled fallback is a v2 fix.
- **Error-text verbosity in toasts/banners** (Security #1, #2, ProdReady #5) — Phase A action layer scrubs at source; the UI just renders what action surfaces. Will tighten if dogfood shows raw HTML in toasts.
- **Severity-prefix parsing brittleness** (Architecture #10, Correctness/ProdReady #9) — works for current prompt design; if the prompt drifts in v2 we'll lift the structure into the schema.
- **CSS not present** (Architecture #5) — components ship with `ir-*` class hooks but no stylesheet in the delta. Styling is the next polish task (R-17 KB docs first).
- **Default-vs-named export inconsistency** (Architecture #6) — cosmetic.
- **Numerous test edge cases** (Test #1, #2, #4, #6, #14, #19) — captured in the acknowledgement file for follow-up.

---

## Fix-loop summary

After this loop, expected state:
- 3 critical findings fixed (B-C1, B-C2, B-C3)
- 5 important findings fixed (B-I1, B-I2, B-I3, B-I4, B-I5)
- 11+ findings acknowledged or deferred (none blocking ship)
- Full Issue Refinery test suite green
- Phase B exit criteria met: zero unresolved critical findings.
