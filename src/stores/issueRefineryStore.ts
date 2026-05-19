/**
 * Issue Refinery — Zustand store (R-2).
 *
 * Drives the Issue Refinery tab. All state is in-memory; no persistence.
 * The store holds:
 *   - the selected parent epic + child-issue list (fetched via gitlabStore /
 *     gitlabClient — this store does not fetch anything itself)
 *   - the currently selected child issue
 *   - per-stage pipeline results (comprehension, refinedDraft, validation)
 *   - phase machine for UI rendering
 *   - dev-only `lastCachedTokens` for prompt-cache verification
 *
 * Phase machine (see `Phase` type):
 *   idle → comprehending → refining → validating → ready → publishing → idle | error
 *
 * Selecting a different child issue clears all per-issue derived state.
 */

import { create } from 'zustand';
import type { GitLabIssue } from '@/services/gitlab/types';
import type {
  ComprehensionResult,
  Phase,
  ValidationResult,
} from '@/pipeline/issue/types';

export interface SelectedEpic {
  groupId: string;
  epicIid: number;
  title: string;
  body: string;
}

export interface IssueRefineryState {
  // Selection
  selectedEpic: SelectedEpic | null;
  children: GitLabIssue[];
  selectedChildIid: number | null;
  originalBody: string | null;
  originalProjectId: number | null;

  // Pipeline outputs
  comprehension: ComprehensionResult | null;
  refinedDraft: string | null;
  userEditedDraft: boolean;
  validation: ValidationResult | null;

  // Status
  phase: Phase;
  error: string | null;

  // Observability (dev only — populated by the action layer)
  lastCachedTokens: number[];

  // Actions
  setSelectedEpic: (epic: SelectedEpic, children: GitLabIssue[]) => void;
  setSelectedChild: (iid: number) => void;
  setComprehension: (c: ComprehensionResult) => void;
  setRefinedDraft: (draft: string, userEdited: boolean) => void;
  setValidation: (v: ValidationResult) => void;
  setPhase: (p: Phase, error?: string | null) => void;
  recordCachedTokens: (n: number) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  selectedEpic: null,
  children: [],
  selectedChildIid: null,
  originalBody: null,
  originalProjectId: null,
  comprehension: null,
  refinedDraft: null,
  userEditedDraft: false,
  validation: null,
  phase: 'idle' as Phase,
  error: null,
  lastCachedTokens: [] as number[],
};

export const useIssueRefineryStore = create<IssueRefineryState>((set, get) => ({
  ...INITIAL_STATE,

  setSelectedEpic: (epic, children) =>
    set({
      selectedEpic: epic,
      children,
      // Selecting a new epic clears the previously selected child and
      // any cached pipeline results — they belong to the old context.
      selectedChildIid: null,
      originalBody: null,
      originalProjectId: null,
      comprehension: null,
      refinedDraft: null,
      userEditedDraft: false,
      validation: null,
      phase: 'idle',
      error: null,
      lastCachedTokens: [],
    }),

  setSelectedChild: (iid) => {
    const child = get().children.find((c) => c.iid === iid);
    if (!child) {
      // Unknown iid — no-op. Tests assert this.
      return;
    }
    set({
      selectedChildIid: iid,
      originalBody: child.description ?? '',
      originalProjectId: child.project_id ?? null,
      // Clear derived state from any prior child.
      comprehension: null,
      refinedDraft: null,
      userEditedDraft: false,
      validation: null,
      phase: 'idle',
      error: null,
      lastCachedTokens: [],
    });
  },

  setComprehension: (c) => set({ comprehension: c }),

  setRefinedDraft: (draft, userEdited) =>
    set({ refinedDraft: draft, userEditedDraft: userEdited }),

  setValidation: (v) => set({ validation: v }),

  setPhase: (p, error = null) => set({ phase: p, error }),

  recordCachedTokens: (n) =>
    set((s) => ({ lastCachedTokens: [...s.lastCachedTokens, n] })),

  reset: () => set({ ...INITIAL_STATE, lastCachedTokens: [] }),
}));
