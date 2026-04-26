# Extreme Initiative GitLab Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the existing Extreme Initiative wizard to real GitLab groups/epics — Streams from API, Crews from subgroups, publish creates Stream Epic → Crew Epics with parent-child linking.

**Architecture:** Extend `initiativeStore` with GitLab-backed types (`StreamGroup`, `GroupNode`, `PublishState`). Add `initiativeService.ts` composing existing `gitlabClient.ts` functions. Modify InitStep (fetch tree) and RefineCrewsStep (real publish). Local-first until publish.

**Tech Stack:** React 19, TypeScript strict, Zustand v5, existing `gitlabClient.ts` (raw fetch, `/gitlab-api` proxy), Vitest 4.

---

## Task 1: Add `streamGroupId` to `GitLabConfig` + Settings UI

**Files:**
- Modify: `src/domain/configTypes.ts:55-60`
- Modify: `src/stores/configStore.ts` (add default)
- Modify: Settings modal component (add input field)

**Step 1: Write the failing test**

```typescript
// In existing configStore test or new test
import { describe, it, expect } from 'vitest';
import { useConfigStore } from '@/stores/configStore';

describe('configStore streamGroupId', () => {
  it('has streamGroupId field defaulting to empty string', () => {
    const config = useConfigStore.getState().config;
    expect(config.gitlab.streamGroupId).toBe('');
  });
});
```

**Step 2: Run, fail** — `streamGroupId` doesn't exist on `GitLabConfig`.

**Step 3: Implement**

In `src/domain/configTypes.ts:55-60`, add `streamGroupId`:
```typescript
export interface GitLabConfig {
  enabled: boolean;
  rootGroupId: string;
  streamGroupId: string;    // ← NEW: Stream-level group ID for Initiative
  accessToken: string;
  authMode: GitLabAuthMode;
}
```

In `src/stores/configStore.ts`, add to the default config:
```typescript
gitlab: {
  ...existing,
  streamGroupId: '',
}
```

In the Settings modal GitLab section, add an input field for "Stream Group ID" below the existing "Group ID" field. Same styling, same onChange pattern.

**Step 4: Run, pass.**
**Step 5: Commit `feat(initiative): add streamGroupId to GitLabConfig + settings UI`.**

---

## Task 2: Add `parent_id` support to `updateGitLabEpic`

**Files:**
- Modify: `src/services/gitlab/types.ts:244-248`
- Modify: `src/services/gitlab/gitlabClient.ts:192-206`

**Step 1: Write the failing test**

```typescript
// src/services/gitlab/initiativeService.test.ts (start the file)
import { describe, it, expect, vi } from 'vitest';
import * as client from '@/services/gitlab/gitlabClient';

describe('updateGitLabEpic parent_id support', () => {
  it('includes parent_id in the request body when provided', async () => {
    // This test validates the type — if parent_id isn't on GitLabUpdateEpicParams, TS fails
    const params: import('@/services/gitlab/types').GitLabUpdateEpicParams = {
      parent_id: 9001,
    };
    expect(params.parent_id).toBe(9001);
  });
});
```

**Step 2: Run, fail** — `parent_id` not on `GitLabUpdateEpicParams`.

**Step 3: Implement**

In `src/services/gitlab/types.ts:244`:
```typescript
export interface GitLabUpdateEpicParams {
  title?: string;
  description?: string;
  labels?: string[];
  parent_id?: number;    // ← NEW: global epic ID for parent linking
}
```

In `src/services/gitlab/gitlabClient.ts:198`, add after labels:
```typescript
if (params.parent_id != null) body.parent_id = params.parent_id;
```

**Step 4: Run, pass.**
**Step 5: Commit `feat(gitlab): add parent_id support to updateGitLabEpic`.**

---

## Task 3: Extend `initiativeStore` types — `StreamGroup`, `GroupNode`, `PublishState`

**Files:**
- Modify: `src/stores/initiativeStore.ts` (types + state + actions)
- Modify: `src/stores/initiativeStore.test.ts` (new tests)

**Step 1: Write the failing test**

