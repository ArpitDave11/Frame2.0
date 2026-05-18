# Issue Refinery — Detailed Design

**Date**: 2026-05-18
**Status**: Design locked, awaiting plan approval before implementation
**HLD**: [2026-05-18-issue-refinery-hld.md](./2026-05-18-issue-refinery-hld.md)
**Implementation plan**: [2026-05-18-issue-refinery-implementation-plan.md](./2026-05-18-issue-refinery-implementation-plan.md)
**PRD**: [.taskmaster/docs/issue-refinery-prd.txt](../../.taskmaster/docs/issue-refinery-prd.txt)

---

## 1. Goals & non-goals

### Goals
1. Let users refine **a single GitLab issue** body using its parent epic as grounding context.
2. Run a 3-stage AI pipeline (Comprehension → Refinement → Validation) entirely client-side, with strict JSON schema outputs and prompt-cache-friendly prompt structure.
3. Stage the refined body as a diff with advisory validation findings; publish via explicit user action.
4. Coexist with the existing `issues` (creation) tab — no regressions to that flow.
5. Respect every scope guard: no edits to `src/pipeline/orchestrator*`, `src/pipeline/stages/**`, `src/components/welcome/**`.

### Non-goals (v1)
- Refining tasks/subtasks beneath issues
- Optimistic-concurrency conflict detection
- Iterative refinement loop
- Category templates for issues
- Batch refinement
- Orphan issues (no parent epic)
- Streaming
- Any backend changes

---

## 2. Locked decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | New top-level tab `'issueRefinery'`, coexist with `'issues'` | Different intent (refine existing vs. create new); merging risks regressing the creation flow |
| D2 | Pipeline lives in `src/pipeline/issue/` — separate from `src/pipeline/stages/` | Pipeline-purity scope guard untouched; epic pipeline stays the canonical reference |
| D3 | 3 stages: Comprehension → Refinement → Validation | Minimum stages to ground+rewrite+gate; Mandatory makes no sense for a single issue |
| D4 | Single-pass execution | Iteration loop is overkill; user can click Refine again if unsatisfied |
| D5 | Freeform refinement (no category template) | Faster to build; works for any team's issue style |
| D6 | Validation is advisory only — Publish always enabled | User retains control; no false blockers |
| D7 | Always-overwrite on publish — no `updated_at` concurrency check | Locked per user direction; v2 may revisit |
| D8 | Findings only — no source-quote schema field | Smaller schema, smaller card UI; v2 may add evidence |
| D9 | Strict `json_schema` response format for all 3 stages | Per Azure prompt research, 100% compliance |
| D10 | Sandwich prompt structure for prompt-cache reuse across stages | Stages 2 & 3 cache-hit the static prefix; ~75% cost reduction on re-runs |
| D11 | Single retry per stage on schema failure (Instructor pattern) | Bounded cost, clear error UX |
| D12 | Reuse `aiClient.ts` and `gitlabClient.ts` wholesale; add only `updateIssue` method | Minimum surface change |
| D13 | Hierarchy: direct epic→issue children only | v1 simplicity |
| D14 | Dev-only HUD logs `cached_tokens` per call | Cost discipline; catches cache busts early |

---

## 3. File inventory

### New files (additive only)

