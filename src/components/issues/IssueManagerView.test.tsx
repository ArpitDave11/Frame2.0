/**
 * Tests for IssueManagerView — Issue Manager (standalone views, no tab bar).
 * Sidebar controls which view is shown via uiStore.issueSubTab.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { IssueManagerView } from './IssueManagerView';
import { AuthContext } from '@/components/auth/AuthContext';
import { useConfigStore } from '@/stores/configStore';
import { useUiStore } from '@/stores/uiStore';

// Mock GitLab API calls that the component now makes on mount
vi.mock('@/services/gitlab/gitlabClient', () => ({
  fetchCurrentUser: vi.fn().mockResolvedValue({ success: true, data: { id: 1, username: 'devuser', name: 'Dev User', email: 'dev.user@ubs.com', avatar_url: '' } }),
  fetchCurrentIteration: vi.fn().mockResolvedValue({ success: true, data: [{ id: 207814, iid: 50, group_id: 478494, title: null, state: 2, start_date: '2026-03-18', due_date: '2026-03-31', web_url: '' }] }),
  fetchRecentIterations: vi.fn().mockResolvedValue({ success: true, data: [
    { id: 207814, iid: 50, group_id: 478494, title: null, state: 2, start_date: '2026-03-18', due_date: '2026-03-31', web_url: '' },
    { id: 207000, iid: 49, group_id: 478494, title: null, state: 3, start_date: '2026-03-04', due_date: '2026-03-17', web_url: '' },
  ] }),
  fetchGroupIssues: vi.fn().mockResolvedValue({ success: true, data: [] }),
  searchGroupMembers: vi.fn().mockResolvedValue({ success: true, data: [] }),
  fetchEpicIssues: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));

vi.mock('@/actions/fetchIssuesAction', () => ({
  fetchIssuesAction: vi.fn(),
}));

// Auth wrapper for tests
const mockAuth = {
  user: { name: 'Dev User', email: 'dev.user@ubs.com' },
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
};

function renderWithAuth(ui: React.ReactElement) {
  return render(
    <AuthContext.Provider value={mockAuth}>
      {ui}
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useUiStore.setState(useUiStore.getInitialState());
});

describe('IssueManagerView — Sprint view (default)', () => {
  it('renders the issue list panel', () => {
    renderWithAuth(<IssueManagerView />);
    expect(screen.getByTestId('issue-list-panel')).toBeTruthy();
  });

  it('no tab bar rendered', () => {
    renderWithAuth(<IssueManagerView />);
    expect(screen.queryByTestId('tab-sprint')).toBeNull();
    expect(screen.queryByTestId('tab-epic')).toBeNull();
  });

  it('shows user search input on sprint view', () => {
    renderWithAuth(<IssueManagerView />);
    expect(screen.getByTestId('user-search-input')).toBeTruthy();
  });

  it('shows current user chip', async () => {
    renderWithAuth(<IssueManagerView />);
    await waitFor(() => expect(screen.getByText('Dev User')).toBeTruthy());
  });

  it('renders filter tabs', () => {
    renderWithAuth(<IssueManagerView />);
    expect(screen.getByTestId('filter-tab-all')).toBeTruthy();
    expect(screen.getByTestId('filter-tab-active')).toBeTruthy();
    expect(screen.getByTestId('filter-tab-blocked')).toBeTruthy();
  });
});

describe('IssueManagerView — Linked Issues view', () => {
  beforeEach(() => {
    useUiStore.setState({ issueSubTab: 'epic' });
  });

  it('hides user search when in epic view', () => {
    renderWithAuth(<IssueManagerView />);
    expect(screen.queryByTestId('user-search-input')).toBeNull();
  });

  it('shows empty state when no epic loaded', () => {
    renderWithAuth(<IssueManagerView />);
    expect(screen.getByText('Load an epic from GitLab to see its linked issues.')).toBeTruthy();
  });

  it('renders filter tabs', () => {
    renderWithAuth(<IssueManagerView />);
    expect(screen.getByTestId('filter-tab-all')).toBeTruthy();
    expect(screen.getByTestId('filter-tab-active')).toBeTruthy();
    expect(screen.getByTestId('filter-tab-blocked')).toBeTruthy();
  });
});

// ─── Iteration Dropdown ─────────────────────────────────────

function enableGitLab() {
  useConfigStore.setState({
    config: {
      ...useConfigStore.getState().config,
      gitlab: { enabled: true, rootGroupId: '478494', accessToken: 'glpat-test', authMode: 'pat' as const },
    },
  });
}

describe('Iteration Dropdown', () => {
  beforeEach(() => {
    enableGitLab();
  });

  it('renders iteration dropdown on sprint view when GitLab is configured', async () => {
    renderWithAuth(<IssueManagerView />);
    await waitFor(() => expect(screen.getByTestId('iteration-dropdown')).toBeTruthy());
  });

  it('dropdown has "All Iterations" plus fetched iterations', async () => {
    renderWithAuth(<IssueManagerView />);
    await waitFor(() => {
      const dropdown = screen.getByTestId('iteration-dropdown') as HTMLSelectElement;
      expect(dropdown.options.length).toBe(3); // All + 2 iterations
      expect(dropdown.options[0]!.textContent).toBe('All Iterations');
    });
  });

  it('current iteration is auto-selected', async () => {
    renderWithAuth(<IssueManagerView />);
    await waitFor(() => {
      const dropdown = screen.getByTestId('iteration-dropdown') as HTMLSelectElement;
      expect(dropdown.value).toBe('207814');
    });
  });

  it('current iteration option has "Current" suffix', async () => {
    renderWithAuth(<IssueManagerView />);
    await waitFor(() => {
      const dropdown = screen.getByTestId('iteration-dropdown') as HTMLSelectElement;
      const currentOption = Array.from(dropdown.options).find((o) => o.value === '207814');
      expect(currentOption?.textContent).toContain('Current');
    });
  });

  it('iteration dropdown hidden on epic view', async () => {
    renderWithAuth(<IssueManagerView />);
    await waitFor(() => expect(screen.getByTestId('iteration-dropdown')).toBeTruthy());
    useUiStore.setState({ issueSubTab: 'epic' });
    // Re-render to pick up store change
    renderWithAuth(<IssueManagerView />);
    expect(screen.queryByTestId('iteration-dropdown')).toBeNull();
  });
});
