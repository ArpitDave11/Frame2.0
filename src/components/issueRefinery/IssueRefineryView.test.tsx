/**
 * Issue Refinery — IssueRefineryView composition smoke tests (R-14,
 * updated post deep-review #2).
 *
 * The bridge logic (B-I4) moved into refineIssueAction.bridgeLoadedEpicAction
 * so it's mocked at the module level here.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { IssueRefineryView } from './IssueRefineryView';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';
import { useGitlabStore } from '@/stores/gitlabStore';
import { useUiStore } from '@/stores/uiStore';
import type { GitLabIssue, GitLabEpic } from '@/services/gitlab/types';

vi.mock('@/actions/refineIssueAction', () => ({
  refineSelectedIssue: vi.fn(),
  publishRefinedIssue: vi.fn(),
  bridgeLoadedEpicAction: vi.fn(),
}));

import {
  refineSelectedIssue,
  bridgeLoadedEpicAction,
} from '@/actions/refineIssueAction';

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
  useGitlabStore.setState({
    selectedEpic: null,
    loadedEpicIid: null,
    loadedGroupId: null,
  });
  useUiStore.setState({ toasts: [], activeModal: null });
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

describe('IssueRefineryView — gitlab bridge (B-I4 + B-C1)', () => {
  it('delegates to bridgeLoadedEpicAction when an epic is loaded in gitlabStore', async () => {
    vi.mocked(bridgeLoadedEpicAction).mockResolvedValueOnce(true);

    render(<IssueRefineryView />);
    act(() => {
      useGitlabStore.setState({
        selectedEpic: EPIC,
        loadedEpicIid: EPIC.iid,
        loadedGroupId: '42',
      });
    });

    await waitFor(() => expect(bridgeLoadedEpicAction).toHaveBeenCalledTimes(1));
    expect(vi.mocked(bridgeLoadedEpicAction).mock.calls[0]).toEqual(['42', EPIC.iid, EPIC]);
  });

  it('does not re-bridge a successfully-bridged epic on re-render', async () => {
    vi.mocked(bridgeLoadedEpicAction).mockResolvedValueOnce(true);

    const { rerender } = render(<IssueRefineryView />);
    act(() => {
      useGitlabStore.setState({
        selectedEpic: EPIC,
        loadedEpicIid: EPIC.iid,
        loadedGroupId: '42',
      });
    });
    await waitFor(() => expect(bridgeLoadedEpicAction).toHaveBeenCalledTimes(1));

    rerender(<IssueRefineryView />);
    expect(bridgeLoadedEpicAction).toHaveBeenCalledTimes(1);
  });

  it('B-C1: a failed bridge does NOT lock out subsequent retry of the same epic', async () => {
    vi.mocked(bridgeLoadedEpicAction)
      .mockResolvedValueOnce(false) // first attempt fails
      .mockResolvedValueOnce(true); //  retry succeeds

    render(<IssueRefineryView />);
    // First attempt — fails.
    act(() => {
      useGitlabStore.setState({
        selectedEpic: EPIC,
        loadedEpicIid: EPIC.iid,
        loadedGroupId: '42',
      });
    });
    await waitFor(() => expect(bridgeLoadedEpicAction).toHaveBeenCalledTimes(1));

    // Retry — gitlabStore replays the same loaded epic, e.g. user re-clicks
    // "Load epic" and picks the same one. Simulate by toggling the iid to a
    // different value and back, since React batches identical-state updates.
    act(() => {
      useGitlabStore.setState({ loadedEpicIid: 999, loadedGroupId: '42' });
    });
    act(() => {
      useGitlabStore.setState({ loadedEpicIid: EPIC.iid, loadedGroupId: '42' });
    });
    await waitFor(() => expect(bridgeLoadedEpicAction).toHaveBeenCalledTimes(2));
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
    const errEl = screen.queryByTestId('ir-error');
    expect(errEl?.textContent).toContain('stage failed: foo');
    // role="alert" surfaces screen reader announcement.
    expect(errEl?.getAttribute('role')).toBe('alert');
  });
});
