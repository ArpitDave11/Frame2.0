# Context-Aware Update Generation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enrich AI-generated issue updates with parent Epic context and deeper activity history so updates maintain narrative continuity with the broader project.

**Architecture:** On issue click in IssueDetail, eagerly fetch the parent Epic (via GitLab issue→epic linkage) and last 10 notes in parallel. Cache in component state. When the user generates an AI update, the prompt includes Epic description + full activity history + user input. Graceful degradation when no Epic is linked.

**Tech Stack:** React, TypeScript, GitLab REST API, existing `callAI` + `gitlabClient` infrastructure.

---

### Task 1: Add `epic` field to `GitLabIssue` type

**Files:**
- Modify: `src/services/gitlab/types.ts:46-62`

**Step 1: Add the `epic` field to `GitLabIssue`**

The GitLab REST API returns an `epic` object on issues when they are linked to one. Add the optional field to the existing interface.

```typescript
// In GitLabIssue interface, add after the `weight` field (line 62):
  epic?: {
    id: number;
    iid: number;
    title: string;
    group_id: number;
    url: string;
  } | null;
```

**Step 2: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | grep -i "types.ts"`
Expected: No new errors (field is optional, so all existing code is unaffected).

**Step 3: Commit**

```bash
git add src/services/gitlab/types.ts
git commit -m "feat: add epic field to GitLabIssue type"
```

---

### Task 2: Add `fetchIssueEpic` function to gitlabClient

**Files:**
- Modify: `src/services/gitlab/gitlabClient.ts:304-314` (near Issue Notes section)
- Test: `src/services/gitlab/gitlabClient.test.ts`

**Step 1: Write the failing test**

Add to the existing `gitlabClient.test.ts` file:

```typescript
describe('fetchIssueEpic', () => {
  it('returns epic when issue has a parent epic', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({
      id: 42,
      iid: 3,
      title: 'Auth Service Redesign',
      description: '## Objective\nRedesign the auth service...',
      state: 'opened',
      web_url: 'https://gitlab.example.com/groups/mygroup/-/epics/3',
      labels: [],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-03-30T00:00:00Z',
      group_id: 99,
    }));

    const result = await fetchIssueEpic(validConfig, 10, 5);
    expect(result.success).toBe(true);
    expect(result.data?.title).toBe('Auth Service Redesign');
    expect(result.data?.description).toContain('Redesign the auth service');
  });

  it('returns success false when issue has no epic', async () => {
    fetchMock.mockResponseOnce('[]', { status: 200 });

    const result = await fetchIssueEpic(validConfig, 10, 5);
    expect(result.success).toBe(true);
    expect(result.data).toBeUndefined();
  });

  it('returns error on API failure', async () => {
    fetchMock.mockResponseOnce('Forbidden', { status: 403 });

    const result = await fetchIssueEpic(validConfig, 10, 5);
    expect(result.success).toBe(false);
    expect(result.error).toContain('403');
  });
});
```

**Step 2: Run the test to verify it fails**

Run: `npx vitest run src/services/gitlab/gitlabClient.test.ts --reporter=verbose 2>&1 | tail -20`
Expected: FAIL — `fetchIssueEpic` is not exported.

**Step 3: Implement `fetchIssueEpic`**

Add to `src/services/gitlab/gitlabClient.ts`, in the "Issue Notes" section (after `addIssueNote`, around line 325):

```typescript
// ─── Issue Epic (context-aware updates) ─────────────────────

export async function fetchIssueEpic(
  config: GitLabConfig,
  projectId: number,
  issueIid: number,
): Promise<GitLabEpicResult> {
  // GitLab API: GET /projects/:id/issues/:iid/related_epics
  // Returns array of epics — we take the first (direct parent).
  const result = await gitlabGet<GitLabEpic[]>(
    config,
    `/projects/${projectId}/issues/${issueIid}/related_epics`,
  );
  if (!result.ok) return { success: false, error: result.error };
  const epic = result.data?.[0];
  if (!epic) return { success: true }; // No linked epic — graceful degradation
  return { success: true, data: epic };
}
```

Note: We import `GitLabEpicResult` which is already in the import block at the top of the file.

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/gitlab/gitlabClient.test.ts --reporter=verbose 2>&1 | tail -20`
Expected: All tests PASS, including the 3 new `fetchIssueEpic` tests.

**Step 5: Commit**

```bash
git add src/services/gitlab/gitlabClient.ts src/services/gitlab/gitlabClient.test.ts
git commit -m "feat: add fetchIssueEpic — resolve parent epic for context-aware updates"
```

---

### Task 3: Add `epic_iid` and `group_id` to `MockIssue` type

