# Iteration Dropdown Filter — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an iteration dropdown to the Issue Manager sprint view so users can filter issues by iteration, with current iteration auto-selected.

**Architecture:** Component-local state in `IssueManagerView`. New `fetchRecentIterations` API function. Existing types reused. No store changes, no new files.

**Tech Stack:** React, TypeScript, Vitest, GitLab REST API v4

**Design doc:** `docs/plans/2026-03-29-iteration-dropdown-design.md`

---

### Task 1: Add `fetchRecentIterations` API function

**Files:**
- Modify: `src/services/gitlab/gitlabClient.ts:340-352` (after `fetchCurrentIteration`)

**Step 1: Write the failing test**

Add to `src/services/gitlab/gitlabClient.test.ts`. Find the iteration-related test section (or add at the end before the closing brace). The test file already mocks `gitlabGet` via `vi.mock`.

```typescript
describe('fetchRecentIterations', () => {
  it('calls /groups/:id/iterations with state=all', async () => {
    const mockIterations = [
      { id: 207814, iid: 50, group_id: 478494, title: null, state: 2, start_date: '2026-03-18', due_date: '2026-03-31', web_url: 'https://gitlab.example.com/iterations/50' },
      { id: 207000, iid: 49, group_id: 478494, title: null, state: 3, start_date: '2026-03-04', due_date: '2026-03-17', web_url: 'https://gitlab.example.com/iterations/49' },
    ];
    mockFetch(mockIterations);

    const result = await fetchRecentIterations(TEST_CONFIG, '478494');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockIterations);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/groups/478494/iterations?state=all&per_page=6&sort=desc&order_by=due_date'),
      expect.any(Object),
    );
  });

  it('returns error on API failure', async () => {
    mockFetchError(500);
    const result = await fetchRecentIterations(TEST_CONFIG, '478494');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

> **Note:** Check the test file first — it may use `mockFetch`/`mockFetchError` helpers or raw `vi.fn()`. Match the existing pattern. Import `fetchRecentIterations` at the top alongside `fetchCurrentIteration`.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/gitlab/gitlabClient.test.ts --reporter=verbose 2>&1 | tail -20`
Expected: FAIL — `fetchRecentIterations is not a function` or `not exported`

**Step 3: Write the implementation**

In `src/services/gitlab/gitlabClient.ts`, add after `fetchCurrentIteration` (line 352):

