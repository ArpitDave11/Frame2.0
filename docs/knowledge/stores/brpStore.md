# brpStore

[src/stores/brpStore.ts](../../../src/stores/brpStore.ts) · [src/stores/brpStore.test.ts](../../../src/stores/brpStore.test.ts)

Zustand v5 store for the BRP tab. The single mutation surface for BRP
state. Holds inputs and raw data only — **never** derived values
(`variance`, `delta`, `totalCapacity`, `pod metrics` are all computed at
the call site via the pure functions in [`src/domain/brp.ts`](../domain/brp.md)).
Patterned on `initiativeStore.ts`. In-memory only — no persistence.

## State (13 fields)

| Group | Field | Type | Purpose |
|---|---|---|---|
| Domain | `crews` | `Crew[]` | Loaded crews (appended via `loadCrew`) |
| Domain | `currentPI` | `PI \| null` | Active Planning Increment |
| Nav | `view` | `'portfolio' \| 'pod'` | Workspace view |
| Nav | `selectedCrewId` | `string \| null` | Active crew |
| Nav | `selectedPodId` | `string \| null` | Active pod (drill-in view) |
| Nav | `selectedEpicId` | `string \| null` | Active epic (detail) |
| UI | `collapsedPods` | `Set<string>` | Which pods are folded in portfolio view |
| UI | `reGroomOnlyFilter` | `boolean` | Filter to `'re-groom'`-band epics |
| UI | `openModal` | `'capacity' \| 'epicPicker' \| 'podLoader' \| 'metrics' \| null` | Which modal is open |
| UI | `modalContext` | `{ podId?: string } \| null` | Context passed to the open modal |
| Process | `analysisStatus` | `'idle' \| 'running' \| 'done'` | Whole-pipeline lifecycle |

## Actions (15)

### Group 1 — Loading
| Action | Behavior |
|---|---|
| `loadCrew(crew)` | Appends (no dedup; caller's job) |
| `loadPods(crewId, pods)` | REPLACES the pod list on the target crew (no-op on unknown id) |
| `loadEpicsIntoPod(podId, epics)` | REPLACES the epic list on the target pod across any crew (no-op on unknown id) |
| `reset()` | Restores initial state via fresh `initialState()` factory. **Also aborts any in-flight `runAnalysis`** to prevent zombie writes after the loop's finally block |

### Group 2 — Capacity
| Action | Behavior |
|---|---|
| `updatePodCapacity(podId, inputs)` | Writes a defensively cloned `{ ...inputs }` to `pod.capacity`. Never stores `totalCapacity`. No-op on unknown pod |

### Group 3 — Estimates
| Action | Behavior |
|---|---|
| `setHumanEstimate(epicId, value \| null)` | Touches only `humanEstimate`. Variance re-derives via `computeVariance` at read |

### Group 4 — Analysis (DI-style — store imports only the `AIEstimator` interface)
| Action | Behavior |
|---|---|
| `runAnalysis(estimator, getReferences?, options?)` | Walks every loaded epic at kickoff. Per-epic: `raw` → `analyzing` → `done` (with frameResult) \| `error`. Whole-pipeline: `idle` → `running` → `done` \| `idle` (aborted). See cancellation rules below |
| `setEpicAnalysisStatus(epicId, status)` | Direct status setter. Does NOT clear an existing `frameResult` (re-runs preserve the prior result until the new one lands) |
| `setEpicFrameResult(epicId, result)` | Sets `frameResult` AND transitions status to `'done'` atomically — a `'done'` status without a `frameResult` would be a category violation |

### Group 5 — Navigation, UI, Modals
| Action | Behavior |
|---|---|
| `setView(view)` | `'portfolio'` ↔ `'pod'` |
| `selectCrew / selectPod / selectEpic(id \| null)` | Independent selection setters |
| `togglePodCollapse(podId)` | Toggles in `collapsedPods`. Returns a FRESH `Set` so identity-based selectors re-render |
| `setReGroomOnlyFilter(enabled)` | Boolean toggle |
| `openModalFor(modal, context?)` | REPLACES previous modal+context wholesale (no merge). `modal` is typed `Exclude<BrpModal, null>` so callers can't open the "null modal" — use `closeModal` |
| `closeModal()` | Clears modal + context atomically |
| `setCurrentPI(pi \| null)` | Active PI setter |

## `runAnalysis` cancellation & concurrency

Deep-review C1 fix. Three guarantees:

1. **Concurrency guard.** Re-entry while already `'running'` is a no-op. No interleaved loops via shared `set()` calls.
2. **Internal `AbortController`** (module-level, tied to store singleton lifecycle). `reset()` aborts it before clearing state. The loop checks `signal.aborted` between epics AND between events.
3. **External `options.signal`** composed via `addEventListener('abort', ..., { once: true })`. Aborting from outside (Phase 6 UI's Cancel button) flows through the same path.

Aborted runs terminate in `analysisStatus: 'idle'` (not `'done'`).

**Defensive epicId check.** Inside the for-await loop:
```ts
if (event.epicId !== epic.id) continue;
```
A buggy estimator can't overwrite an unrelated epic's state by claiming a different `epicId` in its emitted events (deep-review I1).

## Invariants
- **No derived state** ever lives in `state`. Asserted by a programmatic test that diffs `Object.keys(crew/pod/epic)` against the allowed list and `not.toHaveProperty('variance' | 'delta' | 'frameEstimate' | 'totalCapacity')`.
- **Capacity inputs are defensively cloned** at write time — a Phase 6 caller mutating the same object afterward cannot leak into stored state (I3).
- **Stale `frameResult` after a re-run** does NOT contribute to `frameLoad` / `avgConfidence` — `computePodMetrics` requires `analysisStatus === 'done'` (I4).
- **No persistence.** Local storage, session storage, IndexedDB — none used.

## Test count
49 tests (B-5 loading + B-6 capacity/estimates/analysis + B-7 nav/UI/modal + deep-review additions for C1/I1/I3/I11/I13/I14).

## Consumers
- Phase 5 components (`BrpView`, `PortfolioView`, `PodView`, etc. — not yet built).
- Phase 6 wiring layer — supplies `getReferences` callback to `runAnalysis` and the active `AIEstimator` from [`getEstimator()`](../services/brp/simulatedEstimator.md#provider).
- Headless tests today exercise the entire surface via direct calls.
