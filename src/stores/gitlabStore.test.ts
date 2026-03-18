import { describe, it, expect, beforeEach } from 'vitest';
import { useGitlabStore } from './gitlabStore';
import type { GitLabEpic } from './gitlabStore';

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

// ─── navigateToGroup / navigateUp ───────────────────────────

describe('group navigation', () => {
  it('navigateToGroup adds breadcrumb and updates currentGroupId', () => {
    useGitlabStore.getState().navigateToGroup('123', 'Platform');
    const state = useGitlabStore.getState();
    expect(state.currentGroupId).toBe('123');
    expect(state.breadcrumb).toEqual([{ id: '123', name: 'Platform' }]);
  });

  it('navigateToGroup accumulates breadcrumb entries', () => {
    useGitlabStore.getState().navigateToGroup('123', 'Platform');
    useGitlabStore.getState().navigateToGroup('456', 'Backend');
    const state = useGitlabStore.getState();
    expect(state.currentGroupId).toBe('456');
    expect(state.breadcrumb).toHaveLength(2);
    expect(state.breadcrumb[1]).toEqual({ id: '456', name: 'Backend' });
  });

  it('navigateUp pops last breadcrumb entry', () => {
    useGitlabStore.getState().navigateToGroup('123', 'Platform');
    useGitlabStore.getState().navigateToGroup('456', 'Backend');
    useGitlabStore.getState().navigateUp();
    const state = useGitlabStore.getState();
    expect(state.breadcrumb).toHaveLength(1);
    expect(state.currentGroupId).toBe('123');
  });

  it('navigateUp on empty breadcrumb is a no-op', () => {
    const before = useGitlabStore.getState().currentGroupId;
    useGitlabStore.getState().navigateUp();
    expect(useGitlabStore.getState().currentGroupId).toBe(before);
    expect(useGitlabStore.getState().breadcrumb).toEqual([]);
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
    useGitlabStore.getState().navigateToGroup('123', 'Platform');
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
