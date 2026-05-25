# BRP Headless Layer — 5-Agent Deep Review

**Date:** 2026-05-25
**Branch:** `feature/brp`
**Scope:** Phases 1–4 (headless layer): types, store, AI seam, GitLab service
**Checkpoint:** Post-B-11, before B-12 (knowledge docs) and B-13 (devlog/ADR/final commit)
**Reviewer count:** 5 (Correctness, Architecture, Security, Production Readiness, Test Quality)
**Protocol:** [docs/runbooks/deep-review-a10.md](../runbooks/deep-review-a10.md)
**Diff target:** `git diff main...HEAD` (88ed7ca..e0b5bd6)

---

## Summary

| Severity         | Count | Status |
|------------------|-------|--------|
| Critical         | 3     | All to be fixed in this checkpoint loop |
| Important        | 15    | Mix of fix-now and ack-with-justification |
| Nice-to-have     | 10    | Logged, not auto-fixed (v1 acceptable) |

**Cross-reviewer convergence:** Correctness and Production Readiness independently flagged the same root cause — `runAnalysis` has no cancellation path and no concurrency guard. This is the single most important fix.

**Security review:** clean. No findings.

**Architecture:** 2 important findings — drop the speculative `source: 'gitlab'` union (only one variant exists), move `AIEstimator` interface from `domain/brp.ts` (which claims to be services-free) into `src/services/brp/ai/types.ts`.

