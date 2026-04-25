# Extreme Initiative Module — Design

**Date:** 2026-04-25
**Status:** Approved (brainstorm)
**UX Research:** Pasted into brainstorm session — "FRAME UX Recommendation: Split into Crews & Assign Headers"
**Next step:** `superpowers:writing-plans` for atomic implementation tasks

---

## 1. Goal

Add a new "Extreme Initiative" module to FRAME as a **5th tab** alongside Planner/Issues/Blueprint/Analytics. It provides a 4-step wizard for decomposing a high-level initiative into crew-level epics:

1. **Init** — select/create a Stream, set title + description, name crews
2. **Stream Epic** — AI generates a structured epic; user reviews/edits
3. **Split Crews** — assign epic headers to crews (many-to-many); AI proposes initial split
4. **Refine Crew Epics** — AI refines each crew's epic; user reviews; publish

The core UX challenge is Step 3: a many-to-many assignment of headers to crews. The approved UX pattern is an **AI-proposed header-centric list with multi-select crew chips + overlap-aware crew summary rail**, with drag-and-drop as a secondary power-user affordance only.

## 2. Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tab placement | New 5th tab (`'initiative'`) | Separate workflow from Requirements; clean separation |
| Wizard pattern | Full-page within tab (Approach 1) | Matches ViewRouter pattern; no modal overhead |
| State management | New `initiativeStore.ts` | Clean separation from epicStore; dedicated domain |
| AI integration | Separate AI actions (not 6-stage pipeline) | Pipeline is Requirements-specific; initiative epics are freeform |
| Component library | Custom (no new dependencies) | Match FRAME's existing inline-style + CSS var pattern |
| Persistence | localStorage via Zustand persist | Same as configStore; no backend needed |

## 3. State — `initiativeStore.ts`

```typescript
type WizardStep = 'init' | 'streamEpic' | 'splitCrews' | 'refineCrews';

interface Stream {
  id: string;
  name: string;
  description?: string;
}

interface Header {
  id: string;
  text: string;
  level: 2 | 3;              // H2 or H3 from the stream epic
  assignedCrewIds: string[];  // many-to-many — core of the UX
  aiAssigned: boolean;        // true if AI proposed this (provenance badge)
}

interface Crew {
  id: string;
  name: string;
  refinedEpic?: string;       // markdown, populated in step 4
  refineStatus: 'pending' | 'refining' | 'done' | 'error';
}

interface InitiativeState {
  // Wizard
  currentStep: WizardStep;

  // Step 1
  streams: Stream[];
  selectedStreamId: string | null;
  title: string;
  description: string;

  // Step 2
  streamEpicMarkdown: string;
  headers: Header[];

  // Step 3
  crews: Crew[];
}

interface InitiativeActions {
  setStep(step: WizardStep): void;

  // Step 1
  createStream(name: string, description?: string): Stream;
  selectStream(id: string): void;
  setTitle(title: string): void;
  setDescription(desc: string): void;

  // Step 2
  setStreamEpic(markdown: string): void;
  parseHeadersFromEpic(): void;

  // Step 3
  addCrew(name: string): Crew;
  removeCrew(id: string): void;
  renameCrew(id: string, name: string): void;
  assignHeaderToCrew(headerId: string, crewId: string): void;
  unassignHeaderFromCrew(headerId: string, crewId: string): void;
  applyAiProposal(assignments: Record<string, string[]>): void;

  // Step 4
  setCrewRefineStatus(crewId: string, status: Crew['refineStatus']): void;
  setCrewRefinedEpic(crewId: string, markdown: string): void;

  reset(): void;
}
```

**Key:** `Header.assignedCrewIds` is the source of truth for many-to-many. Crew composition is derived. `Header.aiAssigned` enables provenance badges to mitigate automation bias.

## 4. Component Architecture

