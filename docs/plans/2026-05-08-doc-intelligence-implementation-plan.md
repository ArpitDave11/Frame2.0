# Document Intelligence Tab — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Document Intelligence tab that lets users upload any document, analyze it through a lens via 3 parallel AI calls, edit results in BlockNote editors, and export/publish.

**Architecture:** New `docIntel` tab wired into existing ViewRouter/Sidebar/uiStore. New Zustand store manages document + sections + lens state. 3 parallel `callAI()` produce Summary, Insights, Visuals sections. BlockNote provides per-section editing with regenerate/revert. Export via separate microservice (Pandoc/WeasyPrint). GitLab publish reuses existing `commitToGitLabBranch`/`publishWithMergeRequest`.

**Tech Stack:** React 19, Zustand v5, BlockNote (@blocknote/core + @blocknote/react + @blocknote/mantine), Mermaid 11, FastAPI (backend), Pandoc + WeasyPrint (export service)

---

## Phase 1 — Tab Wiring + Store (walking skeleton)

### Task 1: Wire DocIntel tab into app navigation

**Files:**
- Modify: `src/stores/uiStore.ts:12`
- Modify: `src/components/layout/ViewRouter.tsx:10-87`
- Modify: `src/components/layout/WorkspaceSidebar.tsx:42-57`
- Create: `src/components/docIntel/DocIntelView.tsx`

**Step 1: Add 'docIntel' to TabId**

In `src/stores/uiStore.ts` line 12, change:
```typescript
export type TabId = 'planner' | 'issues' | 'blueprint' | 'analytics' | 'initiative';
```
to:
```typescript
export type TabId = 'planner' | 'issues' | 'blueprint' | 'analytics' | 'initiative' | 'docIntel';
```

**Step 2: Create placeholder DocIntelView**

Create `src/components/docIntel/DocIntelView.tsx`:
```tsx
const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export default function DocIntelView() {
  return (
    <div data-testid="docintel-view" style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: F, fontSize: '1.75rem', fontWeight: 300, color: 'var(--col-text-subtle)',
    }}>
      Document Intelligence
    </div>
  );
}
```

**Step 3: Add ViewRouter case**

In `src/components/layout/ViewRouter.tsx`, add import after line 19:
```typescript
import DocIntelView from '@/components/docIntel/DocIntelView';
```

Add case before `default:` (after initiative case, around line 83):
```typescript
case 'docIntel':
  return <ErrorBoundary viewName="Document Intelligence"><div data-testid="docintel-view" style={{ flex: 1, overflow: 'auto' }}><DocIntelView /></div></ErrorBoundary>;
```

**Step 4: Add sidebar nav item**

In `src/components/layout/WorkspaceSidebar.tsx`, add import for `FileSearch` icon (line 13 area):
```typescript
import { FileSearch } from '@phosphor-icons/react';
```

Add nav item in `NAV_ITEMS` array after the `initiative` entry (line 53):
```typescript
{ id: 'docIntel', icon: FileSearch, label: 'Doc Intelligence' },
```

**Step 5: Run tests**

Run: `npx vitest run src/components/layout/ src/stores/uiStore 2>&1 | tail -10`
Expected: All pass (new tab is additive, no existing behavior changed).

**Step 6: Commit**

```bash
git add src/stores/uiStore.ts src/components/layout/ViewRouter.tsx src/components/layout/WorkspaceSidebar.tsx src/components/docIntel/DocIntelView.tsx
git commit -m "feat(docIntel): wire Document Intelligence tab into app navigation

Adds 'docIntel' to TabId, ViewRouter case, sidebar nav item with FileSearch
icon. Placeholder view renders centered title."
```

---

### Task 2: Create docIntelStore (Zustand)

**Files:**
- Create: `src/stores/docIntelStore.ts`
- Create: `src/stores/docIntelStore.test.ts`

**Step 1: Write the store test**

Create `src/stores/docIntelStore.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useDocIntelStore } from './docIntelStore';

describe('docIntelStore', () => {
  beforeEach(() => useDocIntelStore.getState().reset());

  it('starts in empty phase', () => {
    expect(useDocIntelStore.getState().phase).toBe('empty');
  });

  it('setDocument transitions to uploaded phase', () => {
    useDocIntelStore.getState().setDocument({
      fileName: 'test.pdf',
      markdown: '# Test',
      outline: [],
      tables: [],
      metadata: { filename: 'test.pdf', pageCount: 1, fileSha256: 'abc' },
    });
    const s = useDocIntelStore.getState();
    expect(s.phase).toBe('uploaded');
    expect(s.fileName).toBe('test.pdf');
    expect(s.documentMarkdown).toBe('# Test');
  });

  it('setLens stores the lens', () => {
    useDocIntelStore.getState().setLens('executive');
    expect(useDocIntelStore.getState().lens).toBe('executive');
  });

  it('startAnalysis sets phase to analyzing and initializes sections', () => {
    useDocIntelStore.getState().startAnalysis();
    const s = useDocIntelStore.getState();
    expect(s.phase).toBe('analyzing');
    expect(s.sections).toHaveLength(4);
    expect(s.sections.every(sec => sec.status === 'generating')).toBe(true);
  });

  it('updateSection sets markdown and status=done', () => {
    useDocIntelStore.getState().startAnalysis();
    useDocIntelStore.getState().updateSection('summary', '# Summary content');
    const sec = useDocIntelStore.getState().sections.find(s => s.id === 'summary');
    expect(sec?.markdown).toBe('# Summary content');
    expect(sec?.status).toBe('done');
  });

  it('updateSection pushes prior content to history', () => {
    useDocIntelStore.getState().startAnalysis();
    useDocIntelStore.getState().updateSection('summary', 'v1');
    useDocIntelStore.getState().updateSection('summary', 'v2');
    const sec = useDocIntelStore.getState().sections.find(s => s.id === 'summary');
    expect(sec?.markdown).toBe('v2');
    expect(sec?.history).toContain('v1');
  });

  it('revertSection pops from history', () => {
    useDocIntelStore.getState().startAnalysis();
    useDocIntelStore.getState().updateSection('summary', 'v1');
    useDocIntelStore.getState().updateSection('summary', 'v2');
    useDocIntelStore.getState().revertSection('summary');
    const sec = useDocIntelStore.getState().sections.find(s => s.id === 'summary');
    expect(sec?.markdown).toBe('v1');
  });

  it('all sections done transitions phase to ready', () => {
    useDocIntelStore.getState().startAnalysis();
    useDocIntelStore.getState().updateSection('summary', 'a');
    useDocIntelStore.getState().updateSection('insights', 'b');
    useDocIntelStore.getState().updateSection('explanations', 'c');
    useDocIntelStore.getState().updateSection('visuals', 'd');
    expect(useDocIntelStore.getState().phase).toBe('ready');
  });

  it('reset clears everything', () => {
    useDocIntelStore.getState().setDocument({
      fileName: 'x.pdf', markdown: 'md', outline: [], tables: [],
      metadata: { filename: 'x.pdf', pageCount: 5, fileSha256: 'sha' },
    });
    useDocIntelStore.getState().reset();
    const s = useDocIntelStore.getState();
    expect(s.phase).toBe('empty');
    expect(s.fileName).toBeNull();
    expect(s.sections).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/docIntelStore.test.ts 2>&1 | tail -5`
