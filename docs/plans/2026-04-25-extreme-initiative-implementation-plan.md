# Extreme Initiative Module — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a 5th "Extreme Initiative" tab to FRAME with a 4-step wizard (Init → Stream Epic → Split Crews → Refine) for decomposing initiatives into crew-level epics via AI-assisted many-to-many header-to-crew assignment.

**Architecture:** New `initiativeStore.ts` (Zustand v5) owns all state. Full-page wizard in a new tab (`ExtremeInitiativeView`). Three separate AI action functions (not reusing 6-stage pipeline). Custom components only — no new npm dependencies.

**Tech Stack:** React 19, TypeScript strict, Zustand v5, Vite 6, Vitest 4, Phosphor Icons, Azure OpenAI via existing `callAzure()`. Custom inline styles + CSS variables (FRAME convention).

---

## Task 1: Create `initiativeStore.ts` with types + core actions

**Files:**
- Create: `src/stores/initiativeStore.ts`
- Test: `src/stores/initiativeStore.test.ts`

**Step 1: Write the failing test**

```typescript
// src/stores/initiativeStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useInitiativeStore } from './initiativeStore';

const store = () => useInitiativeStore.getState();

beforeEach(() => store().reset());

describe('initiativeStore', () => {
  describe('streams', () => {
    it('creates a stream with id and name', () => {
      const s = store().createStream('Wealth Onboarding', 'desc');
      expect(s.name).toBe('Wealth Onboarding');
      expect(s.id).toBeTruthy();
      expect(store().streams).toHaveLength(1);
    });

    it('selects a stream', () => {
      const s = store().createStream('S1');
      store().selectStream(s.id);
      expect(store().selectedStreamId).toBe(s.id);
    });
  });

  describe('crews', () => {
    it('adds a crew', () => {
      const c = store().addCrew('Alpha');
      expect(c.name).toBe('Alpha');
      expect(c.refineStatus).toBe('pending');
      expect(store().crews).toHaveLength(1);
    });

    it('removes a crew and unassigns its headers', () => {
      const c = store().addCrew('Alpha');
      store().setStreamEpic('## Header One\nContent');
      store().parseHeadersFromEpic();
      store().assignHeaderToCrew(store().headers[0]!.id, c.id);
      store().removeCrew(c.id);
      expect(store().crews).toHaveLength(0);
      expect(store().headers[0]!.assignedCrewIds).toEqual([]);
    });

    it('renames a crew', () => {
      const c = store().addCrew('Alpha');
      store().renameCrew(c.id, 'Beta');
      expect(store().crews[0]!.name).toBe('Beta');
    });
  });

  describe('headers + assignment', () => {
    it('parses H2 and H3 headers from markdown', () => {
      store().setStreamEpic('## Risk Assessment\nText\n### Sub-risk\nMore\n## Compliance\nText');
      store().parseHeadersFromEpic();
      expect(store().headers).toHaveLength(3);
      expect(store().headers[0]!.text).toBe('Risk Assessment');
      expect(store().headers[0]!.level).toBe(2);
      expect(store().headers[1]!.text).toBe('Sub-risk');
      expect(store().headers[1]!.level).toBe(3);
    });

    it('assigns a header to a crew (many-to-many)', () => {
      store().setStreamEpic('## H1\n## H2');
      store().parseHeadersFromEpic();
      const c1 = store().addCrew('A');
      const c2 = store().addCrew('B');
      const hId = store().headers[0]!.id;
      store().assignHeaderToCrew(hId, c1.id);
      store().assignHeaderToCrew(hId, c2.id);
      expect(store().headers[0]!.assignedCrewIds).toEqual([c1.id, c2.id]);
    });

    it('unassigns a header from a crew', () => {
      store().setStreamEpic('## H1');
      store().parseHeadersFromEpic();
      const c = store().addCrew('A');
      const hId = store().headers[0]!.id;
      store().assignHeaderToCrew(hId, c.id);
      store().unassignHeaderFromCrew(hId, c.id);
      expect(store().headers[0]!.assignedCrewIds).toEqual([]);
    });

    it('applies AI proposal', () => {
      store().setStreamEpic('## H1\n## H2');
      store().parseHeadersFromEpic();
      const c1 = store().addCrew('A');
      const c2 = store().addCrew('B');
      const [h1, h2] = store().headers;
      store().applyAiProposal({ [h1!.id]: [c1.id], [h2!.id]: [c1.id, c2.id] });
      expect(store().headers[0]!.assignedCrewIds).toEqual([c1.id]);
      expect(store().headers[1]!.assignedCrewIds).toEqual([c1.id, c2.id]);
      expect(store().headers[1]!.aiAssigned).toBe(true);
    });
  });

  describe('wizard step', () => {
    it('defaults to init', () => {
      expect(store().currentStep).toBe('init');
    });

    it('sets step', () => {
      store().setStep('splitCrews');
      expect(store().currentStep).toBe('splitCrews');
    });
  });

  describe('reset', () => {
    it('clears all state', () => {
      store().createStream('S');
      store().addCrew('C');
      store().setTitle('T');
      store().reset();
      expect(store().streams).toHaveLength(0);
      expect(store().crews).toHaveLength(0);
      expect(store().title).toBe('');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/initiativeStore.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```typescript
