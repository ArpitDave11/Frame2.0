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
| B-8  | AIEstimator + Zod schemas | done |
| B-9  | simulatedEstimator + provider | done |
| B-10 | brpGitlabService skeleton + mocked tests | done |
| B-11 | brpGitlabService live smoke (gated) | done |
| —    | 5-agent deep-review checkpoint | done (3 critical + 12 important fixed, 3 acked) |
| B-12 | Knowledge base docs | in_progress |
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

**Status: done — P4 complete (see B-11 entry below).**

---

### B-9 — simulatedEstimator + provider (in_progress → done) — **P3 COMPLETE**

**Date:** 2026-05-25
**Files created:**
- `src/services/brp/ai/simulatedEstimator.ts` (~200 lines) — deterministic AIEstimator
- `src/services/brp/ai/estimatorProvider.ts` (~25 lines) — the one-line swap seam for P7
- `src/services/brp/ai/simulatedEstimator.test.ts` (~280 lines) — 20 tests

**Simulator design:**
- **Seed:** `hashCode(epic.id)` — Java-style string hash. Same id → same seed across reruns/processes.
- **PRNG:** Mulberry32 (small fast deterministic). Used to pick frameEstimate, breakdown template, confidence jitter.
- **frameEstimate:** 80% chance to sample from FIBONACCI_POINTS[1..7] (2..40) — the realistic middle of the scale; 20% chance for any of the 9 values.
- **breakdown:** precomputed lookup table per Fibonacci point value. Each template sums to within ±1 of the key. Avoids the constraint-satisfaction work that greedy splits need for 40 and 100 (large Fibonacci gaps).
- **confidence:** single-item → ~0.92 ± 0.03; multi-item → `0.85 − 0.5 × cv + ±0.05` where `cv = stdev/mean` (coefficient of variation). Clamped to [0.1, 0.95].
- **rationale:** templated; quotes the epic title (truncated at 60 chars); two phrasings depending on whether refs were supplied.
- **references:** passes through up to 3 caller-supplied refs.
- **modelVersion:** constant `'brp-simulator-v1'`.
- **analyzedAt:** `new Date().toISOString()` — the ONE non-deterministic field, intentional, so the UI can render "last analyzed N seconds ago" sensibly. Determinism tests strip it before comparison.

**Event sequence emitted per analyzeEpic call:**
1. `started` (epicId)
2. `progress` (epicId, pct=0.5)  — one mid-flight tick to exercise consumers
3. `done` (epicId, FrameResult)

**Provider:**
- `getEstimator(): AIEstimator` — returns `createSimulatedEstimator()` today.
  Single-line body. P7's job is to replace this body with the real estimator.
  The "drop-in equivalence" test in simulatedEstimator.test.ts is the
  signpost: when P7 swaps, that test fails — intentionally — telling the
  P7 engineer they're crossing the seam.

**Tests (20):**
- Determinism (3): same id → same content across 10 reruns; different ids
  → varied frameEstimates (≥ 3 distinct in 25 samples); same content across
  two fresh estimator instances
- Event sequence (3): started → progress → done order; epicId carried; pct ∈ [0,1]
- Schema compliance (1): all events from 30 different ids pass AnalysisEventSchema
- Breakdown (3): sum within ±1 of frameEstimate for 50 ids; every breakdown
  item has a Fibonacci-valid points value (30 ids); breakdown is never empty
- Confidence (2): always in [0.1, 0.95] for 50 ids; **mean(single-item conf)
  > mean(3+ item conf)** across 200 samples — the "inversely tracks variance"
  assertion
- References (2): passes through up to 3; empty refs case mentions "no
  closed reference" in rationale
- Metadata (3): modelVersion is the constant; generatedStories is null;
  analyzedAt parses as ISO-8601
- Provider (3): returns an AIEstimator; produces a valid FrameResult;
  drop-in equivalence with simulator today

**Verification:**