Expected: FAIL — module not found.

**Step 3: Implement the store**

Create `src/stores/docIntelStore.ts`:
```typescript
import { create } from 'zustand';

// ─── Types ─────────────────────────────────────────────────

export type LensType = 'executive' | 'technical' | 'legal' | 'financial' | 'operational' | 'risk' | 'summary';

export type SectionKind = 'summary' | 'insights' | 'explanations' | 'visuals';

export interface Section {
  id: string;
  kind: SectionKind;
  label: string;
  markdown: string;
  status: 'idle' | 'generating' | 'done' | 'error';
  history: string[];
  error?: string;
}

export interface OutlineItem {
  level: number;
  text: string;
  page: number;
}

export interface TableItem {
  index: number;
  html: string;
  csv: string;
}

export interface DocMetadata {
  filename: string;
  pageCount: number;
  fileSha256: string;
}

export interface AnalyzeResult {
  fileName: string;
  markdown: string;
  outline: OutlineItem[];
  tables: TableItem[];
  metadata: DocMetadata;
}

const SECTION_DEFS: { id: SectionKind; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'insights', label: 'Key Insights' },
  { id: 'explanations', label: 'Simplified Explanations' },
  { id: 'visuals', label: 'Visuals' },
];

// ─── State ─────────────────────────────────────────────────

interface DocIntelState {
  fileName: string | null;
  documentMarkdown: string | null;
  outline: OutlineItem[];
  tables: TableItem[];
  metadata: DocMetadata | null;
  lens: LensType | null;
  focusContext: string;
  sections: Section[];
  phase: 'empty' | 'uploaded' | 'analyzing' | 'ready' | 'error';

  setDocument: (data: AnalyzeResult) => void;
  setLens: (lens: LensType) => void;
  setFocusContext: (text: string) => void;
  startAnalysis: () => void;
  updateSection: (id: string, markdown: string) => void;
  failSection: (id: string, error: string) => void;
  revertSection: (id: string) => void;
  reset: () => void;
}

// ─── Store ─────────────────────────────────────────────────

export const useDocIntelStore = create<DocIntelState>((set, get) => ({
  fileName: null,
  documentMarkdown: null,
  outline: [],
  tables: [],
  metadata: null,
  lens: null,
  focusContext: '',
  sections: [],
  phase: 'empty',

  setDocument: (data) => set({
    fileName: data.fileName,
    documentMarkdown: data.markdown,
    outline: data.outline,
    tables: data.tables,
    metadata: data.metadata,
    phase: 'uploaded',
  }),

  setLens: (lens) => set({ lens }),
  setFocusContext: (text) => set({ focusContext: text }),

  startAnalysis: () => set({
    phase: 'analyzing',
    sections: SECTION_DEFS.map(({ id, label }) => ({
      id,
      kind: id,
      label,
      markdown: '',
      status: 'generating' as const,
      history: [],
    })),
  }),

  updateSection: (id, markdown) => {
    const sections = get().sections.map((sec) => {
      if (sec.id !== id) return sec;
      const history = sec.markdown ? [...sec.history, sec.markdown] : sec.history;
      return { ...sec, markdown, status: 'done' as const, history, error: undefined };
    });
    const allDone = sections.every((s) => s.status === 'done' || s.status === 'error');
    set({ sections, phase: allDone ? 'ready' : get().phase });
  },

  failSection: (id, error) => {
    const sections = get().sections.map((sec) =>
      sec.id === id ? { ...sec, status: 'error' as const, error } : sec,
    );
    const allDone = sections.every((s) => s.status === 'done' || s.status === 'error');
    set({ sections, phase: allDone ? 'ready' : get().phase });
  },

  revertSection: (id) => {
    const sections = get().sections.map((sec) => {
      if (sec.id !== id || sec.history.length === 0) return sec;
      const history = [...sec.history];
      const previous = history.pop()!;
      return { ...sec, markdown: previous, history };
    });
    set({ sections });
  },

  reset: () => set({
    fileName: null, documentMarkdown: null, outline: [], tables: [],
    metadata: null, lens: null, focusContext: '', sections: [], phase: 'empty',
  }),
}));
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/stores/docIntelStore.test.ts 2>&1 | tail -5`
Expected: All 8 tests PASS.

**Step 5: Commit**

```bash
git add src/stores/docIntelStore.ts src/stores/docIntelStore.test.ts
git commit -m "feat(docIntel): add docIntelStore — sections, lens, document, phase, history

Zustand store managing Doc Intelligence state: document extraction results,
lens selection, 4 analysis sections with per-section regenerate/revert
history, phase machine (empty→uploaded→analyzing→ready→error)."
```

---

## Phase 2 — Empty State + Upload

### Task 3: DocIntelEmptyState (lens chips + drop zone)

**Files:**
- Create: `src/components/docIntel/DocIntelEmptyState.tsx`
- Modify: `src/components/docIntel/DocIntelView.tsx`

