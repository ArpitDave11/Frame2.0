# Issue Refinery — Implementation Plan (Atomic Tasks)

**Date**: 2026-05-18
**Status**: Plan locked, awaiting Taskmaster parse_prd
**HLD**: [2026-05-18-issue-refinery-hld.md](./2026-05-18-issue-refinery-hld.md)
**Design**: [2026-05-18-issue-refinery-design.md](./2026-05-18-issue-refinery-design.md)
**PRD**: [.taskmaster/docs/issue-refinery-prd.txt](../../.taskmaster/docs/issue-refinery-prd.txt)

---

## Conventions

- Task IDs use the **R-** prefix (Refinery).
- Each task is **atomic**: implementable in one focused session, with a clear "done when" gate and verification command.
- Per the standing protocol (CLAUDE.md): every task follows
  `next_task → in_progress → implement → verification-before-completion → journal entry → completed → commit`.
- Phase R-A (R-1..R-9) = headless code (gitlab client, store, pipeline, action).
- Phase R-B (R-10..R-16) = UI integration + wiring.
- Phase R-C (R-17..R-19) = checkpoint review + docs + commit.
- **5-agent deep-review** runs at R-9 (post-headless) and R-16 (post-UI). Zero critical findings required to proceed.

---

## R-0 — Preflight & branch setup

**Goal**: confirm prerequisites and create the feature branch.

**Steps**:
1. Verify current branch state is clean (`git status`).
2. Create branch `feature/issue-refinery` off main (or off the current head if user prefers stacking).
3. Confirm `aiClient.ts` supports `response_format: { type: 'json_schema', strict: true }` against the configured Azure deployment. If not, surface the gap to the user before proceeding.
4. Confirm `gitlabClient.fetchEpicDetails` returns children with `description` populated (or that a separate `fetchIssueDetails(projectId, issueIid)` is available).

**Done when**:
- Branch created.
- Two preflight assertions are documented in `.powerstack4/task_plan.md` with the actual command output.
- Any gap escalated via `AskUserQuestion`.

---

## Phase R-A — Headless code

### R-1 — Add `updateIssue` to `gitlabClient` + tests

**Goal**: net-new GitLab method for content updates.

**Files**:
- Touch [src/services/gitlab/types.ts](../../src/services/gitlab/types.ts) — add `UpdateIssuePayload`.
- Touch [src/services/gitlab/gitlabClient.ts](../../src/services/gitlab/gitlabClient.ts) — add `updateIssue()`.
- Touch [src/services/gitlab/gitlabClient.test.ts](../../src/services/gitlab/gitlabClient.test.ts) — 3 new tests: happy path, 4xx error, network error.

**Implementation notes**:
- Endpoint: `PUT /projects/:projectId/issues/:issueIid`. Body: `{ description }`.
- Return shape: `Result<GitLabIssue>` matching existing convention.
- URL-encode `projectId` (it can be a string path like `group/subgroup/project`).

**Done when**:
- All 3 new tests pass; no existing tests modified.
- `npm run test:run -- gitlabClient` is green.

---

### R-2 — Create `issueRefineryStore`

**Goal**: in-memory store driving the feature.

**Files**:
- New [src/stores/issueRefineryStore.ts](../../src/stores/issueRefineryStore.ts).
- New [src/stores/issueRefineryStore.test.ts](../../src/stores/issueRefineryStore.test.ts).

**Tests** (≥ 8):
- Initial state is `phase='idle'`, all fields null/empty.
- `setSelectedEpic` populates epic, children, and resets per-child state.
- `setSelectedChild` updates iid + originalBody from `children`.
- `setPhase` transitions are valid; invalid transitions are no-ops (or assertion errors in dev).
- `setRefinedDraft(d, false)` does not mark `userEditedDraft`; `setRefinedDraft(d, true)` does.
- `recordCachedTokens` appends.
- `reset` returns to initial state.
- Selecting a different child clears `comprehension`, `refinedDraft`, `validation`.

**Done when**: all tests pass; no other stores touched.

---

### R-3 — Pipeline Zod schemas

**Goal**: contract for all 3 stages.

**Files**:
- New `src/pipeline/issue/schemas.ts` — `ComprehensionSchema`, `RefinementSchema`, `ValidationSchema` per design §4.
- New `src/pipeline/issue/schemas.test.ts` — parse canned valid + invalid JSON, assert errors.

**Done when**:
- Zod schemas defined with `.describe()` per design.
- Round-trip parse test (sample valid JSON → schema → object) passes.
- Validation-failure test (missing required field → ZodError with clear message) passes.

---

