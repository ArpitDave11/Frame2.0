# BRP — Velocity Capacity + Trustworthy Epic Sizing (Create New / Re-analyze)

**Date:** 2026-06-25
**Status:** DESIGN — approved direction, ready for implementation plan
**Owner:** Arpit
**Research:** deep-research run `wf_e9f6239b-c38` (21 verified findings, 4 refuted shortcuts)

---

## 1. Problem statement

Two asks on the BRP (Big Room Planning / Breakdown & Re-groom Planning) tool:

1. **Capacity calculator** anchored on **previous-quarter velocity** instead of a synthetic
   `SP per resource × sprints` guess.
2. Alongside **"Load Epic"** (pull from GitLab), add a way to **create / size epics** that the
   planner trusts: a slim wizard that takes a high-level requirement (or refines an existing epic),
   generates a decomposition, sizes it, previews the **load (total story points)**, lets the
   planner **publish to GitLab**, and **auto-loads it into the current pod**.

**Gating complaint:** story points come out random and **do not match the stories shown**. The
estimate must never contradict the decomposition, or users stop trusting the tool ("it's lying").

---

## 2. Decisions locked with stakeholder

| # | Decision | Choice |
|---|----------|--------|
| D1 | Capacity formula input | Pod-total previous-quarter velocity − deductions |
| D2 | Holiday/leave reduction | Flat SP subtraction (`velocity − holidaySP − leaveSP`) |
| D3 | Generation engine | Reuse the existing 6-stage pipeline (headless, slim wizard) |
| D4 | SP source | Run FRAME estimator after generation |
| D5 | Reconciliation model | **Bottom-up — stories are truth; epic load ≡ Σ story points** |
| D6 | Post-publish | Auto-load into current pod |
| D7 | Legacy single-Fibonacci `frameEstimate` | **Not used.** Load is the sum, never a standalone number |
| D8 | `resources`/`sprintCount` in capacity form | Not shown / not used (velocity replaces them) |
| D9 | Reproducibility | Use `seed` (already plumbed), **not** temperature=0 (refuted) |
| D10 | Variance band | Keep `computeVariance` |
| D11 | Story-less epic → generated stories | **Publishable as real GitLab child issues** |
| D12 | Too-thin epic | **Re-analyze wizard** (planner supplies missing context); `flagged` only as fallback |
| D13 | Engine shape | **One engine, two doors** (Create New / Re-analyze) |
| D14 | Domain story model | **Single canonical story list** with provenance, not `breakdown` + `generatedStories` |

---

## 3. The trust architecture (core of this design)

The reason the tool can "lie" today: the model emits a **total** AND a **list of stories** as two
separate things, so they drift. The fix is to **delete the separate total**.

> **The model never outputs an epic total. It outputs only the list of stories, each with a
> Fibonacci weight. The total is computed in code — `load = Σ story.points` — from the exact
> array that is rendered on screen.**

There is then no "the estimate" vs "the stories" — there is *one array*, and the number is a pure
function of it. They cannot disagree. This is provable by an invariant unit test that becomes a CI
gate. Everything else layers on top:

| Layer | Guarantee | Mechanism |
|-------|-----------|-----------|
| 1. Self-consistency | total ≡ Σ visible stories | `computeEpicLoad` pure fn + CI invariant test |
| 2. Valid weights | every point ∈ Fibonacci; AC + split pattern present; INVEST | `enum` in structured output + post-validation, reject/re-prompt on violation |
| 3. Defensible weights | "why this number" | reference-class anchoring: each story cites a retrieved closed epic with known actual SP |
| 4. Reproducible | same input → same output | `seed` + structured output + cache on `(requirement+references+seed)` |
| 5. Human-in-the-loop | planner owns the number | per-story points editable; total recomputes live |
| 6. Auditable | disputed number has a trail | audit log (ADR 0004): model version, seed, references, raw output |

**Empirical credibility (optional, see §8 scope):** a back-test harness that feeds FRAME the
descriptions of already-closed epics (known actual SP) and tracks error (MAE) over time — turns
"trust me" into "here's the track record."