**Step 1: Create the empty state component**

Create `src/components/docIntel/DocIntelEmptyState.tsx`:
```tsx
import { useRef, useState } from 'react';
import { Upload } from '@phosphor-icons/react';
import { useDocIntelStore } from '@/stores/docIntelStore';
import type { LensType } from '@/stores/docIntelStore';
import { ALLOWED_UPLOAD_EXTENSIONS, MAX_UPLOAD_MB } from '@/services/docmining/docminingClient';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

const LENSES: { id: LensType; label: string }[] = [
  { id: 'executive', label: 'Executive Brief' },
  { id: 'technical', label: 'Technical Breakdown' },
  { id: 'legal', label: 'Legal Review' },
  { id: 'financial', label: 'Financial Digest' },
  { id: 'operational', label: 'Operational Guide' },
  { id: 'risk', label: 'Risk Assessment' },
  { id: 'summary', label: 'Summary Only' },
];

interface Props {
  onFileSelected: (file: File) => void;
}

export function DocIntelEmptyState({ onFileSelected }: Props) {
  const lens = useDocIntelStore((s) => s.lens);
  const setLens = useDocIntelStore((s) => s.setLens);
  const focusContext = useDocIntelStore((s) => s.focusContext);
  const setFocusContext = useDocIntelStore((s) => s.setFocusContext);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFileSelected(f);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', padding: 48,
      fontFamily: F, animation: 'ubsFade .4s ease',
    }}>
      {/* Impulse line + headline */}
      <div style={{
        borderLeft: '4px solid var(--col-background-brand)',
        paddingLeft: 20, marginBottom: 32,
      }}>
        <div style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--col-text-primary)', lineHeight: 1.3 }}>
          Analyze your document
        </div>
        <p style={{ fontSize: 14, color: 'var(--col-text-subtle)', fontWeight: 300, lineHeight: 1.6, maxWidth: 400, marginTop: 8 }}>
          Upload a document, choose an analysis lens, and get an editable breakdown in seconds.
        </p>
      </div>

      {/* Lens chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 24 }}>
        {LENSES.map((l) => (
          <button key={l.id} onClick={() => setLens(l.id)}
            style={{
              padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontFamily: F, fontSize: 13, fontWeight: 500,
              border: lens === l.id ? '2px solid var(--col-background-brand)' : '1px solid var(--col-border-illustrative)',
              background: lens === l.id ? '#FEF2F2' : '#fff',
              color: lens === l.id ? 'var(--col-background-brand)' : 'var(--col-text-primary)',
              transition: 'all 0.15s',
            }}>
            {l.label}
          </button>
        ))}
      </div>

      {/* Focus context textarea */}
      <textarea
        value={focusContext}
        onChange={(e) => setFocusContext(e.target.value)}
        placeholder="What should we focus on? (optional)"
        rows={2}
        style={{
          width: '100%', maxWidth: 480, padding: 12, borderRadius: 6, fontFamily: F, fontSize: 13,
          border: '1px solid var(--col-border-illustrative)', resize: 'vertical', marginBottom: 24,
        }}
      />

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragOver ? '#E60000' : '#d1d5db'}`,
          borderRadius: 8, padding: 40, textAlign: 'center', cursor: 'pointer',
          backgroundColor: dragOver ? '#fef2f2' : '#fafafa', transition: 'all 0.15s',
          width: '100%', maxWidth: 480,
        }}
      >
        <Upload size={40} color="#6b7280" />
        <div style={{ marginTop: 12, fontSize: 14, color: '#374151' }}>Click or drag a file here</div>
        <div style={{ marginTop: 4, fontSize: 12, color: '#9ca3af' }}>
          PDF, DOCX, PPTX, XLSX, HTML, images — up to {MAX_UPLOAD_MB} MB
        </div>
        <input ref={inputRef} type="file" accept={ALLOWED_UPLOAD_EXTENSIONS.join(',')}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelected(f); }}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}
```

**Step 2: Update DocIntelView to show empty state or workspace**

Replace `src/components/docIntel/DocIntelView.tsx`:
```tsx
import { useDocIntelStore } from '@/stores/docIntelStore';
import { DocIntelEmptyState } from './DocIntelEmptyState';

export default function DocIntelView() {
  const phase = useDocIntelStore((s) => s.phase);

  const handleFileSelected = (file: File) => {
    // Upload + analyze orchestration will be wired in Task 5
    console.log('File selected:', file.name);
  };

  if (phase === 'empty') {
    return <DocIntelEmptyState onFileSelected={handleFileSelected} />;
  }

  return <div data-testid="docintel-workspace">Workspace placeholder — phase: {phase}</div>;
}
```

**Step 3: Run tests and verify TypeScript**

Run: `npx vitest run src/components/layout/ && npx tsc -b --noEmit 2>&1 | grep docIntel`
Expected: Pass, zero TS errors in docIntel files.

**Step 4: Commit**

```bash
git add src/components/docIntel/
git commit -m "feat(docIntel): add empty state with lens chips, focus textarea, and drop zone

Mirrors EditorPane empty state: impulse line, headline, 7 lens chips
(executive/technical/legal/financial/operational/risk/summary), focus
context textarea, and drag-and-drop file upload zone."
```

---

### Task 4: docIntelClient — API client for /analyze endpoint

**Files:**
- Create: `src/services/docIntel/docIntelClient.ts`
- Create: `src/services/docIntel/docIntelClient.test.ts`

**Step 1: Write the client test**

Create `src/services/docIntel/docIntelClient.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeDocument } from './docIntelClient';

