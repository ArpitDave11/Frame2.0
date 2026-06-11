/**
 * Pipeline Store — Phase 2 (T-2.2).
 *
 * Zustand store managing the 6-stage AI refine pipeline state:
 * running status, per-stage progress, result, and error handling.
 */

import { create } from 'zustand';
import type { ValidationOutput } from '@/pipeline/pipelineTypes';

// ─── Placeholder Types (Phase 4 will provide real ones) ─────

export type StageStatus = 'pending' | 'running' | 'complete' | 'error';

export interface PipelineResult {
  refinedMarkdown: string;
  category: string;
  categoryConfidence: number;
  sectionCount: number;
  storyCount: number;
  wordCount: number;
  validationScore: number;
  stages: Record<1 | 2 | 3 | 4 | 5 | 6, {
    status: StageStatus;
    message: string;
    durationMs: number;
  }>;
}

// ─── Stage Entry ────────────────────────────────────────────

interface StageEntry {
  status: StageStatus;
  message: string;
  /** Start of the latest pass over this stage (iterative stages re-run 4→6). */
  startedAt?: number | null;
  finishedAt?: number | null;
}

type StageNumber = 1 | 2 | 3 | 4 | 5 | 6;

function pendingStage(): StageEntry {
  return { status: 'pending', message: '', startedAt: null, finishedAt: null };
}

function createPendingStages(): Record<StageNumber, StageEntry> {
  return { 1: pendingStage(), 2: pendingStage(), 3: pendingStage(), 4: pendingStage(), 5: pendingStage(), 6: pendingStage() };
}

// ─── State & Actions ────────────────────────────────────────

interface PipelineState {
  isRunning: boolean;
  stages: Record<StageNumber, StageEntry>;
  result: PipelineResult | null;
  error: string | null;
  showPanel: boolean;
  currentIteration: number;
  maxIterations: number;
  lastValidation: ValidationOutput | null;
  /** Wall-clock start of the current run (drives the elapsed display). */
  runStartedAt: number | null;
  /** Human explanation of the current loop state, e.g. "Score 62 < 75 — re-refining (pass 2/3)". */
  statusNote: string | null;
}

interface PipelineActions {
  startPipeline: () => void;
  updateStage: (stage: StageNumber, status: StageStatus, message: string) => void;
  completePipeline: (result: PipelineResult) => void;
  failPipeline: (error: string) => void;
  setShowPanel: (show: boolean) => void;
  setCurrentIteration: (n: number) => void;
  setMaxIterations: (n: number) => void;
  setLastValidation: (v: ValidationOutput | null) => void;
  setStatusNote: (note: string | null) => void;
  reset: () => void;
}

export type PipelineStore = PipelineState & PipelineActions;

// ─── Initial State ──────────────────────────────────────────

const INITIAL_STATE: PipelineState = {
  isRunning: false,
  stages: createPendingStages(),
  result: null,
  error: null,
  showPanel: false,
  currentIteration: 0,
  maxIterations: 3,
  lastValidation: null,
  runStartedAt: null,
  statusNote: null,
};

// ─── Store ──────────────────────────────────────────────────

export const usePipelineStore = create<PipelineStore>()((set, get) => ({
  ...INITIAL_STATE,

  startPipeline: () => {
    if (get().isRunning) return;
    set({
      isRunning: true,
      stages: createPendingStages(),
      result: null,
      error: null,
      showPanel: true,
      currentIteration: 0,
      maxIterations: 3,
      lastValidation: null,
      runStartedAt: Date.now(),
      statusNote: null,
    });
  },

  updateStage: (stage, status, message) => {
    const { stages } = get();
    const prev = stages[stage];
    const now = Date.now();
    // A stage re-entering 'running' (iterative loop) restarts its pass timer
    const startedAt =
      status === 'running'
        ? prev.status === 'running' ? (prev.startedAt ?? now) : now
        : (prev.startedAt ?? now);
    const finishedAt = status === 'complete' || status === 'error' ? now : null;
    set({
      stages: { ...stages, [stage]: { status, message, startedAt, finishedAt } },
    });
  },

  completePipeline: (result) => {
    set({ isRunning: false, result });
  },

  /** Caller should updateStage(n, 'error', msg) before calling failPipeline */
  failPipeline: (error) => {
    set({ isRunning: false, error });
  },

  setShowPanel: (show) => {
    set({ showPanel: show });
  },

  setCurrentIteration: (n) => {
    set({ currentIteration: n });
  },

  setMaxIterations: (n) => {
    set({ maxIterations: n });
  },

  setLastValidation: (v) => {
    set({ lastValidation: v });
  },

  setStatusNote: (note) => {
    set({ statusNote: note });
  },

  reset: () => {
    set({ ...INITIAL_STATE, stages: createPendingStages() });
  },
}));