```
src/components/initiative/
├── ExtremeInitiativeView.tsx      # Tab root — stepper + step router
├── StepIndicator.tsx              # 4-step non-linear stepper bar
├── steps/
│   ├── InitStep.tsx               # Stream selector + title + description + crew naming
│   ├── StreamEpicStep.tsx         # AI-generated epic viewer/editor
│   ├── SplitCrewsStep.tsx         # Header list (left) + crew rail (right)
│   └── RefineCrewsStep.tsx        # Per-crew refinement progress cards
├── shared/
│   ├── CrewChipSelector.tsx       # Multi-select combobox with chips (creatable)
│   ├── CrewSummaryRail.tsx        # Right-rail crew composition cards
│   ├── HeaderRow.tsx              # Single header row with chip selector
│   ├── CrewCard.tsx               # Crew summary card (name, count, header list)
│   ├── StreamCombobox.tsx         # Creatable combobox for stream select/create
│   └── SharedHeaderBadge.tsx      # ⇄ glyph for headers in ≥2 crews
```

### ExtremeInitiativeView (~40 lines)

```tsx
export default function ExtremeInitiativeView() {
  const step = useInitiativeStore(s => s.currentStep);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <StepIndicator current={step} />
      {step === 'init' && <InitStep />}
      {step === 'streamEpic' && <StreamEpicStep />}
      {step === 'splitCrews' && <SplitCrewsStep />}
      {step === 'refineCrews' && <RefineCrewsStep />}
    </div>
  );
}
```

### SplitCrewsStep Layout (the core Step 3)

```
┌─────────────────────────────────────┬──────────────────────────┐
│ HEADERS (left, ~60% width)          │ CREWS (right rail, ~40%) │
│                                     │                          │
│ 🔍 Filter...  [Show unassigned]     │ + New Crew               │
│                                     │                          │
│ ▸ Header text                       │ ┌─ Crew Alpha ─── 8 ──┐ │
│   [Crew Alpha] [Crew Beta] [+]     │ │ • Header 1           │ │
│                                     │ │ • Header 2 ⇄         │ │
│ ▸ Header text                       │ │ +6 more              │ │
│   [Crew Alpha ⇄] [+Assign...]      │ └──────────────────────┘ │
│                                     │                          │
│ Progress: 3/5 crews, 2 unassigned   │ ┌─ Crew Beta ──── 4 ──┐ │
└─────────────────────────────────────┴──────────────────────────┘
```

Per the UX research:
- Multi-select crew chips on each header row (primary interaction)
- `⇄` shared-header badge when a header is in ≥2 crews
- Right-rail crew summary cards (derived from headers)
- Filter/search when headers > ~15
- "Show only unassigned" filter chip
- Progress tracker: "X of Y crews assigned | Z headers unassigned"
- Drag-and-drop deferred to v2 (secondary affordance per UX doc)

## 5. AI Actions

```
src/services/ai/initiative/
├── generateStreamEpic.ts      # Step 1→2
├── proposeCrewSplit.ts         # Step 2→3
└── refineCrewEpic.ts           # Step 4
```

### generateStreamEpic

`generateStreamEpic(config, title, description, crewCount): Promise<{ok, data|error}>`

System prompt: generate a structured epic with H2 (major workstreams) and H3 (sub-sections) from the initiative description. Returns markdown.

### proposeCrewSplit

`proposeCrewSplit(config, headers, crews): Promise<{ok, data|error}>`

System prompt: propose which headers belong to which crews. A header can belong to multiple crews if cross-cutting. Returns `{ assignments: Record<headerId, crewId[]>, reasoning: string }`.

The `reasoning` field powers the "Why these crews?" explainability popover — mitigates automation bias per the UX research (Eriksson et al. 2023: +14% error detection with rationales).

### refineCrewEpic

`refineCrewEpic(config, crewName, headers, streamEpicContext): Promise<{ok, data|error}>`

Called once per crew in Step 4. Each returns a focused crew epic markdown. Progress is shown via `Crew.refineStatus` updating in real-time.

All three use the existing `callAzure()` client. Error handling follows the `{ ok, data } | { ok, error }` discriminated union pattern from `docminingClient.ts`.

## 6. Wizard Navigation

### StepIndicator

Non-linear 4-step bar. Users can click back to completed steps but cannot jump forward past the current step.