---

## 4. One engine, two doors

Both entry points run the **same** generation→sizing pipeline; only the starting material differs.

| Door | Starts from | Produces |
|------|-------------|----------|
| **Create New** | a fresh high-level requirement | new epic → stories → load = Σ |
| **Re-analyze** | an existing epic + planner's added direction | refined *same* epic → stories → load = Σ |

**Re-analyze** is also the answer to the story-less / thin epic: clicking it opens the same wizard,
scoped to that one epic, takes the planner's missing context, refines the epic on the fly, then
runs the normal decompose→size path. Human supplies what was missing — we never fabricate from
nothing.

### Sizing decision tree (every "analyze" path resolves here)

| Epic state | FRAME behavior | Load |
|------------|----------------|------|
| Has stories with points | use existing; may *propose* adjustments | Σ stories |
| Has stories, no points | size each existing story | Σ stories |
| No stories, usable description | decompose → proposed stories (shown, editable, publishable D11) | Σ stories |
| No stories + thin description | **Re-analyze wizard** → planner adds context → decompose | Σ stories |
| Truly nothing provided (fallback) | mark `flagged` (already excluded from pod load); prompt for detail; **never fabricate** | excluded |

**Invariant across every branch:** the load is the sum of a *visible, editable* decomposition, or
we honestly say "can't size this." There is never a naked number.

---

## 5. Work breakdown

### Phase A — Estimator correctness + trust core (no UI; ship first)

- **A1. Single story list (D14).** Collapse `breakdown` + `generatedStories` (`domain/brp.ts`,
  `ai/schemas.ts`) into one `stories: SizedStory[]` where
  `SizedStory = { title; points: FibonacciPoint; acceptanceCriteria: string[]; splitPattern;
  provenance: 'existing' | 'frame-generated'; referenceEpicId?: string; rationale?: string }`.
- **A2. `computeEpicLoad(epic): number` (D5/D7)** = `Σ stories[].points` (`0` when none / not done).
  Change `computePodMetrics` (`brp.ts:412`) to use it instead of `frameResult.frameEstimate`.
  Remove `frameEstimate` from the load path entirely; if retained, it is display-only and derived.
- **A3. Fix Fibonacci ladder.** Prompt currently says `…21,34,55,89`; canonical is
  `1,2,3,5,8,13,21,40,100` (`FibonacciPoint`, `FIBONACCI_POINTS`). **The prompt is the bug.**
- **A4. Real structured output (D9).** `response_format: json_schema, strict:true`,
  `additionalProperties:false`, `points` as `enum: FIBONACCI_POINTS`, pass `seed`. Schema locks
  shape + per-story value; it cannot do arithmetic — that's why load is computed in code (A2).
- **A5. Reference-class anchoring (Layer 3).** Thread `fetchReferenceEpics` (closed epics in pod
  subgroup) into the prompt as scale-spanning examples; each story records `referenceEpicId` +
  `rationale`.
- **A6. INVEST + SPIDR + validation (Layer 2).** Require non-empty `acceptanceCriteria` and a
  `splitPattern` ∈ {Spike,Path,Interface,Data,Rules}; post-validate Fibonacci-membership and
  story count; reject + single re-prompt on violation.
- **A7. Invariant test (Layer 1).** Property test: for any estimator output,
  `computeEpicLoad === Σ rendered stories.points`. CI gate.

### Phase B — Generation engine + wizard (Create New / Re-analyze)

- **B1. Headless pipeline call.** Reuse `runPremiumPipeline` (pure orchestrator) on the requirement
  text via a BRP action with a local sink — do **not** write to `epicStore.markdown` (keep BRP
  isolated; respect orchestrator purity).