```
src/
├── pipeline/issue/                        ← isolated new pipeline
│   ├── runIssuePipeline.ts                ← pure orchestrator
│   ├── schemas.ts                         ← Zod schemas for all 3 stages
│   ├── promptAssembly.ts                  ← sandwich-cached prefix builder
│   ├── comprehension/
│   │   ├── runComprehension.ts
│   │   ├── prompt.ts
│   │   └── runComprehension.test.ts
│   ├── refinement/
│   │   ├── runRefinement.ts
│   │   ├── prompt.ts
│   │   └── runRefinement.test.ts
│   └── validation/
│       ├── runValidation.ts
│       ├── prompt.ts
│       └── runValidation.test.ts
│
├── actions/
│   ├── refineIssueAction.ts               ← boundary: store ↔ pipeline
│   └── refineIssueAction.test.ts
│
├── stores/
│   ├── issueRefineryStore.ts              ← new Zustand store
│   └── issueRefineryStore.test.ts
│
└── components/issueRefinery/              ← new UI dir
    ├── IssueRefineryView.tsx              ← split-pane container
    ├── ChildIssueList.tsx
    ├── ComprehensionCard.tsx
    ├── RefinedIssueCard.tsx               ← diff + Accept/Edit
    ├── ValidationCard.tsx                 ← score badge + findings
    ├── PublishButton.tsx
    ├── PromptCacheHUD.tsx                 ← dev-only, gated on import.meta.env.DEV
    └── *.test.tsx                          ← one per component

docs/
├── plans/2026-05-18-issue-refinery-hld.md
├── plans/2026-05-18-issue-refinery-design.md            ← this file
├── plans/2026-05-18-issue-refinery-implementation-plan.md
└── knowledge/
    ├── components/issueRefinery/          ← KB doc per component
    ├── pipeline/issue/                    ← KB doc per stage + orchestrator
    ├── actions/refineIssueAction.md
    └── stores/issueRefineryStore.md

.taskmaster/docs/issue-refinery-prd.txt
```

### Touched files (additive changes only — no deletes, no rewrites)

| File | Change | Risk |
|---|---|---|
| [src/stores/uiStore.ts](../../src/stores/uiStore.ts) | Add `'issueRefinery'` to `TabId` union | Trivial — string literal addition |
| [src/components/layout/ViewRouter.tsx](../../src/components/layout/ViewRouter.tsx) | Add `case 'issueRefinery': return <IssueRefineryView />` | Trivial |
| [src/components/layout/WorkspaceSidebar.tsx](../../src/components/layout/WorkspaceSidebar.tsx) | Add tab button entry | Trivial — UI only |
| [src/services/gitlab/gitlabClient.ts](../../src/services/gitlab/gitlabClient.ts) | Add `updateIssue(projectId, issueIid, { description })` method | Low — additive function, matches existing error pattern |
| [src/services/gitlab/types.ts](../../src/services/gitlab/types.ts) | Add `UpdateIssuePayload` type | Trivial |
| [src/services/gitlab/gitlabClient.test.ts](../../src/services/gitlab/gitlabClient.test.ts) | Add tests for `updateIssue` | Low — test-only addition |

**Untouched (scope-guarded):** `src/pipeline/orchestrator*`, `src/pipeline/stages/**`, `src/components/welcome/**`, every existing test file.

---

## 4. Pipeline contracts

All three stages use strict `response_format: { type: 'json_schema', strict: true }` against the schemas below. Schemas are declared once in `src/pipeline/issue/schemas.ts` using Zod, with `.describe()` carrying field-level constraints (word limits, vocabulary).

### 4.1 Comprehension schema

```ts
// src/pipeline/issue/schemas.ts
export const ComprehensionSchema = z.object({
  epicIntent: z.string().describe('1-2 sentences. The core outcome the parent epic targets.'),
  issueIntent: z.string().describe('1-2 sentences. The core change the current issue proposes.'),
  gaps: z.array(z.string()).max(8).describe(
    'Specific gaps in the issue body relative to the epic intent. Each item ≤ 25 words. ' +
    'Examples: "Issue does not specify which user roles see the new flag." or "Acceptance ' +
    'criteria omit the rollback condition stated in epic §3.". Empty array if none.'
  ),
  ambiguities: z.array(z.string()).max(8).describe(
    'Phrases in the issue body that are vague or interpretable. Each item ≤ 25 words. ' +
    'Quote the ambiguous phrase plus a one-clause interpretation question.'
  ),
  alignmentNotes: z.array(z.string()).max(6).describe(
    'Notes about how this issue should align with the epic. Each item ≤ 30 words.'
  ),
});
export type ComprehensionResult = z.infer<typeof ComprehensionSchema>;
```

