# V5 Bug Fixes & Missing Features — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 5 reported issues — 1 confirmed bug, 2 missing features, 2 feature gaps.

**Architecture:** Surgical edits to existing files. No new stores or major refactors. Custom issue creation is the largest change (new AI function + modal UI additions).

**Tech Stack:** React 19, Zustand, Mermaid v11, Phosphor Icons, Vite, Vitest

---

## Priority Order

| # | Issue | Type | Est. Time | Files |
|---|-------|------|-----------|-------|
| 1 | White text on white background (Mermaid) | Bug fix | 15 min | 2 files |
| 2 | Markdown download missing | Missing feature | 30 min | 1 file + 1 test |
| 3 | Diagram node limits per complexity | Feature gap | 45 min | 2 files + 1 test |
| 4 | Diagram version naming (v1, v2, v1-simplify) | Feature gap | 30 min | 1 file + 1 test |
| 5 | Custom issue creation (V4 port) | Missing feature | 2-3 hrs | 3 new files + 2 edits |

---

## Task 1: Fix Mermaid White-on-White Text Bug

**Severity:** High — renders diagram text invisible

**Root cause:** `primaryTextColor` and `secondaryTextColor` are `#ffffff` (white), but some Mermaid nodes render on `mainBkg: #FAFAFA` (near-white) instead of the primary/secondary fill color.

**Files:**
- Modify: `src/pipeline/stages/runStage5Mandatory.ts:551-569`
- Modify: `src/actions/regenerateBlueprintAction.ts:18-36`

**Step 1: Write the failing test**

No test needed — this is a CSS/theme variable fix. Visual verification required.

**Step 2: Fix theme variables in runStage5Mandatory.ts**

In `applyDiagramTheme()` function (line 548), change the `themeInit` string:

```typescript
// BEFORE (broken):
'primaryTextColor': '#ffffff',
'secondaryTextColor': '#ffffff',

// AFTER (fixed):
'primaryTextColor': '#1F2937',
'secondaryTextColor': '#1F2937',
```

The primary/secondary fill colors (#0072B2 blue, #56B4E9 light blue) are already set — Mermaid applies `primaryColor` as the node background. But when nodes DON'T get the fill (default nodes, edge labels, subgraph titles), the text color falls back to `primaryTextColor`. Dark text (#1F2937) is readable on both blue fills AND white backgrounds.

**Step 3: Apply identical fix in regenerateBlueprintAction.ts**

Same changes in the duplicate `applyDiagramTheme()` at lines 18-36.

**Step 4: Verify**

Run the app, generate or view any diagram. Text in ALL node types should be readable.

**Step 5: Commit**

```bash
git add src/pipeline/stages/runStage5Mandatory.ts src/actions/regenerateBlueprintAction.ts
git commit -m "fix: Mermaid diagram white-on-white text — dark text colors for primary/secondary nodes"
```

---

## Task 2: Add Markdown Download Button

**Severity:** Medium — V4 regression

**Files:**
- Modify: `src/components/editor/WorkspaceHeader.tsx`
- Test: `src/components/editor/WorkspaceHeader.test.tsx` (if exists, else skip)

**Step 1: Add import**

Add `DownloadSimple` to the Phosphor icons import in WorkspaceHeader.tsx:

```typescript
import {
  FolderSimple,
  FloppyDisk,
  Lightning,
  ListBullets,
  UploadSimple,
  Star,
  GearSix,
  ArrowCounterClockwise,
  DownloadSimple,        // NEW
} from '@phosphor-icons/react';
```

**Step 2: Add download handler**

After the existing handlers (line ~61), add:

```typescript
const handleDownloadMarkdown = () => {
  const title = epicDoc?.title ?? 'epic';
  const safeName = title.replace(/[^a-z0-9_-]/gi, '_').substring(0, 50);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}.md`;
  a.click();
  URL.revokeObjectURL(url);
};
```

**Step 3: Add button to toolbar**

Insert AFTER the Save button (after line 225, before the closing `</div>` of the left side), add:

```tsx
{/* Download .md */}
<button
  onClick={hasContent ? handleDownloadMarkdown : undefined}
  disabled={!hasContent}
  data-testid="btn-download-md"
  style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    border: '1px solid var(--col-border-illustrative)',
    borderRadius: '0.375rem',
    background: 'var(--col-background-ui-10)',
    color: hasContent ? 'var(--col-text-primary)' : 'var(--col-text-subtle)',
    fontSize: 13,
    fontWeight: 400,
    cursor: hasContent ? 'pointer' : 'not-allowed',
    fontFamily: F,
    opacity: hasContent ? 1 : 0.4,
  }}
