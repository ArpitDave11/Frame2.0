/**
 * BRP Store — Phase 2 (B-5..B-7).
 *
 * The single Zustand store for BRP. Holds two kinds of state — DOMAIN
 * (crews/pods/epics, PI) and UI (selection, view, modal, filters) — and
 * exposes one action per discrete thing a planner does.
 *
 * Architectural rule from Phase 1, enforced here: the store stores ONLY
 * inputs and raw data. It NEVER stores derived data — `variance`, `delta`,
 * `totalCapacity`, `pod metrics`. Those are computed by the pure functions
 * in `src/domain/brp.ts` at the call site (tests today, components in
 * Phase 5). A reviewer grep across this file MUST return zero matches for
 * `variance:`, `delta:`, or `totalCapacity:` as a field name.
 *
 * Patterned on `initiativeStore.ts` (when present on the branch). Style:
 * - `create<TStore>()` with INITIAL captured via a function so Set/array
 *   instances are fresh on every `reset()`.
 * - Functional `set((s) => ({ ... }))` for any update that reads prior state.
 * - Direct `set({ ... })` for simple writes.
 * - State, Actions, and Store types are separate exports for testability.
 *
 * This file is built up across three B-tasks:
 *   B-5: state shape + Loading actions (loadCrew / loadPods / loadEpicsIntoPod / reset)
 *   B-6: Capacity, Estimates, Analysis actions
 *   B-7: Navigation, UI, Modal actions
 */

import { create } from 'zustand';
import type {
  AnalysisStatus,
  CapacityInputs,
  Crew,
  Epic,
  FrameResult,
  PI,
  Pod,
  ReferenceEpic,
} from '../domain/brp';
import type { AIEstimator } from '../services/brp/ai/types';

// ─── Types ─────────────────────────────────────────────────

export type BrpView = 'portfolio' | 'pod';

export type BrpModal = 'capacity' | 'epicPicker' | 'podLoader' | 'metrics' | null;

export interface BrpModalContext {
  podId?: string;
}

export type BrpAnalysisStatus = 'idle' | 'running' | 'done';

interface BrpState {
  // Domain
  crews: Crew[];
  currentPI: PI | null;

  // Navigation & selection
  view: BrpView;
  selectedCrewId: string | null;
  selectedPodId: string | null;
  selectedEpicId: string | null;

  // UI state
  collapsedPods: Set<string>;
  reGroomOnlyFilter: boolean;
  openModal: BrpModal;
  modalContext: BrpModalContext | null;

  // Process state
  analysisStatus: BrpAnalysisStatus;
}

/**
 * Caller-supplied reference resolver for `runAnalysis`. Given an epic, the
 * resolver returns the historical reference epics FRAME should consider.
 * The default (empty array) lets headless tests run without wiring P4's
 * GitLab service; Phase 6 supplies a real implementation that queries the
 * pod's closed epics.
 */
export type GetReferencesFn = (epic: Epic) => readonly ReferenceEpic[];

/**
 * Optional caller-supplied options for `runAnalysis`. Added post-deep-review
 * to address Critical finding C1 (no cancellation, no concurrency guard)
 * and Important findings I2/I7 (hung iterator / no timeout in interface).
 *
 * `signal`: caller can abort the run from outside (e.g., a "Cancel"
 * button). Combined with the store's internal AbortController, this
 * gives both UI cancellation and lifecycle cancellation (`reset()`).
 */
export interface RunAnalysisOptions {
  signal?: AbortSignal;
}

interface BrpActions {
  // Group 1 — Loading (B-5)
  loadCrew: (crew: Crew) => void;
  loadPods: (crewId: string, pods: Pod[]) => void;
  loadEpicsIntoPod: (podId: string, epics: Epic[]) => void;
  reset: () => void;

  // Group 2 — Capacity (B-6)
  updatePodCapacity: (podId: string, inputs: CapacityInputs) => void;

  // Group 3 — Estimates (B-6)
  setHumanEstimate: (epicId: string, value: number | null) => void;

  // Group 4 — Analysis (B-6)
  runAnalysis: (
    estimator: AIEstimator,
    getReferences?: GetReferencesFn,
    options?: RunAnalysisOptions,
  ) => Promise<void>;
  setEpicAnalysisStatus: (epicId: string, status: AnalysisStatus) => void;
  setEpicFrameResult: (epicId: string, result: FrameResult) => void;