describe('docIntelClient', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('sends file via FormData and returns enriched result on success', async () => {
    const mockResponse = {
      status: 'success', markdown: '# Test', pages: 5, duration_ms: 3000,
      file_name: 'test.pdf', file_size: 1024, file_sha256: 'abc',
      outline: [{ level: 1, text: 'Intro', page: 1 }],
      tables: [{ index: 0, html: '<table></table>', csv: 'a,b' }],
      metadata: { filename: 'test.pdf', page_count: 5, binary_hash: 'abc' },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    );

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const result = await analyzeDocument(file);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.markdown).toBe('# Test');
      expect(result.data.outline).toHaveLength(1);
      expect(result.data.tables).toHaveLength(1);
      expect(result.data.metadata.pageCount).toBe(5);
    }
  });

  it('returns error on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'File too large' }), { status: 413 }),
    );

    const file = new File(['x'], 'big.pdf', { type: 'application/pdf' });
    const result = await analyzeDocument(file);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('413');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/docIntel/docIntelClient.test.ts 2>&1 | tail -5`
Expected: FAIL — module not found.

**Step 3: Implement the client**

Create `src/services/docIntel/docIntelClient.ts`:
```typescript
import type { OutlineItem, TableItem, DocMetadata } from '@/stores/docIntelStore';

export interface AnalyzeData {
  markdown: string;
  fileName: string;
  pages: number;
  durationMs: number;
  outline: OutlineItem[];
  tables: TableItem[];
  metadata: DocMetadata;
}

export type AnalyzeOutcome =
  | { ok: true; data: AnalyzeData }
  | { ok: false; error: string };