### 4.2 Refinement schema

```ts
export const RefinementSchema = z.object({
  refinedBody: z.string().min(50).describe(
    'Full rewritten issue body in Markdown. Must contain four sections in this order: ' +
    '## Summary (1-3 sentences), ## Context (why this matters, tie to epic), ' +
    '## Acceptance Criteria (bulleted, testable), ## Technical Notes (optional, implementation hints). ' +
    'Do not introduce H1. Preserve any GitLab-specific syntax (/label, @mentions, #issues) that ' +
    'existed in the original. Word budget: 150-450 words.'
  ),
});
export type RefinementResult = z.infer<typeof RefinementSchema>;
```

### 4.3 Validation schema

```ts
export const ValidationSchema = z.object({
  score: z.number().int().min(0).max(100).describe(
    'Quality score 0-100 for the refined body. Rubric: clarity (25), completeness (25), ' +
    'testable AC (25), alignment with epic (25).'
  ),
  findings: z.array(z.string()).max(10).describe(
    'Actionable findings the user should consider. Each ≤ 20 words. Prefix with [critical], ' +
    '[important], or [nit] so the UI can color-code. Empty array if score = 100.'
  ),
});
export type ValidationResult = z.infer<typeof ValidationSchema>;
```

---

## 5. Prompt design

### 5.1 Sandwich structure

Every stage call builds the message array via `promptAssembly.ts`:

```ts
// promptAssembly.ts
export function buildMessages(stage: 'comprehension' | 'refinement' | 'validation',
                              epicBody: string, issueBody: string,
                              previous?: { comprehension?: ComprehensionResult; refined?: string }): Message[] {
  // ─── Static prefix (byte-identical across all 3 stages) ───
  const system = STAGE_AGNOSTIC_SYSTEM_RULES; // long const, never changes
  const documentBlock =
    `<epic>\n${epicBody}\n</epic>\n\n<issue>\n${issueBody}\n</issue>`;

  // ─── Stage-specific tail ───
  const stageInstruction = STAGE_INSTRUCTIONS[stage]; // const per stage
  const stageContext = stage === 'refinement'
    ? `\n\n<comprehension>\n${JSON.stringify(previous!.comprehension)}\n</comprehension>`
    : stage === 'validation'
    ? `\n\n<refined>\n${previous!.refined}\n</refined>`
    : '';

  return [
    { role: 'system', content: system },
    { role: 'user', content: documentBlock + stageContext + '\n\n' + stageInstruction },
  ];
}
```

**Cache contract:** the `system` and `documentBlock` strings are interpolated only from `epicBody` and `issueBody`, which are stable across a single refine run. No timestamps, no IDs, no `Date.now()`. The stage-specific tail differs each call — that's expected; Azure caches the prefix and re-tokenizes the tail.

### 5.2 Stage-agnostic system rules (excerpt)

```
You are an assistant that refines GitLab issues.
You will be given a parent <epic> and the current <issue> body.
You will be asked to perform one of three tasks: comprehension, refinement, or validation.

Rules:
1. Output MUST match the provided JSON schema exactly. No surrounding prose.
2. Ground every claim in the provided <epic> or <issue>. Do not invent facts.
3. Preserve GitLab syntax (/label, @user, #123) from the original issue.
4. Never emit H1 (# heading). Use H2 (##) as the top heading level.
5. If the issue body is empty or only whitespace, return minimal output:
   - Comprehension: gaps = ["Issue body is empty."]
   - Refinement: refinedBody = a generic AC-only skeleton
   - Validation: score = 10, findings = ["[critical] Original issue had no content."]
```

### 5.3 Stage-specific tails

