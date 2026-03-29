# Iteration Dropdown Filter — Sprint View

**Date**: 2026-03-29
**Status**: Approved

## Goal

Add an iteration dropdown to the Issue Manager sprint view, allowing users to filter issues by iteration (sprint) — matching GitLab board behavior.

## Key Decision: Why Two-Step, Not `iteration_id=Current`

The GitLab Issues REST API documents `iteration_id` as `integer`. The only special string values are `None` and `Any`. `Current` is a Board-internal concept (maps to `-4`), not a documented Issues API parameter. The two-step approach (resolve iteration via `/iterations?state=current`, then pass numeric ID) is the correct, portable method for self-hosted GitLab.

## API Layer

### New function: `fetchRecentIterations`

```typescript
export async function fetchRecentIterations(
  config: GitLabConfig,
  groupId: string,
): Promise<GitLabIterationResult>
```

- Endpoint: `GET /groups/{groupId}/iterations?state=all&per_page=6&sort=desc&order_by=due_date`
- Returns: current + next upcoming + last 3-4 closed iterations
- Reuses existing `GitLabIteration` and `GitLabIterationResult` types

### Existing functions — no changes

- `fetchCurrentIteration` — stays as-is, used to identify default selection
- `fetchGroupIssues` — already accepts `iteration_id?: number`

### Mount: parallel fetch

```typescript
const [iterationsResult, currentResult] = await Promise.all([
  fetchRecentIterations(config.gitlab, groupId),
  fetchCurrentIteration(config.gitlab, groupId),
]);
```

## Component Changes

### Architecture: Component-local state in `IssueManagerView`

No new files. No store changes. Consistent with existing sprint state pattern.

### New state

```typescript
const [iterations, setIterations] = useState<GitLabIteration[]>([]);
const [selectedIterationId, setSelectedIterationId] = useState<number | null>(null);
const [loadingIterations, setLoadingIterations] = useState(false);
```

### `fetchSprintIssues` update

Uses `selectedIterationId` instead of fetching current iteration each time:

```typescript
const fetchSprintIssues = useCallback(async (username: string) => {
  const issuesResult = await fetchGroupIssues(config.gitlab, groupId, {
    assignee_username: username,
    iteration_id: selectedIterationId ?? undefined,
    per_page: 100,
  });
  // ...
}, [selectedIterationId, ...]);
```

### Server-side search fix

The existing debounced search (lines 176-196) calls `fetchGroupIssues` with `search` but is **missing `iteration_id`**. Fix: include `selectedIterationId` in the search re-fetch so results stay scoped to the selected iteration.

### Dropdown UI — inline in filter row

```
[User chip x] [Search users...] [v Mar 18 - Mar 31 *]
```

- Styled `<select>` or custom dropdown, UBS theme (Frutiger, `--col-*` vars)
- Each option: formatted date range, e.g., `Mar 4 - Mar 17`
- Current iteration gets a `* Current` suffix
- Disabled while `loadingIterations`

## UX Behavior

### Default state
- On mount: auto-selects current iteration, issues fetch immediately
- If no current iteration: no pre-selection, issues load without iteration filter

### Switching iterations
- Updates `selectedIterationId` -> re-fetches issues
- Current user preserved (no reset)
- Loading spinner on issues list

### Switching users
- Same `selectedIterationId` + new `assignee_username`
- Dropdown selection unchanged

### Tab switching
- Sprint tab: dropdown visible
- Epic tab: dropdown hidden
- Returning to sprint: selection preserved, no unnecessary re-fetch

### Edge cases
- 0 iterations from API: dropdown hidden, works as today
- Selected iteration has 0 issues: "No issues in this iteration"
- Network error on iterations fetch: dropdown hidden, fall back to current behavior

## Files Modified

1. `src/services/gitlab/gitlabClient.ts` — add `fetchRecentIterations`
2. `src/components/issues/IssueManagerView.tsx` — iteration state, dropdown, updated fetch logic, search fix
3. `src/services/gitlab/gitlabClient.test.ts` — test for `fetchRecentIterations`
4. `src/components/issues/IssueManagerView.test.tsx` — test iteration dropdown behavior
