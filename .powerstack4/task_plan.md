# BRP — Breakdown & Re-groom Planning (Headless Layer: P1 → P4)

## Goal
Ship the headless layer of BRP (types, store, AI seam, GitLab service) per
`.taskmaster/docs/brp-headless-prd.txt`. No UI in this PRD — Phase 5/6/7
are separate. Land on `feature/brp` branch, mergeable to `main` independently.

## Architecture
- Pure model + math: `src/domain/brp.ts` + `brp.constants.ts` (no React, no Zustand).
- Single Zustand store: `src/stores/brpStore.ts` (inputs/raw only, never derived).
- AI seam: `AIEstimator` interface in `domain/brp.ts`; deterministic simulator in
  `src/services/brp/ai/simulatedEstimator.ts`; provider for P7 swap-in.
- GitLab service: `src/services/brp/brpGitlabService.ts` composing `gitlabClient.ts`.

## Phases (per PRD §10)

| # | Task | Status |
|---|------|--------|
| B-0  | Preflight verification | done |
| B-1  | P1 types + constants | done |
| B-2  | computeCapacity + tests | done |
| B-3  | computeDelta + computeVariance + tests | done |
| B-4  | computePodMetrics + tests | done |
| B-5  | brpStore state + Loading actions | done |
| B-6  | brpStore Capacity + Estimates + Analysis actions | done |
| B-7  | brpStore Navigation + UI actions | done |
| B-8  | AIEstimator + Zod schemas | in_progress |
| B-9  | simulatedEstimator + provider | pending |
| B-10 | brpGitlabService skeleton + mocked tests | pending |
| B-11 | brpGitlabService live smoke (gated) | pending |
| —    | 5-agent deep-review checkpoint | pending |
| B-12 | Knowledge base docs | pending |
| B-13 | Devlog + ADR-0003 + final commit | pending |

## Key Decisions (locked)
- **D1** Pure layer at `src/domain/brp.ts` (NOT `src/types/` — matches codebase).
- **D2** Three invariants enforced by type shape: no top-level variance/delta on
  Epic, no totalCapacity on Pod, VarianceBand is a return type only.