```
  ● Init  ────  ● Stream Epic  ────  ○ Split Crews  ────  ○ Refine
  done          active               locked               locked
```

### Step Transition Guards

| From → To | Trigger | Guard |
|-----------|---------|-------|
| init → streamEpic | "Generate Stream Epic →" | Stream selected, title non-empty |
| streamEpic → splitCrews | "Split into Crews →" | Epic non-empty, ≥1 header, ≥2 crews named |
| splitCrews → refineCrews | "Refine Crew Epics →" | Every crew has ≥1 header (soft warn for unassigned headers) |
| refineCrews → publish | "Publish Initiative →" | All crews `refineStatus: 'done'` |

### Back navigation

Always allowed. Going back preserves all state — no data loss. Addresses the wizard anti-pattern (Stef Walter): decisions are never stuck.

### Re-propose (Step 3)

Calls `proposeCrewSplit()` again, replaces all assignments, confirms with dialog first.

### Footer (consistent across steps)

```
[← Back]                                    [Primary CTA →]
```

## 7. Tab Integration

1. **`uiStore.ts`** — extend `TabId` to include `'initiative'`
2. **`ViewRouter.tsx`** — add `case 'initiative': return <ExtremeInitiativeView />`
3. **Tab bar** — add 5th tab "Extreme Initiative" with Phosphor `RocketLaunch` icon
4. **localStorage persistence** — `initiativeStore` uses Zustand `persist` middleware (same as `configStore`)
5. **Publish action** — writes each crew's refined epic to `epicStore` one at a time, reusing existing Publish → GitLab flow
6. **No backend** — all state client-side, only network calls are Azure OpenAI

## 8. Testing Strategy

| What | File | Key Assertions |
|------|------|----------------|
| `initiativeStore` | `initiativeStore.test.ts` | CRUD streams, add/remove crews, assign/unassign headers (many-to-many), applyAiProposal, reset |
| `parseHeadersFromEpic` | `initiativeStore.test.ts` | Extract H2+H3, correct level, stable IDs |
| `generateStreamEpic` | `generateStreamEpic.test.ts` | Correct prompt, returns markdown, error handling |
| `proposeCrewSplit` | `proposeCrewSplit.test.ts` | Valid assignment map, reasoning field, malformed JSON |
| `refineCrewEpic` | `refineCrewEpic.test.ts` | Crew context, returns markdown, timeout handling |
| `CrewChipSelector` | `CrewChipSelector.test.ts` | Render chips, add on select, remove on ×, create new |
| Step transitions | `ExtremeInitiativeView.test.ts` | Guard enforcement, back works, re-propose replaces |

**~25-30 tests** across 7 files. No E2E for v1.

## 9. Scope Guards

- DO NOT modify the existing 6-stage pipeline — initiative AI is separate
- DO NOT add new npm dependencies — custom components only
- DO NOT build drag-and-drop in v1 — it's a v2 secondary affordance
- DO NOT build the checkbox matrix fallback (§4 of UX doc) — chip pattern is primary
- DO NOT build mobile/narrow-viewport adaptations in v1

## 10. File Summary

New files (additive only):
- `src/stores/initiativeStore.ts` + test
- `src/services/ai/initiative/{generateStreamEpic,proposeCrewSplit,refineCrewEpic}.ts` + tests
- `src/components/initiative/ExtremeInitiativeView.tsx` + test
- `src/components/initiative/StepIndicator.tsx`
- `src/components/initiative/steps/{InitStep,StreamEpicStep,SplitCrewsStep,RefineCrewsStep}.tsx`
- `src/components/initiative/shared/{CrewChipSelector,CrewSummaryRail,HeaderRow,CrewCard,StreamCombobox,SharedHeaderBadge}.tsx` + CrewChipSelector test

Modified files:
- `src/stores/uiStore.ts` — add `'initiative'` to `TabId`
- `src/components/layout/ViewRouter.tsx` — add initiative case
- Tab bar component — add 5th tab

---

**Status:** Design approved. Next step: `superpowers:writing-plans` to produce atomic implementation tasks.