### R-4 — Prompt assembly module

**Goal**: sandwich-cached prefix builder.

**Files**:
- New `src/pipeline/issue/promptAssembly.ts` — `buildMessages(stage, epic, issue, prev?)`.
- New `src/pipeline/issue/promptAssembly.test.ts`.

**Tests**:
- The system + document prefix is **byte-identical** across stages (concat of `system + documentBlock`).
- Stage-specific tails differ.
- No interpolation of timestamps / IDs in the prefix (regex assertion).

**Done when**: all tests green; byte-equality assertion enforces cache discipline.

---

### R-5 — Comprehension stage runner + prompt + tests

**Files**:
- New `src/pipeline/issue/comprehension/prompt.ts`.
- New `src/pipeline/issue/comprehension/runComprehension.ts`.
- New `src/pipeline/issue/comprehension/runComprehension.test.ts`.

**Behavior**:
- `runComprehension(epic, issue, aiClient)` builds messages, calls `aiClient.callAI({ temperature: 0.2, reasoning_effort: 'minimal', response_format: { json_schema, strict: true } })`, validates with `ComprehensionSchema`, single retry on validation failure.

**Tests**:
- Happy path: stub aiClient returns valid JSON; runner returns parsed result.
- Schema-fail-then-retry-succeed: first call returns invalid JSON, runner retries with error message appended, second succeeds.
- Schema-fail-twice: throws with diagnostic.
- Empty issue body: returns minimal Comprehension per system rule.

**Done when**: all tests pass; aiClient is mocked, no real network.

---

### R-6 — Refinement stage runner + prompt + tests

Same shape as R-5; temperature 0.4; consumes Comprehension result; produces `{ refinedBody }`.

**Additional test**: refined body preserves GitLab quick actions (`/label`, `@user`, `#123`) from the original issue when stubbed input contains them.

---

### R-7 — Validation stage runner + prompt + tests

Same shape as R-5; temperature 0.2; consumes refined body; produces `{ score, findings }`.

**Additional test**: findings always carry one of `[critical]`, `[important]`, `[nit]` prefixes.

---

### R-8 — Pipeline orchestrator `runIssuePipeline`

**Files**:
- New `src/pipeline/issue/runIssuePipeline.ts` — pure function.
- New `src/pipeline/issue/runIssuePipeline.test.ts`.

**Behavior**:
- Sequentially calls R-5 → R-6 → R-7. Returns `{ comprehension, refined, validation, cachedTokens: number[] }`.
- Reads `cached_tokens` from each call response and accumulates.
- On stage failure: throws with a tagged error (`{ stage: 'comprehension', cause }`); never returns a partial result.

**Tests** (≥ 5):
- Happy path: 3 stages called in order.
- Comprehension fails: throws; refinement + validation never invoked.
- Cached tokens accumulated correctly (stub responses with mock usage).
- Pure: no store/imports of any store.
- No imports from `src/pipeline/stages/**` or `src/pipeline/orchestrator*` (lint test or import-graph assertion).

**Done when**: green; pure check enforced.

---

### R-9 — Action: `refineIssueAction`

**Files**:
- New [src/actions/refineIssueAction.ts](../../src/actions/refineIssueAction.ts).
- New `src/actions/refineIssueAction.test.ts`.

**Exports**:
- `refineSelectedIssue()` — reads store, calls orchestrator, writes phases + results.
- `publishRefinedIssue()` — reads store, calls `gitlabClient.updateIssue`, transitions phases.

**Tests** (≥ 8):
- `refineSelectedIssue` without a selected child is a no-op with error toast.
- Happy path: phases transition idle → comprehending → refining → validating → ready.
- Stage failure: phase = error, error message surfaced.
- `cached_tokens` written to store via `recordCachedTokens`.
- `publishRefinedIssue` with no draft is a no-op.
- Publish happy path: phase publishing → idle; updateIssue called with `{description: refinedDraft}`.
- Publish failure: phase = error; original draft preserved.
- Re-refine after edits: confirmation behavior delegated to UI (action just runs again).

---

### ⚠️ Checkpoint: 5-agent deep-review #1 (post-R-9 headless code)

Per [docs/runbooks/deep-review-a10.md](../runbooks/deep-review-a10.md). Five parallel reviewers:
- Correctness — pipeline purity, race conditions, partial state
- Architecture — adherence to action-boundary pattern, no scope-guard violations
- Security — XSS in markdown rendering (deferred to UI phase), GitLab token handling
- Production Readiness — error paths, retry budget, observability
- Test Quality — coverage, weak assertions, mock realism

