/**
 * brpActions — orchestrating action layer for BRP (B-29).
 *
 * Composes brpGitlabService (data) + brpStore (state) + configStore
 * (auth/base URL) into thin async flows the UI consumes. The pattern
 * follows refinePipelineAction in the rest of FRAME: the pipeline /
 * service is pure, the store action is pure, and the only place
 * those two meet is in a dedicated action module.
 *
 * Each flow returns the Result<T> from brpGitlabService directly so
 * the UI can branch on success/error without parsing exceptions. The
 * UI is also responsible for surfacing toasts; the action layer only
 * dispatches to the store on success.
 *
 * The analysis flow (runAnalysis) lives in B-30 — it threads the
 * estimator and progress callback together and is large enough to
 * warrant its own module.
 */

import { useConfigStore } from '@/stores/configStore';
import { useBrpStore } from '@/stores/brpStore';
import {
  fetchCrews,
  fetchPodEpics,
  fetchPods,
  fetchReferenceEpics,
} from './brpGitlabService';
import type { Result } from './brpGitlabService';
import { getEstimator } from './ai/estimatorProvider';
import { getCapacityAssistant } from './ai/capacityAssistant';
import type { CapacitySuggestion } from './ai/capacityAssistant';
import type { CapacityInputs, Crew, Epic, Pod, ReferenceEpic } from '@/domain/brp';

/**
 * Snapshot the current GitLab config from configStore. Pulled out so
 * tests can replace it with a stub. Throws when GitLab integration
 * isn't enabled — the UI should guard against that before dispatching.
 */
function readGitLabConfig() {
  const cfg = useConfigStore.getState().config.gitlab;
  if (!cfg.enabled) {
    throw new Error('GitLab integration is disabled in settings');
  }
  return cfg;
}

/**
 * Load crews from GitLab and store them. Replaces any crews previously
 * loaded — the assumption is that BRP loads a single root group's
 * subgroups as crews; re-loading reflects a fresh slice of GitLab state.
 */
export async function loadCrewsAction(): Promise<Result<Crew[]>> {
  const cfg = readGitLabConfig();
  const result = await fetchCrews(cfg);
  if (result.success) {
    // Replace the entire crews collection. `loadCrew` appends to the
    // existing list, so we must reset first to avoid duplicates.
    useBrpStore.getState().reset();
    for (const crew of result.data) {
      useBrpStore.getState().loadCrew(crew);
    }
  }
  return result;
}

/**
 * Load pods for a crew. Looks up the crew in the store to find its
 * gitlabGroupId, fetches pods from that subgroup, and dispatches
 * `loadPods` into the store under the same crewId.
 *
 * If the crewId isn't loaded, returns an error result rather than
 * throwing — the UI may race a "Load pods" click against a reset.
 */
export async function loadPodsAction(crewId: string): Promise<Result<Pod[]>> {
  const crew = useBrpStore.getState().crews.find((c) => c.id === crewId);
  if (!crew) {
    return {
      success: false,
      error: {
        code: 'unknown',
        message: `Crew ${crewId} is not loaded; reload crews first.`,
      },
    };
  }
  const cfg = readGitLabConfig();
  const result = await fetchPods(cfg, crew.gitlabGroupId);
  if (result.success) {
    useBrpStore.getState().loadPods(crewId, result.data);
  }
  return result;
}

/**
 * Fetch candidate epics for a pod (does NOT add them — the EpicPicker
 * lets the planner choose which to add). Caller plumbs the result into
 * the picker's `candidates` prop.
 *
 * For convenience, the function is keyed by podId (not pod.gitlabSubgroupId)
 * so the caller doesn't have to look the pod up — same ergonomics as
 * the other actions.
 */
export async function listCandidateEpicsAction(
  podId: string,
): Promise<Result<Epic[]>> {
  const pod = findPod(useBrpStore.getState().crews, podId);
  if (!pod) {
    return {
      success: false,
      error: {
        code: 'unknown',
        message: `Pod ${podId} is not loaded.`,
      },
    };
  }
  const cfg = readGitLabConfig();
  return fetchPodEpics(cfg, pod.gitlabSubgroupId);
}

/**
 * Confirm the EpicPicker selection: merge the chosen epics with the
 * pod's already-loaded epics and dispatch the union via
 * loadEpicsIntoPod. The store action REPLACES (its contract — see its
 * docstring on the canonical refresh path), so the action layer is
 * responsible for the merge whenever the caller is adding rather than
 * refreshing.
 *
 * Synchronous — no GitLab call. Kept here for action-layer symmetry
 * with listCandidateEpicsAction.
 */
export function confirmAddEpicsAction(podId: string, chosen: Epic[]): void {
  const pod = findPod(useBrpStore.getState().crews, podId);
  if (!pod) return;
  const existingIds = new Set(pod.epics.map((e) => e.id));
  const additions = chosen.filter((e) => !existingIds.has(e.id));
  if (additions.length === 0) return;
  useBrpStore.getState().loadEpicsIntoPod(podId, [...pod.epics, ...additions]);
}

/**
 * Update a pod's CapacityInputs. Thin pass-through to the store; kept
 * here so the BrpView/CapacityDialog can route through a single
 * surface even though there's no async work.
 */
export function updateCapacityAction(podId: string, inputs: CapacityInputs): void {
  useBrpStore.getState().updatePodCapacity(podId, inputs);
}

/**
 * Ask the active CapacityAssistant for a capacity suggestion (B-33).
 * Fetches the pod's closed reference epics from GitLab and feeds them
 * to the assistant — the assistant itself is dependency-free of
 * GitLab. On reference fetch error, the assistant still runs against
 * an empty reference list and returns confidence 0.
 *
 * Returns null only when the pod is not loaded. The dialog should
 * disable its "Suggest" button in that case.
 */