  // Group 5 — Navigation, UI, Modals (B-7)
  setView: (view: BrpView) => void;
  selectCrew: (id: string | null) => void;
  selectPod: (id: string | null) => void;
  selectEpic: (id: string | null) => void;
  togglePodCollapse: (podId: string) => void;
  setReGroomOnlyFilter: (enabled: boolean) => void;
  openModalFor: (modal: Exclude<BrpModal, null>, context?: BrpModalContext) => void;
  closeModal: () => void;
  setCurrentPI: (pi: PI | null) => void;
}

export type BrpStore = BrpState & BrpActions;

// ─── Run-lifecycle controller (module-level, tied to store singleton) ──
//
// Hidden from BrpState so subscribers don't re-render on its changes. Tracks
// the currently-active runAnalysis's AbortController so:
//   1. `reset()` can abort an in-flight run cleanly.
//   2. A re-entry guard can be implemented by checking analysisStatus
//      AND that no controller is live.
//
// Zustand stores are module-singletons, so a module-level mutable matches
// the store's lifecycle. Test isolation comes from calling `reset()` in
// `beforeEach`, which now also aborts any in-flight run.

let currentRunController: AbortController | null = null;

// ─── Initial State ─────────────────────────────────────────

/**
 * Return a fresh BrpState. Wrapped in a function so `reset()` always gets
 * a new Set instance for `collapsedPods` (and fresh arrays) — sharing a
 * mutable INITIAL across resets would be a subtle bug source.
 */
function initialState(): BrpState {
  return {
    crews: [],
    currentPI: null,
    view: 'portfolio',
    selectedCrewId: null,
    selectedPodId: null,
    selectedEpicId: null,
    collapsedPods: new Set<string>(),
    reGroomOnlyFilter: false,
    openModal: null,
    modalContext: null,
    analysisStatus: 'idle',
  };
}

// ─── Store ─────────────────────────────────────────────────