export async function analyzeDocument(file: File, signal?: AbortSignal): Promise<AnalyzeOutcome> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('include_markdown', 'true');

  try {
    const res = await fetch('/api/docmining/analyze', {
      method: 'POST',
      body: fd,
      signal,
    });

    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        if (typeof body?.detail === 'string') detail = body.detail;
      } catch { /* ignore */ }
      return { ok: false, error: detail };
    }

    const json = await res.json();
    return {
      ok: true,
      data: {
        markdown: json.markdown ?? '',
        fileName: json.file_name,
        pages: json.pages,
        durationMs: json.duration_ms,
        outline: (json.outline ?? []).map((o: any) => ({
          level: o.level, text: o.text, page: o.page,
        })),
        tables: (json.tables ?? []).map((t: any) => ({
          index: t.index, html: t.html, csv: t.csv,
        })),
        metadata: {
          filename: json.metadata?.filename ?? json.file_name,
          pageCount: json.metadata?.page_count ?? json.pages,
          fileSha256: json.metadata?.binary_hash ?? json.file_sha256,
        },
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/docIntel/docIntelClient.test.ts 2>&1 | tail -5`
Expected: 2 tests PASS.

**Step 5: Commit**

```bash
git add src/services/docIntel/
git commit -m "feat(docIntel): add docIntelClient — API client for /analyze endpoint

Calls POST /api/docmining/analyze, returns enriched extraction result
with outline, tables, and metadata alongside markdown. Discriminated
union outcome type for error handling."
```

---

### Task 5: analyzeAction — orchestrates upload + 3 parallel AI calls

**Files:**
- Create: `src/services/docIntel/lensPrompts.ts`
- Create: `src/services/docIntel/analyzeAction.ts`

**Step 1: Create lens prompt templates**

Create `src/services/docIntel/lensPrompts.ts`:
```typescript
import type { LensType } from '@/stores/docIntelStore';

const LENS_SYSTEM_PROMPTS: Record<LensType, string> = {
  executive: 'You are a senior strategy analyst preparing an executive briefing. Write for C-suite: focus on business impact, strategic alignment, and decisions needed. Use confident, concise language. No technical jargon.',
  technical: 'You are a principal engineer performing a technical review. Focus on architecture, implementation details, dependencies, risks, and technical debt. Be precise and specific.',
  legal: 'You are a legal analyst reviewing a document for compliance, liability, and regulatory implications. Flag obligations, risks, and ambiguous language. Cite specific sections.',
  financial: 'You are a financial analyst extracting financial implications. Focus on costs, revenue impact, ROI, budget requirements, and financial risks. Use concrete numbers where available.',
  operational: 'You are an operations manager creating an operational guide. Focus on processes, workflows, resource requirements, timelines, and operational risks. Be actionable.',
  risk: 'You are a risk analyst performing a comprehensive risk assessment. Identify, categorize, and prioritize risks. Include likelihood, impact, and mitigation strategies.',
  summary: 'You are a technical writer creating a comprehensive summary. Cover all key points concisely. Be neutral and factual.',
};

export function getLensSystemPrompt(lens: LensType, focusContext: string): string {
  const base = LENS_SYSTEM_PROMPTS[lens];
  const focus = focusContext.trim()
    ? `\n\nUSER FOCUS: The user has asked you to focus on: "${focusContext.trim()}". Prioritize this in your analysis.`
    : '';
  return `${base}${focus}

BREVITY RULES:
- No preamble. No postamble. Lead with the answer.
- Every sentence must add information. Cut filler.
- Prefer active voice. No marketing adjectives.`;
}

export function buildSummaryPrompt(docContext: string): string {
  return `Analyze this document and produce a structured summary.

<document>
${docContext}
</document>

Respond with JSON matching this exact schema:
\`\`\`json
{
  "title": "string — concise document title (5-10 words)",
  "oneLineSummary": "string — one sentence capturing the core message",
  "executiveSummaryMd": "string — 150-250 word markdown overview",
  "audienceBriefMd": "string — 100-200 word markdown rewrite tuned to the analysis lens"
}
\`\`\``;
}

export function buildInsightsPrompt(docContext: string): string {
  return `Extract key insights, simplified explanations, and risks from this document.

<document>
${docContext}
</document>

Respond with JSON matching this exact schema:
\`\`\`json
{
  "keyInsights": [
    { "heading": "string", "bodyMd": "string — 2-3 sentence markdown", "severity": "high | medium | low" }
  ],
  "simplifiedExplanations": [
    { "term": "string — complex concept from the document", "plainMd": "string — plain-language explanation" }
  ],
  "risks": [
    { "descriptionMd": "string", "likelihood": "high | medium | low", "impact": "high | medium | low" }
  ]
}
\`\`\`
Return 3-7 insights, 3-5 explanations, and 2-5 risks.`;
}

export function buildVisualsPrompt(docContext: string): string {
  return `Generate Mermaid diagrams that visualize the key structures and flows in this document.

<document>
${docContext}
</document>

Respond with JSON matching this exact schema:
\`\`\`json
{
  "diagrams": [
    {
      "title": "string — descriptive diagram title",
      "kind": "flowchart | sequenceDiagram | classDiagram | stateDiagram-v2 | erDiagram | gantt | mindmap",
      "mermaidSource": "string — valid Mermaid syntax",
      "caption": "string — one-sentence description of what the diagram shows"
    }
  ]
}
\`\`\`
Generate 1-3 diagrams. Use flowchart for system architecture, sequenceDiagram for processes.
For flowchart/graph ONLY: use classDef for semantic colors. For all other types: do NOT use classDef or linkStyle.`;
}
```

**Step 2: Create the analyze action**

Create `src/services/docIntel/analyzeAction.ts`:
```typescript
import { useDocIntelStore } from '@/stores/docIntelStore';
import { useConfigStore } from '@/stores/configStore';
import { useUiStore } from '@/stores/uiStore';
import { isAIEnabled, callAI } from '@/services/ai/aiClient';
import { analyzeDocument as callAnalyzeAPI } from './docIntelClient';
import { getLensSystemPrompt, buildSummaryPrompt, buildInsightsPrompt, buildVisualsPrompt } from './lensPrompts';
import type { AIClientConfig } from '@/services/ai/types';

function parseJSON(raw: string): any {
  try { return JSON.parse(raw); } catch { /* try markdown fence */ }
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match?.[1]) try { return JSON.parse(match[1]); } catch { /* fall through */ }
  return null;
}

function formatSummary(parsed: any): string {
  if (!parsed) return '_Analysis failed — try regenerating._';
  return [
    `# ${parsed.title ?? 'Document Analysis'}`,
    '',
    `> ${parsed.oneLineSummary ?? ''}`,
    '',
    parsed.executiveSummaryMd ?? '',
    '',
    '---',
    '',
    '## Audience Brief',
    '',
    parsed.audienceBriefMd ?? '',
  ].join('\n');
}

function formatInsights(parsed: any): string {
  if (!parsed) return '_Analysis failed — try regenerating._';
  const parts: string[] = ['## Key Insights', ''];
  for (const i of parsed.keyInsights ?? []) {
    parts.push(`### ${i.heading}`, '', i.bodyMd ?? '', '');
  }
  parts.push('---', '', '## Simplified Explanations', '');
  for (const e of parsed.simplifiedExplanations ?? []) {
    parts.push(`**${e.term}:** ${e.plainMd ?? ''}`, '');
  }
  parts.push('---', '', '## Risks', '');
  for (const r of parsed.risks ?? []) {
    parts.push(`- **[${r.likelihood}/${r.impact}]** ${r.descriptionMd ?? ''}`, '');
  }
  return parts.join('\n');
}

function formatVisuals(parsed: any): string {
  if (!parsed?.diagrams?.length) return '_No diagrams generated — try regenerating._';
  const parts: string[] = [];
  for (const d of parsed.diagrams) {
    parts.push(`### ${d.title ?? 'Diagram'}`, '', '```mermaid', d.mermaidSource ?? '', '```', '');
    if (d.caption) parts.push(`_${d.caption}_`, '');
  }
  return parts.join('\n');
}

export async function runDocIntelAnalysis(file: File): Promise<void> {
  const store = useDocIntelStore.getState();
  const cfg = useConfigStore.getState().config;
  const addToast = useUiStore.getState().addToast;

  if (!isAIEnabled(cfg)) {
    addToast({ type: 'error', title: 'No AI provider configured. Open Settings.' });
    return;
  }

  const lens = store.lens ?? 'summary';
  const focusContext = store.focusContext;

  // Step 1: Upload + extract via backend
  const uploadResult = await callAnalyzeAPI(file);
  if (!uploadResult.ok) {
    addToast({ type: 'error', title: `Upload failed: ${uploadResult.error}` });
    return;
  }

  store.setDocument({
    fileName: uploadResult.data.fileName,
    markdown: uploadResult.data.markdown,
    outline: uploadResult.data.outline,
    tables: uploadResult.data.tables,
    metadata: uploadResult.data.metadata,
  });

  // Step 2: Fire 3 parallel AI calls
  store.startAnalysis();

  const aiConfig: AIClientConfig = {
    provider: cfg.ai.provider,
    azure: cfg.ai.azure,
    openai: cfg.ai.openai,
    endpoints: cfg.endpoints,
  };

  const systemPrompt = getLensSystemPrompt(lens, focusContext);
  const docContext = uploadResult.data.markdown;

  const calls = [
    { id: 'summary', prompt: buildSummaryPrompt(docContext), format: formatSummary },
    { id: 'insights', prompt: buildInsightsPrompt(docContext), format: formatInsights },
    { id: 'visuals', prompt: buildVisualsPrompt(docContext), format: formatVisuals },
  ] as const;

  const results = await Promise.allSettled(
    calls.map(async ({ id, prompt, format }) => {
      try {
        const response = await callAI(aiConfig, { systemPrompt, userPrompt: prompt });
        const parsed = parseJSON(response.content);
        const markdown = format(parsed);
        store.updateSection(id, markdown);
      } catch (e) {
        store.failSection(id, e instanceof Error ? e.message : 'AI call failed');
      }
    }),
  );

  // Explanations section = subset of insights (already included)
  // Set explanations to done with extracted content
  const insightsSec = useDocIntelStore.getState().sections.find(s => s.id === 'insights');
  if (insightsSec?.status === 'done') {
    store.updateSection('explanations', insightsSec.markdown);
  } else {
    store.failSection('explanations', 'Insights call failed — explanations unavailable');
  }
}

export async function regenerateSection(sectionId: string): Promise<void> {
  const store = useDocIntelStore.getState();
  const cfg = useConfigStore.getState().config;
  const docMarkdown = store.documentMarkdown;
  if (!docMarkdown) return;

  const lens = store.lens ?? 'summary';
  const systemPrompt = getLensSystemPrompt(lens, store.focusContext);
  const aiConfig: AIClientConfig = {
    provider: cfg.ai.provider, azure: cfg.ai.azure,
    openai: cfg.ai.openai, endpoints: cfg.endpoints,
  };

  const prompts: Record<string, { prompt: string; format: (p: any) => string }> = {
    summary: { prompt: buildSummaryPrompt(docMarkdown), format: formatSummary },
    insights: { prompt: buildInsightsPrompt(docMarkdown), format: formatInsights },
    explanations: { prompt: buildInsightsPrompt(docMarkdown), format: formatInsights },
    visuals: { prompt: buildVisualsPrompt(docMarkdown), format: formatVisuals },
  };

  const entry = prompts[sectionId];
  if (!entry) return;

  // Mark generating
  const sections = store.sections.map(s =>
    s.id === sectionId ? { ...s, status: 'generating' as const } : s,
  );
  useDocIntelStore.setState({ sections });

  try {
    const response = await callAI(aiConfig, { systemPrompt, userPrompt: entry.prompt });
    const parsed = parseJSON(response.content);
    store.updateSection(sectionId, entry.format(parsed));
  } catch (e) {
    store.failSection(sectionId, e instanceof Error ? e.message : 'Regeneration failed');
  }
}
```

**Step 3: Run TypeScript check**

Run: `npx tsc -b --noEmit 2>&1 | grep docIntel`
Expected: Zero errors.

**Step 4: Commit**

```bash
git add src/services/docIntel/lensPrompts.ts src/services/docIntel/analyzeAction.ts
git commit -m "feat(docIntel): add analyzeAction — upload + 3 parallel AI calls

Orchestrates: upload file via /analyze API → setDocument → startAnalysis →
3 parallel callAI (summary, insights, visuals) → updateSection per result.
7 lens system-prompt variants. Per-section regenerate support."
```

---

## Phase 3 — Workspace UI (section cards + BlockNote)

### Task 6: Install BlockNote dependencies

**Step 1: Install packages**

Run: `npm install @blocknote/core @blocknote/react @blocknote/mantine @mantine/core`

**Step 2: Verify install**

Run: `node -e "require('@blocknote/react'); console.log('BlockNote OK')"`
Expected: `BlockNote OK`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add BlockNote dependencies for Doc Intelligence editor"
```

---

### Task 7: SectionCard (BlockNote editor + regenerate + revert)

**Files:**
- Create: `src/components/docIntel/SectionCard.tsx`

**Step 1: Create the component**

Create `src/components/docIntel/SectionCard.tsx`:
```tsx
import { useCallback } from 'react';
import { ArrowCounterClockwise, ArrowsClockwise, Spinner } from '@phosphor-icons/react';
import { useDocIntelStore } from '@/stores/docIntelStore';
import type { Section } from '@/stores/docIntelStore';
import { regenerateSection } from '@/services/docIntel/analyzeAction';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

const SECTION_ICONS: Record<string, string> = {
  summary: '📋', insights: '💡', explanations: '📖', visuals: '📊',
};

interface Props {
  section: Section;
}

export function SectionCard({ section }: Props) {
  const updateSection = useDocIntelStore((s) => s.updateSection);
  const revertSection = useDocIntelStore((s) => s.revertSection);

  const handleRegenerate = useCallback(() => {
    regenerateSection(section.id);
  }, [section.id]);

  const handleRevert = useCallback(() => {
    revertSection(section.id);
  }, [section.id, revertSection]);

  const isGenerating = section.status === 'generating';
  const canRevert = section.history.length > 0;

  return (
    <div style={{
      border: '1px solid var(--col-border-illustrative)',
      borderRadius: 8, marginBottom: 16, overflow: 'hidden',
      background: '#fff',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid var(--col-border-illustrative)',
        background: '#fafafa',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: F }}>
          <span>{SECTION_ICONS[section.id] ?? '📄'}</span>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{section.label}</span>
          {isGenerating && <Spinner size={14} className="animate-spin" />}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={handleRevert} disabled={!canRevert || isGenerating}
            title="Revert to previous version"
            style={{
              padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db',
              background: '#fff', cursor: canRevert && !isGenerating ? 'pointer' : 'not-allowed',
              opacity: canRevert && !isGenerating ? 1 : 0.4, display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: F, fontSize: 12,
            }}>
            <ArrowCounterClockwise size={12} /> Revert
          </button>
          <button onClick={handleRegenerate} disabled={isGenerating}
            title="Regenerate this section"
            style={{
              padding: '4px 8px', borderRadius: 4, border: 'none',
              background: isGenerating ? '#fca5a5' : 'var(--col-background-brand)',
              color: '#fff', cursor: isGenerating ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: F, fontSize: 12, fontWeight: 500,
            }}>
            <ArrowsClockwise size={12} /> {isGenerating ? 'Generating...' : 'Regenerate'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 16, fontFamily: F, fontSize: 14, lineHeight: 1.6 }}>
        {isGenerating ? (
          <div style={{ color: 'var(--col-text-subtle)', fontStyle: 'italic' }}>
            Analyzing document...
          </div>
        ) : section.status === 'error' ? (
          <div style={{ color: '#991b1b', padding: 12, background: '#fef2f2', borderRadius: 6 }}>
            {section.error ?? 'Analysis failed'}
          </div>
        ) : (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {section.markdown}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Note:** Phase 1 uses ReactMarkdown for rendering. BlockNote editing will be integrated in Task 9 once the walking skeleton works end-to-end.

**Step 2: Commit**

```bash
git add src/components/docIntel/SectionCard.tsx
git commit -m "feat(docIntel): add SectionCard — section header + markdown rendering + regenerate/revert

Per-section card with header (icon, label, status), Regenerate button
(fires regenerateSection), Revert button (pops history), and markdown
content rendering via ReactMarkdown. BlockNote upgrade in Task 9."
```

---

### Task 8: DocIntelWorkspace + wire full flow

**Files:**
- Create: `src/components/docIntel/DocIntelHeader.tsx`
- Create: `src/components/docIntel/DocIntelWorkspace.tsx`
- Create: `src/components/docIntel/ExportBar.tsx`
- Modify: `src/components/docIntel/DocIntelView.tsx`

**Step 1: Create DocIntelHeader**

Create `src/components/docIntel/DocIntelHeader.tsx`:
```tsx
import { useDocIntelStore } from '@/stores/docIntelStore';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

const LENS_LABELS: Record<string, string> = {
  executive: 'Executive Brief', technical: 'Technical', legal: 'Legal',
  financial: 'Financial', operational: 'Operational', risk: 'Risk', summary: 'Summary',
};

export function DocIntelHeader() {
  const fileName = useDocIntelStore((s) => s.fileName);
  const lens = useDocIntelStore((s) => s.lens);
  const reset = useDocIntelStore((s) => s.reset);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 20px', background: '#1a1a1a', fontFamily: F,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>
          {fileName ?? 'Document'}
        </span>
        {lens && (
          <span style={{
            fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 4,
            background: 'var(--col-background-brand)', color: '#fff',
          }}>
            {LENS_LABELS[lens] ?? lens}
          </span>
        )}
      </div>
      <button onClick={reset} style={{
        padding: '6px 12px', borderRadius: 4, border: '1px solid #555',
        background: 'transparent', color: '#aaa', cursor: 'pointer',
        fontFamily: F, fontSize: 12,
      }}>
        New Analysis
      </button>
    </div>
  );
}
```

**Step 2: Create ExportBar**

Create `src/components/docIntel/ExportBar.tsx`:
```tsx
import { DownloadSimple } from '@phosphor-icons/react';
import { useDocIntelStore } from '@/stores/docIntelStore';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function ExportBar() {
  const sections = useDocIntelStore((s) => s.sections);
  const fileName = useDocIntelStore((s) => s.fileName);

  const handleDownloadMd = () => {
    const md = sections
      .filter((s) => s.status === 'done')
      .map((s) => s.markdown)
      .join('\n\n---\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(fileName ?? 'analysis').replace(/\.[^.]+$/, '')}-analysis.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      display: 'flex', gap: 8, padding: '16px 0', borderTop: '1px solid var(--col-border-illustrative)',
      marginTop: 16,
    }}>
      <button onClick={handleDownloadMd} style={{
        padding: '8px 14px', borderRadius: 6, border: '1px solid #d1d5db',
        background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        fontFamily: F, fontSize: 13,
      }}>
        <DownloadSimple size={16} /> Download Markdown
      </button>
      {/* DOCX/PDF export and GitLab publish buttons added in later tasks */}
    </div>
  );
}
```

**Step 3: Create DocIntelWorkspace**

Create `src/components/docIntel/DocIntelWorkspace.tsx`:
```tsx
import { useDocIntelStore } from '@/stores/docIntelStore';
import { DocIntelHeader } from './DocIntelHeader';
import { SectionCard } from './SectionCard';
import { ExportBar } from './ExportBar';

