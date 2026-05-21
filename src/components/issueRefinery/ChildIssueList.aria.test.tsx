/**
 * Issue Refinery — ChildIssueList ARIA / keyboard tests (B-I1).
 *
 * Separate file from ChildIssueList.test.tsx so the H3 hook (which blocks
 * edits to existing test files) doesn't get in the way.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChildIssueList } from './ChildIssueList';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';
import type { GitLabIssue } from '@/services/gitlab/types';

const EPIC = {
  groupId: '42',
  epicIid: 7,
  title: 'Payments revamp',
  body: 'epic body',
};

const issues: GitLabIssue[] = [
  { id: 100, iid: 1, title: 'A', description: 'a', state: 'opened', web_url: '', labels: [], project_id: 999 },
  { id: 101, iid: 2, title: 'B', description: 'b', state: 'opened', web_url: '', labels: [], project_id: 999 },
  { id: 102, iid: 3, title: 'C', description: 'c', state: 'opened', web_url: '', labels: [], project_id: 999 },
];

beforeEach(() => {
  useIssueRefineryStore.getState().reset();
  useIssueRefineryStore.getState().setSelectedEpic(EPIC, issues);
});

describe('ChildIssueList — WAI-ARIA radio pattern (B-I1)', () => {
  it('initial render: first item is focusable (tabindex=0), others tabindex=-1', () => {
    render(<ChildIssueList />);
    expect(screen.getByTestId('childlist-item-1').getAttribute('tabindex')).toBe('0');
    expect(screen.getByTestId('childlist-item-2').getAttribute('tabindex')).toBe('-1');
    expect(screen.getByTestId('childlist-item-3').getAttribute('tabindex')).toBe('-1');
  });

  it('after selecting iid=2: only the selected item is focusable', () => {
    useIssueRefineryStore.getState().setSelectedChild(2);
    render(<ChildIssueList />);
    expect(screen.getByTestId('childlist-item-1').getAttribute('tabindex')).toBe('-1');
    expect(screen.getByTestId('childlist-item-2').getAttribute('tabindex')).toBe('0');
    expect(screen.getByTestId('childlist-item-3').getAttribute('tabindex')).toBe('-1');
  });

  it('ArrowDown selects the next item (wrap-around)', () => {
    useIssueRefineryStore.getState().setSelectedChild(1);
    render(<ChildIssueList />);
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'ArrowDown' });
    expect(useIssueRefineryStore.getState().selectedChildIid).toBe(2);
    fireEvent.keyDown(group, { key: 'ArrowDown' });
    expect(useIssueRefineryStore.getState().selectedChildIid).toBe(3);
    fireEvent.keyDown(group, { key: 'ArrowDown' }); // wraps to first
    expect(useIssueRefineryStore.getState().selectedChildIid).toBe(1);
  });

  it('ArrowUp selects the previous item (wrap-around)', () => {
    useIssueRefineryStore.getState().setSelectedChild(2);
    render(<ChildIssueList />);
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'ArrowUp' });
    expect(useIssueRefineryStore.getState().selectedChildIid).toBe(1);
    fireEvent.keyDown(group, { key: 'ArrowUp' }); // wraps to last
    expect(useIssueRefineryStore.getState().selectedChildIid).toBe(3);
  });

  it('Home selects the first item, End the last', () => {
    useIssueRefineryStore.getState().setSelectedChild(2);
    render(<ChildIssueList />);
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'End' });
    expect(useIssueRefineryStore.getState().selectedChildIid).toBe(3);
    fireEvent.keyDown(group, { key: 'Home' });
    expect(useIssueRefineryStore.getState().selectedChildIid).toBe(1);
  });

  it('ArrowRight / ArrowLeft are also bound (per ARIA radiogroup)', () => {
    useIssueRefineryStore.getState().setSelectedChild(1);
    render(<ChildIssueList />);
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(useIssueRefineryStore.getState().selectedChildIid).toBe(2);
    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    expect(useIssueRefineryStore.getState().selectedChildIid).toBe(1);
  });

  it('non-navigation keys are ignored (do not preventDefault)', () => {
    useIssueRefineryStore.getState().setSelectedChild(1);
    render(<ChildIssueList />);
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'a' });
    expect(useIssueRefineryStore.getState().selectedChildIid).toBe(1);
  });
});