```typescript
// Add to src/stores/initiativeStore.test.ts
describe('gitlab integration', () => {
  it('sets streamGroup from API data', () => {
    store().setStreamGroup({ id: 280115, name: 'Wealth Management', fullPath: 'ubs/wealth' });
    expect(store().streamGroup?.id).toBe(280115);
    expect(store().streamGroup?.name).toBe('Wealth Management');
  });

  it('populates crews from subgroups with gitlabGroupId', () => {
    store().setCrewsFromSubgroups([
      { id: 111, name: 'Crew Alpha', fullPath: 'ubs/wealth/alpha' },
      { id: 222, name: 'Crew Beta', fullPath: 'ubs/wealth/beta' },
    ]);
    expect(store().crews).toHaveLength(2);
    expect(store().crews[0]!.gitlabGroupId).toBe(111);
    expect(store().crews[0]!.name).toBe('Crew Alpha');
  });

  it('tracks publish state transitions', () => {
    expect(store().publish.status).toBe('idle');
    store().setPublishStatus('publishing');
    expect(store().publish.status).toBe('publishing');
    store().setPublishStreamEpic(9001, 12);
    expect(store().publish.streamEpicId).toBe(9001);
    store().setPublishCrewEpic('local-id', 9002, 5);
    expect(store().publish.crewEpicIds['local-id']).toEqual({ id: 9002, iid: 5 });
    store().setPublishStatus('done');
    expect(store().publish.status).toBe('done');
  });

  it('reset clears gitlab state', () => {
    store().setStreamGroup({ id: 1, name: 'S', fullPath: 's' });
    store().setPublishStatus('done');
    store().reset();
    expect(store().streamGroup).toBeNull();
    expect(store().publish.status).toBe('idle');
  });
});
```

**Step 2: Run, fail.**

**Step 3: Implement**

Add to `initiativeStore.ts`:

New types:
```typescript
export interface StreamGroup {
  id: number;
  name: string;
  fullPath: string;
}

export interface GroupNode {
  id: number;
  name: string;
  fullPath: string;
  children: GroupNode[];
}

export interface PublishState {
  status: 'idle' | 'publishing' | 'done' | 'error';
  streamEpicId?: number;
  streamEpicIid?: number;
  crewEpicIds: Record<string, { id: number; iid: number }>;
  error?: string;
}
```

Extend `Crew`:
```typescript
export interface Crew {
  id: string;
  gitlabGroupId?: number;    // ← NEW
  name: string;
  refinedEpic?: string;
  refineStatus: 'pending' | 'refining' | 'done' | 'error';
}
```

Add to state:
```typescript
streamGroup: StreamGroup | null;
groupTree: GroupNode | null;
crewSubgroups: StreamGroup[];
publish: PublishState;
```

Add actions:
```typescript
setStreamGroup: (group: StreamGroup) => void;
setGroupTree: (tree: GroupNode) => void;
setCrewsFromSubgroups: (subgroups: StreamGroup[]) => void;
setPublishStatus: (status: PublishState['status'], error?: string) => void;
setPublishStreamEpic: (id: number, iid: number) => void;
setPublishCrewEpic: (localCrewId: string, id: number, iid: number) => void;
```

Implementation:
```typescript
setStreamGroup: (group) => set({ streamGroup: group }),
setGroupTree: (tree) => set({ groupTree: tree }),
setCrewsFromSubgroups: (subgroups) => set({
  crewSubgroups: subgroups,
  crews: subgroups.map((sg) => ({
    id: uid(),
    gitlabGroupId: sg.id,
    name: sg.name,
    refineStatus: 'pending' as const,
  })),
}),
setPublishStatus: (status, error) => set((s) => ({
  publish: { ...s.publish, status, error },
})),
setPublishStreamEpic: (id, iid) => set((s) => ({
  publish: { ...s.publish, streamEpicId: id, streamEpicIid: iid },
})),
setPublishCrewEpic: (localCrewId, id, iid) => set((s) => ({
  publish: { ...s.publish, crewEpicIds: { ...s.publish.crewEpicIds, [localCrewId]: { id, iid } } },
})),
```

Update INITIAL to include new fields:
```typescript
streamGroup: null,
groupTree: null,
crewSubgroups: [],
publish: { status: 'idle', crewEpicIds: {} },
```

Update `reset` to clear new fields.

**Step 4: Run, pass.**
**Step 5: Commit `feat(initiative): extend store with StreamGroup, GroupNode, PublishState`.**

---

## Task 4: Create `initiativeService.ts` — `fetchStreamTree`