- **Comprehension**: "Analyze the <issue> relative to the <epic>. Return ComprehensionSchema. Be specific and grounded — every gap must cite a missing detail observable in the issue."
- **Refinement**: "Rewrite the <issue> using the <comprehension> analysis. Address each listed gap and ambiguity. Return RefinementSchema with the four required sections."
- **Validation**: "Score the <refined> issue body 0-100 per the rubric. Return ValidationSchema. Tag findings with [critical], [important], or [nit]."

---

## 6. GitLab API additions

### 6.1 `gitlabClient.updateIssue`

```ts
// src/services/gitlab/gitlabClient.ts (additive)
export interface UpdateIssuePayload {
  description?: string;
  title?: string;       // not used in v1, kept for forward compatibility
  labels?: string[];    // not used in v1
}

export async function updateIssue(
  config: GitLabConfig,
  projectId: string | number,
  issueIid: number,
  payload: UpdateIssuePayload
): Promise<Result<GitLabIssue>> {
  const url = `${config.baseUrl}/projects/${encodeURIComponent(projectId)}/issues/${issueIid}`;
  try {
    const resp = await fetch(url, {
      method: 'PUT',
      headers: { ...authHeaders(config), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      return { success: false, error: await formatError(resp) };
    }
    return { success: true, data: await resp.json() };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
```

**Endpoint correctness check (storyforge research):** Issues live on **projects**, not on epics. `PUT /projects/:id/issues/:iid` is the correct content-update endpoint. The `epics/.../issues` endpoint only assigns/links — it does not update issue content. Do not confuse these.

### 6.2 Child issue list — reuse existing path

`gitlabClient.fetchEpicDetails(groupId, epicIid)` already returns the issue list. Confirm pagination uses `per_page=100` and follows Link headers; if the existing implementation defaults to `per_page=20`, **the new feature requires** the fix (not a regression risk because the same path serves the existing epic flow).

---

## 7. State model (`issueRefineryStore.ts`)

```ts
// src/stores/issueRefineryStore.ts
type Phase = 'idle' | 'comprehending' | 'refining' | 'validating' | 'ready' | 'publishing' | 'error';

interface IssueRefineryState {
  // selection
  selectedEpic: { groupId: number; epicIid: number; title: string; body: string } | null;
  children: GitLabIssue[];
  selectedChildIid: number | null;
  originalBody: string | null;
  originalProjectId: number | null;

  // pipeline outputs
  comprehension: ComprehensionResult | null;
  refinedDraft: string | null;
  userEditedDraft: boolean;
  validation: ValidationResult | null;

  // status
  phase: Phase;
  error: string | null;

  // observability (dev only)
  lastCachedTokens: number[];  // one entry per stage call

  // actions
  setSelectedEpic(epic, children, body): void;
  setSelectedChild(iid): void;
  setComprehension(c): void;
  setRefinedDraft(d, userEdited: boolean): void;
  setValidation(v): void;
  setPhase(p, error?): void;
  recordCachedTokens(n): void;
  reset(): void;
}
```

**Invariants:**
- Phase transitions are strict: `idle → comprehending → refining → validating → ready → publishing → idle | error`.
- Reverse transitions only from `ready` (back to `comprehending` on re-Refine) or from `error` (back to `idle` on user dismiss).
- Setting `refinedDraft` with `userEdited=true` does not change `phase` (the user can edit while phase is `ready`).

---

## 8. UI design

### 8.1 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ WorkspaceSidebar │ Issue Refinery tab                            │
│  - Planner        │ ┌──────────────────┬─────────────────────┐  │
│  - Issues         │ │ Left pane        │ Right pane          │  │
│  - Blueprint      │ │                  │                     │  │
│  - Analytics      │ │ [Load Epic]      │ <Original body>     │  │
│  - Initiative     │ │ Epic: ABC-123    │ <ComprehensionCard> │  │
│  - DocIntel       │ │                  │ <RefinedIssueCard>  │  │
│  - IssueRefinery* │ │ Children:        │  └ diff toggle      │  │
│  - Settings       │ │  ☐ #45 ...       │  └ Accept / Edit    │  │
│  - Feedback       │ │  ☑ #46 ...       │ <ValidationCard>    │  │
│                   │ │  ☐ #47 ...       │  └ score badge      │  │
│                   │ │                  │  └ findings list    │  │
│                   │ │                  │ [Refine] [Publish]  │  │
│                   │ └──────────────────┴─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