**Test Quality:** 3 critical/important — one probabilistic flake (confidence inverse-variance assertion has no statistical buffer), one wrong-reason pass (test overrides both `analysisStatus` and `frameResult`, can't distinguish which check the production code is making), and several missing edge-case tests.

---

## Critical

### C1 — `runAnalysis` lacks cancellation AND concurrency guard

**Source:** Correctness #3 + #20, Production Readiness #1 + #2 — flagged independently by both reviewers.

- `src/stores/brpStore.ts:250–287` — `for await` loop runs to completion with no `AbortSignal`, no cancel flag, no early-exit on store reset.
- Two concurrent `runAnalysis` calls interleave through shared `set()` calls. State.analysisStatus flips `'running' → 'running' → 'done'` while another loop is still mid-iteration; per-epic transitions can interleave.
- `reset()` mid-run leaves zombie writes — `set({ analysisStatus: 'done' })` at line 287 still fires after the reset cleared state to `'idle'`.

**Required fix (interface revision — do once):**
1. Add an optional `AbortSignal` parameter to `AIEstimator.analyzeEpic` (and `RunAnalysisOptions`).
2. Add a re-entry guard in `runAnalysis`: early-return when `analysisStatus === 'running'`.
3. Honor `signal.aborted` between epics and inside the for-await loop.
4. Reset to `'idle'` when aborted (not `'done'`).
5. Tests: concurrent-call no-op, abort mid-run, abort between epics.

This change also covers Important findings **I2** (hung iterator) and **I7** (no timeout in interface) — bundle them.

---

### C2 — `simulatedEstimator.test.ts` probabilistic flake without statistical buffer

**Source:** Test Quality #1 — `simulatedEstimator.test.ts:208–227`.

The "mean(single-item conf) > mean(3+ item conf) across 200 samples" assertion has no buffer (no `+ 0.05`) and no fixed seed. The expected gap is ~0.1–0.2, but in the long tail of CI runs it could collide due to template/middle-bias sampling variance.

**Required fix:** assert `mean(singles) > mean(multi) + 0.05` (real-world gap is comfortably above this), OR bypass `pickFrameEstimate` and call `computeConfidence` directly with fixed breakdowns.

---

### C3 — `brp.test.ts` "raw" pending test passes for the wrong reason

**Source:** Test Quality #2 — `brp.test.ts:208–211`.

The test overrides BOTH `analysisStatus: 'raw'` AND `frameResult: null`. Production check at `brp.ts:357` is `analysisStatus !== 'done' || frameResult === null`. The OR short-circuits, so the test cannot distinguish which arm fired.

**Required fix:** add a complementary test where one arm is held constant. Specifically:
- `analysisStatus: 'analyzing'`, **with a valid `frameResult`** → must return `'pending'` (with fat description).
- `analysisStatus: 'done'`, `frameResult: null` → must return `'pending'` (with fat description).

---

## Important

### I1 — Estimator could overwrite the wrong epic via `event.epicId`

**Source:** Correctness #2 — `brpStore.ts:267`.
Store trusts `event.epicId` from the estimator's emitted events and writes wherever the estimator claims. A buggy or malicious estimator could overwrite an unrelated epic's state.

**Fix:** assert `event.epicId === epic.id` (or use the outer `epic.id` consistently when writing).

### I2 — Hung iterator silently leaves an epic in `'analyzing'`

**Source:** Correctness #1.
If a future estimator returns without emitting a terminal `'done'`/`'error'` event, the loop exits cleanly but the epic is stuck in `'analyzing'` forever. **Bundle with C1's AbortSignal/timeout interface revision.**

### I3 — `updatePodCapacity` stores caller's object by reference

**Source:** Correctness #4 — `brpStore.ts:194–200`.
No defensive `{ ...inputs }` clone. If a Phase 6 component mutates the same object after passing it in, the pod's capacity mutates outside Zustand's set cycle; selectors won't re-render and `Object.is` equality passes.

**Fix:** `set((s) => ({ crews: s.crews.map(...p.id === podId ? { ...p, capacity: { ...inputs } } : p ...) }))`.

### I4 — `computePodMetrics` confidence aggregation includes `'pending'` epics

**Source:** Correctness #10 — `brp.ts:429–432`.
The metric loop adds `frameResult.confidence` whenever `frameResult` is non-null, regardless of band. After `setEpicAnalysisStatus(id, 'analyzing')` for a re-run (which deliberately preserves the prior `frameResult` per [brpStore.ts:294]), the stale confidence is still counted, contradicting the docstring "across analyzed (non-flagged) epics".

**Fix:** check `epic.analysisStatus === 'done'` (or use the already-computed `band` from the variance check) before adding to `confidenceSum`. Add a regression test.

### I5 — `runAnalysis` `console.error` is wrong channel for UBS context (Phase 6 concern)

**Source:** Production #3 — `brpStore.ts:280–282`.
For a regulated banking feature, silent `console.error` means estimator failures vanish in production. Should accept an `onError` callback (so the store stays UI-agnostic) and let Phase 6 wire to `addToast`.

**Recommendation:** acknowledge — defer to Phase 6 wiring. The PRD scope is headless-only. Add to Phase 5/6 PRD as a must-fix-before-merge item. Document in [docs/reviews/acknowledged.md](acknowledged.md).

### I6 — `'progress'` AnalysisEvents are dropped (Phase 5/6 concern)

**Source:** Production #4 — `brpStore.ts:271–276`.
The for-await consumer only acts on `'done'` and `'error'`. `'progress'` events fall through. No `analysisProgress` state for UI subscribers.

**Recommendation:** acknowledge — defer to Phase 5/6 (depends on UI shape). Headless layer just needs to NOT drop the events on the floor; consider adding a `BrpProgress` state field but leaving it unused until P5 wires it. Document in acknowledged.md.

### I7 — `AIEstimator` interface lacks `AbortSignal` / timeout

**Source:** Production #5.
**Bundle with C1.** The interface revision is cheap now (no real estimator yet), expensive in P7.

### I8 — `brpGitlabService` Result error is just a string (Phase 6 concern)

**Source:** Production #6 — `brpGitlabService.ts:56–58`.
No error code, no original cause, no HTTP status. UI cannot discriminate auth-expired vs rate-limit vs network.

**Recommendation:** acknowledge — defer; widen `Result<T>` to `{ code?, message, cause? }` when Phase 6 wiring needs to discriminate. Document in acknowledged.md.

### I9 — `source: 'gitlab'` literal union is speculative (YAGNI)

**Source:** Architecture #3 — `brp.ts:178`.
Only one variant exists. No B-task plans to add another.

**Fix:** change to a plain `source: 'gitlab';` (not a union) with a TODO comment for the manual-seed source if it ever lands.

### I10 — `AIEstimator` should move out of `domain/brp.ts`

**Source:** Architecture #4 — `brp.ts:279–284`.
The `domain/brp.ts` header explicitly says the module is "dependency-free except for its own constants file… no React, no Zustand, no FRAME services." `AIEstimator` is a service seam. Belongs in `src/services/brp/ai/types.ts` alongside the schemas + simulator.

**Fix:** move `AIEstimator` and `AnalysisEvent` to `src/services/brp/ai/types.ts`. Update imports in brpStore, simulatedEstimator, schemas.

### I11 — Missing test: estimator throws synchronously vs throws inside iterator

**Source:** Test Quality #3.
Existing throw test (`brpStore.test.ts:551–578`) throws inside the async generator body — iterator is created first. Add a case where `analyzeEpic` itself throws synchronously before returning an iterator, and a case where the estimator returns a non-iterable (defensive).

### I12 — Missing test: ratio "just above 0.20" is not actually tight

**Source:** Test Quality #5 — `brp.test.ts:264–270`.
Current test uses h=8, f=5 → ratio 0.375, which is well above 0.20. Doesn't pin the boundary.

**Fix:** add test with h=100, f=79 → ratio 0.21 → `'caution'`.

### I13 — Missing test: `setEpicFrameResult` from `'error'` state

**Source:** Test Quality #8 — `brpStore.test.ts:451`.
The atomic-transition test only starts from `'analyzing'`. Verify `'error' → 'done'` also works (production at brpStore.ts:322 unconditionally sets `'done'`, but no test pins it).

### I14 — Missing test: `runAnalysis` snapshot semantics under mid-run mutation

**Source:** Test Quality #7.
Production snapshots `epicIds` at start (brpStore.ts:256). No test verifies that:
1. A NEW epic loaded mid-run is NOT analyzed (snapshot held).
2. An epic REMOVED mid-run (`findEpic` returns undefined) — loop `continue`s cleanly with no error.

### I15 — Schema tests only assert no-throw, not equality

**Source:** Test Quality #14 — `schemas.test.ts:147–155`.
"`done` with valid FrameResult" tests do not assert `parse(input).toEqual(input)`. A schema that silently strips a field would pass.

**Fix:** add `expect(AnalysisEventSchema.parse(input)).toEqual(input)` to the happy-path assertions.

---

## Nice-to-have (logged, not fixing in this checkpoint)

- **TQ #10** — "different ids → ≥3 distinct estimates" assertion is weak; bump to ≥5 (probability of <5 distinct across 25 samples is negligible).
- **TQ #11** — Live smoke gating: add belt-and-suspenders second env var.
- **TQ #16** — `brpStore.test.ts:580–586` no-epics test could explicitly assert `invoked === 0`.
- **TQ #17** — `analyzedAt` parseable test is too weak (Date.parse('2026') succeeds); also assert within ~5s of `Date.now()`.
- **TQ #19** — No-derived-state invariant test could assert `Object.keys` exactly (catches NEW silently-added fields).
- **Architecture #7** — Extract test fixture builders (`buildEpic`, `buildPod`, `buildFrameResult`, `buildCrew`, `buildSubgroup`) to `src/test/fixtures/brp.ts`.
- **Architecture #9** — Stale JSDoc on `extractSpFromLabels` regex in brpGitlabService.ts:26 (says `/^SP[-:]?(\d+)$/i`, code is `/^SP[\s:_-]?(\d+)$/i`).
- **Architecture #10** — Rename `BrpAnalysisStatus` → `BrpRunStatus` to disambiguate from per-epic `AnalysisStatus`.
- **Correctness #16** — `hashCode` "avoid 0-seed degeneracy" comment is misleading (Math.abs(-2147483648) overflow).
- **Production #9** — Deep-spread perf on every mutation (v2 concern: keyed lookups or Immer).
- **Production #10** — `DEFAULT_POD_CAPACITY.sprintCount` hardcoded; could derive from `currentPI.sprintCount` when available.

---

## Fix plan for this checkpoint

Per the runbook exit criteria (zero critical unresolved + every important fixed-or-acked):

### Fix loop — single commit per cluster

**Cluster 1 (C1 + I2 + I7) — AIEstimator interface + runAnalysis lifecycle**
Files: `src/services/brp/ai/types.ts` (new — also satisfies I10), `src/domain/brp.ts` (remove AIEstimator + AnalysisEvent), `src/stores/brpStore.ts` (re-entry guard + AbortSignal honoring), `src/services/brp/ai/simulatedEstimator.ts` (honor signal), `src/services/brp/ai/schemas.ts` (re-export from new types), tests.

**Cluster 2 (C2 + C3 + I11 + I12 + I13 + I14 + I15) — Test corrections + additions**
Files: `src/domain/brp.test.ts` (C3, I12, I13), `src/stores/brpStore.test.ts` (I11, I13, I14), `src/services/brp/ai/simulatedEstimator.test.ts` (C2), `src/services/brp/ai/schemas.test.ts` (I15).

**Cluster 3 (I1 + I3 + I4 + I9) — Small targeted fixes**
- I1: assert `event.epicId === epic.id` in runAnalysis loop
- I3: defensive `{ ...inputs }` clone in updatePodCapacity
- I4: filter confidence aggregation by `analysisStatus === 'done'` in computePodMetrics
- I9: narrow `source: 'gitlab'` to plain literal type

### Acknowledged (deferred to Phase 5/6 PRD)

- **I5** — error channel via onError callback / addToast
- **I6** — progress state for UI
- **I8** — Result<T> error widening with code/cause

These three are intrinsic to UI wiring decisions, not headless-layer bugs. They will be must-fix items in the Phase 5/6 PRD.

Documented in [docs/reviews/acknowledged.md](acknowledged.md) (new).

---

## References

- Runbook: [docs/runbooks/deep-review-a10.md](../runbooks/deep-review-a10.md)
- PRD: [.taskmaster/docs/brp-headless-prd.txt](../../.taskmaster/docs/brp-headless-prd.txt)
- Phase plans: [docs/Brp_plan/p1.md](../Brp_plan/p1.md), [p2.md](../Brp_plan/p2.md), [p3.md](../Brp_plan/p3.md), [p4.md](../Brp_plan/p4.md)