// src/stores/initiativeStore.ts
import { create } from 'zustand';

// ─── Types ─────────────────────────────────────────────────

export type WizardStep = 'init' | 'streamEpic' | 'splitCrews' | 'refineCrews';

export interface Stream {
  id: string;
  name: string;
  description?: string;
}

export interface Header {
  id: string;
  text: string;
  level: 2 | 3;
  assignedCrewIds: string[];
  aiAssigned: boolean;
}

export interface Crew {
  id: string;
  name: string;
  refinedEpic?: string;
  refineStatus: 'pending' | 'refining' | 'done' | 'error';
}

interface InitiativeState {
  currentStep: WizardStep;
  streams: Stream[];
  selectedStreamId: string | null;
  title: string;
  description: string;
  streamEpicMarkdown: string;
  headers: Header[];
  crews: Crew[];
}

interface InitiativeActions {
  setStep: (step: WizardStep) => void;
  createStream: (name: string, description?: string) => Stream;
  selectStream: (id: string) => void;
  setTitle: (title: string) => void;
  setDescription: (desc: string) => void;
  setStreamEpic: (markdown: string) => void;
  parseHeadersFromEpic: () => void;
  addCrew: (name: string) => Crew;
  removeCrew: (id: string) => void;
  renameCrew: (id: string, name: string) => void;
  assignHeaderToCrew: (headerId: string, crewId: string) => void;
  unassignHeaderFromCrew: (headerId: string, crewId: string) => void;
  applyAiProposal: (assignments: Record<string, string[]>) => void;
  setCrewRefineStatus: (crewId: string, status: Crew['refineStatus']) => void;
  setCrewRefinedEpic: (crewId: string, markdown: string) => void;
  reset: () => void;
}

// ─── Helpers ───────────────────────────────────────────────

let _counter = 0;
const uid = () => `ini_${Date.now()}_${++_counter}`;