- **D5** `AIEstimator` interface lives in `domain/brp.ts` (per p2's recommended option).
- **D9** Branch `feature/brp` from `main` via worktree at
  `/Users/arpit/Documents/FRAME_DEPLOYED-brp`, mergeable independent of IR.
- Chart library for P5: **recharts** (~200KB) — added in P5, not in this PRD.
- Variance UI labels deferred to P5; internal type names locked here.

## Error Log
(none yet)

---

## Journal

### B-0 — Preflight Verification (in_progress → done)

**Date:** 2026-05-24
**Branch:** feature/brp at 88ed7ca (main HEAD before IR work)
**Worktree:** /Users/arpit/Documents/FRAME_DEPLOYED-brp

**Commands run:**

```
$ git branch --show-current
feature/brp

$ git worktree list
/Users/arpit/Documents/FRAME_DEPLOYED      3cf6831 [feature/issue-refinery]
/Users/arpit/Documents/FRAME_DEPLOYED-brp  88ed7ca [feature/brp]

$ git status --short
 M .taskmaster/config.json                           # claude-code provider switch
?? .taskmaster/docs/brp-headless-prd.txt             # this PRD
?? .taskmaster/tasks/                                # parse_prd output

$ npm install
added 388 packages, audited 389 in 5s
13 vulnerabilities (pre-existing on main — not BRP's concern)

$ npx tsc -b --noEmit | grep -c "error TS"
55 errors total — pre-existing across many test files (uiStore, chatStore,
configStore, gitlabStore, ai/aiClient/azureClient/openaiClient/throttler,
gitlabClient, templateLoader, pipelineFlow/gitlabFlow/crossFeature, etc.) —
mostly TS2532/TS2345 strict-null violations + a missing `totalDuration`
field on PipelineResult fixture and a couple TS6133 unused-var lints.
Exit code 0 (tsc -b doesn't fail on these in build mode).
NOT caused by BRP. Baseline must remain ≤ 55 errors. (Earlier note said
"23" — that was a tail-truncated count, corrected here.)

$ npm run test:run
Test Files  2 failed | 70 passed (72)
Tests       11 failed | 1297 passed (1308)
Duration    14.70s
Failing files (pre-existing, both about missing AuthProvider in test wrappers):
  - src/components/layout/WelcomeSidebar.test.tsx (9 failures)
  - src/components/views/WelcomeScreen.test.tsx   (2 failures)
NOT caused by BRP. Baseline must remain at 11 failures.
```

**Baseline locked:**
- tsc errors: 55 (pre-existing across ~12 files)
- test failures: 11 (pre-existing — Welcome* AuthProvider)
- BRP work must keep both numbers ≤ current (no regressions, fix nothing outside scope).

**Notes:**
- `.claude/hooks/stop-typecheck.py` is branch-scoped to `docmining*`/`phase-a*`/
  `phase-b*` — does NOT gate on `feature/brp`. Confirmed by reading hook source.
- `.powerstack4/task_plan.md` was reset for BRP (old content was stale
  Mermaid-diagnostics research from a prior session).
- Per CLAUDE.md `Active Work` section: still says DocMining. Will be updated
  in the wrap-up after P4, not now.

**Verification:** all 5 PRD steps for B-0 confirmed (worktree exists, branch
correct, npm install clean, tsc baseline captured, test baseline captured).

**Status: done**

---

### B-1 — P1 Types and Constants Module (in_progress → done)

**Date:** 2026-05-24
**Files created:**
- `src/domain/brp.ts` (227 lines) — 14 types + 1 interface (AIEstimator)
- `src/domain/brp.constants.ts` (47 lines) — 6 constants

**Type inventory (matches PRD §F1.1):**
- Scales/enums: `FibonacciPoint` (literal union), `AnalysisStatus`, `VarianceBand`
- Capacity: `CapacityInputs` (5 inputs), `CapacityResult`
- FRAME blocks: `BreakdownItem`, `ReferenceEpic`, `GeneratedStory`, `FrameResult`
- Entities: `Epic`, `Pod`, `Crew`, `PI`
- Derived (return-type-only): `PodMetrics`
- AI seam: `AnalysisEvent` (discriminated union), `AIEstimator` interface

**Constants (matches PRD §F1.2):**
- `FIBONACCI_POINTS`, `DEFAULT_SP_PER_RESOURCE` (10),
  `VARIANCE_AGREE_THRESHOLD` (0.20), `VARIANCE_CAUTION_THRESHOLD` (0.50),
  `CONFIDENCE_BUMP_THRESHOLD` (0.40), `FLAGGED_DESCRIPTION_MIN_CHARS` (80)

**Architectural decisions made during implementation:**
- Added `description: string` to `Epic` (PRD §F1.5 step 1 references it for the
  'flagged' heuristic but the B-1 spec didn't list it explicitly). Normalize at
  the GitLab service boundary (null → '').
- Added `FLAGGED_DESCRIPTION_MIN_CHARS = 80` to constants (B-3 will use it).
  PRD called it out in RK1 as needing to be made concrete; locking it now.
- `AIEstimator.analyzeEpic` takes `readonly ReferenceEpic[]` (immutable).
- `Epic.id` is `string` (not `number`) for safety across GitLab number ranges.
- `Epic.source` is the literal union `'gitlab'` (room to extend later
  without a model change).

**Verification commands:**

```
$ npx tsc -b --noEmit | grep -c "error TS"
55   # unchanged from B-0 baseline — zero BRP-introduced errors

$ npx tsc -b --noEmit 2>&1 | grep "src/domain/brp" | wc -l
0    # zero errors in the new files specifically

$ grep -nE "^import" src/domain/brp.ts src/domain/brp.constants.ts
src/domain/brp.constants.ts:11:import type { FibonacciPoint } from './brp';
     # Only a type-only import between the two BRP files — no React,
     # no Zustand, no FRAME services. Dependency-free per AC6.
```

**Status: done**

---

### B-2 — computeCapacity + tests (in_progress → done)

**Date:** 2026-05-24
**Files touched:**
- `src/domain/brp.ts` — appended `computeCapacity` after the AIEstimator interface
- `src/domain/brp.test.ts` (new, 95 lines) — 7 tests for computeCapacity

**Tests written (7):**
1. PRD worked example (343 total for 6×10×6 − 12 − 5) — the named acceptance gate
2. Clamps negative total to 0 when leave overwhelms gross
3. Zero resources → zero gross, zero holiday deduction, zero total
4. Zero deductions → total equals gross
5. Holiday × resources rule (3 holidays × 10 people = 30 SP off, not 3)
6. Leave taken as-is (NOT multiplied by resources)
7. Determinism — repeated calls with same input are equal

**Verification commands:**

```
$ npm run test:run -- src/domain/brp.test.ts
Test Files  1 passed (1)
Tests       7 passed (7)
Duration    477ms

$ npx tsc -b --noEmit 2>&1 | grep -c "error TS"
55   # unchanged from baseline — no BRP-introduced errors
```

**Status: done**

---

### B-3 — computeDelta + computeVariance + tests (in_progress → done)

**Date:** 2026-05-24
**Files touched:**
- `src/domain/brp.ts` — appended `computeDelta` and `computeVariance`;
  added `import` block for the 4 thresholds from `brp.constants.ts`
- `src/domain/brp.test.ts` — rm + Write (H3 pattern); now 28 tests covering
  computeCapacity (7) + computeDelta (6) + computeVariance (15)

**Tests added for computeDelta (6):**
- null when frameResult missing / humanEstimate missing / both
- positive when FRAME estimates higher
- negative when FRAME estimates lower
- zero when estimates match

**Tests added for computeVariance (15), grouped by step:**
- Step 1 (no analysis): 5 tests — raw + normal desc → pending; raw + thin desc
  → flagged; raw + empty desc → flagged; analyzing status → pending;
  error status → pending OR flagged depending on description thickness
- Step 2 (analyzed, no humanEstimate): 1 test — pending
- Step 3 (thresholds): 6 tests — ratio exactly 0.20 → agree; just above 0.20
  → caution; exactly 0.50 → caution; just above 0.50 → re-groom; symmetric
  when FRAME higher; identical estimates → agree at any magnitude
- Step 4 (confidence bump): 3 tests — agree at conf=0.40 stays agree; agree
  at conf=0.39 bumps to caution; caution/re-groom NEVER downgraded by low conf

**Type-system caught a real bug during this task:**
First test pass used `frameEstimate: 7` and `frameEstimate: 4` in 7 threshold
tests. tsc rose 55 → 62 with `TS2322: Type '7' is not assignable to type
'FibonacciPoint'`. The `FibonacciPoint` literal union (1|2|3|5|8|13|21|40|100)
is doing exactly the job the architectural rule wants — preventing the
simulator and any other producer from emitting non-Fibonacci values.
Fixed by rewriting threshold tests with valid Fibonacci pairs that still
land on the same band boundaries (e.g., human=8, frame=5 → 3/8 = 0.375
→ caution, replacing the original human=10, frame=7 → 0.30).

**Verification commands:**

```
$ npm run test:run -- src/domain/brp.test.ts
Test Files  1 passed (1)
Tests       28 passed (28)
Duration    591ms

$ npx tsc -b --noEmit 2>&1 | grep -c "error TS"
55   # back to baseline after Fibonacci-safe rewrite

$ npx tsc -b --noEmit 2>&1 | grep "src/domain/brp" | wc -l
0
```

**Status: done**

---

### B-4 — computePodMetrics + tests (in_progress → done) — **P1 COMPLETE**

**Date:** 2026-05-25
**Files touched:**
- `src/domain/brp.ts` — appended `computePodMetrics`
- `src/domain/brp.test.ts` — rm + Write (H3 pattern); now 35 tests covering
  all 4 pure functions

**Tests added for computePodMetrics (7):**
- Empty pod: all-zero loads, zero avgConfidence (not NaN), totalCapacity from inputs
- Normal pod, 4 epics mixing agree/caution/re-groom/flagged — verifies
  humanLoad=24, frameLoad=16 (E4's flagged 21 excluded), avgConfidence=0.8
- **Regression guard**: flagged epic with humanEstimate=100 is NOT added
  to humanLoad (p1.md's stated past bug)
- All-flagged pod: humanLoad=0, frameLoad=0, balance=totalCapacity, no NaN
- Pending epic (FRAME done, no human est): contributes frameLoad+confidence,
  NOT humanLoad
- Over-committed pod: negative balance (totalCapacity 10, frameLoad 100,
  balance -90)
- Purity: repeated calls equal

**Verification:**

```
$ npm run test:run -- src/domain/brp.test.ts
Test Files  1 passed (1)
Tests       35 passed (35)
Duration    465ms

$ npx tsc -b --noEmit 2>&1 | grep -c "error TS"
55      # baseline unchanged

$ npx tsc -b --noEmit 2>&1 | grep "src/domain/brp" | wc -l
0
```

**Phase 1 complete:**
- `src/domain/brp.ts` — 14 types + AIEstimator interface + 4 pure functions
- `src/domain/brp.constants.ts` — 6 constants
- `src/domain/brp.test.ts` — 35 tests (7 capacity + 6 delta + 15 variance + 7 metrics)
- All 4 functions are pure, dependency-free, and Fibonacci-safe.
- Architectural invariants enforced by type shape (no stored variance/delta/totalCapacity).

**Status: done**

---

### B-5 — brpStore state + Loading actions (in_progress → done)

**Date:** 2026-05-25
**Files created:**
- `src/stores/brpStore.ts` (~145 lines) — Zustand v5 store, patterned on initiativeStore.ts
- `src/stores/brpStore.test.ts` (~190 lines) — 13 tests

**State shape (12 fields, all inputs/raw):**
- Domain: `crews`, `currentPI`
- Navigation: `view`, `selectedCrewId`, `selectedPodId`, `selectedEpicId`
- UI: `collapsedPods` (Set), `reGroomOnlyFilter`, `openModal`, `modalContext`
- Process: `analysisStatus` ('idle' | 'running' | 'done')

**Loading actions (4 — B-5 scope):**
- `loadCrew(crew)` — appends (does NOT dedup; caller's job)
- `loadPods(crewId, pods)` — REPLACES the crew's pod list (no-op on unknown id)
- `loadEpicsIntoPod(podId, epics)` — REPLACES the pod's epic list across any crew (no-op on unknown id)
- `reset()` — fresh Set + arrays via `initialState()` factory

**Design decisions:**
- `initialState()` is a function (not a frozen constant) so `reset()` always
  returns a fresh `Set` for collapsedPods. A shared mutable INITIAL is a
  subtle bug source.
- Append-on-loadCrew (not upsert) matches p2.md's "a crew enters the board"
  framing. Dedup is the caller's concern; staging multiple crews intentional.
- Replace-on-loadPods/loadEpicsIntoPod matches the GitLab-refresh model:
  re-loading = "what's in there now", not "merge with what was there".

**Tests (13):**
- Initial-state shape (Set instance, all defaults)
- loadCrew append, multi-crew order preservation, no-dedup behavior
- loadPods sets pods on target crew, leaves others alone, REPLACES not
  merges, no-ops on unknown crew
- loadEpicsIntoPod sets on target pod across any crew, REPLACES, no-ops
  on unknown pod
- reset clears all, returns FRESH Set (not a stale reference)
- **No-derived-state invariant**: programmatically asserts Crew has only
  {id,name,gitlabGroupId,pods}; Pod has no totalCapacity field; Epic has
  no variance/delta/frameEstimate fields.

**Verification:**

```
$ npm run test:run -- src/stores/brpStore.test.ts
Test Files  1 passed (1)
Tests       13 passed (13)
Duration    640ms

$ npx tsc -b --noEmit 2>&1 | grep -c "error TS"
55   # baseline unchanged

$ npx tsc -b --noEmit 2>&1 | grep -E "(src/domain/brp|src/stores/brp)" | wc -l
0
```

**Status: done — P2 complete (see B-7 entry below).**

---

### B-6 — Capacity + Estimates + Analysis actions (in_progress → done)

**Date:** 2026-05-25
**Files touched:**
- `src/stores/brpStore.ts` — added 5 actions (+ `findEpic` helper) and the
  remaining type imports (CapacityInputs, FrameResult, AnalysisStatus,
  AIEstimator, ReferenceEpic)
- `src/stores/brpStore.test.ts` — rm + Write; now 30 tests (13 from B-5 + 17 from B-6)

**Actions added (5):**
- **updatePodCapacity(podId, inputs)** — writes 5 raw inputs only; no totalCapacity field added; no-op on unknown pod
- **setHumanEstimate(epicId, value | null)** — touches only humanEstimate; variance re-derives via computeVariance at read; no-op on unknown
- **runAnalysis(estimator, getReferences?)** — async; walks every epic across crews/pods at kickoff; per-epic: status → 'analyzing' → 'done'+frameResult or 'error'; whole-pipeline: 'idle' → 'running' → 'done'; estimator throw caught → epic 'error', run continues; getReferences defaults to () => []
- **setEpicAnalysisStatus(epicId, status)** — direct setter; does NOT clear frameResult (so re-runs preserve prior result until new one lands)
- **setEpicFrameResult(epicId, result)** — sets result AND status='done' atomically (a 'done' without a result is a category violation)

**Design decisions:**
- `runAnalysis` scope = all loaded epics. Phase 6 wiring decides scope by
  pre-loading only what should be analyzed; this keeps UI-scope concerns
  out of the store.
- `runAnalysis` snapshots epic IDs at kickoff (`get().crews.flatMap...`),
  then re-reads each epic per iteration. Walking the live store would risk
  missing newly-loaded epics or revisiting analyzed ones.
- `runAnalysis` catches thrown estimator errors per-epic and continues —
  one bad epic shouldn't kill the whole run. Logs via `console.error`;
  Phase 7 may want toast UX.
- `findEpic` helper at module scope (not in the store closure) so the
  store value is small and the helper is testable in isolation if needed.

**Tests added (17):**
- updatePodCapacity (4): writes inputs, no totalCapacity field added,
  doesn't touch other pods, no-op on unknown
- setHumanEstimate (4): value set + variance derives correctly, null clears,
  cross-pod isolation, no-op on unknown
- setEpicAnalysisStatus (2): basic set, does NOT clear frameResult on
  re-analyzing transition
- setEpicFrameResult (1): atomic set of result + status='done'
- runAnalysis (6): walks all epics + idle→running→done, sets 'analyzing'
  before each call, 'error' event → epic 'error' + null frameResult,
  thrown estimator continues run, empty store still transitions cleanly,
  getReferences passed through to estimator

**Verification:**

```
$ npm run test:run -- src/stores/brpStore.test.ts
Test Files  1 passed (1)
Tests       30 passed (30)
Duration    1.00s

$ npx tsc -b --noEmit 2>&1 | grep -c "error TS"
55   # baseline unchanged

$ npx tsc -b --noEmit 2>&1 | grep -E "(src/domain/brp|src/stores/brp)" | wc -l
0
```

**Status: done**

---

### B-7 — Navigation, UI, Modal actions (in_progress → done) — **P2 COMPLETE**

**Date:** 2026-05-25
**Files touched:**
- `src/stores/brpStore.ts` — added 9 actions (8 from PRD §F2.2 + setCurrentPI)
- `src/stores/brpStore.test.ts` — rm + Write; now 44 tests (13 + 17 + 14)

**Actions added (9):**
- **setView** — 'portfolio' ↔ 'pod'
- **selectCrew / selectPod / selectEpic** — string | null setters
- **togglePodCollapse** — Set add/remove with a FRESH Set instance per
  toggle (so React selectors that compare by reference re-render correctly)
- **setReGroomOnlyFilter** — boolean toggle
- **openModalFor(modal, context?)** — modalContext defaults to null;
  REPLACES the previous modal+context wholesale (no merge)
- **closeModal** — clears openModal AND modalContext atomically
- **setCurrentPI** — set the active PI (or null). Not in p2's explicit
  action list but needed by P5 (the portfolio-view top bar shows the PI
  name); pulling it forward is trivial here.

**Design decisions:**
- `togglePodCollapse` returns a new Set per toggle. Otherwise React's
  `useShallow` / identity-based selectors would miss the change.
- Modal opens REPLACE context entirely. Avoids subtle merge bugs where
  a stale podId from a prior open leaks into a new modal.
- `BrpModal` is `'capacity' | ... | null`. `openModalFor` parameter is
  typed `Exclude<BrpModal, null>` so the caller can't open the "null
  modal" (closeModal exists for that).

**Tests added (14):**
- setView toggle
- select* setters: each sets and clears, independent of others
- togglePodCollapse: add, remove, fresh Set identity, multi-pod independence
- setReGroomOnlyFilter: on/off
- openModalFor: no context, with context, replace semantics, close clears both
- setCurrentPI: set + clear
- reset also clears modal state (added one extra assertion to the existing
  reset test for B-7 fields)

**Verification:**

```
$ npm run test:run -- src/stores/brpStore.test.ts
Test Files  1 passed (1)
Tests       44 passed (44)
Duration    499ms

$ npx tsc -b --noEmit 2>&1 | grep -c "error TS"
55   # baseline unchanged

$ npx tsc -b --noEmit 2>&1 | grep -E "(src/domain/brp|src/stores/brp)" | wc -l
0
```

**Phase 2 complete:**
- `src/stores/brpStore.ts` — 13 state fields + 14 actions (4 Loading + 1
  Capacity + 1 Estimates + 3 Analysis + 5 Navigation/UI/Modal + reset)
- `src/stores/brpStore.test.ts` — 44 tests
- AIEstimator interface imported but no implementation — Phase 3's job.
- Action contract FROZEN — components in Phase 5 can be written against
  this surface without fear of signature churn.

**Status: done**

---

### B-8 — AIEstimator + Zod schemas (in_progress → done)

**Date:** 2026-05-25
**Files created:**
- `src/services/brp/ai/schemas.ts` (~110 lines) — Zod runtime schemas
- `src/services/brp/ai/schemas.test.ts` (~165 lines) — 38 parse tests

**Dependency added:**
- `zod@^4.4.3` to package.json (matching the version IR uses on main+IR).
  Branch point (88ed7ca) was pre-IR so didn't have zod. PRD assumed zod
  was already present; this addition aligns the branch with main+IR. When
  feature/brp eventually rebases or main merges, no version conflict.

**Schemas exported (5):**
- `FibonacciPointSchema` — union of 9 number literals
- `BreakdownItemSchema` — { title, points: FibonacciPoint }
- `ReferenceEpicSchema` — { epicId, title, similarity ∈ [0,1], actualSp }
- `GeneratedStorySchema` — { title, points: FibonacciPoint, acceptanceCriteria: string[] }
- `FrameResultSchema` — composes the above; confidence ∈ [0,1];
  generatedStories nullable
- `AnalysisEventSchema` — `z.discriminatedUnion('kind', [...])` with
  started/progress (pct ∈ [0,1])/done/error variants

**Decision: simulator does NOT call these at runtime.**
The B-9 simulator is fully TypeScript-typed; it cannot emit invalid
events by construction. Running Zod parse on every emitted event would
be redundant work with zero detection value. The schemas exist for:
  1. Schema-vs-type drift detection (these tests catch it).
  2. P7 real-LLM estimator's boundary parser (LLM JSON is untyped).
  3. External callers validating untrusted input.

Documented in the schemas.ts header so a future contributor doesn't
"helpfully" add `.parse(...)` calls inside the simulator.

**Tests (38):**
- FibonacciPointSchema: 9 valid (parameterized), 10 invalid (parameterized
  including 0, 4, 7, 9, 10, 14, 50, -1, 101, 1.5), strings rejected
- FrameResultSchema (9): valid happy path, generatedStories present,
  non-Fib frameEstimate, confidence < 0, confidence > 1, non-Fib
  breakdown point, missing required field, similarity out of [0,1],
  empty references/breakdown accepted
- AnalysisEventSchema (10): all 4 variants accepted with valid payloads,
  progress pct boundaries, invalid pct, done with bad FrameResult,
  unknown event kind, missing epicId, missing result on done

**Verification:**

```
$ npm run test:run -- src/services/brp/ai/schemas.test.ts
Test Files  1 passed (1)
Tests       38 passed (38)
Duration    569ms

$ npx tsc -b --noEmit 2>&1 | grep -c "error TS"
55   # baseline unchanged

$ npx tsc -b --noEmit 2>&1 | grep -E "(src/domain/brp|src/stores/brp|src/services/brp)" | wc -l
0
```

**Status: done**