```typescript
export async function fetchRecentIterations(
  config: GitLabConfig,
  groupId: string,
): Promise<GitLabIterationResult> {
  const result = await gitlabGet<GitLabIteration[]>(
    config,
    `/groups/${groupId}/iterations?state=all&per_page=6&sort=desc&order_by=due_date`,
  );
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, data: result.data };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/gitlab/gitlabClient.test.ts --reporter=verbose 2>&1 | tail -20`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/gitlab/gitlabClient.ts src/services/gitlab/gitlabClient.test.ts
git commit -m "feat: add fetchRecentIterations API function"
```

---

### Task 2: Add iteration state and update mount logic

**Files:**
- Modify: `src/components/issues/IssueManagerView.tsx:50-133`

**Step 1: Add iteration state variables**

After line 58 (`const [loadingSprint, setLoadingSprint] = useState(false);`), add:

```typescript
// Iteration dropdown state
const [iterations, setIterations] = useState<GitLabIteration[]>([]);
const [selectedIterationId, setSelectedIterationId] = useState<number | null>(null);
const [loadingIterations, setLoadingIterations] = useState(false);
```

Add `GitLabIteration` to the import from `@/services/gitlab/types` (or from wherever `GitLabMember` is imported — check the import block).

Add `fetchRecentIterations` to the import from `@/services/gitlab/gitlabClient`.

**Step 2: Add iteration fetch on mount**

Add a new `useEffect` after the existing username resolution effect (after line 99). This fetches iterations once when GitLab is configured:

```typescript
// Fetch recent iterations for dropdown
useEffect(() => {
  if (!isConfigured || !config.gitlab.rootGroupId) return;
  setLoadingIterations(true);
  Promise.all([
    fetchRecentIterations(config.gitlab, config.gitlab.rootGroupId),
    fetchCurrentIteration(config.gitlab, config.gitlab.rootGroupId),
  ]).then(([recentResult, currentResult]) => {
    if (recentResult.success && recentResult.data) {
      setIterations(recentResult.data);
    }
    const currentId = currentResult.data?.[0]?.id ?? null;
    setSelectedIterationId(currentId);
  }).finally(() => setLoadingIterations(false));
}, [isConfigured, config.gitlab]);
```

**Step 3: Update `fetchSprintIssues` to use `selectedIterationId`**

Replace the current `fetchSprintIssues` callback (lines 102-126) with:

```typescript
const fetchSprintIssues = useCallback(async (username: string) => {
  if (!isConfigured || !config.gitlab.rootGroupId) return;
  setLoadingSprint(true);

  try {
    const issuesResult = await fetchGroupIssues(config.gitlab, config.gitlab.rootGroupId, {
      assignee_username: username,
      iteration_id: selectedIterationId ?? undefined,
      per_page: 100,
    });

    if (issuesResult.success && issuesResult.data) {
      setSprintIssues(issuesResult.data.map(mapGitLabIssueToMock));
    }
  } catch (err) {
    console.error('[Issue Manager] Sprint fetch failed:', err);
  } finally {
    setLoadingSprint(false);
  }
}, [isConfigured, config.gitlab, selectedIterationId]);
```

Key change: removed the `fetchCurrentIteration` call inside — now uses `selectedIterationId` from state. Added `selectedIterationId` to the dependency array.

**Step 4: Update the mount/user-change effect to also trigger on iteration change**

The existing effect at line 129-133 already depends on `fetchSprintIssues` (which now has `selectedIterationId` in its deps), so it will automatically re-trigger when the iteration changes. No change needed here.

**Step 5: Run build check**

Run: `npx vitest run src/components/issues/IssueManagerView.test.tsx --reporter=verbose 2>&1 | tail -20`
Expected: PASS (existing tests still work — they mock `fetchCurrentIteration` returning empty, so `selectedIterationId` stays null, matching current behavior)

**Step 6: Commit**

```bash
git add src/components/issues/IssueManagerView.tsx
git commit -m "feat: add iteration state and mount logic to IssueManagerView"
```

---

### Task 3: Fix server-side search to include iteration filter

**Files:**
- Modify: `src/components/issues/IssueManagerView.tsx:176-196`

**Step 1: Add `iteration_id` to the search `fetchGroupIssues` call**

In the server-side search `useEffect` (line 176-196), find the `fetchGroupIssues` call at line 183. Add `iteration_id`:

```typescript
fetchGroupIssues(config.gitlab, config.gitlab.rootGroupId, {
  assignee_username: viewingUser.username,
  iteration_id: selectedIterationId ?? undefined,
  search: trimmed,
  per_page: 50,
})
```

**Step 2: Add `selectedIterationId` to the effect's dependency array**

The current dependency array is:
```typescript
}, [search, activeTab, viewingUser, isConfigured, config.gitlab, fetchSprintIssues]);
```

`selectedIterationId` is already captured via `fetchSprintIssues` callback deps, but the search effect references it directly now. Add it:

```typescript
}, [search, activeTab, viewingUser, isConfigured, config.gitlab, fetchSprintIssues, selectedIterationId]);
```

**Step 3: Run tests**

Run: `npx vitest run src/components/issues/IssueManagerView.test.tsx --reporter=verbose 2>&1 | tail -20`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/issues/IssueManagerView.tsx
git commit -m "fix: include iteration_id in server-side sprint search"
```

---

### Task 4: Add the iteration dropdown UI

**Files:**
- Modify: `src/components/issues/IssueManagerView.tsx:252-344` (sprint tab filter row area)

**Step 1: Create a date formatting helper**

Add at the top of the file (after imports, before the component):

```typescript
function formatIterationLabel(iter: GitLabIteration, currentId: number | null): string {
  const start = new Date(iter.start_date);
  const end = new Date(iter.due_date);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const label = `${fmt(start)} – ${fmt(end)}`;
  return iter.id === currentId ? `${label} · Current` : label;
}
```

> **Note:** `currentId` here refers to the iteration that has `state: 2` (the current active iteration from the API), NOT `selectedIterationId`. We need to track which iteration is "current" separately. Add one more piece of state:
>
> ```typescript
> const [currentIterationId, setCurrentIterationId] = useState<number | null>(null);
> ```
>
> And in the mount effect, after `const currentId = currentResult.data?.[0]?.id ?? null;`, add:
> ```typescript
> setCurrentIterationId(currentId);
> ```

**Step 2: Add the dropdown JSX**

Inside the sprint tab filter row (after the "My Issues" button, before the closing `</div>` of the sprint filter section at ~line 344), add:

```typescript
{/* Iteration dropdown */}
{iterations.length > 0 && (
  <select
    data-testid="iteration-dropdown"
    value={selectedIterationId ?? ''}
    onChange={(e) => {
      const val = e.target.value;
      setSelectedIterationId(val ? Number(val) : null);
    }}
    disabled={loadingIterations}
    style={{
      padding: '4px 8px',
      borderRadius: 6,
      border: '1px solid var(--col-border-illustrative)',
      background: 'var(--col-background-ui-10, #fff)',
      fontSize: 11,
      fontFamily: F,
      fontWeight: 300,
      color: 'var(--col-text-primary)',
      cursor: 'pointer',
      outline: 'none',
      maxWidth: 180,
      whiteSpace: 'nowrap',
    }}
  >
    <option value="">All Iterations</option>
    {iterations.map((iter) => (
      <option key={iter.id} value={iter.id}>
        {formatIterationLabel(iter, currentIterationId)}
      </option>
    ))}
  </select>
)}
```