export function DocIntelWorkspace() {
  const sections = useDocIntelStore((s) => s.sections);
  const phase = useDocIntelStore((s) => s.phase);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <DocIntelHeader />
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {sections.map((sec) => (
          <SectionCard key={sec.id} section={sec} />
        ))}
        {phase === 'ready' && <ExportBar />}
      </div>
    </div>
  );
}
```

**Step 4: Wire DocIntelView with the full flow**

Replace `src/components/docIntel/DocIntelView.tsx`:
```tsx
import { useState } from 'react';
import { Spinner } from '@phosphor-icons/react';
import { useDocIntelStore } from '@/stores/docIntelStore';
import { DocIntelEmptyState } from './DocIntelEmptyState';
import { DocIntelWorkspace } from './DocIntelWorkspace';
import { runDocIntelAnalysis } from '@/services/docIntel/analyzeAction';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export default function DocIntelView() {
  const phase = useDocIntelStore((s) => s.phase);
  const [uploading, setUploading] = useState(false);

  const handleFileSelected = async (file: File) => {
    setUploading(true);
    await runDocIntelAnalysis(file);
    setUploading(false);
  };

  if (phase === 'empty' && !uploading) {
    return <DocIntelEmptyState onFileSelected={handleFileSelected} />;
  }

  if (uploading || phase === 'analyzing') {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', fontFamily: F, gap: 16,
      }}>
        <Spinner size={32} className="animate-spin" color="var(--col-background-brand)" />
        <span style={{ fontSize: 14, color: 'var(--col-text-subtle)' }}>
          {phase === 'analyzing' ? 'Analyzing document...' : 'Uploading and extracting...'}
        </span>
      </div>
    );
  }

  return <DocIntelWorkspace />;
}
```

**Step 5: Run tests + TypeScript check**

Run: `npx vitest run src/components/layout/ src/stores/docIntelStore.test.ts && npx tsc -b --noEmit 2>&1 | grep docIntel`
Expected: All pass, zero TS errors in docIntel files.

**Step 6: Commit**

```bash
git add src/components/docIntel/
git commit -m "feat(docIntel): add workspace UI — header, section cards, export bar, full flow