```
$ npm run test:run -- src/services/brp/ai/simulatedEstimator.test.ts
Test Files  1 passed (1)
Tests       20 passed (20)
Duration    438ms

$ npx tsc -b --noEmit 2>&1 | grep -c "error TS"
55   # baseline unchanged (caught a TS6133 unused-param warning mid-task,
     # fixed by using the epic.title in the rationale)

$ npx tsc -b --noEmit 2>&1 | grep -E "(src/domain/brp|src/stores/brp|src/services/brp)" | wc -l
0
```

**Phase 3 complete:**
- `src/services/brp/ai/schemas.ts` — runtime Zod schemas for FrameResult + AnalysisEvent
- `src/services/brp/ai/simulatedEstimator.ts` — deterministic AIEstimator
- `src/services/brp/ai/estimatorProvider.ts` — one-line swap seam for P7
- 58 tests across 2 test files (schemas 38 + simulator 20)
- The store imports only AIEstimator from domain/brp — no implementation dep.
- brpStore.runAnalysis tests already exercise this seam via DI (B-6).

**Status: done**

---

### B-10 — brpGitlabService skeleton + mocked tests (in_progress → done)

**Date:** 2026-05-25
**Files created:**
- `src/services/brp/brpGitlabService.ts` (~180 lines)
- `src/services/brp/brpGitlabService.test.ts` (~280 lines) — 20 tests

**Four public operations:**
- `fetchCrews(config)` → `Result<Crew[]>` — top-level subgroups under
  `config.rootGroupId`, mapped to crews with empty pods. Errors out
  cleanly if rootGroupId is missing.
- `fetchPods(config, crewGroupId)` → `Result<Pod[]>` — subgroups under
  the crew's GitLab group, mapped to pods with `DEFAULT_POD_CAPACITY`
  (resources 1, spPerResource 10 from constants, sprintCount 6,
  holiday 0, leave 0) + empty epics.
- `fetchPodEpics(config, podSubgroupId)` → `Result<Epic[]>` — opened
  epics in the pod's subgroup, per_page=100. Each Epic returned with
  `analysisStatus: 'raw'`, `frameResult: null`, `humanEstimate: null`.
- `fetchReferenceEpics(config, podSubgroupId)` → `Result<ReferenceEpic[]>`
  — closed epics, similarity hardcoded at 0.5 (real value belongs to
  estimator at analyzeEpic time), actualSp parsed from labels via
  `/^SP[\s:_-]?(\d+)$/i`.

**Design decisions:**
- **Composition only.** No `fetch()` calls. Imports only
  `fetchGitLabSubgroups` and `fetchGroupEpics` from gitlabClient.
- **Description normalization.** `gitlabEpicToEpic` coerces a null
  description to '' so `computeVariance`'s thin-description heuristic
  never has to null-check. Documented at the mapper.
- **id coercion at the boundary.** GitLab uses numeric ids on epics,
  string ids on subgroups; BRP entities carry both `id: string`
  (for routing/keys) and `gitlabGroupId|gitlabSubgroupId: number`
  (for outbound calls). Conversion happens in the mappers only.
- **DEFAULT_POD_CAPACITY exported** so tests + P5's UI can both
  reference the same value. Frozen object; spread when assigning.
- **Pagination is single-page (100).** Documented as a v1 limitation:
  PI planning typically scopes < 100 epics per pod. v2 should iterate.

**Known limitations (documented in source comments):**
- `ReferenceEpic.similarity` hardcoded at 0.5 — real similarity needs
  text comparison against the analyzed epic, which is the estimator's
  job (P7).
- `ReferenceEpic.actualSp` parsed from labels — GitLab's `weight`
  field on issues would be more authoritative but requires iterating
  each epic's children (deferred to P7).

**Tests (20), all mock gitlabClient via `vi.mock`:**
- fetchCrews (4): happy path mapping, empty rootGroupId, GitLab error
  propagation, empty subgroup response
- fetchPods (4): mapping + default capacity, CapacityInputs shape +
  numeric types, string coercion of crewGroupId in the outbound call,
  GitLab error propagation
