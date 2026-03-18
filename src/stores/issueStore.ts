/**
 * Issue Store — Phase 2 (T-2.8).
 *
 * Zustand store managing parsed user stories, selection,
 * duplicate detection, and GitLab issue creation progress.
 */

import { create } from 'zustand';

// ─── Types ─────────────────────────────────────────────────

export interface ParsedUserStory {
  id: string;
  title: string;
  description: string;
  labels: string[];
  isDuplicate: boolean;
}

export interface ExistingIssue {
  id: number;
  iid: number;
  title: string;
  state: string;
  web_url: string;
}

export interface CreationProgress {
  current: number;
  total: number;
  currentTitle: string;
}

// ─── State & Actions ────────────────────────────────────────

interface IssueState {
  parsedStories: ParsedUserStory[];
  selectedStoryIds: string[];
  existingIssues: ExistingIssue[];
  isAnalyzing: boolean;
  isCreating: boolean;
  creationProgress: CreationProgress;
}

interface IssueActions {
  setParsedStories: (stories: ParsedUserStory[]) => void;
  toggleStorySelection: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  setExistingIssues: (issues: ExistingIssue[]) => void;
  setAnalyzing: (analyzing: boolean) => void;
  setCreating: (creating: boolean) => void;
  updateCreationProgress: (progress: CreationProgress) => void;
  reset: () => void;
}

export type IssueStore = IssueState & IssueActions;

// ─── Initial State ──────────────────────────────────────────

const INITIAL_STATE: IssueState = {
  parsedStories: [],
  selectedStoryIds: [],
  existingIssues: [],
  isAnalyzing: false,
  isCreating: false,
  creationProgress: { current: 0, total: 0, currentTitle: '' },
};

// ─── Store ──────────────────────────────────────────────────

export const useIssueStore = create<IssueStore>()((set, get) => ({
  ...INITIAL_STATE,

  setParsedStories: (stories) => {
    set({ parsedStories: stories });
  },

  toggleStorySelection: (id) => {
    const { selectedStoryIds } = get();
    if (selectedStoryIds.includes(id)) {
      set({ selectedStoryIds: selectedStoryIds.filter((s) => s !== id) });
    } else {
      set({ selectedStoryIds: [...selectedStoryIds, id] });
    }
  },

  selectAll: () => {
    const ids = get().parsedStories.filter((s) => !s.isDuplicate).map((s) => s.id);
    set({ selectedStoryIds: ids });
  },

  deselectAll: () => {
    set({ selectedStoryIds: [] });
  },

  setExistingIssues: (issues) => {
    set({ existingIssues: issues });
  },

  setAnalyzing: (analyzing) => {
    set({ isAnalyzing: analyzing });
  },

  setCreating: (creating) => {
    set({ isCreating: creating });
  },

  updateCreationProgress: (progress) => {
    set({ creationProgress: progress });
  },

  reset: () => {
    set(INITIAL_STATE);
  },
}));
