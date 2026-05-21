# issueRefineryStore

[src/stores/issueRefineryStore.ts](../../../src/stores/issueRefineryStore.ts)

Zustand v5 store for the Issue Refinery tab. In-memory only — refined drafts that the user has not published are lost on refresh. Intentional for v1 to avoid surfacing stale drafts that may conflict with upstream edits.

## State

| Field | Type | Purpose |
|---|---|---|
| `selectedEpic` | `SelectedEpic \| null` | `{ groupId, epicIid, title, body }` |
| `children` | `GitLabIssue[]` | Direct child issues of `selectedEpic` |
| `selectedChildIid` | `number \| null` | Currently selected child |
| `originalBody` | `string \| null` | Description of the selected child (read-only) |
| `originalProjectId` | `number \| null` | Project that owns the selected child (target for PUT) |
| `comprehension` | `ComprehensionResult \| null` | Stage 1 output |
| `refinedDraft` | `string \| null` | Stage 2 output (or user-edited version) |
| `userEditedDraft` | `boolean` | Drives the Publish confirm dialog |
| `validation` | `ValidationResult \| null` | Stage 3 output |
| `phase` | `Phase` | State machine; see [types.md](../pipeline/issue/types.md) |
| `error` | `string \| null` | Set when `phase='error'` |
| `lastCachedTokens` | `number[]` | Reserved for future aiClient extension (currently unused) |

## Actions

| Action | Behavior |
|---|---|
| `setSelectedEpic(epic, children)` | Replaces epic + child list; clears all per-issue derived state |
| `setSelectedChild(iid)` | No-op for unknown iid; otherwise pulls `description` + `project_id` from the matching child and clears derived state |
| `setComprehension(c)` | Writes Stage 1 output |
| `setRefinedDraft(draft, userEdited)` | Writes Stage 2 output; the boolean flag drives the Publish confirm |
| `setValidation(v)` | Writes Stage 3 output |
| `setPhase(p, error?)` | Advances phase + (optionally) sets error message |
| `recordCachedTokens(n)` | Append to `lastCachedTokens` (currently unused by the action layer) |
| `clearResults()` | Clears `comprehension` / `refinedDraft` / `userEditedDraft` / `validation` / `error` / `lastCachedTokens` without dropping the selected epic + child |
| `reset()` | Returns to initial state |

## Invariants
- Selecting a new epic OR a new child clears all per-child derived state.
- `clearResults()` is called by `refineIssueAction` before each pipeline kickoff so a mid-pipeline failure never leaves the UI mixing fresh + stale stage outputs (B-I1).
- The store has no persistence — `localStorage`, IndexedDB, etc. are not used.

## Consumers
- [`IssueRefineryView`](../components/issueRefinery/IssueRefineryView.md)
- [`ChildIssueList`](../components/issueRefinery/ChildIssueList.md)
- [`ComprehensionCard`](../components/issueRefinery/ComprehensionCard.md)
- [`RefinedIssueCard`](../components/issueRefinery/RefinedIssueCard.md)
- [`ValidationCard`](../components/issueRefinery/ValidationCard.md)
- [`PublishButton`](../components/issueRefinery/PublishButton.md)
- [`refineIssueAction`](../actions/refineIssueAction.md)