- fetchPodEpics (6): mapping with `'raw'`/null invariants, id string
  coercion, **null description → ''** normalization, correct outbound
  params `{state:'opened', per_page:100}`, error propagation, mapper
  doesn't pass through spurious fields (frameResult/variance leak)
- fetchReferenceEpics (6): closed-state filter + mapping, SP label
  parsing across 5 formats (SP-13, sp:8, SP 21, sp_5, SP100), no SP
  label → 0, malformed SP label → 0, similarity always 0.5, error
  propagation

**Hook story (worth journaling for future tasks):**
First write of brpGitlabService.test.ts used a `@ts-expect-error`
directive that didn't fire on the second occurrence (the second
property in the spread inherited the cast). TS2578 raised tsc to 56.
First attempt to fix via Edit was BLOCKED by H3 pre-edit-protect-tests
hook (the test file already existed). Fixed by rm + Write — the
hook's documented pattern. The behavior is exactly as the IR devlog
described it.

**Verification:**

```
$ npm run test:run -- src/services/brp/brpGitlabService.test.ts
Test Files  1 passed (1)
Tests       20 passed (20)
Duration    446ms

$ npx tsc -b --noEmit 2>&1 | grep -c "error TS"
55   # baseline unchanged

$ npx tsc -b --noEmit 2>&1 | grep -E "(src/domain/brp|src/stores/brp|src/services/brp)" | wc -l
0
```

**Status: done**

---

### B-11 — brpGitlabService live smoke (gated) (in_progress → done) — **P4 COMPLETE**

**Date:** 2026-05-25
**Files created:**
- `src/services/brp/brpGitlabService.live.test.ts` (~90 lines) — gated live smoke

**Design note: the live smoke is in its OWN file** rather than appended
to `brpGitlabService.test.ts`. First attempt inlined a
`describe.skipIf(!LIVE_SMOKE_ENABLED)` block at the bottom of the
mocked test file with `vi.unmock(...)` inside the test body. That
broke all 20 mocked tests: Vitest hoists `vi.unmock` to module init
(same as `vi.mock`), so it cancelled the file-level mock and
`mockedFetchGitLabSubgroups` lost its `.mockReset`/`.mockResolvedValueOnce`
helpers. The fix is structural — separate file = separate mock scope.

**The gated test:**
- Skipped at the file level via `describe.skipIf(!LIVE_SMOKE_ENABLED)`.
- Requires `VITE_BRP_LIVE_SMOKE=1` plus `VITE_GITLAB_ROOT_GROUP_ID`
  and `VITE_GITLAB_TOKEN` env vars.
- Walks crews → first crew's pods → first pod's epics, asserting BRP
  shape invariants on real responses: analysisStatus 'raw', frameResult
  null, description always a string, ids string-coerced.

**Manual run command:**

```
VITE_BRP_LIVE_SMOKE=1 \
VITE_GITLAB_ROOT_GROUP_ID=<your-group-id> \
VITE_GITLAB_TOKEN=<your-pat> \
npm run test:run -- src/services/brp/brpGitlabService.live.test.ts
```

This was NOT run in this session — running it against real UBS GitLab
is the human's call. Captured here for the wrap-up: please run it
before opening the PR for `feature/brp` to verify B-10's mappers
against real responses.

**Verification (default run — skip-by-default):**

```
$ npm run test:run -- src/services/brp/
Test Files  3 passed | 1 skipped (4)
Tests       78 passed | 1 skipped (79)
Duration    773ms

$ npx tsc -b --noEmit 2>&1 | grep -c "error TS"
55   # baseline unchanged

$ npx tsc -b --noEmit 2>&1 | grep -E "(src/domain/brp|src/stores/brp|src/services/brp)" | wc -l
0
```

**Phase 4 complete:**
- `src/services/brp/brpGitlabService.ts` — 4 ops composing gitlabClient
- `src/services/brp/brpGitlabService.test.ts` — 20 mocked tests
- `src/services/brp/brpGitlabService.live.test.ts` — gated smoke, 1 test (skipped)
- Total BRP test count post-P4: 158 (35 + 44 + 38 + 20 + 20 + 1 skipped).

