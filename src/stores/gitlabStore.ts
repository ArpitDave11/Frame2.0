/**
 * GitLab Store — Phase 2 (T-2.5).
 *
 * Zustand store managing GitLab browsing, selection, publishing, and load modal state.
 * State-only — no API calls. Service layer (Phase 3) handles network requests.
 */

import { create } from 'zustand';
import type { GitLabEpic, GitLabEpicChild, GitLabLabel, GitLabIssue, GitLabSubgroup, GitLabGroupMetadata } from '@/services/gitlab/types';
import { fetchGroupMetadata, fetchGitLabSubgroups, fetchGroupEpics } from '@/services/gitlab/gitlabClient';
import { useConfigStore } from '@/stores/configStore';

// Re-export so existing imports from '@/stores/gitlabStore' still work
export type { GitLabEpic, GitLabEpicChild, GitLabLabel, GitLabIssue };

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes (F12 requirement)

export interface GroupCacheEntry {
  metadata: GitLabGroupMetadata;
  subgroups: GitLabSubgroup[];
  epics: GitLabEpic[];
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
  loadingNavigation: boolean;

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

  // Server-side search (Approach B: separate from browse)
  searchResults: GitLabEpic[];
  searchTotalCount: number;
  isSearching: boolean;
  searchActive: boolean;
  browseTotalCount: number;
}

interface GitlabActions {
  setSearchTerm: (term: string) => void;
  setFilterState: (state: EpicFilterState) => void;
  setPage: (page: number) => void;
  setSelectedEpic: (epic: GitLabEpic | null) => void;
  clearSelectedEpic: () => void;
  navigateToGroup: (groupId: string) => Promise<void>;
  navigateToBreadcrumb: (index: number) => void;
  setIncludeDescendants: (value: boolean) => void;
  invalidateGroupCache: (groupId: string) => void;
  setPublishLevel: (level: 'crew' | 'pod') => void;
  setPublishTargetGroup: (groupId: string | null) => void;
  setPublishStatus: (status: { type: 'success' | 'error'; message: string } | null) => void;
  setIssues: (issues: GitLabIssue[]) => void;
  selectIssue: (id: string | null) => void;
  setIssueFilter: (filter: IssueFilter) => void;
  setIssueSearchQuery: (query: string) => void;
  setLoadedEpicContext: (epicIid: number, groupId: string) => void;
  clearLoadedEpicContext: () => void;
  searchEpics: (query: string, state?: string) => Promise<void>;
  clearSearch: () => void;
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
  loadingNavigation: false,

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

  searchResults: [],
  searchTotalCount: 0,
  isSearching: false,
  searchActive: false,
  browseTotalCount: 0,
};

// ─── Helpers ────────────────────────────────────────────────

/** Build breadcrumb from group's full_path, using cache for names (V4 parity) */
function buildBreadcrumb(
  group: GitLabGroupMetadata,
  cache: Record<string, GroupCacheEntry>,
): { id: string; name: string }[] {
  const parts = group.full_path.split('/');
  const breadcrumb: { id: string; name: string }[] = [];

  let currentPath = '';
  for (const part of parts) {
    currentPath = currentPath ? `${currentPath}/${part}` : part;

    let foundId = '';
    let foundName = part;
    for (const [id, entry] of Object.entries(cache)) {
      if (entry.metadata.full_path === currentPath) {
        foundId = id;
        foundName = entry.metadata.name;
        break;
      }
    }

    if (currentPath === group.full_path) {
      foundId = String(group.id);
      foundName = group.name;
    }

    breadcrumb.push({ id: foundId, name: foundName });
  }

  return breadcrumb;
}

/**
 * Resolve group name for an epic (F03: show group context).
 * Priority: groupCache → extract from web_url → fallback to group_id string.
 */