>
  <DownloadSimple size={14} weight="regular" /> Download
</button>
```

**Step 4: Verify**

Load an epic, click Download — should save `<epic-title>.md` file with full markdown content.

**Step 5: Commit**

```bash
git add src/components/editor/WorkspaceHeader.tsx
git commit -m "feat: add markdown download button to workspace header"
```

---

## Task 3: Tighten Diagram Node Limits

**Severity:** Medium — diagrams are over-complex for simple epics

**User's requested limits:**

| Complexity | Node Range |
|-----------|-----------|
| Simple | 4–6 |
| Moderate | 6–8 |
| Complex | 8–12 |

**Files:**
- Modify: `src/pipeline/prompts/mandatoryPrompt.ts:38-53`
- Modify: `src/pipeline/epicScorer.ts` (add node count validation)
- Test: `src/pipeline/epicScorer.test.ts`

**Step 1: Update prompt node count instructions**

In `COMPLEXITY_INSTRUCTIONS` (mandatoryPrompt.ts, lines 38-53), change the diagram guidance:

```typescript
simple: `...
- Architecture diagram: a single flowchart showing main components. STRICT LIMIT: 4–6 nodes maximum. Do NOT exceed 6 nodes.
...`

moderate: `...
- Architecture diagram: a detailed graph showing components, data stores, and integrations. STRICT LIMIT: 6–8 nodes maximum. Do NOT exceed 8 nodes.
...`