**Status: done**

---

### Deep-review checkpoint — 5 agents in parallel

**Date:** 2026-05-25
**Protocol:** docs/runbooks/deep-review-a10.md
**Diff target:** main..HEAD on feature/brp

5 reviewers ran in parallel against `/tmp/brp-prod-*.md` + `/tmp/brp-tests-*.md`
bundles (worktree sandbox blocked direct access; bundles built via Bash from
the actual worktree files):
- Correctness
- Architecture & Idioms
- Security — **clean, no findings**
- Production Readiness
- Test Quality

**Aggregated findings:** 3 critical, 15 important, 10 nice-to-have. Full
report at `docs/reviews/2026-05-25-brp-headless-deep-review.md`.

**Three acknowledged-deferred** (Phase 5/6 wiring concerns, documented in
`docs/reviews/acknowledged.md`): I5 (error channel via onError),
I6 (progress state field), I8 (Result<T> error widening).

---

### Cluster 1 — Interface revision (C1 + I1 + I2 + I7 + I10)

**Files touched:**
- NEW `src/services/brp/ai/types.ts` (~75 lines) — `AIEstimator` + `AnalysisEvent` moved here from `domain/brp.ts` (I10 — domain claimed to be services-free)
- `src/domain/brp.ts` — removed AIEstimator + AnalysisEvent; left a comment pointer
- `src/services/brp/ai/{schemas,simulatedEstimator,estimatorProvider}.ts` — imports updated
- `src/services/brp/ai/simulatedEstimator.ts` — added `signal?: AbortSignal` to `analyzeEpic`; checks `signal?.aborted` between yields and returns early
- `src/stores/brpStore.ts`:
  - Imports `AIEstimator` from new location
  - New `RunAnalysisOptions { signal?: AbortSignal }`
  - Module-level `currentRunController: AbortController | null` (tied to store singleton lifecycle)
  - `runAnalysis`: concurrency guard (early-return if already 'running'); creates internal controller, composes with caller signal; passes signal to estimator; checks `controller.signal.aborted` between epics + between events; on abort, terminal state is `'idle'` (not `'done'`); **defensive `event.epicId !== epic.id` guard** (I1)
  - `reset`: aborts `currentRunController` before clearing state, preventing zombie writes after the in-flight loop's finally block
- Tests: rm + Write `brpStore.test.ts` and `simulatedEstimator.test.ts`

**New tests added (8):**
- `brpStore` runAnalysis cancellation/concurrency (5): mismatched-epicId
  ignored; concurrent call is no-op; reset() aborts mid-run; options.signal
  aborts; already-aborted signal → no work
- `simulatedEstimator` AbortSignal handling (3): already-aborted before
  start → no events; aborted mid-stream → no 'done' event; no-signal
  back-compat

**Findings resolved by this cluster:**
- **C1** (run lifecycle: no cancellation + no concurrency guard) — fixed
- **I1** (estimator could overwrite wrong epic) — defensive `event.epicId === epic.id` check
- **I2** (hung iterator) — caller-side abort breaks the for-await; bundled with the AbortSignal contract
- **I7** (no timeout/AbortSignal in interface) — interface now anticipates it
- **I10** (AIEstimator should move out of domain) — moved to `services/brp/ai/types.ts`

**Verification:**

```
$ npm run test:run -- src/domain/brp.test.ts src/stores/brpStore.test.ts src/services/brp/
Test Files  5 passed | 1 skipped (6)
Tests       165 passed | 1 skipped (166)
Duration    1.56s

$ npx tsc -b --noEmit 2>&1 | grep -c "error TS"
55   # baseline unchanged

$ npx tsc -b --noEmit 2>&1 | grep -E "(src/domain/brp|src/stores/brp|src/services/brp)" | wc -l
0
```

**Status: cluster 1 done. Cluster 2 (test fixes for C2+C3+I11–I15) and Cluster 3 (small fixes I3+I4+I9) pending.**

