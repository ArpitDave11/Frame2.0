# brpActions

Thin async orchestration layer that connects `brpGitlabService` (data),
`brpStore` (state), and the AI seams under `services/brp/ai/`. Lives
at `src/services/brp/brpActions.ts`. The BrpView component is the
sole consumer; component primitives never reach into the store or
service directly.

## What lives here

| Action | Returns | Side effects |
|---|---|---|
| `loadCrewsAction()` | `Result<Crew[]>` | resets brpStore, loads result on success, audit `crews-loaded` |
| `loadPodsAction(crewId)` | `Result<Pod[]>` | dispatches `loadPods`, audit `pods-loaded` |
| `listCandidateEpicsAction(podId)` | `Result<Epic[]>` | NO store mutation — caller routes through `confirmAddEpicsAction` |
| `confirmAddEpicsAction(podId, chosen)` | `void` | merges with existing epics, audit `epics-added` |
| `updateCapacityAction(podId, inputs)` | `void` | dispatches `updatePodCapacity`, audit `capacity-updated` |
| `setHumanEstimateAction(epicId, value)` | `void` | dispatches `setHumanEstimate`, audit `human-estimate-set` |
| `runAnalysisAction({signal})` | `{ aborted, failures }` | runs estimator across all pods (legacy path) |
| `runAnalysisForPodAction(podId, {signal})` | `{ aborted, failures }` | scoped per-pod run with the active estimator + closed-epic refs |
| `suggestCapacityAction(podId)` | `CapacitySuggestion \| null` | reads refs + asks active CapacityAssistant |
| `interpretVarianceAction(epicId)` | `VarianceInterpretation \| null` | asks active VarianceInterpreter |
| `findDuplicatesInPodAction(podId)` | `DuplicateGroup[]` | asks active DuplicateDetector against pod epics |

## Why merge-on-add lives here

`brpStore.loadEpicsIntoPod` is a REPLACE — that's the right contract
for "refresh epics from GitLab". The picker, however, returns the
newly-checked subset (pre-loaded epics are already on the pod and the
planner can't uncheck them). So `confirmAddEpicsAction` reads the
current epics + merges before dispatching. This keeps the store
contract clean and lets the picker stay dumb.

## Cancel + abort

`runAnalysisForPodAction` does NOT throw on abort — `brpStore.runAnalysis`
silently sets `analysisStatus` to `'idle'` in its `finally` block. The
action layer detects cancellation by checking `signal.aborted` OR
`useBrpStore.getState().analysisStatus === 'idle'` after the await.
Either signal indicates the run didn't complete. This was deep-review
finding C1 — the previous try/catch on `AbortError` was dead code.

## Pod scoping

`RunAnalysisOptions.podId` (added in B-32) restricts the store walk to
one pod's epics. `runAnalysisForPodAction` passes it; the legacy
`runAnalysisAction` does not (kept for completeness — no UI uses it).

## Audit log integration

Every mutating action logs to `auditLog.ts`. The audit is fire-and-forget;
listeners (`subscribeAuditLog`) react asynchronously. Adding a new flow
means adding one `recordAudit(...)` line — the tests for that flow
should assert the event fires.

## Testing

- `brpActions.test.ts` mocks `brpGitlabService` and exercises every
  data-loading flow (happy path, network error, GitLab disabled,
  unknown crew/pod).
- `brpActions.analysis.test.ts` mocks `estimatorProvider` and
  `fetchReferenceEpics`; uses `AsyncIterable<AnalysisEvent>` stubs
  to drive `runAnalysisForPodAction`.
- The audit-log integration is unit-tested at the action layer (each
  action's happy path asserts the right kind/summary/details).