export function resolveGroupName(
  epic: GitLabEpic,
  cache: Record<string, GroupCacheEntry>,
): string {
  const groupId = String(epic.group_id);
  const cached = cache[groupId];
  if (cached) return cached.metadata.name;

  if (epic.web_url) {
    const match = epic.web_url.match(/^https?:\/\/[^/]+\/(.+?)\/-\/epics\//);
    if (match) {
      const pathParts = match[1].split('/');
      return pathParts[pathParts.length - 1] ?? groupId;
    }
  }

  return groupId;
}

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

  navigateToGroup: async (groupId) => {
    const { groupCache, includeDescendants } = get();

    // Check cache — instant return if fresh (F12: cache-first)
    const cached = groupCache[groupId];
    if (cached && (Date.now() - cached.fetchedAt < CACHE_TTL)) {
      const bc = buildBreadcrumb(cached.metadata, groupCache);
      set({ currentGroupId: groupId, breadcrumb: bc, epics: cached.epics, loadingNavigation: false, searchActive: false });
      return;
    }

    // Not cached — parallel fetch (V4 parity)
    set({ loadingNavigation: true });
    const config = useConfigStore.getState().config;

    try {
      const [metaRes, subRes, epicRes] = await Promise.all([
        fetchGroupMetadata(config.gitlab, groupId),
        fetchGitLabSubgroups(config.gitlab, groupId),
        fetchGroupEpics(config.gitlab, groupId, { include_descendant_groups: includeDescendants, per_page: 100 }),
      ]);

      if (metaRes.success && metaRes.data) {
        const metadata = metaRes.data;
        const subgroups = subRes.data ?? [];
        const epics = epicRes.data ?? [];
        const newCache = { ...get().groupCache, [groupId]: { metadata, subgroups, epics, fetchedAt: Date.now() } };
        const bc = buildBreadcrumb(metadata, newCache);
        const browseTotal = epicRes.totalCount ?? epics.length;
        set({ currentGroupId: groupId, breadcrumb: bc, groupCache: newCache, epics, loadingNavigation: false, browseTotalCount: browseTotal, searchActive: false });
      } else {
        set({ loadingNavigation: false });
      }
    } catch {
      set({ loadingNavigation: false });
    }
  },

  navigateToBreadcrumb: (index) => {
    const { breadcrumb } = get();
    if (index < 0 || index >= breadcrumb.length) return;
    const target = breadcrumb[index];
    if (target) get().navigateToGroup(target.id);
  },

  setIncludeDescendants: (value) => {
    const { currentGroupId, groupCache } = get();
    if (currentGroupId) {
      const updated = { ...groupCache };
      delete updated[currentGroupId];
      set({ includeDescendants: value, groupCache: updated });
      get().navigateToGroup(currentGroupId);
    } else {
      set({ includeDescendants: value });
    }
  },

  invalidateGroupCache: (groupId) => {
    const { groupCache } = get();
    const updated = { ...groupCache };
    delete updated[groupId];
    set({ groupCache: updated });
  },

  setPublishLevel: (level) => {
    // F02: Reset target group and parent on level switch to prevent stale state
    set({ publishLevel: level, publishTargetGroupId: null });
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

  searchEpics: async (query, state) => {
    if (!query.trim()) { get().clearSearch(); return; }

    set({ isSearching: true, searchActive: true });
    const config = useConfigStore.getState().config;

    try {
      const result = await fetchGroupEpics(config.gitlab, config.gitlab.rootGroupId, {
        search: query.trim(),
        state: state && state !== 'all' ? state : undefined,
        include_descendant_groups: true,
        per_page: 100,
      });

      if (result.success) {
        set({
          searchResults: result.data ?? [],
          searchTotalCount: result.totalCount ?? (result.data?.length ?? 0),
          isSearching: false,
        });
      } else {
        set({ isSearching: false });
      }
    } catch {
      set({ isSearching: false });
    }
  },

  clearSearch: () => {
    set({ searchActive: false, searchResults: [], searchTotalCount: 0, isSearching: false });
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