**Files:**
- Create: `src/services/gitlab/initiativeService.ts`
- Create: `src/services/gitlab/initiativeService.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchStreamTree } from './initiativeService';
import * as client from './gitlabClient';

vi.mock('./gitlabClient');

const mockConfig = { enabled: true, rootGroupId: '1', streamGroupId: '280115', accessToken: 'tok', authMode: 'pat' as const };

describe('fetchStreamTree', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns stream metadata + crew subgroups', async () => {
    vi.mocked(client.fetchGroupMetadata).mockResolvedValue({
      success: true,
      data: { id: 280115, name: 'Wealth', full_path: 'ubs/wealth', web_url: 'https://devcloud.ubs.net/ubs/wealth' },
    });
    vi.mocked(client.fetchGitLabSubgroups).mockResolvedValue({
      success: true,
      data: [
        { id: '111', name: 'Crew Alpha', full_path: 'ubs/wealth/alpha' },
        { id: '222', name: 'Crew Beta', full_path: 'ubs/wealth/beta' },
      ],
    });

    const result = await fetchStreamTree(mockConfig, '280115');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.stream.name).toBe('Wealth');
      expect(result.data.crews).toHaveLength(2);
      expect(result.data.crews[0]!.id).toBe(111);
      expect(result.data.crews[0]!.name).toBe('Crew Alpha');
    }
  });

  it('returns error when group metadata fails', async () => {
    vi.mocked(client.fetchGroupMetadata).mockResolvedValue({ success: false, error: '404 Not Found' });
    const result = await fetchStreamTree(mockConfig, '999');
    expect(result.ok).toBe(false);
  });
});
```

**Step 2: Run, fail.**

**Step 3: Implement**

```typescript
// src/services/gitlab/initiativeService.ts
import type { GitLabConfig } from '@/domain/configTypes';
import type { StreamGroup, GroupNode } from '@/stores/initiativeStore';
import { fetchGroupMetadata, fetchGitLabSubgroups } from './gitlabClient';

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function fetchStreamTree(
  config: GitLabConfig,
  streamGroupId: string,
): Promise<Result<{ stream: StreamGroup; crews: StreamGroup[]; tree: GroupNode }>> {
  const metaResult = await fetchGroupMetadata(config, streamGroupId);
  if (!metaResult.success) return { ok: false, error: metaResult.error ?? 'Failed to fetch stream group' };

  const meta = metaResult.data!;
  const stream: StreamGroup = { id: meta.id, name: meta.name, fullPath: meta.full_path };

  const subResult = await fetchGitLabSubgroups(config, streamGroupId);
  if (!subResult.success) return { ok: false, error: subResult.error ?? 'Failed to fetch crew subgroups' };

  const crews: StreamGroup[] = (subResult.data ?? []).map((sg) => ({
    id: typeof sg.id === 'string' ? parseInt(sg.id, 10) : sg.id,
    name: sg.name,
    fullPath: sg.full_path,
  }));

  const tree: GroupNode = {
    id: stream.id,
    name: stream.name,
    fullPath: stream.fullPath,
    children: crews.map((c) => ({ id: c.id, name: c.name, fullPath: c.fullPath, children: [] })),
  };

  return { ok: true, data: { stream, crews, tree } };
}
```

**Step 4: Run, pass.**
**Step 5: Commit `feat(initiative): initiativeService.fetchStreamTree`.**

---

## Task 5: `initiativeService.ts` — `publishInitiativeEpics`

**Files:**
- Modify: `src/services/gitlab/initiativeService.ts`
- Modify: `src/services/gitlab/initiativeService.test.ts`

**Step 1: Write the failing test**

