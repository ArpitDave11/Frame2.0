/**
 * GitLab Store — Phase 2 (T-2.5).
 *
 * Zustand store managing GitLab browsing, selection, publishing, and load modal state.
 * State-only — no API calls. Service layer (Phase 3) handles network requests.
 */

import { create } from 'zustand';
import type { GitLabEpic, GitLabEpicChild, GitLabLabel, GitLabIssue } from '@/services/gitlab/types';

// Re-export so existing imports from '@/stores/gitlabStore' still work
export type { GitLabEpic, GitLabEpicChild, GitLabLabel, GitLabIssue };

export interface GroupCacheEntry {
  subgroups: { id: string; name: string; full_path: string }[];
  fetchedAt: number;
}

export type IssueFilter = 'all' | 'active' | 'blocked';

// ─── State & Actions ────────────────────────────────────────

type EpicFilterState = 'opened' | 'closed' | 'all';

interface GitlabState {
  // Epic browsing
  epics: GitLabEpic[];
  loadingEpics: boolean;
  totalCount: number;
  searchTerm: string;
  filterState: EpicFilterState;
  filterLabels: string[];
  page: number;
  availableLabels: GitLabLabel[];

  // Selected epic
  selectedEpic: GitLabEpic | null;
  epicChildren: { epics: GitLabEpicChild[]; issues: GitLabEpicChild[] };
  loadingDetails: boolean;

  // Group navigation
  currentGroupId: string;
  breadcrumb: { id: string; name: string }[];
  groupCache: Record<string, GroupCacheEntry>;

  // Publish
  publishLevel: 'crew' | 'pod';
  publishTargetGroupId: string | null;
  isPublishing: boolean;
  publishStatus: { type: 'success' | 'error'; message: string } | null;

  // Issue management
  issues: GitLabIssue[];
  selectedIssueId: string | null;
  issueFilter: IssueFilter;
  issueSearchQuery: string;

  // Loaded epic context (set when user loads an epic from GitLab)
  loadedEpicIid: number | null;
  loadedGroupId: string | null;

  // Load modal
  loadModalOpen: boolean;
  loadSearchTerm: string;
  loadFilterState: EpicFilterState;
  loadResults: GitLabEpic[];
  loadingResults: boolean;
  includeDescendants: boolean;
}

interface GitlabActions {
  setSearchTerm: (term: string) => void;
  setFilterState: (state: EpicFilterState) => void;
  setPage: (page: number) => void;
  setSelectedEpic: (epic: GitLabEpic | null) => void;
  clearSelectedEpic: () => void;
  navigateToGroup: (groupId: string, groupName: string) => void;
  navigateUp: () => void;
  setPublishLevel: (level: 'crew' | 'pod') => void;
  setPublishTargetGroup: (groupId: string | null) => void;
  setPublishStatus: (status: { type: 'success' | 'error'; message: string } | null) => void;
  setIssues: (issues: GitLabIssue[]) => void;
  selectIssue: (id: string | null) => void;
  setIssueFilter: (filter: IssueFilter) => void;
  setIssueSearchQuery: (query: string) => void;
  setLoadedEpicContext: (epicIid: number, groupId: string) => void;
  clearLoadedEpicContext: () => void;
  openLoadModal: () => void;
  closeLoadModal: () => void;
  reset: () => void;
}

export type GitlabStore = GitlabState & GitlabActions;

// ─── Initial State ──────────────────────────────────────────

const INITIAL_STATE: GitlabState = {
  epics: [],
  loadingEpics: false,
  totalCount: 0,
  searchTerm: '',
  filterState: 'opened',
  filterLabels: [],
  page: 1,
  availableLabels: [],

  selectedEpic: null,
  epicChildren: { epics: [], issues: [] },
  loadingDetails: false,

  currentGroupId: '',
  breadcrumb: [],
  groupCache: {},

  publishLevel: 'crew',
  publishTargetGroupId: null,
  isPublishing: false,
  publishStatus: null,

  issues: [],
  selectedIssueId: null,
  issueFilter: 'all',
  issueSearchQuery: '',

  loadedEpicIid: null,
  loadedGroupId: null,

  loadModalOpen: false,
  loadSearchTerm: '',
  loadFilterState: 'opened',
  loadResults: [],
  loadingResults: false,
  includeDescendants: false,
};

// ─── Store ──────────────────────────────────────────────────

export const useGitlabStore = create<GitlabStore>()((set, get) => ({
  ...INITIAL_STATE,

  setSearchTerm: (term) => {
    set({ searchTerm: term });
  },

  setFilterState: (state) => {
    set({ filterState: state });
  },

  setPage: (page) => {
    set({ page });
  },

  setSelectedEpic: (epic) => {
    set({ selectedEpic: epic });
  },

  clearSelectedEpic: () => {
    set({ selectedEpic: null, epicChildren: { epics: [], issues: [] }, loadingDetails: false });
  },

  navigateToGroup: (groupId, groupName) => {
    const { breadcrumb } = get();
    set({
      currentGroupId: groupId,
      breadcrumb: [...breadcrumb, { id: groupId, name: groupName }],
    });
  },

  navigateUp: () => {
    const { breadcrumb } = get();
    if (breadcrumb.length === 0) return;
    const newBreadcrumb = breadcrumb.slice(0, -1);
    const parentId = newBreadcrumb.length > 0 ? newBreadcrumb[newBreadcrumb.length - 1]!.id : '';
    set({
      breadcrumb: newBreadcrumb,
      currentGroupId: parentId,
    });
  },

  setPublishLevel: (level) => {
    set({ publishLevel: level });
  },

  setPublishTargetGroup: (groupId) => {
    set({ publishTargetGroupId: groupId });
  },

  setPublishStatus: (status) => {
    set({ publishStatus: status });
  },

  setIssues: (issues) => {
    set({ issues });
  },

  selectIssue: (id) => {
    set({ selectedIssueId: id });
  },

  setIssueFilter: (filter) => {
    set({ issueFilter: filter });
  },

  setIssueSearchQuery: (query) => {
    set({ issueSearchQuery: query });
  },

  setLoadedEpicContext: (epicIid, groupId) => {
    set({ loadedEpicIid: epicIid, loadedGroupId: groupId });
  },

  clearLoadedEpicContext: () => {
    set({ loadedEpicIid: null, loadedGroupId: null, issues: [] });
  },

  openLoadModal: () => {
    set({ loadModalOpen: true });
  },

  closeLoadModal: () => {
    set({
      loadModalOpen: false,
      loadSearchTerm: '',
      loadFilterState: 'opened',
      loadResults: [],
      loadingResults: false,
      includeDescendants: false,
    });
  },

  reset: () => {
    set(INITIAL_STATE);
  },
}));