**Files:**
- Modify: `src/components/issues/types.ts:13-30`
- Modify: `src/components/issues/IssueManagerView.tsx:29-48`

**Step 1: Add fields to `MockIssue`**

In `src/components/issues/types.ts`, add to the `MockIssue` interface after line 29 (`weight`):

```typescript
  epic_iid?: number | null;
  epic_group_id?: number | null;
```

**Step 2: Pass epic data through in `mapGitLabIssueToMock`**

In `src/components/issues/IssueManagerView.tsx`, add to the `mapGitLabIssueToMock` return object (around line 47, after `weight`):

```typescript
    epic_iid: issue.epic?.iid ?? null,
    epic_group_id: issue.epic?.group_id ?? null,
```

**Step 3: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | grep -i "types.ts\|IssueManager"`
Expected: No new errors.

**Step 4: Commit**

```bash
git add src/components/issues/types.ts src/components/issues/IssueManagerView.tsx
git commit -m "feat: pass epic_iid and epic_group_id through MockIssue for context-aware updates"
```

---

### Task 4: Eager-fetch parent Epic + bump notes to 10 in IssueDetail

**Files:**
- Modify: `src/components/issues/IssueDetail.tsx:6-68` (imports + state + useEffects)

**Step 1: Add import for `fetchIssueEpic` and `fetchEpicDetails`**

In the imports at the top of `IssueDetail.tsx` (line 13), add `fetchIssueEpic` and `fetchEpicDetails`:

```typescript
import { fetchIssueNotes, addIssueNote, fetchIssueLinks, fetchIssueEpic, fetchEpicDetails } from '@/services/gitlab/gitlabClient';
```

Also add the type import (line 15):

```typescript
import type { GitLabNote, GitLabIssueLink, GitLabEpic } from '@/services/gitlab/types';
```

**Step 2: Add epic context state**

After line 32 (`const [postingComment, setPostingComment] = useState(false);`), add:

```typescript
  const [epicContext, setEpicContext] = useState<{ title: string; description: string } | null>(null);
  const [loadingEpic, setLoadingEpic] = useState(false);
```

**Step 3: Add eager-fetch useEffect for parent Epic**

After the existing issue links useEffect (after line 68), add:

```typescript
  // Eager-fetch parent Epic for context-aware updates
  useEffect(() => {
    if (!isRealIssue || !issue?.project_id || !issue?.iid) {
      setEpicContext(null);
      return;
    }

    let cancelled = false;
    setLoadingEpic(true);

    fetchIssueEpic(gitlabConfig, issue.project_id, issue.iid).then((result) => {
      if (cancelled) return;
      setLoadingEpic(false);
      if (result.success && result.data) {
        setEpicContext({
          title: result.data.title,
          description: result.data.description ?? '',
        });
      } else {
        setEpicContext(null);
      }
    });

    return () => { cancelled = true; };
  }, [isRealIssue, issue?.project_id, issue?.iid, gitlabConfig]);
```

**Step 4: Bump notes context from 5 to 10**

In `handleGenerateAI` (line 104), change:

```typescript
// BEFORE:
const recentNotesContext = realNotes.slice(-5).map((n) => `[${n.author?.name ?? 'Unknown'}]: ${n.body.slice(0, 200)}`).join('\n');
```

To:

```typescript
// AFTER:
const recentNotesContext = realNotes.slice(-10).map((n) => `[${n.author?.name ?? 'Unknown'}] (${new Date(n.created_at).toLocaleDateString()}): ${n.body.slice(0, 300)}`).join('\n');
```

Changes: `slice(-5)` → `slice(-10)`, truncation `200` → `300` chars, added date for timeline continuity.

**Step 5: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | grep "IssueDetail"`
Expected: No errors.

**Step 6: Commit**

```bash
git add src/components/issues/IssueDetail.tsx
git commit -m "feat: eager-fetch parent Epic on issue click, bump activity context to 10 notes"
```

---

### Task 5: Enrich AI prompt with Epic context

**Files:**
- Modify: `src/components/issues/IssueDetail.tsx:83-134` (handleGenerateAI)

This is the core change — rewriting the AI prompt to include Epic narrative context.

**Step 1: Rewrite the `callAI` invocation in `handleGenerateAI`**

Replace the `systemPrompt` and `userPrompt` construction (lines 117-119) with:

```typescript
    // Build Epic context section (omitted when no epic)
    const epicSection = epicContext
      ? `EPIC CONTEXT:\nTitle: ${epicContext.title}\n${epicContext.description.slice(0, 2000)}\n\n`
      : '';

    // Build issue context
    const issueSection = `ISSUE: "${issue?.title}"\nDescription: ${issueContext}\nStory Points: ${issue?.weight ?? 'unset'} | Status: ${issue?.status ?? 'unknown'}\n`;

    // Build activity log
    const activitySection = recentNotesContext
      ? `\nACTIVITY LOG (recent → oldest):\n${recentNotesContext}\n`
      : '';

    try {
      const response = await callAI(aiConfig, {
        systemPrompt: `You generate GitLab issue activity updates. ${guide}\n\nRules:\n- Keep concise (2-4 sentences).\n- Maintain continuity with previous updates in the activity log — do not repeat them.\n- If an Epic is provided, align the update with the Epic's objectives and narrative.\n- If the user includes GitLab quick actions (lines starting with /), preserve them exactly.`,
        userPrompt: `${epicSection}${issueSection}${activitySection}${blockerCtx}\n\nUSER INPUT: "${textForAI}"\n\nGenerate a ${activityType} for this issue.`,
        temperature: 0.5,
      });
```

**Step 2: Add `epicContext` to the `useCallback` dependency array**

The `handleGenerateAI` useCallback (line 134) currently has these deps:

```typescript
}, [aiInput, activityType, cfg, issue?.title, issue?.description, issue?.weight, realNotes, issueLinksData]);
```

Add `epicContext`:

```typescript
}, [aiInput, activityType, cfg, issue?.title, issue?.description, issue?.weight, issue?.status, realNotes, issueLinksData, epicContext]);
```

**Step 3: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | grep "IssueDetail"`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/components/issues/IssueDetail.tsx
git commit -m "feat: enrich AI update prompt with Epic context and deeper activity history"
```

---

### Task 6: Add loading indicator for Epic context

**Files:**
- Modify: `src/components/issues/IssueDetail.tsx:247-294` (AI Input Section)

**Step 1: Add a subtle loading/context indicator**

After the quick actions hint (line 293), before the AI Preview section, add:

```typescript
        {/* Epic context indicator */}
        {isRealIssue && (
          <div style={{ marginTop: 4, fontSize: 10, color: 'var(--col-text-subtle)', fontFamily: F, fontWeight: 300, opacity: 0.7, display: 'flex', alignItems: 'center', gap: 4 }}>
            {loadingEpic ? (
              <>Loading epic context...</>
            ) : epicContext ? (
              <>Epic: {epicContext.title.slice(0, 60)}{epicContext.title.length > 60 ? '...' : ''}</>
            ) : (
              <>No linked epic — updates use issue context only</>
            )}
          </div>
        )}