Zero critical findings required to proceed to Phase R-B. Findings recorded in `docs/reviews/2026-05-18-issue-refinery-phase-A-review.md`.

---

## Phase R-B — UI integration

### R-10 — `ChildIssueList` component

**Files**: new `src/components/issueRefinery/ChildIssueList.tsx` + test.

**Behavior**:
- Renders `[Load Epic]` button (opens existing LoadEpicModal — reuse, do not duplicate).
- On epic loaded, displays scrollable list of children with title + iid.
- Radio-select pattern; clicking selects via `issueRefineryStore.setSelectedChild`.
- Loading skeletons during fetch.

**Tests**: rendering by phase, click handler, empty-children state.

---

### R-11 — `ComprehensionCard` + `ValidationCard`

**Files**: two new components + tests.

**Behavior**:
- `ComprehensionCard`:
  - Renders only when `comprehension` non-null.
  - Three sub-sections: Gaps, Ambiguities, Alignment notes.
  - `<ReactMarkdown>` per item with `disallowedElements={['h1'..'h6']}`.
- `ValidationCard`:
  - Score badge color = green ≥80, amber 60–79, red <60.
  - Findings list color by prefix tag (`[critical]` red, `[important]` amber, `[nit]` gray).
  - "Advisory only" sublabel.

**Tests**: rendering per data, color thresholds, missing-data graceful handling.

---

### R-12 — `RefinedIssueCard` with diff

**Files**: new component + test.

**Behavior**:
- Renders original (left) and refined (right) side-by-side.
- Diff highlighting: changed lines.
- Toggle: side-by-side vs unified.
- "Edit" button enables inline textarea editing of refined draft; calls `setRefinedDraft(draft, true)` on change.
- "Reset" button restores model output (clears `userEditedDraft` flag).

**Diff lib choice**:
- Evaluate `react-diff-view` (~15 KB gz) and `react-diff-viewer-continued` (~20 KB gz).
- Fallback: hand-rolled unified diff using `diff` npm package + custom render.
- Decision recorded in implementation journal.

**Tests**: rendering with/without changes, edit flag toggling, reset behavior.

---

### R-13 — `PublishButton` + `PromptCacheHUD`

**Files**: two new components + tests.

**PublishButton**:
- Disabled unless `phase === 'ready'` and `refinedDraft` non-empty.
- On click: confirm dialog if `userEditedDraft=true` ("Publish your edited version to GitLab?"). Otherwise direct call to `publishRefinedIssue()`.
- Loading spinner during `phase='publishing'`.

**PromptCacheHUD**:
- Renders only if `import.meta.env.DEV`.
- Floating bottom-right panel showing last 3 cache-token counts.
- Color: green if all 3 > 0, red otherwise.

**Tests**: button enabling, confirm path, HUD dev-only gating.

---

### R-14 — `IssueRefineryView` composition

**Files**: new top-level view + test.

**Behavior**:
- Split-pane wrapper using existing [src/components/layout/SplitPane.tsx](../../src/components/layout/SplitPane.tsx).
- Left pane: `ChildIssueList`.
- Right pane: vertically stacked `ComprehensionCard`, `RefinedIssueCard`, `ValidationCard`, button row (`Refine`, `PublishButton`), `PromptCacheHUD`.
- `Refine` button onClick → `refineSelectedIssue()`.
- Top-level error banner if `phase === 'error'`.

**Tests**: composition smoke test; renders all sub-components when relevant phase.

---

### R-15 — Tab registration

**Files**:
- Touch [src/stores/uiStore.ts](../../src/stores/uiStore.ts) — add `'issueRefinery'` to `TabId` union type.
- Touch [src/components/layout/ViewRouter.tsx](../../src/components/layout/ViewRouter.tsx) — add `case 'issueRefinery': return <IssueRefineryView />;`.
- Touch [src/components/layout/WorkspaceSidebar.tsx](../../src/components/layout/WorkspaceSidebar.tsx) — add sidebar entry (label "Issue Refinery", appropriate Phosphor icon).

**Tests**: existing layout tests still pass; one new test verifies tab switches to refinery view.

**Done when**: clicking the new tab renders the view; existing tabs unchanged.

---

### R-16 — Integration test

**Files**: new `src/test/integration/issueRefineryFlow.test.tsx`.

**Scope** (mock only `fetch`; everything else real):
1. Mount workspace, click Issue Refinery tab.
2. Mock GitLab fetch responses for epic search + child issues.
3. Select epic, then select a child.
4. Mock Azure OpenAI responses for 3 stages.
5. Click Refine; assert phase progression and rendered cards.
6. Mock updateIssue response; click Publish; assert PUT body, phase return to idle.
7. Assert `cached_tokens` written to store on stages 2 & 3.