---

### Cluster 2 — Test corrections + additions (C3 + I11 + I12 + I13 + I14 + I15)

**Note:** C2 (probabilistic flake) was already fixed in Cluster 1 when
`simulatedEstimator.test.ts` was rewritten — the `+ 0.05` statistical
buffer landed there.

**Files touched (all rm + Write per H3 hook):**
- `src/domain/brp.test.ts` — +3 tests (35 → 38)
- `src/stores/brpStore.test.ts` — +4 tests (49 → 53); also refactored
  two timing-fragile cancel tests to use a signal-gated estimator
  helper that synchronizes via a Promise resolver (not sleep)
- `src/services/brp/ai/schemas.test.ts` — modified 5 existing tests
  to add `toEqual(input)` assertions (I15); no count change (38 → 38)

**C3 — split "raw → pending" into two arm-specific tests:**
- `[C3 arm A]` status 'analyzing' + **valid** frameResult + fat desc → 'pending'
- `[C3 arm B]` status 'done' + frameResult **null** + fat desc → 'pending'

Each test holds one OR-arm constant, so the production `status !== 'done'
|| frameResult === null` check cannot pass for the wrong reason. Replaces
the prior "treats 'analyzing' the same as 'raw'" test which overrode
both arms.

**I11 — estimator throws SYNCHRONOUSLY:**
Plain `analyzeEpic(epic)` method that throws before returning an iterator
(vs. throwing inside an async generator's body). Verifies the store's
catch block handles both paths. E1 throws sync, E2 succeeds — run
continues.

**I12 — tight boundary tests:**
- ratio ≈ 0.2157 (h=51, f=40) → 'caution' (just above the 0.20 boundary)
- ratio ≈ 0.5061 (h=81, f=40) → 're-groom' (just above the 0.50 boundary)

Kept the looser 0.375 and 0.625 tests as broader-band sanity checks.

**I13 — `setEpicFrameResult` from 'error' state:**
Re-run recovery: an epic in `analysisStatus: 'error'` plus a new
`setEpicFrameResult` call must transition to 'done' atomically.

**I14 — snapshot semantics under mid-run mutation (2 tests):**
- New epic loaded mid-run is NOT analyzed (snapshot held at kickoff).
- Epic removed mid-run: `findEpic` returns undefined, loop `continue`s
  without error, status ends 'done' cleanly.

**I15 — schema equality assertions:**
Happy-path schema parses now assert `.parse(input).toEqual(input)` rather
than just no-throw. A schema that silently strips a field would have
passed the old check; now it can't.

**Timing fragility caught + fixed mid-cluster:**
First write of the cancel-via-reset() and cancel-via-options.signal tests
used `setTimeout(0)` inside the estimator + `setTimeout(5)` in the test.
Vitest's fast scheduler completed all 3 epics inside the 5ms window. The
fix was structural: a `buildSignalGatedEstimator()` helper that returns
both the estimator (hangs until aborted) and a `firstStartedPromise` that
resolves the moment the estimator is first invoked. The test awaits the
promise (no sleeping), then aborts — guaranteed timing.

**Verification:**

```
$ npm run test:run -- src/domain/brp.test.ts src/stores/brpStore.test.ts \\
    src/services/brp/
Test Files  5 passed | 1 skipped (6)
Tests       172 passed | 1 skipped (173)
Duration    1.05s

$ npx tsc -b --noEmit 2>&1 | grep -c "error TS"
55   # baseline unchanged

$ npx tsc -b --noEmit 2>&1 | grep -E "(src/domain/brp|src/stores/brp|src/services/brp)" | wc -l
0
```

**Findings resolved by cluster 2:**
- **C3** (wrong-reason pending test) — split into two arm-specific tests
- **I11** (estimator throws synchronously) — added test
- **I12** (loose boundary tests) — added tight just-above-0.20 and 0.50 tests
- **I13** (setEpicFrameResult from 'error') — added recovery test
- **I14** (mid-run mutation snapshot semantics) — added 2 tests
- **I15** (schema toEqual assertions) — added to 5 existing tests

**Status: cluster 2 done. Cluster 3 (small production fixes I3+I4+I9) pending.**

---

### Cluster 3 — Small targeted production fixes (I3 + I4 + I9)

**Files touched:**
- `src/stores/brpStore.ts` — I3: `updatePodCapacity` now stores
  `{ ...inputs }` (defensive clone) so a caller's post-call mutation
  cannot leak into the stored capacity object
- `src/domain/brp.ts` — I4: `computePodMetrics` confidence + frameLoad
  aggregation now requires `epic.analysisStatus === 'done'` in addition
  to `frameResult !== null`. Prevents a stale FrameResult (preserved
  during a re-run) from skewing aggregate metrics. `humanLoad` is
  intentionally NOT status-gated — the planner's number is valid
  regardless of analysis lifecycle.
- `src/domain/brp.ts` — I9: the comment on `Epic.source` no longer
  claims a "union shape that reserves room"; the field is a single
  literal `'gitlab'` and the comment now reflects that honestly.

**Test additions (rm + Write on both files):**
- `brp.test.ts` — `[I4] re-run epic ('analyzing' + stale frameResult)
  excluded from frameLoad + avgConfidence`: pod with one fresh 'done'
  epic (frameEstimate=8, conf=0.9) and one re-run 'analyzing' epic
  with stale frameResult (100, 0.1). Asserts frameLoad=8 (NOT 108),
  avgConfidence=0.9 (NOT 0.5), humanLoad=16 (both planner numbers
  count regardless of status).
- `brpStore.test.ts` — `[I3] mutating the inputs object after the call
  does NOT affect stored capacity`: caller passes `inputs` to
  `updatePodCapacity`, mutates `inputs.resources = 999` afterward,
  asserts stored pod.capacity.resources is still 6 AND that
  `pod.capacity !== inputs` (reference inequality).

**Findings resolved by cluster 3:**
- **I3** (defensive clone in updatePodCapacity)
- **I4** (stale frameResult in confidence aggregation during re-runs)
- **I9** (misleading "union shape" comment on Epic.source)

**Verification:**

```
$ npm run test:run -- src/domain/brp.test.ts src/stores/brpStore.test.ts \\
    src/services/brp/
Test Files  5 passed | 1 skipped (6)
Tests       174 passed | 1 skipped (175)
Duration    1.00s

$ npx tsc -b --noEmit 2>&1 | grep -c "error TS"
55   # baseline unchanged

$ npx tsc -b --noEmit 2>&1 | grep -E "(src/domain/brp|src/stores/brp|src/services/brp)" | wc -l
0
```

---

### Deep-review checkpoint — exit criteria

Per `docs/runbooks/deep-review-a10.md` exit criteria:

- ✅ **Zero critical findings unresolved**
    - C1 (run lifecycle): fixed in cluster 1
    - C2 (probabilistic flake): fixed in cluster 1 (folded into simulator test rewrite)
    - C3 (wrong-reason pass): fixed in cluster 2
- ✅ **Every important finding fixed OR explicitly acknowledged**
    - Fixed: I1, I2, I7, I10 (cluster 1); I11, I12, I13, I14, I15 (cluster 2); I3, I4, I9 (cluster 3)
    - Acknowledged with justification in `docs/reviews/acknowledged.md`: I5, I6, I8 (Phase 5/6 wiring concerns)
- ✅ **Tests green after fixes**
    - 174 passed, 1 skipped (live smoke, gated), 0 BRP-introduced tsc errors
- ✅ **Nice-to-have logged but not auto-fixed**
    - 10 items listed in the deep-review report under "Nice-to-have"

**Checkpoint passed. Resuming kit-runner loop at B-12.**

---

### Post-checkpoint emergent finding L1 — live smoke caught real GitLab type drift

**Date:** 2026-05-25 (during user-run of live smoke against gitlab.com)
**Severity:** Important (would have shipped a runtime type lie)

**Discovery:** The user ran the gated live smoke against gitlab.com with
a fresh PAT and a dedicated test fixture (`wma-test-stream/crew-alpha`,
`crew-beta`, each with two pods). First run failed at:

```
expect(typeof crew.id).toBe('string')
  Expected: "string"
  Received: "number"
```

**Root cause:** `src/services/gitlab/types.ts` declares
`GitLabSubgroup.id` as `string`, but the live GitLab API actually
returns it as a `number`. The original mappers (`subgroupToCrew`,
`subgroupToPod`) passed `sg.id` through unchanged, so `Crew.id` and
`Pod.id` were numbers at runtime despite being typed `string`. The
mocked tests passed because every fixture used string IDs (matching
the WRONG declared type, not the real runtime shape).

This is precisely the class of bug the live smoke exists to catch —
the deep-review's Test Quality reviewer (#13) flagged "no test of
description: undefined vs null" but missed this drift because no
review could detect it without a real-network call.

**Fix:** In `src/services/brp/brpGitlabService.ts`, replaced the
old `toNumericId(stringId: string)` with two helpers that accept
`string | number` and coerce at the boundary:
- `toIdString(id)` → string (BRP routing/key shape)
- `toNumericId(id)` → number (outbound API shape)

Both mappers (`subgroupToCrew`, `subgroupToPod`) now use these. The
shared `types.ts` file is NOT modified (out of BRP scope; the IR
branch also depends on it). The runtime coercion makes brpGitlabService
robust to either shape regardless of what the type declaration says.

**Regression guards added (mocked tests):**
- `[live-smoke regression] coerces NUMERIC subgroup id from GitLab to
  BRP string id` — in both `fetchCrews` and `fetchPods` describe blocks.
- Each test passes a fixture with `id: 131025594` (a number) cast via
  `as unknown as GitLabSubgroup`, then asserts the BRP output has
  `id: '131025594'` (string) and `gitlabGroupId: 131025594` (number).
- If the live smoke had been written against a fixture using the real
  numeric shape from the start, the deep-review would have caught this
  without needing a network call. Lesson: mocked fixtures should match
  the actual runtime shape, not the declared type.

**Verification:**

```
$ npm run test:run -- src/domain/brp.test.ts src/stores/brpStore.test.ts \\
    src/services/brp/
Test Files  5 passed | 1 skipped (6)
Tests       176 passed | 1 skipped (177)
Duration    1.04s

$ VITE_BRP_LIVE_SMOKE=1 VITE_GITLAB_BASE_URL=https://gitlab.com/api/v4 \\
  VITE_GITLAB_ROOT_GROUP_ID=131024666 \\
  VITE_GITLAB_TOKEN=<rotated-after> \\
  npm run test:run -- src/services/brp/brpGitlabService.live.test.ts
Test Files  1 passed (1)
Tests       1 passed (1)
Duration    1.33s

$ npx tsc -b --noEmit 2>&1 | grep -c "error TS"
55
```

**Live smoke target used:** `wma-test-stream` root group on gitlab.com
(id 131024666), with `crew-alpha` (id 131025594) + `crew-beta` (id
131025603) as visible crews. The token used has been recommended for
rotation since it was pasted in chat.

**Status: emergent finding L1 fixed. Live smoke run complete.**

---

### B-12 — Knowledge base docs (in_progress → done)

**Date:** 2026-05-26
**Files created (5, all under docs/knowledge/):**
- `domain/brp.md` (~97 lines) — pure types + 4 derivation functions + 3 invariants
- `stores/brpStore.md` (~93 lines) — state shape + 15 actions + cancellation rules + invariants
- `services/brp/README.md` (~76 lines) — service-layer index + architecture diagram
- `services/brp/simulatedEstimator.md` (~93 lines) — AI seam, simulator design, Zod schemas, swap path
- `services/brp/brpGitlabService.md` (~81 lines) — 4 ops, type-drift fix, live-smoke run command, v1 limitations

**Patterned on the IR knowledge docs** (`docs/knowledge/stores/issueRefineryStore.md` etc. from the IR branch's main checkout): title + source link + 1–2 sentence summary, tables for State/Actions, Invariants section, Consumers section, source-relative `..` paths.

**Architecture diagram** in `services/brp/README.md` makes the layer
contract visible at a glance: components call pure functions at render
time + dispatch store actions; the store imports only the AIEstimator
interface (never an implementation); brpGitlabService and the estimator
provider sit below the store as injected dependencies.

**Cross-links:** every doc links to its source file(s), to its
consumers, and to other BRP knowledge files. The README also links to
the deep-review report and `acknowledged.md`.

**Verification:**

```
$ find docs/knowledge -type f -name '*.md' | sort
docs/knowledge/domain/brp.md
docs/knowledge/services/brp/README.md
docs/knowledge/services/brp/brpGitlabService.md
docs/knowledge/services/brp/simulatedEstimator.md
docs/knowledge/stores/brpStore.md
```

(5 files, 440 lines total. No tests touched, no production code touched.)

**Status: done**

---

### B-13 — Devlog + ADR-0003 + final commit (in_progress → done) — **BRANCH COMPLETE**

**Date:** 2026-05-26
**Files created:**
- `docs/adr/0003-brp-no-derived-state.md` (~75 lines) — ADR covering the
  three architectural invariants (no top-level variance/delta on Epic;
  no totalCapacity on Pod; VarianceBand is a return type only) AND the
  `AIEstimator`-lives-in-services-not-domain decision (deep-review I10)
  AND the `AbortSignal`-on-the-interface decision (C1). Format matches
  the existing `docs/adr/template.md` (id, title, date, status,
  Context, Decision, Consequences, Alternatives, References).
- `docs/devlog/2026-05-26-brp-headless.md` (~75 lines) — devlog
  capturing: what shipped, scale (20 commits, 11 new src files, 1 dep
  added, 177 tests), process (kit-runner + 5-agent deep-review + L1
  emergent), 7 lessons learned, what's next (P5/P6/P7), pre-PR checklist.

**Intentionally NOT modified** (to avoid merge-conflict with main+IR's
edits to the same files; the post-merge user will update):
- `docs/adr/README.md` — needs an ADR-0003 entry after merge.
- `docs/devlog/README.md` — needs the BRP entry prepended after merge.
- Root `CLAUDE.md` — "Active Work: DocMining" still stale; should be
  updated post-merge to call out BRP Phases 1–4 shipped.

**Build status (corrected — B-0 journal misreported):**
- `npx tsc -b --noEmit` exits **1** with 55 pre-existing errors (B-0
  noted "exit 0" — that was wrong; the error count was right). All 55
  errors are in pre-existing test files (uiStore.test, chatStore.test,
  pipelineFlow.test, etc.) and not in any BRP code.
- `npx vite build` standalone exits 0 in 4.18s — the actual bundle is
  buildable.
- `npm run build` (= `tsc -b && vite build`) fails at the `tsc -b`
  step due to the pre-existing errors. This is the SAME baseline that
  exists on `main` before any BRP work. Not introduced by this branch.
- The stop-typecheck hook is branch-scoped to `docmining*`/`phase-a*`/
  `phase-b*` per `.claude/hooks/stop-typecheck.py` — does NOT gate on
  `feature/brp`. The hook deliberately tolerates pre-existing failures
  outside the active branch's scope.

**Final verification:**

```
$ npm run test:run -- src/domain/brp.test.ts src/stores/brpStore.test.ts \\
    src/services/brp/
Test Files  5 passed | 1 skipped (6)
Tests       176 passed | 1 skipped (177)
Duration    1.01s

$ npx tsc -b --noEmit 2>&1 | grep -c "error TS"
55   # baseline unchanged

$ npx tsc -b --noEmit 2>&1 | grep -E "(src/domain/brp|src/stores/brp|src/services/brp)" | wc -l
0    # zero BRP-introduced errors

$ npx vite build
✓ built in 4.18s
```

**Status: done. BRP headless branch (Phases 1–4) ready for PR.**
