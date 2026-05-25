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
import type { Crew, Epic, PI, Pod } from '../domain/brp';

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

interface BrpActions {
  // Group 1 — Loading (B-5)
  loadCrew: (crew: Crew) => void;
  loadPods: (crewId: string, pods: Pod[]) => void;
  loadEpicsIntoPod: (podId: string, epics: Epic[]) => void;
  reset: () => void;
}

export type BrpStore = BrpState & BrpActions;

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

export const useBrpStore = create<BrpStore>()((set) => ({
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
   * never re-uses references from a prior session.
   */
  reset: () => set(initialState()),
}));