function extractHeaders(markdown: string): Header[] {
  const lines = markdown.split('\n');
  const headers: Header[] = [];
  for (const line of lines) {
    const m2 = line.match(/^## (.+)/);
    if (m2) { headers.push({ id: uid(), text: m2[1]!.trim(), level: 2, assignedCrewIds: [], aiAssigned: false }); continue; }
    const m3 = line.match(/^### (.+)/);
    if (m3) { headers.push({ id: uid(), text: m3[1]!.trim(), level: 3, assignedCrewIds: [], aiAssigned: false }); }
  }
  return headers;
}

const INITIAL: InitiativeState = {
  currentStep: 'init',
  streams: [],
  selectedStreamId: null,
  title: '',
  description: '',
  streamEpicMarkdown: '',
  headers: [],
  crews: [],
};

// ─── Store ─────────────────────────────────────────────────

export const useInitiativeStore = create<InitiativeState & InitiativeActions>()((set, get) => ({
  ...INITIAL,

  setStep: (step) => set({ currentStep: step }),

  createStream: (name, description) => {
    const stream: Stream = { id: uid(), name, description };
    set((s) => ({ streams: [...s.streams, stream] }));
    return stream;
  },
  selectStream: (id) => set({ selectedStreamId: id }),
  setTitle: (title) => set({ title }),
  setDescription: (desc) => set({ description: desc }),

  setStreamEpic: (markdown) => set({ streamEpicMarkdown: markdown }),
  parseHeadersFromEpic: () => {
    const headers = extractHeaders(get().streamEpicMarkdown);
    set({ headers });
  },

  addCrew: (name) => {
    const crew: Crew = { id: uid(), name, refineStatus: 'pending' };
    set((s) => ({ crews: [...s.crews, crew] }));
    return crew;
  },
  removeCrew: (id) => set((s) => ({
    crews: s.crews.filter((c) => c.id !== id),
    headers: s.headers.map((h) => ({
      ...h,
      assignedCrewIds: h.assignedCrewIds.filter((cid) => cid !== id),
    })),
  })),
  renameCrew: (id, name) => set((s) => ({
    crews: s.crews.map((c) => c.id === id ? { ...c, name } : c),
  })),

  assignHeaderToCrew: (headerId, crewId) => set((s) => ({
    headers: s.headers.map((h) =>
      h.id === headerId && !h.assignedCrewIds.includes(crewId)
        ? { ...h, assignedCrewIds: [...h.assignedCrewIds, crewId] }
        : h
    ),
  })),
  unassignHeaderFromCrew: (headerId, crewId) => set((s) => ({
    headers: s.headers.map((h) =>
      h.id === headerId
        ? { ...h, assignedCrewIds: h.assignedCrewIds.filter((id) => id !== crewId) }
        : h
    ),
  })),
  applyAiProposal: (assignments) => set((s) => ({
    headers: s.headers.map((h) => ({
      ...h,
      assignedCrewIds: assignments[h.id] ?? h.assignedCrewIds,
      aiAssigned: h.id in assignments,
    })),
  })),

  setCrewRefineStatus: (crewId, status) => set((s) => ({
    crews: s.crews.map((c) => c.id === crewId ? { ...c, refineStatus: status } : c),
  })),
  setCrewRefinedEpic: (crewId, markdown) => set((s) => ({
    crews: s.crews.map((c) => c.id === crewId ? { ...c, refinedEpic: markdown } : c),
  })),

  reset: () => { _counter = 0; set(INITIAL); },
}));
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/stores/initiativeStore.test.ts`
Expected: 10/10 PASS

**Step 5: Commit**

```bash
git add src/stores/initiativeStore.ts src/stores/initiativeStore.test.ts
git commit -m "feat(initiative): initiativeStore — streams, crews, headers, many-to-many assignment"
```

---

## Task 2: Wire the 5th tab into uiStore + ViewRouter + Sidebar

**Files:**
- Modify: `src/stores/uiStore.ts:12` — add `'initiative'` to TabId
- Modify: `src/components/layout/ViewRouter.tsx:69-84` — add initiative case
- Modify: `src/components/layout/WorkspaceSidebar.tsx:40-53` — add nav item
- Create: `src/components/initiative/ExtremeInitiativeView.tsx` (placeholder)

**Step 1: Write the failing test**

```typescript
// src/components/initiative/ExtremeInitiativeView.test.ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useUiStore } from '@/stores/uiStore';
import { ViewRouter } from '@/components/layout/ViewRouter';

describe('ExtremeInitiativeView tab', () => {
  it('renders when activeTab is initiative', () => {
    useUiStore.getState().setActiveTab('initiative');
    render(<ViewRouter />);
    expect(screen.getByTestId('initiative-view')).toBeTruthy();
  });
});
```

**Step 2: Run, fail.**

**Step 3: Implement**

In `src/stores/uiStore.ts:12`:
```typescript
export type TabId = 'planner' | 'issues' | 'blueprint' | 'analytics' | 'initiative';
```

In `src/components/initiative/ExtremeInitiativeView.tsx`:
```tsx
import { useInitiativeStore } from '@/stores/initiativeStore';

export default function ExtremeInitiativeView() {
  const step = useInitiativeStore((s) => s.currentStep);
  return (
    <div data-testid="initiative-view" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: 24 }}>
      <h2 style={{ margin: 0, fontFamily: "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
        Extreme Initiative — Step: {step}
      </h2>
      <p>Wizard steps coming next.</p>
    </div>
  );
}
```

In `src/components/layout/ViewRouter.tsx`, add import and case:
```tsx
import ExtremeInitiativeView from '@/components/initiative/ExtremeInitiativeView';
// ... in switch:
case 'initiative':
  return <ErrorBoundary viewName="Extreme Initiative"><ExtremeInitiativeView /></ErrorBoundary>;
```

In `src/components/layout/WorkspaceSidebar.tsx`, add to `NAV_ITEMS` array (before analytics):
```typescript
import { Lightning } from '@phosphor-icons/react';
// in NAV_ITEMS:
{ id: 'initiative', icon: Lightning, label: 'Extreme Initiative' },
```

**Step 4: Run test, pass.**
**Step 5: Commit `feat(initiative): wire 5th tab — uiStore + ViewRouter + Sidebar`.**

---

## Task 3: StepIndicator component

**Files:**
- Create: `src/components/initiative/StepIndicator.tsx`
- Test: `src/components/initiative/StepIndicator.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StepIndicator } from './StepIndicator';

describe('StepIndicator', () => {
  it('renders 4 steps', () => {
    render(<StepIndicator current="init" onStepClick={() => {}} completedSteps={[]} />);
    expect(screen.getByText('Init')).toBeTruthy();
    expect(screen.getByText('Stream Epic')).toBeTruthy();
    expect(screen.getByText('Split Crews')).toBeTruthy();
    expect(screen.getByText('Refine')).toBeTruthy();
  });

  it('marks completed steps as clickable', () => {
    render(<StepIndicator current="splitCrews" onStepClick={() => {}} completedSteps={['init', 'streamEpic']} />);
    const initStep = screen.getByText('Init').closest('button');
    expect(initStep).not.toBeNull();
    expect(initStep!.getAttribute('aria-disabled')).not.toBe('true');
  });

  it('marks future steps as locked', () => {
    render(<StepIndicator current="init" onStepClick={() => {}} completedSteps={[]} />);
    const refineStep = screen.getByText('Refine').closest('button');
    expect(refineStep!.getAttribute('aria-disabled')).toBe('true');
  });
});
```

**Step 2: Run, fail.**

**Step 3: Implement** — A horizontal bar with 4 buttons connected by lines. Each button shows a filled/hollow circle + label. Completed = filled + clickable, active = filled + bold, future = hollow + aria-disabled. Uses FRAME's CSS var tokens (`--col-accent`, `var(--col-text-primary)`).

**Step 4: Run, pass.**
**Step 5: Commit `feat(initiative): StepIndicator — 4-step non-linear stepper`.**

---

## Task 4: InitStep — stream selector + title + crew naming

**Files:**
- Create: `src/components/initiative/steps/InitStep.tsx`
- Create: `src/components/initiative/shared/StreamCombobox.tsx`

**Step 1: Failing test** — renders title input, stream combobox, crew name fields. Clicking "Generate Stream Epic" calls `setStep('streamEpic')` when title is non-empty and stream is selected.

**Step 3: Implement** —
- `StreamCombobox`: text input + dropdown list. Filters on type. Last item = "Create '[query]'" when no match. Uses `initiativeStore.createStream()` and `selectStream()`.
- `InitStep`: title input, description textarea, `StreamCombobox`, crew count stepper `[–][N][+]`, N text inputs for crew names (auto-generated "Crew Alpha", "Crew Beta"... or "Let AI suggest" checkbox), "Generate Stream Epic →" button with guards.

**Step 5: Commit `feat(initiative): InitStep — stream selector, title, crew naming`.**

---

## Task 5: AI action — `generateStreamEpic.ts`

**Files:**
- Create: `src/services/ai/initiative/generateStreamEpic.ts`
- Test: `src/services/ai/initiative/generateStreamEpic.test.ts`

**Step 1: Failing test**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { generateStreamEpic } from './generateStreamEpic';

vi.mock('@/services/ai/azureClient', () => ({
  callAzure: vi.fn().mockResolvedValue({
    content: '## Risk Assessment\nContent\n## Compliance\nMore content',
    model: 'gpt-4.1',
  }),
}));

describe('generateStreamEpic', () => {
  it('returns markdown with H2 sections', async () => {
    const result = await generateStreamEpic(
      {} as any, 'http://endpoint', 'Wealth Onboarding', 'Description here', 3
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('## ');
    }
  });
});
```

**Step 3: Implement**

```typescript
// src/services/ai/initiative/generateStreamEpic.ts
import { callAzure } from '@/services/ai/azureClient';
import type { AzureOpenAIConfig } from '@/domain/configTypes';

interface GenerateResult {
  ok: true; data: string; reasoning?: string;
} | {
  ok: false; error: string;
}

export async function generateStreamEpic(
  config: AzureOpenAIConfig,
  endpoint: string,
  title: string,
  description: string,
  crewCount: number,
): Promise<GenerateResult> {
  try {
    const response = await callAzure(config, endpoint, {
      systemPrompt: `You are an enterprise initiative planner. Given a stream title and description, generate a structured epic outline. Use ## for major workstreams and ### for sub-sections. Target approximately ${crewCount * 3}-${crewCount * 5} sections total so they can be distributed across ${crewCount} crews. Each section should be a meaningful unit of work.`,
      userPrompt: `Stream: ${title}\n\nDescription:\n${description}`,
      maxTokens: 4000,
      temperature: 0.7,
    });
    return { ok: true, data: response.content };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