* New tab.

### 8.2 Component responsibilities

| Component | Owns | Reads |
|---|---|---|
| `IssueRefineryView` | layout, split pane, top-level error toast | uiStore.activeTab |
| `ChildIssueList` | epic load trigger, list + radio selection | issueRefineryStore (epic, children, selectedChildIid) |
| `ComprehensionCard` | renders gaps/ambiguities/alignmentNotes as sub-cards | issueRefineryStore.comprehension, .phase |
| `RefinedIssueCard` | side-by-side diff, editable textarea on click, Accept/Edit toggle | issueRefineryStore (originalBody, refinedDraft, phase) |
| `ValidationCard` | score badge (green/amber/red), findings list with [critical]/[important]/[nit] color | issueRefineryStore.validation |
| `PublishButton` | onClick → `publishRefinedIssue()` action; loading state on `phase='publishing'` | issueRefineryStore.refinedDraft, .phase |
| `PromptCacheHUD` | dev-only floating panel showing `lastCachedTokens` per stage | issueRefineryStore.lastCachedTokens |

### 8.3 Markdown safety

All three cards render markdown via `<ReactMarkdown>` with:
- `disallowedElements={['h1','h2','h3','h4','h5','h6']}` for inline content within cards (card provides its own header).
- `remarkPlugins={[remarkGfm]}` to match existing FRAME convention.
- `RefinedIssueCard`'s diff uses a diff library (e.g. `react-diff-view` or a simple custom unified diff component) — TBD in implementation; library choice driven by bundle size and React 19 compat.

---

## 9. Cost & latency analysis

**Single refine run (all 3 stages):**

| Stage | Input tokens | Output tokens | Latency (P50) | Cost (gpt-4.1) |
|---|---|---|---|---|
| Comprehension | ~2500 (epic + issue + system) | ~300 | 2.5 s | $0.005 |
| Refinement | ~2500 (cached prefix ≈ 2200) | ~600 | 4.0 s | $0.004 |
| Validation | ~2500 (cached prefix ≈ 2200) | ~250 | 2.0 s | $0.003 |
| **Total** | | | **~8.5 s** | **~$0.012** |

