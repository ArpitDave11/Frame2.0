/**
 * Issue Refinery — ChildIssueList tests (R-10).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChildIssueList } from './ChildIssueList';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';
import type { GitLabIssue } from '@/services/gitlab/types';

const EPIC = {
  groupId: '42',
  epicIid: 7,
  title: 'Payments revamp',
  body: 'Replace legacy gateway.',
};

const ISSUE_A: GitLabIssue = {
  id: 100,
  iid: 1,
  title: 'Wire Stripe SDK',
  description: 'add the SDK',
  state: 'opened',
  web_url: 'https://gitlab/test/-/issues/1',
  labels: [],
  project_id: 999,
};
const ISSUE_B: GitLabIssue = {
  id: 101,
  iid: 2,
  title: 'Migrate auth tokens',
  description: 'rotate tokens',
  state: 'opened',
  web_url: 'https://gitlab/test/-/issues/2',
  labels: [],
  project_id: 999,
};

beforeEach(() => {
  useIssueRefineryStore.getState().reset();
});

describe('ChildIssueList — empty state', () => {
  it('shows "load an epic" hint when no epic is selected', () => {
    render(<ChildIssueList />);
    expect(screen.queryByTestId('childlist-empty')).not.toBeNull();
    expect(screen.queryByText(/load an epic to refine/i)).not.toBeNull();
  });

  it('renders Load button when onRequestLoadEpic is provided', () => {
    const handler = vi.fn();
    render(<ChildIssueList onRequestLoadEpic={handler} />);
    const btn = screen.getByRole('button', { name: /load epic/i });
    fireEvent.click(btn);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('omits the Load button when no callback is provided', () => {
    render(<ChildIssueList />);
    expect(screen.queryByRole('button', { name: /load epic/i })).toBeNull();
  });
});

describe('ChildIssueList — populated', () => {
  beforeEach(() => {
    useIssueRefineryStore.getState().setSelectedEpic(EPIC, [ISSUE_A, ISSUE_B]);
  });

  it('renders the epic title and IID', () => {
    render(<ChildIssueList />);
    expect(screen.queryByText('Payments revamp')).not.toBeNull();
    expect(screen.queryByText('&7')).not.toBeNull();
  });

  it('renders every child as a radio button', () => {
    render(<ChildIssueList />);
    expect(screen.queryByTestId('childlist-item-1')).not.toBeNull();
    expect(screen.queryByTestId('childlist-item-2')).not.toBeNull();
    expect(screen.queryByText('Wire Stripe SDK')).not.toBeNull();
    expect(screen.queryByText('Migrate auth tokens')).not.toBeNull();
  });

  it('clicking an item calls setSelectedChild with its iid', () => {
    render(<ChildIssueList />);
    fireEvent.click(screen.getByTestId('childlist-item-2'));
    expect(useIssueRefineryStore.getState().selectedChildIid).toBe(2);
  });

  it('selected item carries aria-checked=true and the selected class', () => {
    useIssueRefineryStore.getState().setSelectedChild(2);
    render(<ChildIssueList />);
    const selected = screen.getByTestId('childlist-item-2');
    expect(selected.getAttribute('aria-checked')).toBe('true');
    expect(selected.className).toContain('selected');
  });
});

describe('ChildIssueList — epic with no children', () => {
  it('shows the no-children hint', () => {
    useIssueRefineryStore.getState().setSelectedEpic(EPIC, []);
    render(<ChildIssueList />);
    expect(screen.queryByTestId('childlist-no-children')).not.toBeNull();
  });
});