```

**Step 5: Commit `feat(initiative): generateStreamEpic AI action`.**

---

## Task 6: StreamEpicStep — AI epic viewer/editor

**Files:**
- Create: `src/components/initiative/steps/StreamEpicStep.tsx`

**Step 1: Failing test** — renders the epic markdown in an editable textarea or rich editor area. Shows "Split into Crews →" button. "Re-generate" button calls `generateStreamEpic` again.

**Step 3: Implement** — Left side: editable `<textarea>` with the stream epic markdown. Right side: rendered preview using `react-markdown` (already in project). Top: "Re-generate" button + "Why this structure?" explainability popover. Bottom: "← Back" and "Split into Crews →" with guard (epic non-empty, ≥1 header, ≥2 crews).

On entering this step, if `streamEpicMarkdown` is empty, auto-call `generateStreamEpic()` and show a loading skeleton.

**Step 5: Commit `feat(initiative): StreamEpicStep — AI epic viewer/editor with preview`.**

---

## Task 7: AI action — `proposeCrewSplit.ts`

**Files:**
- Create: `src/services/ai/initiative/proposeCrewSplit.ts`
- Test: `src/services/ai/initiative/proposeCrewSplit.test.ts`

**Step 1: Failing test** — mock `callAzure` to return JSON with `assignments` and `reasoning`. Assert result parses correctly.

**Step 3: Implement**

```typescript
// src/services/ai/initiative/proposeCrewSplit.ts
import { callAzure } from '@/services/ai/azureClient';
import type { AzureOpenAIConfig } from '@/domain/configTypes';
import type { Header, Crew } from '@/stores/initiativeStore';

