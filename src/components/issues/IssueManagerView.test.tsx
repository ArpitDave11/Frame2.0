/**
 * Tests for IssueManagerView — Issue Manager with sprint view.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IssueManagerView } from './IssueManagerView';
import { AuthContext } from '@/components/auth/AuthContext';

// Mock GitLab API calls that the component now makes on mount
vi.mock('@/services/gitlab/gitlabClient', () => ({
  fetchCurrentIteration: vi.fn().mockResolvedValue({ success: true, data: [] }),
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
});

describe('IssueManagerView', () => {
  it('renders the tab bar with My Sprint and Epic Issues', () => {
    renderWithAuth(<IssueManagerView />);
    expect(screen.getByTestId('tab-sprint')).toBeTruthy();
    expect(screen.getByTestId('tab-epic')).toBeTruthy();
  });

  it('renders the issue list panel', () => {
    renderWithAuth(<IssueManagerView />);
    expect(screen.getByTestId('issue-list-panel')).toBeTruthy();
  });

  it('defaults to My Sprint tab', () => {
    renderWithAuth(<IssueManagerView />);
    const sprintTab = screen.getByTestId('tab-sprint');
    expect(sprintTab.style.borderBottom).toContain('rgb(230, 0, 0)');
  });

  it('shows user search input on sprint tab', () => {
    renderWithAuth(<IssueManagerView />);
    expect(screen.getByTestId('user-search-input')).toBeTruthy();
  });

  it('shows current user chip', () => {
    renderWithAuth(<IssueManagerView />);
    expect(screen.getByText('Dev User')).toBeTruthy();
  });

  it('switching to Epic Issues tab hides user search', () => {
    renderWithAuth(<IssueManagerView />);
    fireEvent.click(screen.getByTestId('tab-epic'));
    expect(screen.queryByTestId('user-search-input')).toBeNull();
  });

  it('shows mock data banner on epic tab when no real issues', () => {
    renderWithAuth(<IssueManagerView />);
    fireEvent.click(screen.getByTestId('tab-epic'));
    expect(screen.getByTestId('mock-data-banner')).toBeTruthy();
  });

  it('renders filter tabs', () => {
    renderWithAuth(<IssueManagerView />);
    // Switch to epic tab to see mock issues with filter tabs
    fireEvent.click(screen.getByTestId('tab-epic'));
    expect(screen.getByTestId('filter-tab-all')).toBeTruthy();
    expect(screen.getByTestId('filter-tab-active')).toBeTruthy();
    expect(screen.getByTestId('filter-tab-blocked')).toBeTruthy();
  });
});