```

**Step 2: Verify the component renders correctly**

Run: `npx vitest run src/components/issues/ --reporter=verbose 2>&1 | tail -20`
Expected: All existing tests pass (this is a visual-only change).

**Step 3: Commit**

```bash
git add src/components/issues/IssueDetail.tsx
git commit -m "feat: add epic context loading indicator in AI input section"
```

---

### Task 7: Write integration test for context-aware generation

**Files:**
- Modify: `src/components/issues/IssueManagerView.test.tsx` (or create `src/components/issues/IssueDetail.test.tsx` if it doesn't exist)

**Step 1: Check if IssueDetail test file exists**

Run: `ls src/components/issues/IssueDetail.test.tsx 2>/dev/null || echo "MISSING"`

If MISSING, create `src/components/issues/IssueDetail.test.tsx`.

**Step 2: Write the test**

```typescript
/**
 * Tests for IssueDetail — context-aware AI update generation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IssueDetail } from './IssueDetail';
import { useConfigStore } from '@/stores/configStore';
import type { MockIssue } from './types';

// Mock the gitlabClient module
vi.mock('@/services/gitlab/gitlabClient', () => ({
  fetchIssueNotes: vi.fn().mockResolvedValue({ success: true, data: [] }),
  addIssueNote: vi.fn().mockResolvedValue({ success: true, data: { id: 1, body: 'test', author: { name: 'Test' }, created_at: new Date().toISOString(), system: false } }),
  fetchIssueLinks: vi.fn().mockResolvedValue({ success: true, data: [] }),
  fetchIssueEpic: vi.fn().mockResolvedValue({ success: true, data: { id: 42, iid: 3, title: 'Auth Epic', description: '## Objective\nRedesign auth', state: 'opened', web_url: '', labels: [], created_at: '', updated_at: '', group_id: 99 } }),
}));

// Mock the AI client
vi.mock('@/services/ai/aiClient', () => ({
  callAI: vi.fn().mockResolvedValue({ content: 'AI generated update based on epic context.' }),
  isAIEnabled: vi.fn().mockReturnValue(true),
}));

const realIssue: MockIssue = {
  id: '#101',
  title: 'Implement OAuth2 flow',
  status: 'in-progress',
  priority: 'high',
  updated: '2h ago',
  assignee: 'Sarah Kim',
  description: 'Implement OAuth2 with PKCE',
  web_url: 'https://gitlab.example.com/project/issues/101',
  project_id: 10,
  iid: 101,
  weight: 5,
};

beforeEach(() => {
  vi.clearAllMocks();
  useConfigStore.setState({
    config: {
      ...useConfigStore.getState().config,
      gitlab: { ...useConfigStore.getState().config.gitlab, enabled: true, accessToken: 'test-token' },
      ai: { ...useConfigStore.getState().config.ai, provider: 'azure' },
    },
  });
});

describe('IssueDetail — context-aware updates', () => {
  it('fetches parent epic on mount for real issues', async () => {
    const { fetchIssueEpic } = await import('@/services/gitlab/gitlabClient');
    render(<IssueDetail issue={realIssue} />);

    await waitFor(() => {
      expect(fetchIssueEpic).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true }),
        10,
        101,
      );
    });
  });

  it('shows epic title in context indicator', async () => {
    render(<IssueDetail issue={realIssue} />);

    await waitFor(() => {
      expect(screen.getByText(/Auth Epic/)).toBeDefined();
    });
  });

  it('shows fallback text when no epic linked', async () => {
    const { fetchIssueEpic } = await import('@/services/gitlab/gitlabClient');
    (fetchIssueEpic as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ success: true });

    render(<IssueDetail issue={realIssue} />);

    await waitFor(() => {
      expect(screen.getByText(/No linked epic/)).toBeDefined();
    });
  });

  it('passes epic context to AI prompt', async () => {
    const { callAI } = await import('@/services/ai/aiClient');
    render(<IssueDetail issue={realIssue} />);

    // Wait for epic to load
    await waitFor(() => {
      expect(screen.getByText(/Auth Epic/)).toBeDefined();
    });

    // Type input and generate
    const input = screen.getByTestId('ai-input');
    fireEvent.change(input, { target: { value: 'Finished PKCE implementation' } });
    fireEvent.click(screen.getByTestId('ai-generate-btn'));

    await waitFor(() => {
      expect(callAI).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          userPrompt: expect.stringContaining('EPIC CONTEXT'),
        }),
      );
      expect(callAI).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          userPrompt: expect.stringContaining('Auth Epic'),
        }),
      );
    });
  });

  it('generates without epic context when no epic linked', async () => {
    const { fetchIssueEpic } = await import('@/services/gitlab/gitlabClient');
    const { callAI } = await import('@/services/ai/aiClient');
    (fetchIssueEpic as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ success: true });

    render(<IssueDetail issue={realIssue} />);

    await waitFor(() => {
      expect(screen.getByText(/No linked epic/)).toBeDefined();
    });

    const input = screen.getByTestId('ai-input');
    fireEvent.change(input, { target: { value: 'Finished PKCE implementation' } });
    fireEvent.click(screen.getByTestId('ai-generate-btn'));

    await waitFor(() => {
      expect(callAI).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          userPrompt: expect.not.stringContaining('EPIC CONTEXT'),
        }),
      );
    });
  });

  it('does not fetch epic for mock issues', () => {
    const mockIssue: MockIssue = {
      id: 'AUTH-101',
      title: 'Mock issue',
      status: 'in-progress',
      priority: 'high',
      updated: '2h ago',
      assignee: 'Test',
    };

    render(<IssueDetail issue={mockIssue} />);

    // fetchIssueEpic should NOT be called for non-real issues
    const { fetchIssueEpic } = require('@/services/gitlab/gitlabClient');
    expect(fetchIssueEpic).not.toHaveBeenCalled();
  });
});
```

**Step 3: Run test to verify it passes**

Run: `npx vitest run src/components/issues/IssueDetail.test.tsx --reporter=verbose 2>&1 | tail -30`
Expected: All 6 tests PASS.

**Step 4: Commit**

```bash
git add src/components/issues/IssueDetail.test.tsx
git commit -m "test: add IssueDetail context-aware update generation tests"
```

---

### Task 8: Run full test suite and verify

**Files:** None (verification only)

**Step 1: Run full test suite**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -30`
Expected: No new failures from our changes. Pre-existing failures are acceptable.

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: Same count as before our changes (pre-existing errors only).

**Step 3: Final commit (if any fixes needed)**

If any test adjustments were needed, commit them:

```bash
git add -A
git commit -m "fix: resolve test issues from context-aware update integration"
```
