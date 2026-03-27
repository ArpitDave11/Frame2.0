import { describe, it, expect, beforeEach } from 'vitest';
import { useGitlabStore } from './gitlabStore';
import type { GitLabEpic, GitLabIssue } from './gitlabStore';

beforeEach(() => {
  useGitlabStore.setState(useGitlabStore.getInitialState());
});

// ─── Fixtures ───────────────────────────────────────────────

const MOCK_EPIC: GitLabEpic = {
  id: 101,
  iid: 1,
  title: 'Auth Overhaul',
  description: 'Revamp authentication',
  state: 'opened',
  web_url: 'https://gitlab.example.com/epics/1',
  labels: ['backend', 'security'],
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-02-20T14:00:00Z',
  group_id: 42,
};

const MOCK_EPIC_2: GitLabEpic = {
  ...MOCK_EPIC,
  id: 102,
  iid: 2,
  title: 'Payment Integration',
};

// ─── Initial State ──────────────────────────────────────────

describe('initial state', () => {
  it('no epics loaded', () => {
    expect(useGitlabStore.getState().epics).toEqual([]);
  });

  it('no selected epic', () => {
    expect(useGitlabStore.getState().selectedEpic).toBeNull();
  });

  it('page is 1', () => {
    expect(useGitlabStore.getState().page).toBe(1);
  });

  it('filterState is opened', () => {
    expect(useGitlabStore.getState().filterState).toBe('opened');
  });

  it('loadingEpics is false', () => {
    expect(useGitlabStore.getState().loadingEpics).toBe(false);
  });

  it('searchTerm is empty', () => {
    expect(useGitlabStore.getState().searchTerm).toBe('');
  });

  it('breadcrumb is empty', () => {
    expect(useGitlabStore.getState().breadcrumb).toEqual([]);
  });

  it('loadModalOpen is false', () => {
    expect(useGitlabStore.getState().loadModalOpen).toBe(false);
  });

  it('publishLevel is crew', () => {
    expect(useGitlabStore.getState().publishLevel).toBe('crew');
  });

  it('isPublishing is false', () => {
    expect(useGitlabStore.getState().isPublishing).toBe(false);
  });
});

// ─── setSearchTerm ──────────────────────────────────────────

describe('setSearchTerm', () => {
  it('updates searchTerm', () => {
    useGitlabStore.getState().setSearchTerm('auth');
    expect(useGitlabStore.getState().searchTerm).toBe('auth');
  });
});

// ─── setFilterState ─────────────────────────────────────────

describe('setFilterState', () => {
  it('updates filterState', () => {
    useGitlabStore.getState().setFilterState('closed');
    expect(useGitlabStore.getState().filterState).toBe('closed');
  });
});

// ─── setPage ────────────────────────────────────────────────

describe('setPage', () => {
  it('updates page', () => {
    useGitlabStore.getState().setPage(3);
    expect(useGitlabStore.getState().page).toBe(3);
  });
});

// ─── selectedEpic ───────────────────────────────────────────

describe('selectedEpic', () => {
  it('setSelectedEpic sets the epic', () => {
    useGitlabStore.getState().setSelectedEpic(MOCK_EPIC);
    expect(useGitlabStore.getState().selectedEpic).toEqual(MOCK_EPIC);
  });

  it('clearSelectedEpic nulls epic and empties children', () => {
    useGitlabStore.getState().setSelectedEpic(MOCK_EPIC);
    useGitlabStore.setState({
      epicChildren: {
        epics: [{ id: 200, iid: 10, title: 'Child', type: 'epic' }],
        issues: [],
      },
    });
    useGitlabStore.getState().clearSelectedEpic();
    const state = useGitlabStore.getState();
    expect(state.selectedEpic).toBeNull();
    expect(state.epicChildren).toEqual({ epics: [], issues: [] });
  });
});

// ─── group navigation ───────────────────────────────────────

describe('group navigation', () => {
  it('navigateToBreadcrumb is a no-op for out-of-range index', () => {
    useGitlabStore.getState().navigateToBreadcrumb(-1);
    expect(useGitlabStore.getState().breadcrumb).toEqual([]);
  });

  it('setIncludeDescendants updates the flag', () => {
    useGitlabStore.getState().setIncludeDescendants(true);
    expect(useGitlabStore.getState().includeDescendants).toBe(true);
  });

  it('invalidateGroupCache removes the targeted entry', () => {
    useGitlabStore.setState({
      groupCache: {
        '10': { metadata: { id: 10, name: 'Test', full_path: 'test', web_url: '', parent_id: null }, subgroups: [], epics: [], fetchedAt: Date.now() },
        '20': { metadata: { id: 20, name: 'Other', full_path: 'other', web_url: '', parent_id: null }, subgroups: [], epics: [], fetchedAt: Date.now() },
      },
    });
    useGitlabStore.getState().invalidateGroupCache('10');
    const cache = useGitlabStore.getState().groupCache;
    expect(cache['10']).toBeUndefined();
    expect(cache['20']).toBeDefined();
  });

  it('loadingNavigation defaults to false', () => {
    expect(useGitlabStore.getState().loadingNavigation).toBe(false);
  });
});