```typescript
describe('publishInitiativeEpics', () => {
  beforeEach(() => vi.resetAllMocks());

  it('creates stream epic then crew epics with parent_id linking', async () => {
    // Stream epic creation
    vi.mocked(client.createGitLabEpic).mockResolvedValueOnce({
      success: true,
      data: { id: 9001, iid: 1, title: 'Stream', group_id: 280115 } as any,
    });
    // Crew Alpha epic creation
    vi.mocked(client.createGitLabEpic).mockResolvedValueOnce({
      success: true,
      data: { id: 9002, iid: 1, title: 'Alpha', group_id: 111 } as any,
    });
    // Crew Alpha parent linking
    vi.mocked(client.updateGitLabEpic).mockResolvedValueOnce({
      success: true,
      data: { id: 9002, iid: 1, title: 'Alpha', group_id: 111 } as any,
    });

    const result = await publishInitiativeEpics(mockConfig, {
      streamGroupId: 280115,
      streamTitle: 'Wealth Initiative',
      streamEpicMarkdown: '## Content',
      crews: [{ gitlabGroupId: 111, name: 'Alpha', refinedEpic: '## Alpha Epic', localId: 'c1' }],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.streamEpicId).toBe(9001);
      expect(result.data.crewEpics).toHaveLength(1);
      expect(result.data.crewEpics[0]!.epicId).toBe(9002);
    }

    // Verify parent_id is the GLOBAL stream epic ID (9001), not iid
    expect(client.updateGitLabEpic).toHaveBeenCalledWith(
      mockConfig, '111', 1,
      expect.objectContaining({ parent_id: 9001 }),
    );
  });

  it('tracks partial failure when crew epic creation fails', async () => {
    vi.mocked(client.createGitLabEpic)
      .mockResolvedValueOnce({ success: true, data: { id: 9001, iid: 1 } as any })
      .mockResolvedValueOnce({ success: false, error: '500 Internal Server Error' });

    const result = await publishInitiativeEpics(mockConfig, {
      streamGroupId: 280115,
      streamTitle: 'Test',
      streamEpicMarkdown: 'md',
      crews: [{ gitlabGroupId: 111, name: 'Alpha', refinedEpic: 'md', localId: 'c1' }],
    });

    expect(result.ok).toBe(false);
  });
});
```

**Step 2: Run, fail.**

**Step 3: Implement**

```typescript
import { createGitLabEpic, updateGitLabEpic } from './gitlabClient';

interface PublishInput {
  streamGroupId: number;
  streamTitle: string;
  streamEpicMarkdown: string;
  crews: Array<{ gitlabGroupId: number; name: string; refinedEpic: string; localId: string }>;
}

interface PublishOutput {
  streamEpicId: number;
  streamEpicIid: number;
  crewEpics: Array<{ crewName: string; epicId: number; epicIid: number; localId: string }>;
}

export async function publishInitiativeEpics(
  config: GitLabConfig,
  input: PublishInput,
): Promise<Result<PublishOutput>> {
  // Step A: Create Stream Epic
  const streamResult = await createGitLabEpic(config, {
    title: input.streamTitle,
    description: input.streamEpicMarkdown,
    group_id: String(input.streamGroupId),
  });
  if (!streamResult.success || !streamResult.data) {
    return { ok: false, error: streamResult.error ?? 'Failed to create stream epic' };
  }
  const streamEpic = streamResult.data;

  // Step B: For each crew, create epic + link to parent
  const crewEpics: PublishOutput['crewEpics'] = [];
  const errors: string[] = [];

  for (const crew of input.crews) {
    const crewResult = await createGitLabEpic(config, {
      title: crew.name,
      description: crew.refinedEpic,
      group_id: String(crew.gitlabGroupId),
    });
    if (!crewResult.success || !crewResult.data) {
      errors.push(`${crew.name}: ${crewResult.error ?? 'creation failed'}`);
      continue;
    }

    const crewEpic = crewResult.data;

    // Link to parent — parent_id is GLOBAL streamEpic.id (NOT iid)
    const linkResult = await updateGitLabEpic(
      config,
      String(crew.gitlabGroupId),
      crewEpic.iid,
      { parent_id: streamEpic.id },
    );
    if (!linkResult.success) {
      errors.push(`${crew.name}: created but parent linking failed — ${linkResult.error}`);
    }

    crewEpics.push({
      crewName: crew.name,
      epicId: crewEpic.id,
      epicIid: crewEpic.iid,
      localId: crew.localId,
    });
  }

  if (errors.length > 0) {
    return { ok: false, error: `Partial failure: ${errors.join('; ')}` };
  }

  return { ok: true, data: { streamEpicId: streamEpic.id, streamEpicIid: streamEpic.iid, crewEpics } };
}
```

**Step 4: Run, pass.**
**Step 5: Commit `feat(initiative): publishInitiativeEpics — stream + crew epic creation with parent linking`.**

---

## Task 6: Rewrite `InitStep` — fetch tree, select crews from subgroups

