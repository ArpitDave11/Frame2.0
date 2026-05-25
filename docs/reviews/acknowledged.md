# Acknowledged review findings (deferred with justification)

Findings the deep-review identified that are NOT fixed in the source branch
but are explicitly accepted with documented reasoning. The justification is
the contract — if a future change removes the reasoning, the finding becomes
a must-fix.

---

## BRP headless layer — 2026-05-25

From [2026-05-25-brp-headless-deep-review.md](./2026-05-25-brp-headless-deep-review.md).

### I5 — `console.error` in `brpStore.runAnalysis` is wrong channel for regulated context

**Severity:** important
**Source:** Production Readiness reviewer #3
**Location:** `src/stores/brpStore.ts:280–282`

**Why deferred:** The store is intentionally UI-agnostic — `addToast` would
couple it to `uiStore`. The right fix is an optional `onError` callback
injected by the Phase 6 wiring layer, where the UI shape (toast vs.
inline banner vs. modal) is decided. Wiring this in the headless layer
without a UI consumer is premature.

**Owner:** Phase 5/6 PRD. Must-fix before any UI ships that depends on
`runAnalysis`.

**Tracking:** Add to the upcoming P5/P6 PRD as a required acceptance
criterion. Reference: this acknowledgment file.

---

### I6 — `'progress'` AnalysisEvents are dropped in `runAnalysis`

**Severity:** important
**Source:** Production Readiness reviewer #4
**Location:** `src/stores/brpStore.ts:271–276`

**Why deferred:** A `BrpProgress` state field would have no consumer
without UI. The PRD scope explicitly excludes UI (N1, N2). The simulator
emits exactly one `'progress'` event at pct=0.5 today; the dropped event
has zero observable v1 cost. A real estimator that emits many events
will surface this gap loudly, which is the right time to design the
state field against an actual UI requirement.

**Owner:** Phase 5/6 PRD — wire progress state when the UI design
specifies how progress is rendered (spinner-with-pct, per-epic-row, or
aggregate counter).

**Tracking:** P5/P6 PRD acceptance criterion.

---

### I8 — `brpGitlabService` `Result<T>` error is a plain string

**Severity:** important
**Source:** Production Readiness reviewer #6
**Location:** `src/services/brp/brpGitlabService.ts:56–58`

**Why deferred:** Widening to `{ code?: string; message: string; cause?:
unknown }` is an interface revision that ripples into every caller. With
no callers today (the action layer is Phase 6), making the change now
buys nothing and risks designing the shape against imagined needs.
Phase 6 will be the first consumer that needs to discriminate
auth-expired vs rate-limit vs network errors; that's when the structure
of `code` should be designed against real UI requirements.

**Owner:** Phase 6 wiring. Must-fix when the first action layer needs
to branch on error type.

**Tracking:** P5/P6 PRD acceptance criterion.

---

## How to remove an acknowledgment

If you're about to ship UI that depends on `runAnalysis` (Phase 6), or
to widen the GitLab service Result shape:

1. Implement the fix.
2. Update the corresponding finding here with the commit SHA + date of
   resolution.
3. Move the entry to the bottom of this file under a `## Resolved`
   section so the history stays auditable.
