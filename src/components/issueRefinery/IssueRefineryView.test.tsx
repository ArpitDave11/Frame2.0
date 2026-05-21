/**
 * Issue Refinery — IssueRefineryView composition smoke tests (R-14).
 *
 * End-to-end wiring with mocked GitLab + action layer. Full integration
 * test lives in src/test/integration/issueRefineryFlow.test.tsx (R-16).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { IssueRefineryView } from './IssueRefineryView';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';
import { useGitlabStore } from '@/stores/gitlabStore';
import { useUiStore } from '@/stores/uiStore';
import type { GitLabIssue, GitLabEpic } from '@/services/gitlab/types';

vi.mock('@/services/gitlab/gitlabClient', () => ({ fetchEpicIssues: vi.fn() }));
vi.mock('@/actions/refineIssueAction', () => ({
  refineSelectedIssue: vi.fn(),
  publishRefinedIssue: vi.fn(),
}));

import { fetchEpicIssues } from '@/services/gitlab/gitlabClient';
import { refineSelectedIssue } from '@/actions/refineIssueAction';

const EPIC: GitLabEpic = {
  id: 200,
  iid: 7,
  title: 'Payments revamp',
  description: 'Replace legacy gateway.',
  state: 'opened',
  web_url: 'https://gitlab/test/-/epics/7',
  labels: [],
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  group_id: 42,
};

const ISSUE: GitLabIssue = {
  id: 100,
  iid: 1,
  title: 'Wire SDK',
  description: 'original body',
  state: 'opened',
  web_url: 'https://gitlab/test/-/issues/1',
  labels: [],
  project_id: 999,
};

beforeEach(() => {
  vi.clearAllMocks();
  useIssueRefineryStore.getState().reset();
  // Reset gitlab + ui stores.
  useGitlabStore.setState({
    selectedEpic: null,
    loadedEpicIid: null,
    loadedGroupId: null,
  });
  const toasts = useUiStore.getState().toasts;
  for (const t of toasts) useUiStore.getState().removeToast(t.id);
});

describe('IssueRefineryView — initial render', () => {
  it('shows the empty-pane hint when no child is selected', () => {
    render(<IssueRefineryView />);
    expect(screen.queryByTestId('ir-empty-hint')).not.toBeNull();
    expect(screen.queryByTestId('childlist-empty')).not.toBeNull();
  });

  it('clicking "Load epic" opens the loadEpic modal', () => {
    render(<IssueRefineryView />);
    fireEvent.click(screen.getByRole('button', { name: /load epic/i }));
    expect(useUiStore.getState().activeModal).toBe('loadEpic');
  });
});

describe('IssueRefineryView — gitlab bridge', () => {
  it('fetches children and populates issueRefineryStore when an epic is loaded in gitlabStore', async () => {
    vi.mocked(fetchEpicIssues).mockResolvedValueOnce({ success: true, data: [ISSUE] });

    render(<IssueRefineryView />);
    act(() => {
      useGitlabStore.setState({
        selectedEpic: EPIC,
        loadedEpicIid: EPIC.iid,
        loadedGroupId: '42',
      });
    });

    await waitFor(() => {
      expect(fetchEpicIssues).toHaveBeenCalledTimes(1);
    });
    const irState = useIssueRefineryStore.getState();
    expect(irState.selectedEpic?.epicIid).toBe(EPIC.iid);
    expect(irState.selectedEpic?.title).toBe('Payments revamp');
    expect(irState.selectedEpic?.body).toBe('Replace legacy gateway.');
    expect(irState.children).toEqual([ISSUE]);
  });

  it('toasts an error when fetchEpicIssues fails', async () => {
    vi.mocked(fetchEpicIssues).mockResolvedValueOnce({ success: false, error: '500 boom' });

    render(<IssueRefineryView />);
    act(() => {
      useGitlabStore.setState({
        selectedEpic: EPIC,
        loadedEpicIid: EPIC.iid,
        loadedGroupId: '42',
      });
    });

    await waitFor(() => {
      const toasts = useUiStore.getState().toasts;
      expect(toasts.length).toBeGreaterThan(0);
      const last = toasts[toasts.length - 1];
      expect(last?.type).toBe('error');
      expect(last?.title).toContain('500');
    });
  });

  it('does not re-bridge the same epic twice', async () => {
    vi.mocked(fetchEpicIssues).mockResolvedValue({ success: true, data: [ISSUE] });

    const { rerender } = render(<IssueRefineryView />);
    act(() => {
      useGitlabStore.setState({
        selectedEpic: EPIC,
        loadedEpicIid: EPIC.iid,
        loadedGroupId: '42',
      });
    });
    await waitFor(() => expect(fetchEpicIssues).toHaveBeenCalledTimes(1));

    // Re-render without changing the epic.
    rerender(<IssueRefineryView />);
    expect(fetchEpicIssues).toHaveBeenCalledTimes(1);
  });
});

describe('IssueRefineryView — refine button', () => {
  beforeEach(() => {
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(
      { groupId: '42', epicIid: 7, title: 'X', body: 'epic body' },
      [ISSUE],
    );
    s.setSelectedChild(ISSUE.iid);
  });

  it('renders the refine button enabled when a child is selected', () => {
    render(<IssueRefineryView />);
    const btn = screen.getByTestId('refine-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toMatch(/refine/i);
  });

  it('calls refineSelectedIssue on click', () => {
    render(<IssueRefineryView />);
    fireEvent.click(screen.getByTestId('refine-btn'));
    expect(refineSelectedIssue).toHaveBeenCalledTimes(1);
  });

  it('disables and shows "Refining…" during the pipeline', () => {
    useIssueRefineryStore.getState().setPhase('refining', null);
    render(<IssueRefineryView />);
    const btn = screen.getByTestId('refine-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toMatch(/refining/i);
  });

  it('shows "Refine again" once results are ready', () => {
    useIssueRefineryStore.getState().setPhase('ready', null);
    render(<IssueRefineryView />);
    expect(screen.getByTestId('refine-btn').textContent).toMatch(/refine again/i);
  });
});

describe('IssueRefineryView — error banner', () => {
  it('shows the error message when phase=error', () => {
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(
      { groupId: '42', epicIid: 7, title: 'X', body: 'body' },
      [ISSUE],
    );
    s.setSelectedChild(ISSUE.iid);
    s.setPhase('error', 'stage failed: foo');

    render(<IssueRefineryView />);
    expect(screen.queryByTestId('ir-error')?.textContent).toContain('stage failed: foo');
  });
});