**Files:**
- Modify: `src/components/initiative/steps/InitStep.tsx`
- Create: `src/components/initiative/steps/InitStep.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useInitiativeStore } from '@/stores/initiativeStore';
import { useConfigStore } from '@/stores/configStore';

// Mock the service
vi.mock('@/services/gitlab/initiativeService', () => ({
  fetchStreamTree: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      stream: { id: 280115, name: 'Wealth', fullPath: 'ubs/wealth' },
      crews: [
        { id: 111, name: 'Crew Alpha', fullPath: 'ubs/wealth/alpha' },
        { id: 222, name: 'Crew Beta', fullPath: 'ubs/wealth/beta' },
      ],
      tree: { id: 280115, name: 'Wealth', fullPath: 'ubs/wealth', children: [] },
    },
  }),
}));

describe('InitStep with GitLab', () => {
  beforeEach(() => {
    useInitiativeStore.getState().reset();
  });

  it('shows error when streamGroupId is not configured', async () => {
    // Ensure streamGroupId is empty
    const { InitStep } = await import('./InitStep');
    render(<InitStep />);
    expect(screen.getByText(/Configure Stream Group ID/i)).toBeTruthy();
  });
});
```

**Step 3: Implement** — Major rewrite of InitStep:
- On mount: read `configStore.config.gitlab.streamGroupId`. If empty → show "Configure Stream Group ID in Settings" message.
- If set: call `fetchStreamTree(gitlabConfig, streamGroupId)` → show loading skeleton
- On success: `setStreamGroup(data.stream)`, display stream name/path read-only, render crews as checkboxes
- User checks which crews to include → `setCrewsFromSubgroups(selectedCrews)`
- Title + description inputs remain (same as before)
- Crew count stepper / manual naming removed
- StreamCombobox removed (stream comes from settings, not user selection)
- "Generate Stream Epic →" guard: title non-empty + at least 2 crews selected

**Step 5: Commit `feat(initiative): rewrite InitStep — fetch tree, crew selection from subgroups`.**

---

## Task 7: Update `StreamEpicStep` — use real crew names in AI prompt

**Files:**
- Modify: `src/components/initiative/steps/StreamEpicStep.tsx`

**Step 1: Failing test** — AI prompt includes crew names from `crews[].name` (which now come from GitLab subgroups).

**Step 3: Implement** — When calling `generateStreamEpic()`, pass the real crew names in the prompt so AI generates sections aligned with actual crew names. Small change — the crew names flow through the store, the AI action already accepts them.

**Step 5: Commit `feat(initiative): StreamEpicStep uses real crew names in AI prompt`.**

---

## Task 8: Rewrite `RefineCrewsStep` — real publish with progress

**Files:**
- Modify: `src/components/initiative/steps/RefineCrewsStep.tsx`
- Create: `src/components/initiative/steps/RefineCrewsStep.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { useInitiativeStore } from '@/stores/initiativeStore';

vi.mock('@/services/gitlab/initiativeService', () => ({
  publishInitiativeEpics: vi.fn(),
}));

describe('RefineCrewsStep publish', () => {
  it('publish button is disabled until all crews are done', () => {
    const store = useInitiativeStore.getState();
    store.reset();
    store.setCrewsFromSubgroups([
      { id: 111, name: 'Alpha', fullPath: 'a' },
    ]);
    store.setCrewRefineStatus(store.crews[0]!.id, 'pending');
    // Button should be disabled — tested via store state
    expect(store.crews.every(c => c.refineStatus === 'done')).toBe(false);
  });
});
```

**Step 3: Implement** — Extend RefineCrewsStep:
- "Publish Initiative" button now calls `publishInitiativeEpics()` from `initiativeService`
- Shows publish progress: per-crew card gains a publish status row below refine status
- On publish start: `setPublishStatus('publishing')`
- For each crew result: `setPublishCrewEpic(crew.id, epicId, epicIid)`
- On all done: `setPublishStatus('done')`, show clickable GitLab epic URLs
- On partial failure: show which crews failed, "Retry failed" button
- Compose the `PublishInput` from store state:
  ```typescript
  {
    streamGroupId: streamGroup!.id,
    streamTitle: title,
    streamEpicMarkdown,
    crews: crews.filter(c => c.refineStatus === 'done').map(c => ({
      gitlabGroupId: c.gitlabGroupId!,
      name: c.name,
      refinedEpic: c.refinedEpic!,
      localId: c.id,
    })),
  }
  ```

**Step 5: Commit `feat(initiative): RefineCrewsStep with real GitLab publish + progress tracking`.**

---

## Task 9: Remove `StreamCombobox` + clean up unused code

**Files:**
- Delete: `src/components/initiative/shared/StreamCombobox.tsx`
- Modify: `src/stores/initiativeStore.ts` — remove `streams: Stream[]`, `selectedStreamId`, `createStream`, `selectStream`
- Modify: `src/stores/initiativeStore.test.ts` — remove/update stream tests