**Done when**: integration test green; no real network calls.

---

### ⚠️ Checkpoint: 5-agent deep-review #2 (post-R-16 UI integration)

Same protocol as R-9 checkpoint, focused this time on:
- XSS / markdown injection in rendered cards
- Diff-rendering correctness on edge inputs (huge diffs, no diffs, unicode)
- Accessibility (keyboard navigation, ARIA labels, color-only signals)
- Phase-stuck states under failure injection
- Performance with large epic + issue bodies

Findings: `docs/reviews/2026-05-18-issue-refinery-phase-B-review.md`.

---

## Phase R-C — Knowledge base, commit, wrap

### R-17 — Knowledge-base docs

**Files**: new `docs/knowledge/` pages mirroring source tree:
- `docs/knowledge/components/issueRefinery/` — one MD per component
- `docs/knowledge/pipeline/issue/` — one MD per stage + orchestrator + promptAssembly
- `docs/knowledge/actions/refineIssueAction.md`
- `docs/knowledge/stores/issueRefineryStore.md`

**Each KB doc**: purpose, exports, inputs/outputs, consumers, invariants, gotchas.

**Cross-links**: update [docs/knowledge/README.md](../knowledge/README.md) and [docs/knowledge/SYSTEM.md](../knowledge/SYSTEM.md) with refinery flow diagram + links.

---

### R-18 — Devlog + ADR (if architecture-significant)

**Devlog**: new `docs/devlog/2026-05-18-issue-refinery.md` — what shipped, decisions revisited, surprises.
**ADR**: new `docs/adr/0002-issue-refinery-isolation.md` — record the decision to keep the new pipeline isolated in `src/pipeline/issue/` rather than extending the existing orchestrator (the scope-guard rationale).

---

### R-19 — Final commit + PR

**Steps**:
1. Confirm all tests pass: `npm run test:run`.
2. Confirm typecheck clean: `tsc -b --noEmit`.
3. Confirm pre-commit hooks pass (no `--no-verify`).
4. Commit per Conventional Commits:
   - `feat(issueRefinery): three-stage AI pipeline for refining GitLab issues against parent epic`
   - Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
5. Update `.powerstack4/task_plan.md` with final journal entry.

**Done when**:
- All hooks green.
- `.powerstack4/task_plan.md` reflects every R-* task as completed.
- Branch ready for PR.

---

## Task summary table

| ID | Title | Layer | Est. | Critical path |
|---|---|---|---|---|
| R-0 | Preflight & branch | infra | 0.5 h | ✓ |
| R-1 | gitlabClient.updateIssue | service | 1 h | ✓ |
| R-2 | issueRefineryStore | state | 1 h | ✓ |
| R-3 | Pipeline schemas | pipeline | 1 h | ✓ |
| R-4 | Prompt assembly | pipeline | 1 h | ✓ |
| R-5 | Comprehension runner | pipeline | 1.5 h | ✓ |
| R-6 | Refinement runner | pipeline | 1.5 h | ✓ |
| R-7 | Validation runner | pipeline | 1.5 h | ✓ |
| R-8 | Orchestrator | pipeline | 1 h | ✓ |
| R-9 | refineIssueAction | action | 1.5 h | ✓ |
| ⚠ | Deep-review #1 | review | 2 h | gate |
| R-10 | ChildIssueList | UI | 1.5 h | ✓ |
| R-11 | Comprehension+Validation cards | UI | 1.5 h | ✓ |
| R-12 | RefinedIssueCard + diff | UI | 2.5 h | ✓ |
| R-13 | PublishButton + cache HUD | UI | 1 h | ✓ |
| R-14 | IssueRefineryView | UI | 1 h | ✓ |
| R-15 | Tab registration | UI | 0.5 h | ✓ |
| R-16 | Integration test | test | 2 h | ✓ |
| ⚠ | Deep-review #2 | review | 2 h | gate |
| R-17 | Knowledge-base docs | docs | 2 h | |
| R-18 | Devlog + ADR | docs | 0.5 h | |
| R-19 | Final commit + PR | infra | 0.5 h | ✓ |

**Total estimated effort**: ~28 hours of focused work, two review checkpoints, 19 atomic tasks.

---

## Rollback plan

Single-commit feature → revert the merge commit and the tab disappears. No state migrations. No backend changes. No persistent data to clean up. The only externally visible artifact is published issue descriptions on GitLab — those are not rolled back automatically (intentionally, they're user-confirmed edits).