**Step 3: Run build check**

Run: `npx tsc --noEmit 2>&1 | tail -10`
Expected: No errors

**Step 4: Run tests**

Run: `npx vitest run src/components/issues/IssueManagerView.test.tsx --reporter=verbose 2>&1 | tail -20`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/issues/IssueManagerView.tsx
git commit -m "feat: add iteration dropdown UI to sprint view"
```

---

### Task 5: Add iteration dropdown tests

**Files:**
- Modify: `src/components/issues/IssueManagerView.test.tsx`

**Step 1: Update the mock to include `fetchRecentIterations`**

In the `vi.mock('@/services/gitlab/gitlabClient')` block at the top, add:

```typescript
fetchRecentIterations: vi.fn().mockResolvedValue({
  success: true,
  data: [
    { id: 207814, iid: 50, group_id: 478494, title: null, state: 2, start_date: '2026-03-18', due_date: '2026-03-31', web_url: '' },
    { id: 207000, iid: 49, group_id: 478494, title: null, state: 3, start_date: '2026-03-04', due_date: '2026-03-17', web_url: '' },
  ],
}),
```

Also update `fetchCurrentIteration` mock to return a matching current iteration:

```typescript
fetchCurrentIteration: vi.fn().mockResolvedValue({
  success: true,
  data: [{ id: 207814, iid: 50, group_id: 478494, title: null, state: 2, start_date: '2026-03-18', due_date: '2026-03-31', web_url: '' }],
}),
```

**Step 2: Write the tests**

Add to the `describe('IssueManagerView')` block:

```typescript
it('renders iteration dropdown on sprint tab', async () => {
  renderWithAuth(<IssueManagerView />);
  await waitFor(() => expect(screen.getByTestId('iteration-dropdown')).toBeTruthy());
});

it('iteration dropdown has "All Iterations" option plus fetched iterations', async () => {
  renderWithAuth(<IssueManagerView />);
  await waitFor(() => {
    const dropdown = screen.getByTestId('iteration-dropdown') as HTMLSelectElement;
    expect(dropdown.options.length).toBe(3); // All + 2 iterations
    expect(dropdown.options[0]!.textContent).toBe('All Iterations');
  });
});

it('current iteration is auto-selected', async () => {
  renderWithAuth(<IssueManagerView />);
  await waitFor(() => {
    const dropdown = screen.getByTestId('iteration-dropdown') as HTMLSelectElement;
    expect(dropdown.value).toBe('207814');
  });
});

it('iteration dropdown hidden on epic tab', async () => {
  renderWithAuth(<IssueManagerView />);
  await waitFor(() => expect(screen.getByTestId('iteration-dropdown')).toBeTruthy());
  fireEvent.click(screen.getByTestId('tab-epic'));
  expect(screen.queryByTestId('iteration-dropdown')).toBeNull();
});

it('iteration dropdown hidden when no iterations returned', async () => {
  const { fetchRecentIterations } = await import('@/services/gitlab/gitlabClient');
  (fetchRecentIterations as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ success: true, data: [] });
  renderWithAuth(<IssueManagerView />);
  // Give time for async mount
  await waitFor(() => expect(screen.getByTestId('tab-sprint')).toBeTruthy());
  expect(screen.queryByTestId('iteration-dropdown')).toBeNull();
});
```

> **Note:** The `configStore` must have GitLab configured for these tests to hit the API mocks. Check if the existing tests set up `useConfigStore` — if so, replicate that setup. If not, iteration effects won't fire (the `if (!isConfigured)` guard returns early) and the dropdown won't render. In that case, add `useConfigStore.setState(...)` in `beforeEach` with `gitlab: { enabled: true, rootGroupId: '478494', ... }`.

**Step 3: Run tests**

Run: `npx vitest run src/components/issues/IssueManagerView.test.tsx --reporter=verbose 2>&1 | tail -30`
Expected: PASS — all existing + new tests green

**Step 4: Commit**

```bash
git add src/components/issues/IssueManagerView.test.tsx
git commit -m "test: add iteration dropdown tests for IssueManagerView"
```

---

### Task 6: Full test suite + build check

**Files:** None (verification only)

**Step 1: Run full test suite**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -30`
Expected: All tests pass (no regressions)

**Step 2: Run TypeScript build check**

Run: `npx tsc --noEmit 2>&1 | tail -10`
Expected: No errors

**Step 3: Final commit (if any adjustments were needed)**

```bash
git add -A
git commit -m "chore: iteration dropdown — final adjustments after full test run"
```

**Step 4: Push**

```bash
git push
```