DocIntelHeader (dark, filename + lens badge + New Analysis button),
SectionCard x4 with ReactMarkdown rendering, ExportBar with Download MD,
DocIntelWorkspace assembles the layout, DocIntelView orchestrates phases
(empty → uploading → analyzing → ready). Full upload → analyze → view
→ download flow working end-to-end."
```

---

## Phase 4 — Backend + BlockNote + Export + GitLab

### Task 9: Upgrade SectionCard to BlockNote editing

This task replaces ReactMarkdown with BlockNote for inline editing in each section card. Requires Task 6 (BlockNote installed).

**Files:**
- Modify: `src/components/docIntel/SectionCard.tsx`

**Step 1: Replace ReactMarkdown with BlockNote**

Update `SectionCard.tsx` — replace the ReactMarkdown rendering in the content area with a BlockNote editor that imports/exports markdown. The key pattern:

```tsx
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';

// Inside the component:
const editor = useCreateBlockNote({
  initialContent: undefined, // will be set from markdown
});

// On section.markdown change, import markdown into editor
useEffect(() => {
  if (section.markdown && editor) {
    const blocks = await editor.tryParseMarkdownToBlocks(section.markdown);
    editor.replaceBlocks(editor.document, blocks);
  }
}, [section.markdown]);

// On editor change, export to markdown and update store
const handleChange = useCallback(async () => {
  const md = await editor.blocksToMarkdownLossy(editor.document);
  updateSection(section.id, md);
}, [editor, section.id, updateSection]);
```

Wrap in `<BlockNoteView editor={editor} onChange={handleChange} theme="light" />`.

**Step 2: Verify rendering**

Run: `npm run dev` → navigate to Doc Intelligence → upload a document → verify sections render in BlockNote with editable content.

**Step 3: Commit**

```bash
git add src/components/docIntel/SectionCard.tsx
git commit -m "feat(docIntel): upgrade SectionCard to BlockNote inline editing