complex: `...
- Architecture diagram: a comprehensive diagram showing all components, services, and data flows. STRICT LIMIT: 8–12 nodes maximum. Do NOT exceed 12 nodes.
...`
```

**Step 2: Add node count limits to complexity config**

Add `diagramNodeRange` to `ComplexityConfig` in `src/domain/complexity.ts`:

```typescript
diagramNodeRange: { min: number; max: number };
```

Values:
- simple: `{ min: 4, max: 6 }`
- moderate: `{ min: 6, max: 8 }`
- complex: `{ min: 8, max: 12 }`

**Step 3: Add post-generation validation in epicScorer**

Add `validateDiagramNodeCount()` to epicScorer.ts that checks the `nodeCount` from `analyzeMermaidGraph()` against the complexity config limits. If over limit, deduct additional points from the diagram quality score.

```typescript
export function validateDiagramNodeCount(
  nodeCount: number,
  complexity: ComplexityLevel,
): { withinLimits: boolean; max: number } {
  const { diagramNodeRange } = getComplexityConfig(complexity);
  return {
    withinLimits: nodeCount <= diagramNodeRange.max,
    max: diagramNodeRange.max,
  };
}
```

**Step 4: Write tests**

Add tests for `validateDiagramNodeCount`:
- Simple with 5 nodes → within limits
- Simple with 10 nodes → exceeds limits
- Complex with 12 nodes → within limits
- Complex with 15 nodes → exceeds limits

**Step 5: Update Stage 6 validation to penalize oversized diagrams**

In `runStage6Validation.ts`, `runLocalScoring()`, after the Mermaid block analysis, add:

```typescript
if (nodeCount > maxNodes) {
  baseScore = Math.max(0, baseScore - 10); // 10-point penalty for oversized diagrams
}
```

**Step 6: Commit**

```bash
git add src/pipeline/prompts/mandatoryPrompt.ts src/domain/complexity.ts src/pipeline/epicScorer.ts src/pipeline/epicScorer.test.ts src/pipeline/stages/runStage6Validation.ts
git commit -m "feat: enforce diagram node count limits per complexity level"
```

---

## Task 4: Diagram Version Naming Convention

**Severity:** Low — quality-of-life improvement

**Files:**
- Modify: `src/stores/blueprintStore.ts`
- Modify: `src/actions/regenerateBlueprintAction.ts`
- Test: `src/stores/blueprintStore.test.ts` (if exists)

**Step 1: Update `setCode` to auto-generate version labels**

In `blueprintStore.ts`, modify `setCode`:

```typescript
setCode: (code, type, reasoning, label) => {
  const { versions } = get();
  const versionNumber = versions.length + 1;

  // Auto-generate version label: "v1", "v2", etc.
  // If a label is provided (e.g., "simplify", "regenerated"), append: "v1-simplify"
  const autoLabel = label
    ? `v${versionNumber}-${label.toLowerCase().replace(/\s+/g, '-')}`
    : `v${versionNumber}`;

  const newVersion: DiagramVersion = {
    code,
    type: type ?? '',
    timestamp: Date.now(),
    label: autoLabel,
  };
  ...
```

**Step 2: Update regenerateBlueprintAction to pass activity labels**

In `regenerateBlueprintAction.ts`, when calling `setCode`, pass the action type as label:

```typescript
// After regeneration:
blueprintStore.setCode(newCode, diagramType, reasoning, 'regenerated');

// For simplify action (if exists):
blueprintStore.setCode(newCode, diagramType, reasoning, 'simplify');
```

**Step 3: Ensure version label is NOT in the Mermaid diagram title**

The `label` field is metadata only — it's stored in `DiagramVersion.label` and displayed in the version history UI, NOT injected into the Mermaid code. Verify this by checking that `applyDiagramTheme()` does NOT reference `label`.

**Step 4: Update version history UI (if it renders labels)**

Check `BlueprintView.tsx` — if it displays version labels, verify they show the new format.

**Step 5: Write tests**

```typescript
it('auto-generates v1, v2 labels', () => {
  blueprintStore.setCode('graph TD\nA-->B', 'flowchart');
  expect(blueprintStore.versions[0].label).toBe('v1');
  blueprintStore.setCode('graph TD\nA-->B-->C', 'flowchart');
  expect(blueprintStore.versions[1].label).toBe('v2');
});

it('appends activity suffix to version label', () => {
  blueprintStore.setCode('graph TD\nA-->B', 'flowchart');
  blueprintStore.setCode('graph TD\nA-->B-->C', 'flowchart', '', 'simplify');
  expect(blueprintStore.versions[1].label).toBe('v2-simplify');
});
```

**Step 6: Commit**

```bash
git add src/stores/blueprintStore.ts src/actions/regenerateBlueprintAction.ts
git commit -m "feat: auto-version diagram labels (v1, v2, v1-simplify)"
```

---

## Task 5: Custom Issue Creation (V4 Port)

**Severity:** High — missing user workflow

This is the largest change. Port the V4 `generateCustomStories()` AI function and add a "Custom Issue" input section to the existing `IssueCreationModal`.

### Sub-task 5.1: Create `generateCustomStories` AI function

**Files:**
- Create: `src/services/ai/generateCustomStories.ts`
- Test: `src/services/ai/generateCustomStories.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { generateCustomStories } from './generateCustomStories';

vi.mock('@/services/ai/aiClient', () => ({ callAI: vi.fn() }));
import { callAI } from '@/services/ai/aiClient';

describe('generateCustomStories', () => {
  it('parses AI JSON response into ParsedUserStory array', async () => {
    vi.mocked(callAI).mockResolvedValue({
      content: JSON.stringify([{
        title: 'Set up CI/CD pipeline',
        persona: 'DevOps engineer',
        goal: 'automate deployments',
        benefit: 'faster releases',
        acceptanceCriteria: ['Pipeline triggers on merge', 'Deploys to staging']
      }]),
      model: 'gpt-4.1',
    });

    const result = await generateCustomStories(
      mockAIConfig,
      'Set up CI/CD',
      'Epic content here',
      [],
      []
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toMatch(/^custom-/);
    expect(result[0].title).toBe('Set up CI/CD pipeline');
    expect(result[0].acceptanceCriteria).toHaveLength(2);
  });

  it('returns empty array when AI returns no stories', async () => { ... });
  it('handles markdown-wrapped JSON', async () => { ... });
  it('throws on unparseable response', async () => { ... });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/ai/generateCustomStories.test.ts -v`
Expected: FAIL — module not found

**Step 3: Implement generateCustomStories**

Create `src/services/ai/generateCustomStories.ts`:

```typescript
/**
 * generateCustomStories — AI-powered custom issue generation.
 *
 * User provides a plain-text description. AI correlates it with the epic
 * context and generates 1-5 structured user stories with acceptance criteria.
 * Ported from V4 skills.ts:4228-4334.
 */

import type { AIClientConfig } from '@/services/ai/types';
import { callAI } from '@/services/ai/aiClient';
import type { ParsedUserStory } from '@/pipeline/utils/parseUserStories';

export async function generateCustomStories(
  aiConfig: AIClientConfig,
  userDescription: string,
  epicContent: string,
  existingStories: readonly ParsedUserStory[],
  existingIssues: readonly { title: string; iid: number }[],
): Promise<ParsedUserStory[]> {
  const existingStoryTitles = existingStories.map(s => `- ${s.title}`).join('\n');
  const existingIssueTitles = existingIssues.map(i => `- #${i.iid}: ${i.title}`).join('\n');

  const systemPrompt = `You are a senior Agile product owner creating GitLab issues.

The user describes what they need in plain text. Using the project's epic for context, generate 1-5 well-structured user stories that can become GitLab issues.

RULES:
1. Each story MUST have: title (concise, action-oriented), persona, goal, benefit
2. Generate ONLY what the user asked for — do not pad with unrelated stories
3. If the request is specific (one task), generate 1 story
4. If the request is broad (a feature area), break into 2-5 stories
5. Titles should be professional GitLab issue titles (not "As a..." format)
6. Persona/goal/benefit come from the epic's context — use real roles and systems
7. Include 3-5 specific acceptance criteria per story
8. Do NOT duplicate any existing story or issue listed below
9. Stories must be technically grounded in the epic's architecture/tech stack

Return ONLY a JSON array (no markdown, no explanation):
[{ "title": "...", "persona": "...", "goal": "...", "benefit": "...", "acceptanceCriteria": ["..."] }]`;

  const userPrompt = `PROJECT EPIC (for context):
${epicContent.substring(0, 4000)}

EXISTING USER STORIES (do NOT duplicate):
${existingStoryTitles || '(none)'}

EXISTING GITLAB ISSUES (do NOT duplicate):
${existingIssueTitles || '(none)'}

USER'S REQUEST:
"${userDescription}"

Generate the appropriate user stories as JSON:`;

  const response = await callAI(aiConfig, {
    systemPrompt,
    userPrompt,
    temperature: 0.4,
  });

  // Parse response — handle markdown code blocks
  let cleaned = response.content.trim()
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  if (!cleaned.startsWith('[')) {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) cleaned = match[0];
  }

  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed) || parsed.length === 0) return [];

  return parsed.map((story: Record<string, unknown>, index: number) => {
    const id = `custom-${Date.now()}-${index}`;
    const persona = (story.persona as string) || 'user';
    const goal = (story.goal as string) || (story.title as string) || '';
    const benefit = (story.benefit as string) || '';
    const criteria = (story.acceptanceCriteria as string[]) || [];

    return {
      id,
      title: (story.title as string) || `Custom Story ${index + 1}`,
      asA: persona,
      iWant: goal,
      soThat: benefit,
      acceptanceCriteria: criteria,
      priority: 'medium',
      storyPoints: undefined,
    };
  });
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/ai/generateCustomStories.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/ai/generateCustomStories.ts src/services/ai/generateCustomStories.test.ts
git commit -m "feat: add generateCustomStories AI function (V4 port)"
```

---

### Sub-task 5.2: Add Custom Issue UI to IssueCreationModal

**Files:**
- Modify: `src/components/issues/IssueCreationModal.tsx`

**Step 1: Add imports**

```typescript
import { generateCustomStories } from '@/services/ai/generateCustomStories';
import { Plus } from '@phosphor-icons/react';
```

**Step 2: Add state variables**

After the existing state declarations (around line 53):

```typescript
// Custom issue creation state
const [customInput, setCustomInput] = useState('');
const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);
const [customError, setCustomError] = useState<string | null>(null);
```

**Step 3: Add handler**

After the existing handlers, add `handleGenerateCustomStories`:

```typescript
const handleGenerateCustomStories = useCallback(async () => {
  if (!customInput.trim()) return;
  setIsGeneratingCustom(true);
  setCustomError(null);

  try {
    const aiConfig: AIClientConfig = {
      provider: cfg.ai.provider,
      azure: cfg.ai.azure,
      openai: cfg.ai.openai,
      endpoints: cfg.endpoints,
    };

    const existingIssues = gitlabIssues.map(i => ({
      title: i.title,
      iid: i.iid,
    }));

    const newStories = await generateCustomStories(
      aiConfig,
      customInput,
      markdown,
      storiesWithAnalysis.map(s => s.story),
      existingIssues,
    );

    if (newStories.length === 0) {
      setCustomError('Could not generate stories. Try being more specific.');
      return;
    }

    // Append to existing stories, auto-selected
    setStoriesWithAnalysis(prev => [
      ...prev,
      ...newStories.map(story => ({ story, selected: true })),
    ]);

    setCustomInput('');
  } catch (err) {
    setCustomError((err as Error).message);
  } finally {
    setIsGeneratingCustom(false);
  }
}, [customInput, cfg, markdown, storiesWithAnalysis, gitlabIssues]);
```

**Step 4: Add UI section**

Insert BEFORE the story list section (before the project picker). Render only when AI is configured:

```tsx
{/* Custom Issue Input — AI generates stories from description */}
{cfg.ai.provider !== 'none' && phase === 'ready' && (
  <div
    data-testid="custom-issue-section"
    style={{
      marginBottom: 16,
      padding: 14,
      backgroundColor: 'var(--col-background-ui-10, #FAFAFA)',
      borderRadius: 8,
      border: '1px solid var(--col-border-illustrative, #e5e5e5)',
    }}
  >
    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--col-text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, fontFamily: F }}>
      <Plus size={14} weight="bold" color="var(--col-background-brand)" />
      Custom Issue
    </div>
    <textarea
      data-testid="custom-issue-input"
      value={customInput}
      onChange={(e) => setCustomInput(e.target.value)}
      placeholder="Describe what you need... e.g., 'Set up CI/CD pipeline with GitHub Actions'"
      style={{
        width: '100%', minHeight: 60, padding: 10, borderRadius: 6,
        border: '1px solid var(--col-border-illustrative)', fontSize: 13,
        resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
        background: 'var(--col-bg-surface, #fff)', color: 'var(--col-text, #222)',
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerateCustomStories();
      }}
    />
    {customError && (
      <div style={{ fontSize: 12, color: 'var(--col-background-brand)', marginTop: 6, fontFamily: F }}>
        {customError}
      </div>
    )}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--col-text-subtle)', fontFamily: F }}>
        AI generates user stories from your description + epic context (Cmd+Enter)
      </span>
      <button
        data-testid="generate-stories-btn"
        onClick={handleGenerateCustomStories}
        disabled={!customInput.trim() || isGeneratingCustom}
        style={{
          padding: '6px 16px', borderRadius: 6, border: 'none',
          background: customInput.trim() && !isGeneratingCustom ? 'var(--col-background-brand)' : 'var(--col-border-illustrative)',
          color: '#fff', cursor: customInput.trim() && !isGeneratingCustom ? 'pointer' : 'not-allowed',
          fontSize: 12, fontWeight: 500, fontFamily: F,
        }}
      >
        {isGeneratingCustom ? 'Generating...' : 'Generate Stories'}
      </button>
    </div>
  </div>
)}
```

**Step 5: Add "AI Generated" badge to story rows**

In the story list rendering, for stories with `id.startsWith('custom-')`, show a small badge:

```tsx
{story.id.startsWith('custom-') && (
  <span style={{
    fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 4,
    background: 'var(--col-background-brand)', color: '#fff', marginLeft: 6,
  }}>
    AI Generated
  </span>
)}
```

**Step 6: Verify**

1. Load an epic from GitLab
2. Click "Issues" button
3. In the modal, see "Custom Issue" section at top
4. Type a description, click Generate Stories (or Cmd+Enter)
5. See new stories appear in the list with "AI Generated" badges
6. Select and create as normal

**Step 7: Commit**

```bash
git add src/components/issues/IssueCreationModal.tsx
git commit -m "feat: custom issue creation — AI generates stories from user description (V4 port)"
```

---

## Testing Checklist

After all tasks:

- [ ] `npx vitest run` — all tests pass
- [ ] `npx tsc --noEmit` — no new type errors
- [ ] Visual: Mermaid diagrams have readable text (no white-on-white)
- [ ] Visual: Download button appears in workspace header, downloads .md file
- [ ] Visual: Custom Issue textarea appears in issue creation modal
- [ ] Visual: Generated stories show "AI Generated" badge
- [ ] Visual: Diagram version history shows v1, v2, v1-simplify labels