- **B2. Size with FRAME** (Phase-A estimator) → stories + points + references.
- **B3. Wizard UI** `EpicWizard.tsx` (BRP component; composes via `brpActions` only — scope guard).
  Modes: `create` (blank requirement) and `reanalyze` (pre-scoped to an epic, takes added
  direction). States: input → generating (progress) → preview → publishing → done. Preview shows
  each story, its weight, split pattern, reference/rationale, and **total = Σ rendered live**; the
  total is shown as an explicit sum the planner can verify and edit.
  *UI gate (global CLAUDE.md): frontend-design skill + FRAME tokens + Frutiger + screenshot loop
  before "done"; cover default/loading/empty/error.*
- **B4. Publish to GitLab (D11).** New `brpGitlabService.createEpicWithStories(...)` orchestrating
  the **existing** `createGitLabEpic` + `createGitLabIssue` + `linkIssueToEpic` (`gitlabClient.ts`).
  Re-analyze publish updates the existing epic (`updateGitLabEpic`) and adds the new child issues.
- **B5. Auto-load into current pod (D6).** On publish success, map to domain `Epic`, dispatch
  existing `loadEpicsIntoPod` for the active pod.
- **B6. Wire buttons.** "Create New" next to "Add epics"; "Re-analyze" on the epic (row/detail —
  confirm during build).

### Phase C — Velocity-based capacity

- **C1. Domain (D1/D2/D8).** Extend `CapacityInputs` with `previousVelocity: number`. New formula:
  ```
  gross            = previousVelocity            // pod-total, last quarter
  holidayDeduction = holidayDays × resources
  leaveDeduction   = leaveDays
  total            = max(0, gross − holidayDeduction − leaveDeduction)
  ```
  `spPerResource`/`sprintCount` no longer feed `gross` and are removed from the form. `resources`
  is retained (holiday math needs it) but secondary.
- **C2. UI.** `CapacityDialog`: "Previous quarter velocity (SP)" as lead field; breakdown `Gross`
  → `Previous velocity`. Keep the live `computeCapacity` contract.
- **C3. Migration.** Default `previousVelocity` for existing pods to
  `spPerResource × resources × sprintCount` so saved pods don't reset to 0.

---

## 6. Files touched (estimate)

| Area | Files |
|------|-------|
| Domain | `src/domain/brp.ts`, `brp.constants.ts` |
| Estimator | `src/services/brp/ai/azureEstimator.ts`, `ai/schemas.ts`, `ai/types.ts` |
| GitLab write | `src/services/brp/brpGitlabService.ts` (new `createEpicWithStories`) |
| Actions | `src/services/brp/brpActions.ts` (generate, reanalyze, publish, auto-load) |
| UI | new `EpicWizard.tsx`, `CapacityDialog.tsx`, `BrpView.tsx`/`PodView.tsx`/`EpicRow.tsx` wiring |
| Tests | estimator + invariant, computeEpicLoad, computeCapacity, wizard states, a11y contract |

---

## 7. Resolved decisions (was "open items")

1. Legacy `frameEstimate` — **not used** (D7); load is the sum only.
2. `resources`/`sprintCount` in capacity form — **removed** (D8).
3. Reproducibility — **`seed`** (D9), not temperature.
4. Variance bands — **kept** (D10); verify tests still pass once load is a sum.

### Still to confirm during build (non-blocking)
- Re-analyze: replace vs augment the epic's existing content/stories.
- Re-analyze button placement (epic row vs detail panel).
- Whether the planner's added direction is written to the GitLab epic description on publish.

---

## 8. Scope for this iteration

In: trust stack Layers 1–6 (self-consistency, valid + defensible weights, reproducible, editable,
auditable), the unified engine + wizard, story-less/Re-analyze handling, velocity capacity.
**Deferred:** empirical back-test harness (FRAME vs closed-epic actuals / MAE tracking) — strong
"provable accuracy" story, but larger; revisit after the consistency fix lands.

---

## 9. Sequencing

**Phase A** (root-cause fix + trust core, no UI, fast to verify) → **Phase C** (contained
domain+UI) → **Phase B** (engine + wizard + write path + UI gate). Each phase under project
protocol: PRD → parse_prd → per-task TDD → `verification-before-completion` → devlog → commit.