interface SplitResult {
  ok: true; data: { assignments: Record<string, string[]>; reasoning: string };
} | {
  ok: false; error: string;
}

export async function proposeCrewSplit(
  config: AzureOpenAIConfig,
  endpoint: string,
  headers: Header[],
  crews: Crew[],
): Promise<SplitResult> {
  const headerList = headers.map((h) => `- [${h.id}] ${h.text} (H${h.level})`).join('\n');
  const crewList = crews.map((c) => `- [${c.id}] ${c.name}`).join('\n');

  try {
    const response = await callAzure(config, endpoint, {
      systemPrompt: `You are an initiative planning assistant. Given a list of headers (from a stream epic) and crew names, propose which headers should be assigned to which crews. A header CAN belong to multiple crews if it is cross-cutting. Return ONLY valid JSON: {"assignments": {"headerId": ["crewId", ...]}, "reasoning": "explanation of grouping logic"}`,
      userPrompt: `Headers:\n${headerList}\n\nCrews:\n${crewList}`,
      maxTokens: 2000,
      temperature: 0.3,
    });

    const parsed = JSON.parse(response.content);
    return { ok: true, data: parsed };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
```

**Step 5: Commit `feat(initiative): proposeCrewSplit AI action`.**

---

## Task 8: CrewChipSelector + HeaderRow + SharedHeaderBadge

**Files:**
- Create: `src/components/initiative/shared/CrewChipSelector.tsx`
- Create: `src/components/initiative/shared/HeaderRow.tsx`
- Create: `src/components/initiative/shared/SharedHeaderBadge.tsx`
- Test: `src/components/initiative/shared/CrewChipSelector.test.ts`

**Step 1: Failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CrewChipSelector } from './CrewChipSelector';

const crews = [
  { id: 'c1', name: 'Alpha', refineStatus: 'pending' as const },
  { id: 'c2', name: 'Beta', refineStatus: 'pending' as const },
];

describe('CrewChipSelector', () => {
  it('renders assigned crew chips', () => {
    render(<CrewChipSelector assignedCrewIds={['c1']} crews={crews} onAssign={() => {}} onUnassign={() => {}} />);
    expect(screen.getByText('Alpha')).toBeTruthy();
  });

  it('calls onUnassign when × is clicked', () => {
    const onUnassign = vi.fn();
    render(<CrewChipSelector assignedCrewIds={['c1']} crews={crews} onAssign={() => {}} onUnassign={onUnassign} />);
    fireEvent.click(screen.getByLabelText('Remove Alpha'));
    expect(onUnassign).toHaveBeenCalledWith('c1');
  });

  it('shows dropdown with unassigned crews on + click', () => {
    render(<CrewChipSelector assignedCrewIds={['c1']} crews={crews} onAssign={() => {}} onUnassign={() => {}} />);
    fireEvent.click(screen.getByText('+ Assign'));
    expect(screen.getByText('Beta')).toBeTruthy();
  });
});
```

**Step 3: Implement** —
- `CrewChipSelector`: renders chips for assigned crews + a "+ Assign" trigger that opens a dropdown. Dropdown shows unassigned crews, filterable by typing. Each chip has an `×` button with `aria-label`. ARIA combobox attributes on the input.
- `HeaderRow`: wraps a header text + `CrewChipSelector`. Shows level indicator (H2 bold, H3 indented).
- `SharedHeaderBadge`: renders `⇄` glyph (Phosphor `ArrowsLeftRight` icon, 12px) when `assignedCrewIds.length >= 2`. `aria-label` lists the crew names.

**Step 5: Commit `feat(initiative): CrewChipSelector + HeaderRow + SharedHeaderBadge`.**

---

## Task 9: CrewSummaryRail + CrewCard

**Files:**
- Create: `src/components/initiative/shared/CrewSummaryRail.tsx`
- Create: `src/components/initiative/shared/CrewCard.tsx`

**Step 1: Failing test** — renders one card per crew with header count and first 3 header names.

**Step 3: Implement** —
- `CrewCard`: crew name, header count badge, first 3 headers listed, "+N more" if > 3. Empty state: "No headers assigned yet". Shows `⇄` on shared headers.
- `CrewSummaryRail`: vertical list of `CrewCard`s + "+ New Crew" button at top. Derives crew composition from `headers.filter(h => h.assignedCrewIds.includes(crewId))`.

**Step 5: Commit `feat(initiative): CrewSummaryRail + CrewCard — right-rail crew overview`.**

---

## Task 10: SplitCrewsStep — the core Step 3

**Files:**
- Create: `src/components/initiative/steps/SplitCrewsStep.tsx`

**Step 1: Failing test** — renders header list on left, crew rail on right, progress tracker, filter input.

**Step 3: Implement** — Two-column flexbox layout (60%/40%). Left: filter input + "Show unassigned" toggle + `HeaderRow` list. Right: `CrewSummaryRail`. Top bar: progress ("X of Y crews assigned | Z unassigned"), "Re-propose" button, "Why these crews?" popover. Bottom: "← Back" and "Refine Crew Epics →".

On entering this step, if no AI proposal has been applied, auto-call `proposeCrewSplit()` and show loading state.

**Step 5: Commit `feat(initiative): SplitCrewsStep — header-to-crew assignment with chips + rail`.**

---

## Task 11: AI action — `refineCrewEpic.ts`

**Files:**
- Create: `src/services/ai/initiative/refineCrewEpic.ts`
- Test: `src/services/ai/initiative/refineCrewEpic.test.ts`

**Step 1: Failing test** — mock callAzure, assert returns markdown.

**Step 3: Implement** — system prompt: "Write a focused crew epic for [crewName] covering these assigned headers: [list]. Use the parent stream epic as context. Output clean markdown." Returns `{ ok, data }`.

**Step 5: Commit `feat(initiative): refineCrewEpic AI action`.**

---

## Task 12: RefineCrewsStep — per-crew progress + publish

**Files:**
- Create: `src/components/initiative/steps/RefineCrewsStep.tsx`

**Step 1: Failing test** — renders one card per crew with status indicator (pending/refining/done/error).

**Step 3: Implement** — On entering this step, sequentially call `refineCrewEpic()` for each crew. Each crew card shows: pending (gray), refining (spinner), done (green check + expandable preview), error (red + retry button). Bottom: "← Back" and "Publish Initiative →" (enabled when all crews are done). Publish writes each crew epic to `epicStore.setMarkdown()` one at a time (user picks which to publish via existing GitLab flow).

**Step 5: Commit `feat(initiative): RefineCrewsStep — per-crew AI refinement + publish`.**

---

## Task 13: Wire ExtremeInitiativeView with all steps + navigation

**Files:**
- Modify: `src/components/initiative/ExtremeInitiativeView.tsx` — replace placeholder with full stepper + step routing + navigation guards

**Step 1: Failing test** — Renders StepIndicator. Cannot advance past init without title. Can go back from any step.

**Step 3: Implement** — Full `ExtremeInitiativeView` with:
- `StepIndicator` at top
- Step component based on `currentStep`
- Navigation guards per design doc §6
- `completedSteps` derived from store state
- Back/forward managed via `setStep()`

**Step 5: Commit `feat(initiative): wire full wizard — stepper + step routing + navigation guards`.**

---

## Task 14: Integration test — full wizard flow

**Files:**
- Create: `src/test/integration/initiativeFlow.test.ts`

**Step 1: Write the test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useInitiativeStore } from '@/stores/initiativeStore';

const store = () => useInitiativeStore.getState();

beforeEach(() => store().reset());

describe('initiative wizard flow', () => {
  it('completes full init → streamEpic → splitCrews → refineCrews cycle', () => {
    // Step 1: Init
    const stream = store().createStream('Wealth Onboarding');
    store().selectStream(stream.id);
    store().setTitle('Wealth Initiative 2026');
    store().setDescription('Modernize onboarding');
    const c1 = store().addCrew('Alpha');
    const c2 = store().addCrew('Beta');
    store().setStep('streamEpic');

    // Step 2: Stream Epic
    store().setStreamEpic('## Risk Assessment\nContent\n## Compliance\nMore\n## KYC\nDetails');
    store().parseHeadersFromEpic();
    expect(store().headers).toHaveLength(3);
    store().setStep('splitCrews');

    // Step 3: Split Crews
    store().applyAiProposal({
      [store().headers[0]!.id]: [c1.id],
      [store().headers[1]!.id]: [c1.id, c2.id],  // shared header
      [store().headers[2]!.id]: [c2.id],
    });
    expect(store().headers[1]!.assignedCrewIds).toHaveLength(2);
    expect(store().headers[1]!.aiAssigned).toBe(true);
    store().setStep('refineCrews');

    // Step 4: Refine
    store().setCrewRefineStatus(c1.id, 'done');
    store().setCrewRefinedEpic(c1.id, '# Alpha Epic\n## Risk Assessment\nRefined.');
    store().setCrewRefineStatus(c2.id, 'done');
    store().setCrewRefinedEpic(c2.id, '# Beta Epic\n## Compliance\n## KYC');

    expect(store().crews.every((c) => c.refineStatus === 'done')).toBe(true);
    expect(store().crews[0]!.refinedEpic).toContain('Risk Assessment');
  });
});
```

**Step 2: Run, fail.**
**Step 3: No new implementation — test exercises existing store.**
**Step 4: Run, pass.**
**Step 5: Commit `test(initiative): integration test — full wizard flow`.**

---

## Verification before completion

After all 14 tasks: run `npx vitest run` (full suite). Expect all new tests green + no regressions to existing ~1200 tests.

Use `superpowers:verification-before-completion` at every task boundary.

---

## Out of scope (per design doc §9)

- Drag-and-drop secondary affordance (v2)
- Checkbox matrix fallback
- Mobile/narrow-viewport adaptations
- E2E/Playwright tests
- Backend persistence (all localStorage)
- Existing 6-stage pipeline modifications

---

Plan complete and saved to `docs/plans/2026-04-25-extreme-initiative-implementation-plan.md`.

Two execution options:

**1. Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Parallel Session (separate)** — Open a new session with `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?
