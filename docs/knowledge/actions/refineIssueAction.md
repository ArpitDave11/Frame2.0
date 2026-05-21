# refineIssueAction

[src/actions/refineIssueAction.ts](../../../src/actions/refineIssueAction.ts)

Boundary layer between the Issue Refinery UI / store and the pure pipeline orchestrator + GitLab client. Mirrors the pattern of `refinePipelineAction.ts` (the epic-pipeline boundary).

## Exports

### `bridgeLoadedEpicAction(groupId, epicIid, epic) → Promise<boolean>`
Called by `IssueRefineryView` when `gitlabStore.selectedEpic` changes. Calls `gitlabClient.fetchEpicIssues`, pushes the result into `issueRefineryStore.setSelectedEpic`, and returns `true` on success / `false` on failure (used by the view's effect to decide whether to persist the "bridged" iid ref). On failure, surfaces an error toast via `uiStore`.

### `refineSelectedIssue() → Promise<void>`
Runs the 3-stage pipeline against the selected child issue and writes results to the store. Fire-and-forget from UI.

Precondition checks:
- Epic + child selected — else error toast, no-op.
- Phase is `idle` / `ready` / `error` — else no-op (in-flight guard, B-C2).
- Both bodies ≤ 50,000 chars — else error toast, no-op (B-I8).

Drives the pipeline:
- `clearResults()` on the store before kickoff.
- `runIssuePipeline(aiConfig, epicBody, issueBody, { onStageStart })` where the callback advances `phase` through `comprehending → refining → validating`.
- Stale-child guard: captures `selectedChildIid` at start; if it changes mid-pipeline, all subsequent store writes (phase, results, error) are suppressed (B-C2 stale-child).
- On success: writes `comprehension`, `refinedDraft` (userEdited=false), `validation`; `phase='ready'`.
- On failure: `phase='error'` + error message + toast.

### `publishRefinedIssue() → Promise<void>`
Calls `gitlabClient.updateIssue(projectId, issueIid, { description: refinedDraft })` to PUT the refined body back to GitLab.

Precondition checks:
- Non-empty refined draft + selected child + known project_id — else error toast, no-op.
- Phase not in-flight — else no-op.

On success: `phase='idle'` + success toast.
On failure: `phase='error'` + error message preserved; refined draft is NOT cleared so the user can retry or copy out.

Per locked design decision D7: always-overwrite (no `updated_at` concurrency check in v1).