**Step 1:** Remove the `Stream` type and `streams[]` state (replaced by `StreamGroup`). Remove `createStream()` and `selectStream()` actions. Update tests — the "streams" describe block becomes the "gitlab integration" block from Task 3.

**Step 2:** Delete `StreamCombobox.tsx` — no longer needed (stream comes from settings, not user selection).

**Step 3:** Run full initiative test suite to verify no breakage:
```bash
npx vitest run src/stores/initiativeStore.test.ts src/services/gitlab/initiativeService.test.ts src/components/initiative/
```

**Step 5: Commit `refactor(initiative): remove local-only Stream type, replace with GitLab-backed StreamGroup`.**

---

## Task 10: Integration test — full GitLab-integrated flow

**Files:**
- Modify: `src/test/integration/initiativeFlow.test.ts`

**Step 1: Write the test**

```typescript
describe('initiative GitLab-integrated flow', () => {
  it('full flow: fetch tree → wizard → publish → verify epic ID chain', () => {
    // Step 1: Simulate tree fetch
    store().setStreamGroup({ id: 280115, name: 'Wealth', fullPath: 'ubs/wealth' });
    store().setCrewsFromSubgroups([
      { id: 111, name: 'Crew Alpha', fullPath: 'ubs/wealth/alpha' },
      { id: 222, name: 'Crew Beta', fullPath: 'ubs/wealth/beta' },
    ]);
    store().setTitle('Wealth Initiative 2026');
    store().setStep('streamEpic');

    // Step 2: AI generates epic
    store().setStreamEpic('## Risk Assessment\nContent\n## Compliance\nMore');
    store().parseHeadersFromEpic();
    expect(store().headers).toHaveLength(2);
    store().setStep('splitCrews');

    // Step 3: Assign headers to crews (using gitlabGroupId)
    const [h1, h2] = store().headers;
    const [c1, c2] = store().crews;
    expect(c1!.gitlabGroupId).toBe(111);
    expect(c2!.gitlabGroupId).toBe(222);
    store().assignHeaderToCrew(h1!.id, c1!.id);
    store().assignHeaderToCrew(h2!.id, c1!.id);
    store().assignHeaderToCrew(h2!.id, c2!.id); // shared
    store().setStep('refineCrews');

    // Step 4: Refine + publish tracking
    store().setCrewRefineStatus(c1!.id, 'done');
    store().setCrewRefinedEpic(c1!.id, '# Alpha Epic');
    store().setCrewRefineStatus(c2!.id, 'done');
    store().setCrewRefinedEpic(c2!.id, '# Beta Epic');

    // Simulate publish results
    store().setPublishStatus('publishing');
    store().setPublishStreamEpic(9001, 1);
    store().setPublishCrewEpic(c1!.id, 9002, 1);
    store().setPublishCrewEpic(c2!.id, 9003, 1);
    store().setPublishStatus('done');

    expect(store().publish.status).toBe('done');
    expect(store().publish.streamEpicId).toBe(9001);
    expect(store().publish.crewEpicIds[c1!.id]).toEqual({ id: 9002, iid: 1 });
    expect(store().publish.crewEpicIds[c2!.id]).toEqual({ id: 9003, iid: 1 });
  });
});
```

**Step 4: Run, pass.**
**Step 5: Commit `test(initiative): integration test — full GitLab-integrated wizard flow`.**

---

## Verification

After all 10 tasks, run full suite:
```bash
npx vitest run src/stores/initiativeStore.test.ts src/services/gitlab/initiativeService.test.ts src/components/initiative/ src/test/integration/initiativeFlow.test.ts
```

Expected: all new + existing initiative tests green. Use `superpowers:verification-before-completion` at every task boundary.

---

## Out of scope (per design doc §9)

- Issue creation (Pod → Commons → Home traversal)
- `@gitbeaker/rest` migration
- Drag-and-drop on SplitCrewsStep
- Mobile/responsive
- Full group tree eager fetch (Pod level) — deferred until issues are added

---

Plan complete and saved to `docs/plans/2026-04-25-extreme-initiative-gitlab-implementation-plan.md`.

Two execution options:

**1. Subagent-Driven (this session)** — I dispatch fresh subagent per task, review between tasks, fast iteration.

**2. Parallel Session (separate)** — Open new session with `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?