export const useBrpStore = create<BrpStore>()((set, get) => ({
  ...initialState(),

  // Group 1 — Loading -------------------------------------------------

  /**
   * Add a crew to the board. Appends — does not replace the list, so a
   * planner can stage multiple crews. Use `reset()` to clear all.
   * The caller (Phase 4 service) provides a Crew with its pods already
   * attached if known; otherwise pass empty pods and follow up with
   * `loadPods()`.
   */
  loadCrew: (crew) =>
    set((s) => ({ crews: [...s.crews, crew] })),

  /**
   * Replace the pods on a specific crew. Silently no-ops if the crew is
   * not found — the caller is expected to have loaded the crew first.
   * This is "replace" rather than "append": pods are the source of truth
   * for what's in a crew at a given moment.
   */
  loadPods: (crewId, pods) =>
    set((s) => ({
      crews: s.crews.map((c) => (c.id === crewId ? { ...c, pods } : c)),
    })),

  /**
   * Replace the epics on a specific pod, regardless of which crew the
   * pod belongs to. Silently no-ops if the pod is not found anywhere.
   * Replace (not append) — re-loading a pod's epics is the canonical
   * way to refresh from GitLab.
   */
  loadEpicsIntoPod: (podId, epics) =>
    set((s) => ({
      crews: s.crews.map((c) => ({
        ...c,
        pods: c.pods.map((p) => (p.id === podId ? { ...p, epics } : p)),
      })),
    })),

  /**
   * Restore the store to its empty initial state. Fresh Set + arrays —
   * never re-uses references from a prior session. Also aborts any
   * in-flight `runAnalysis` so its finally-block lands on the cleared
   * state without zombie writes (deep-review Critical C1).
   */
  reset: () => {
    if (currentRunController) {
      currentRunController.abort();
      currentRunController = null;
    }
    set(initialState());
  },

  // Group 2 — Capacity ------------------------------------------------

  /**
   * Write the 5 raw capacity inputs to a pod. Silently no-ops if the pod
   * is not found. Crucially — this writes inputs, NOT `totalCapacity`.
   * The total is always `computeCapacity(inputs).total` at the call site,
   * which is the architectural invariant from Phase 1.
   */
  updatePodCapacity: (podId, inputs) =>
    set((s) => ({
      crews: s.crews.map((c) => ({
        ...c,
        pods: c.pods.map((p) => (p.id === podId ? { ...p, capacity: inputs } : p)),
      })),
    })),

  // Group 3 — Estimates -----------------------------------------------

  /**
   * Set the planner's estimate on an Epic, or clear it with `null`.
   * Searches across all crews' pods. Silently no-ops if the epic is not
   * found. Setting this does NOT touch any other field — variance and
   * delta re-derive on the next render because `computeVariance` reads
   * `humanEstimate` live.
   */
  setHumanEstimate: (epicId, value) =>
    set((s) => ({
      crews: s.crews.map((c) => ({
        ...c,
        pods: c.pods.map((p) => ({
          ...p,
          epics: p.epics.map((e) =>
            e.id === epicId ? { ...e, humanEstimate: value } : e,
          ),
        })),
      })),
    })),

  // Group 4 — Analysis ------------------------------------------------

  /**
   * Walk every epic loaded into the store and analyze it through the
   * supplied estimator. The estimator is dependency-injected (the store
   * imports only the AIEstimator interface from `services/brp/ai/types`,
   * never an implementation) which is what keeps Phase 2 swappable
   * between simulator (Phase 3) and a real LLM (Phase 7).
   *
   * Scope (v1): every epic across every crew/pod. Phase 6 wiring may
   * pre-filter the loaded state if the planner wants to analyze a
   * subset; we keep the action signature minimal here to avoid leaking
   * UI-scope decisions into the store.
   *
   * Per-epic lifecycle:
   *   raw → analyzing (set immediately before the estimator call)
   *   → done with frameResult (on 'done' event)
   *   → error (on 'error' event — frameResult stays null)
   *
   * Whole-pipeline lifecycle:
   *   idle → running (at start)
   *   → done (every epic finished, success or error)
   *   → idle (aborted via `reset()` or `options.signal`)
   *
   * Cancellation (deep-review Critical C1, Important I2/I7):
   *   - Re-entry while already 'running' is a no-op (concurrency guard).
   *   - `reset()` aborts any in-flight run; the run ends in 'idle' state
   *     and writes nothing further to the (now-cleared) store.
   *   - `options.signal` lets a caller (Phase 6 UI) abort the run
   *     externally. The internal AbortController is composed with it.
   *   - The estimator is passed `controller.signal` so it can cooperate.
   *   - Between epics and between events, the loop checks
   *     `controller.signal.aborted` and short-circuits.
   *
   * Defensive: event.epicId MUST match the epic currently being analyzed
   * (deep-review Important I1). Mismatched events are silently dropped
   * — never a cross-epic write.
   *
   * `getReferences` defaults to returning [] so headless tests don't need
   * a GitLab integration. Phase 6 wires a real per-epic reference resolver.
   */
  runAnalysis: async (estimator, getReferences = () => [], options = {}) => {
    // Concurrency guard (C1): a second call while a first is in flight
    // is a no-op. Re-entrancy was a real corruption risk before this
    // guard — two interleaved loops sharing `set()` calls.
    if (get().analysisStatus === 'running') return;

    // Internal controller composed with optional caller signal.
    const controller = new AbortController();
    currentRunController = controller;
    if (options.signal) {
      if (options.signal.aborted) {
        controller.abort();
      } else {
        options.signal.addEventListener('abort', () => controller.abort(), { once: true });
      }
    }

    set({ analysisStatus: 'running' });

    // Snapshot the epic IDs at start. Walking the live store would risk
    // missing newly-loaded epics or revisiting analyzed ones — neither
    // is desirable. v1 semantics: "analyze whatever was loaded at kickoff".
    const epicIds = get().crews.flatMap((c) =>
      c.pods.flatMap((p) => p.epics.map((e) => e.id)),
    );

    try {
      for (const epicId of epicIds) {
        if (controller.signal.aborted) break;

        // Re-read the epic each iteration in case prior actions mutated it.
        const epic = findEpic(get().crews, epicId);
        if (!epic) continue;

        get().setEpicAnalysisStatus(epicId, 'analyzing');
        try {
          for await (const event of estimator.analyzeEpic(
            epic,
            getReferences(epic),
            controller.signal,
          )) {
            if (controller.signal.aborted) break;
            // I1: defensive epicId match. A buggy/malicious estimator
            // could otherwise overwrite an unrelated epic's state.
            if (event.epicId !== epic.id) continue;
            if (event.kind === 'done') {
              get().setEpicFrameResult(epic.id, event.result);
            } else if (event.kind === 'error') {
              get().setEpicAnalysisStatus(epic.id, 'error');
            }
            // 'started' / 'progress' are observability-only in v1.
            // (Phase 5/6 will wire progress state — see acknowledged.md I6.)
          }
        } catch (err) {
          if (controller.signal.aborted) break;
          // Estimator threw outside the event stream — mark this epic
          // errored, surface in the console for the dev, and continue
          // with the rest of the run. Phase 5/6 may inject an onError
          // callback to surface to UI (see acknowledged.md I5).
          // eslint-disable-next-line no-console
          console.error(`[brpStore] runAnalysis: epic ${epicId} threw`, err);
          get().setEpicAnalysisStatus(epicId, 'error');
        }
      }
    } finally {
      // Clear the module controller only if it's still ours (defensive
      // against unexpected re-entry; the concurrency guard should make
      // this impossible).
      if (currentRunController === controller) {
        currentRunController = null;
      }
      // Terminal state: aborted → 'idle' (caller cancelled, no result);
      // otherwise → 'done'. If reset() already cleared state to 'idle'
      // via initialState(), this set is a no-op equivalent.
      if (controller.signal.aborted) {
        set({ analysisStatus: 'idle' });
      } else {
        set({ analysisStatus: 'done' });
      }
    }
  },

  /**
   * Set an epic's lifecycle status. Used by `runAnalysis` internally and
   * exposed for tests / Phase 6 manual flows. Does NOT clear `frameResult`
   * — that's a deliberate choice so re-setting to 'analyzing' for a
   * re-run keeps the previous result visible until the new one lands.
   */
  setEpicAnalysisStatus: (epicId, status) =>
    set((s) => ({
      crews: s.crews.map((c) => ({
        ...c,
        pods: c.pods.map((p) => ({
          ...p,
          epics: p.epics.map((e) =>
            e.id === epicId ? { ...e, analysisStatus: status } : e,
          ),
        })),
      })),
    })),

  /**
   * Set an epic's FrameResult AND transition status to 'done' in one
   * atomic update. The two go together — a 'done' status without a
   * frameResult is a category violation, so the action enforces them
   * as a pair.
   */
  setEpicFrameResult: (epicId, result) =>
    set((s) => ({
      crews: s.crews.map((c) => ({
        ...c,
        pods: c.pods.map((p) => ({
          ...p,
          epics: p.epics.map((e) =>
            e.id === epicId
              ? { ...e, frameResult: result, analysisStatus: 'done' as const }
              : e,
          ),
        })),
      })),
    })),

  // Group 5 — Navigation, UI, Modals ---------------------------------

  /** Switch the workspace view: portfolio (cross-crew) ↔ pod (drill-in). */
  setView: (view) => set({ view }),

  /** Set the active crew, or pass null to clear the selection. */
  selectCrew: (id) => set({ selectedCrewId: id }),

  /** Set the active pod, or pass null to clear the selection. */
  selectPod: (id) => set({ selectedPodId: id }),

  /** Set the active epic, or pass null to clear the selection. */
  selectEpic: (id) => set({ selectedEpicId: id }),

  /**
   * Toggle whether a pod's epic list is collapsed in the portfolio view.
   * Returns a fresh Set instance per toggle so React re-renders see a
   * new reference (Sets compare by identity in selectors).
   */
  togglePodCollapse: (podId) =>
    set((s) => {
      const next = new Set(s.collapsedPods);
      if (next.has(podId)) next.delete(podId);
      else next.add(podId);
      return { collapsedPods: next };
    }),

  /** Toggle the "show only re-groom" filter on the portfolio. */
  setReGroomOnlyFilter: (enabled) => set({ reGroomOnlyFilter: enabled }),

  /**
   * Open a modal with optional context. `modalContext` is replaced
   * wholesale on each open — there is no merge semantics.
   */
  openModalFor: (modal, context) =>
    set({ openModal: modal, modalContext: context ?? null }),

  /** Close any open modal and clear its context in the same update. */
  closeModal: () => set({ openModal: null, modalContext: null }),

  /** Set the active Planning Increment (or clear with null). */
  setCurrentPI: (pi) => set({ currentPI: pi }),
}));

// ─── Internal helpers ───────────────────────────────────────

/** Walk crews → pods → epics looking for an id. Returns undefined if not found. */
function findEpic(crews: Crew[], epicId: string): Epic | undefined {
  for (const c of crews) {
    for (const p of c.pods) {
      const e = p.epics.find((ep) => ep.id === epicId);
      if (e) return e;
    }
  }
  return undefined;
}