**Re-run on same issue** (e.g., user clicks Refine again after editing — but normally they wouldn't; this is for retries):
- All 3 stages cache-hit on the document portion → ~$0.005 total.

**Publish:** one PUT, ~200 ms, negligible cost.

---

## 10. Observability

| Signal | Where | Purpose |
|---|---|---|
| `lastCachedTokens[]` in store | `aiClient.ts` reads `response.usage.prompt_tokens_details.cached_tokens` and reports via callback; `refineIssueAction` writes to store | Verify cache is firing |
| Phase transitions | Zustand devtools middleware (dev only) | Debug stuck states |
| Error toasts | `uiStore.addToast` on `phase='error'` | User-visible failure surfaces |
| Console errors | `console.error` on schema-validation failure | Dev debug; suppressed in prod build via Vite |

**Not added (out of scope):**
- Metrics/telemetry export (no observability backend wired today)
- Distributed tracing
- Audit log for publishes (could be added by writing to GitLab discussion thread — v2)

---

## 11. Testing strategy

| Layer | Approach |
|---|---|
| Schemas (`schemas.ts`) | Snapshot test JSON-schema generation; round-trip parse of canned LLM output |
| Stage runners (`runComprehension`, `runRefinement`, `runValidation`) | Mock `aiClient.callAI`; assert prompt assembly, schema validation, single-retry path |
| Orchestrator (`runIssuePipeline`) | Mock the 3 runners; assert sequential calling, error propagation, no partial commits |
| Action (`refineIssueAction`) | Mock store + orchestrator + gitlabClient; assert phase transitions, error surfaces |
| Store (`issueRefineryStore`) | Direct Zustand tests; assert reset, phase invariants |
| `gitlabClient.updateIssue` | Mock fetch; assert URL, method, body, error mapping |
| Components | RTL: render with mocked store; assert phase-driven rendering, button states |
| Integration | Wire all of the above; mock only `fetch`; assert end-to-end flow including cache-token recording |

**Coverage gate:** new files target ≥85% line coverage. Existing files (gitlabClient additions) target 100% on added lines.

---

## 12. Risks & mitigations (detail)

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Prompt cache busts → cost spikes | M | M | Dev HUD + add a per-PR manual check |
| R2 | Strict json_schema unsupported by current Azure deployment | L | H | Reuse `aiClient.ts`'s existing fallback; verify against a known endpoint in R-0 preflight |
| R3 | Always-overwrite clobbers teammate edits | M | M | Documented decision; v2 to add `updated_at` check |
| R4 | GitLab pagination silently truncates child list | M | M | Force `per_page=100`, follow Link headers, integration test |
| R5 | Bundle size from diff library | L | L | Prefer a small lib (~10 KB); fall back to custom unified diff if needed |
| R6 | LLM emits H1 anyway despite schema rule | M | L | `disallowedElements` strips them at render time |
| R7 | Empty issue body crashes pipeline | L | M | Stage rule: explicit empty-body handling per system prompt |
| R8 | Refined body invalidates GitLab quick actions (/label, @user, #ref) | M | M | System prompt rule #3 preserves them; integration test asserts |
| R9 | Re-Refine button confuses users (loses their inline edits) | M | L | Confirm dialog if `userEditedDraft=true` |
| R10 | Schema-validation failure loop (retry also fails) | L | M | Single retry only; surface raw model output in error toast for debug |

---

## 13. Rollout plan

1. **Behind no feature flag.** The tab is additive and gated by user choice (must click into it). Risk to existing flows is near-zero.
2. **Dogfood phase:** team uses the feature against a sandbox GitLab project for one week before announcing.
3. **Telemetry:** none in v1; rely on user feedback via the existing Feedback modal (which writes to GitLab).
4. **Rollback:** revert the commit. The tab disappears; no schema migrations, no persisted state to clean up (`issueRefineryStore` is in-memory only).

---

## 14. Migration / persistence

**Zero migrations.** The new store is in-memory; nothing is persisted to localStorage or any backend. Refined drafts that the user has not published are lost on refresh — this is by design for v1 (we don't want to recover stale drafts that may now conflict with upstream edits).

If a user wants to preserve work-in-progress, they can copy the refined body manually or publish.

---

## 15. References

- HLD: [2026-05-18-issue-refinery-hld.md](./2026-05-18-issue-refinery-hld.md)
- Research applied:
  - [Production-Grade Prompt Engineering Patterns for Azure](../research/Production-Grade%20Prompt%20Engineering%20Patterns%20for%20Azure.md) — strict json_schema, sandwich, temp/effort tuning
  - [storyforge_gitlab_traversal_complete](../research/storyforge_gitlab_traversal_complete.md) — correct issue-update endpoint, pagination
  - [Production-Grade Patterns for Rendering Structured](../research/Production-Grade%20Patterns%20for%20Rendering%20Structured%20.md) — component-based cards, no markdown dumps
- Existing FRAME files to mirror:
  - [src/pipeline/refinePipelineAction.ts](../../src/pipeline/refinePipelineAction.ts) — action-boundary pattern
  - [src/services/gitlab/gitlabClient.ts](../../src/services/gitlab/gitlabClient.ts) — `Result<T>` error pattern
  - [src/services/docIntel/analyzeAction.ts](../../src/services/docIntel/analyzeAction.ts) — multi-stage parallel/sequential composition