// ─── publish ────────────────────────────────────────────────

describe('publish', () => {
  it('setPublishLevel updates level', () => {
    useGitlabStore.getState().setPublishLevel('pod');
    expect(useGitlabStore.getState().publishLevel).toBe('pod');
  });

  it('setPublishTargetGroup updates target', () => {
    useGitlabStore.getState().setPublishTargetGroup('789');
    expect(useGitlabStore.getState().publishTargetGroupId).toBe('789');
  });

  it('setPublishStatus sets status', () => {
    useGitlabStore.getState().setPublishStatus({ type: 'success', message: 'Published!' });
    expect(useGitlabStore.getState().publishStatus).toEqual({ type: 'success', message: 'Published!' });
  });
});

// ─── load modal ─────────────────────────────────────────────

describe('load modal', () => {
  it('openLoadModal sets loadModalOpen to true', () => {
    useGitlabStore.getState().openLoadModal();
    expect(useGitlabStore.getState().loadModalOpen).toBe(true);
  });

  it('closeLoadModal sets loadModalOpen to false and clears search state', () => {
    useGitlabStore.getState().openLoadModal();
    useGitlabStore.setState({ loadSearchTerm: 'test', loadResults: [MOCK_EPIC] });
    useGitlabStore.getState().closeLoadModal();
    const state = useGitlabStore.getState();
    expect(state.loadModalOpen).toBe(false);
    expect(state.loadSearchTerm).toBe('');
    expect(state.loadResults).toEqual([]);
  });
});

// ─── reset ──────────────────────────────────────────────────

describe('reset', () => {
  it('everything back to initial state', () => {
    // Mutate several fields
    useGitlabStore.getState().setSearchTerm('auth');
    useGitlabStore.getState().setFilterState('closed');
    useGitlabStore.getState().setPage(5);
    useGitlabStore.getState().setSelectedEpic(MOCK_EPIC);
    useGitlabStore.setState({ currentGroupId: '123', breadcrumb: [{ id: '123', name: 'Platform' }] });
    useGitlabStore.getState().openLoadModal();

    useGitlabStore.getState().reset();

    const state = useGitlabStore.getState();
    expect(state.epics).toEqual([]);
    expect(state.searchTerm).toBe('');
    expect(state.filterState).toBe('opened');
    expect(state.page).toBe(1);
    expect(state.selectedEpic).toBeNull();
    expect(state.breadcrumb).toEqual([]);
    expect(state.loadModalOpen).toBe(false);
    expect(state.isPublishing).toBe(false);
  });
});

// ─── Issue Management ──────────────────────────────────────

const MOCK_ISSUE: GitLabIssue = {
  id: 100,
  iid: 1,
  title: 'Fix login bug',
  state: 'opened',
  labels: ['bug'],
  assignee: 'user1',
  web_url: 'https://gitlab.com/issue/1',
  created_at: '2026-01-01T00:00:00Z',
};

describe('issue management', () => {
  it('initial issue state is empty', () => {
    const state = useGitlabStore.getState();
    expect(state.issues).toEqual([]);
    expect(state.selectedIssueId).toBeNull();
    expect(state.issueFilter).toBe('all');
    expect(state.issueSearchQuery).toBe('');
  });

  it('setIssues populates issues array', () => {
    useGitlabStore.getState().setIssues([MOCK_ISSUE]);
    expect(useGitlabStore.getState().issues).toHaveLength(1);
    expect(useGitlabStore.getState().issues[0]!.title).toBe('Fix login bug');
  });

  it('selectIssue sets selectedIssueId', () => {
    useGitlabStore.getState().selectIssue('100');
    expect(useGitlabStore.getState().selectedIssueId).toBe('100');
  });

  it('selectIssue with null clears selection', () => {
    useGitlabStore.getState().selectIssue('100');
    useGitlabStore.getState().selectIssue(null);
    expect(useGitlabStore.getState().selectedIssueId).toBeNull();
  });

  it('setIssueFilter changes filter', () => {
    useGitlabStore.getState().setIssueFilter('active');
    expect(useGitlabStore.getState().issueFilter).toBe('active');
  });

  it('setIssueSearchQuery changes query', () => {
    useGitlabStore.getState().setIssueSearchQuery('auth');
    expect(useGitlabStore.getState().issueSearchQuery).toBe('auth');
  });

  it('reset clears issue state', () => {
    useGitlabStore.getState().setIssues([MOCK_ISSUE]);
    useGitlabStore.getState().selectIssue('100');
    useGitlabStore.getState().setIssueFilter('blocked');
    useGitlabStore.getState().reset();
    const state = useGitlabStore.getState();
    expect(state.issues).toEqual([]);
    expect(state.selectedIssueId).toBeNull();
    expect(state.issueFilter).toBe('all');
  });
});