export async function suggestCapacityAction(
  podId: string,
): Promise<CapacitySuggestion | null> {
  const pod = findPod(useBrpStore.getState().crews, podId);
  if (!pod) return null;

  let refs: readonly ReferenceEpic[] = [];
  try {
    const cfg = readGitLabConfig();
    const res = await fetchReferenceEpics(cfg, pod.gitlabSubgroupId);
    if (res.success) refs = res.data;
  } catch {
    // GitLab disabled or unreachable — fall through with empty refs.
    // The assistant degrades to "no data" + confidence 0.
  }

  return getCapacityAssistant().suggestCapacity(pod, refs);
}

// ─── B-30 Analysis flow ─────────────────────────────────────

/**
 * One failure surfaced by runAnalysisAction. Mirrors the shape the
 * AnalysisProgress component consumes, so the caller can drop the
 * `failures` field straight into the banner.
 */
export interface AnalysisFailure {
  epicId: string;
  message: string;
}

/**
 * Result returned from runAnalysisAction. `aborted` distinguishes a
 * planner-initiated cancel from a "completed but with failures" run —
 * the UI can use it to suppress the success banner when the planner
 * stopped the run themselves.
 */
export interface RunAnalysisActionResult {
  aborted: boolean;
  failures: AnalysisFailure[];
}

/**
 * Reference resolver factory. For each pod, fetch the pod's closed
 * epics ONCE and memoize the result so repeat lookups for each epic
 * in that pod don't re-fire the GitLab call. The estimator gets a
 * synchronous lookup (the store's runAnalysis expects a sync
 * GetReferencesFn for v1).
 *
 * Returns an empty list on fetch failure — references are an
 * estimator hint, not a hard requirement, so a transient error
 * shouldn't block the whole analysis.
 */
async function buildReferenceResolver(
  pod: Pod,
): Promise<(epic: Epic) => readonly ReferenceEpic[]> {
  let refs: readonly ReferenceEpic[] = [];
  try {
    const cfg = readGitLabConfig();
    const res = await fetchReferenceEpics(cfg, pod.gitlabSubgroupId);
    if (res.success) refs = res.data;
  } catch {
    // GitLab disabled or otherwise unreachable — leave refs empty so
    // the run still completes against the simulator's own heuristics.
  }
  return () => refs;
}

/**
 * Detect whether the most recent runAnalysis call was cancelled.
 *
 * The store's `runAnalysis` does NOT throw on abort — it sets
 * `analysisStatus` to 'idle' in its finally block (see brpStore.ts
 * line ~457). So we cannot infer "aborted" from a thrown AbortError.
 * Two cheap signals tell us the truth:
 *   1. The caller's signal was aborted (planner clicked Cancel).
 *   2. After the run, the store ended in 'idle' instead of 'done'
 *      (the store's own AbortController fired — e.g., reset() called
 *      mid-run).
 *
 * Either signal indicates the run didn't complete. Caught post-B-32
 * deep-review (C1) — without this, a cancelled run reported
 * `aborted: false` and the UI showed a false-positive success banner.
 */
function detectAborted(signal?: AbortSignal): boolean {
  if (signal?.aborted) return true;
  if (useBrpStore.getState().analysisStatus === 'idle') return true;
  return false;
}

/**
 * Run analysis for every epic across every loaded crew/pod. Composes:
 *   - estimator from estimatorProvider (B-37 swaps the implementation)
 *   - empty reference resolver (no scope info to pick a pod's refs)
 *   - failures collector wired through RunAnalysisOptions.onError
 *   - AbortSignal wired through RunAnalysisOptions.signal
 *
 * Returns the collected failures + an `aborted` flag. Throws only if
 * the configStore guard fires (GitLab disabled at the moment of run).
 *
 * For per-pod runs prefer `runAnalysisForPodAction` — it scopes the
 * store walk and supplies real reference epics for the estimator.
 */
export async function runAnalysisAction(
  options: { signal?: AbortSignal } = {},
): Promise<RunAnalysisActionResult> {
  const estimator = getEstimator();
  const failures: AnalysisFailure[] = [];
  const resolver = () => [] as readonly ReferenceEpic[];

  await useBrpStore.getState().runAnalysis(estimator, resolver, {
    signal: options.signal,
    onError: (failure) => failures.push(failure),
  });

  return { aborted: detectAborted(options.signal), failures };
}

/**
 * Variant: run analysis for a SINGLE pod. Uses buildReferenceResolver
 * to give the estimator real references from the pod's closed epics,
 * and passes `podId` through to the store so the run is scoped to
 * only that pod's epics (B-32 C2 fix — previously this ran across
 * EVERY pod despite the name).
 */
export async function runAnalysisForPodAction(
  podId: string,
  options: { signal?: AbortSignal } = {},
): Promise<RunAnalysisActionResult> {
  const pod = findPod(useBrpStore.getState().crews, podId);
  if (!pod) {
    return {
      aborted: false,
      failures: [
        {
          epicId: '<missing-pod>',
          message: `Pod ${podId} is not loaded.`,
        },
      ],
    };
  }
  const estimator = getEstimator();
  const failures: AnalysisFailure[] = [];
  const resolver = await buildReferenceResolver(pod);

  await useBrpStore.getState().runAnalysis(estimator, resolver, {
    signal: options.signal,
    onError: (failure) => failures.push(failure),
    podId,
  });

  return { aborted: detectAborted(options.signal), failures };
}

// ─── Internal ───────────────────────────────────────────────

function findPod(crews: readonly Crew[], podId: string): Pod | null {
  for (const c of crews) {
    const p = c.pods.find((x) => x.id === podId);
    if (p) return p;
  }
  return null;
}