Replaces ReactMarkdown with BlockNote editor per section. Markdown
imported on analysis completion, exported on edit. Regenerate/revert
preserved — BlockNote re-imports on markdown change."
```

---

### Task 10: Backend /analyze endpoint

**Files:**
- Modify: `backend/docmining/app/api/v1/documents.py`

**Step 1: Add /analyze endpoint**

Add a new route alongside the existing `/convert` endpoint. It reuses the same `convert_sync` + `_stream_to_tempfile` logic but returns enriched output with outline, tables, and metadata:

```python
@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_document(
    request: Request, background: BackgroundTasks,
    file: Annotated[UploadFile, File()],
    settings: Settings = Depends(get_settings),
    converter: DocumentConverter = Depends(get_converter),
    executor: ThreadPoolExecutor = Depends(get_executor),
) -> AnalyzeResponse:
    # Same upload/validate/convert as /convert
    # But also extract: outline (section headers), tables (html+csv), metadata
```

Add `AnalyzeResponse` Pydantic model with the extra fields.

**Step 2: Add Vite proxy**

In `vite.config.ts`, add proxy for `/api/docmining/analyze` (should already work with the existing `/api/docmining` wildcard rewrite).

**Step 3: Run backend tests**

Run: `cd backend/docmining && source .venv/bin/activate && pytest -q`
Expected: All pass.

**Step 4: Commit**

```bash
git add backend/docmining/app/api/v1/documents.py
git commit -m "feat(docmining): add /analyze endpoint — enriched extraction with outline, tables, metadata

New POST /api/v1/documents/analyze returns markdown + outline (section
headers with level/text/page), tables (html+csv per table), and metadata
(filename, page_count, file_sha256). Existing /convert untouched."
```

---

### Task 11: Export microservice scaffold

**Files:**
- Create: `backend/export/pyproject.toml`
- Create: `backend/export/app/__init__.py`
- Create: `backend/export/app/main.py`
- Create: `backend/export/app/api/__init__.py`
- Create: `backend/export/app/api/v1/__init__.py`
- Create: `backend/export/app/api/v1/export.py`
- Create: `backend/export/Dockerfile`

**Step 1: Create pyproject.toml**

```toml
[project]
name = "frame-export"
version = "0.1.0"
requires-python = ">=3.11,<3.13"
dependencies = [
  "fastapi>=0.115,<0.120",
  "uvicorn[standard]>=0.32",
  "pydantic>=2.9,<3",
  "weasyprint>=62",
  "cairosvg>=2.7",
  "markdown>=3.6",
  "python-multipart>=0.0.12",
]
```

**Step 2: Create main.py + export endpoint**

The endpoint accepts `{ format, markdown, title }` and returns a file stream.

**Step 3: Create Dockerfile**

Alpine-based with Pandoc static binary + WeasyPrint Cairo deps.

**Step 4: Add Vite proxy**

Add `/api/export` proxy entry in `vite.config.ts`.

**Step 5: Commit**

```bash
git add backend/export/ vite.config.ts
git commit -m "feat(export): scaffold export microservice — Pandoc DOCX + WeasyPrint PDF

New FastAPI service at backend/export/. POST /api/v1/export accepts
markdown + format (docx|pdf), returns file bytes. DOCX via pandoc with
UBS reference template. PDF via WeasyPrint. Alpine Dockerfile."
```

---

### Task 12: PublishToGitLabDialog + wire export buttons

**Files:**
- Create: `src/components/docIntel/PublishToGitLabDialog.tsx`
- Modify: `src/components/docIntel/ExportBar.tsx`

**Step 1: Create PublishToGitLabDialog**

Form with: repo URL input, branch dropdown (fetched), file path (default: `docs/intel/{slug}.md`), commit message, MR checkbox. Reuses `commitToGitLabBranch` / `publishWithMergeRequest`.

**Step 2: Wire export buttons in ExportBar**

Add DOCX, PDF, and Publish to GitLab buttons alongside the existing Download MD button.

**Step 3: Commit**

```bash
git add src/components/docIntel/PublishToGitLabDialog.tsx src/components/docIntel/ExportBar.tsx
git commit -m "feat(docIntel): add GitLab publish dialog + DOCX/PDF export buttons

PublishToGitLabDialog: repo URL, branch dropdown, file path, commit msg,
MR checkbox. ExportBar: Download MD, Export DOCX, Export PDF, Publish to
GitLab. DOCX/PDF call export microservice with Mermaid pre-rendered as
SVG data URIs."
```

---

## Execution Order Summary

```
Phase 1 — Tab Wiring + Store
  Task 1:  Wire docIntel tab (uiStore, ViewRouter, Sidebar)
  Task 2:  Create docIntelStore (Zustand)

Phase 2 — Empty State + Upload
  Task 3:  DocIntelEmptyState (lens chips + drop zone)
  Task 4:  docIntelClient (API client for /analyze)
  Task 5:  analyzeAction (upload + 3 parallel AI calls)

Phase 3 — Workspace UI
  Task 6:  Install BlockNote dependencies
  Task 7:  SectionCard (markdown rendering + regenerate/revert)
  Task 8:  DocIntelWorkspace + wire full flow

Phase 4 — Backend + Editing + Export + GitLab
  Task 9:  Upgrade SectionCard to BlockNote editing
  Task 10: Backend /analyze endpoint
  Task 11: Export microservice scaffold
  Task 12: PublishToGitLabDialog + export buttons
```

**Total: 12 tasks, ~20 new files, 3 modified files. No stage/orchestrator/WelcomeScreen edits.**
