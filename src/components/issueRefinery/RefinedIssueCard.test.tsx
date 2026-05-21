/**
 * Issue Refinery — RefinedIssueCard tests (R-12).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RefinedIssueCard } from './RefinedIssueCard';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';
import type { GitLabIssue } from '@/services/gitlab/types';

const EPIC = {
  groupId: '42',
  epicIid: 7,
  title: 'Payments',
  body: 'epic body',
};
const ISSUE: GitLabIssue = {
  id: 100,
  iid: 1,
  title: 'Wire SDK',
  description: 'original body content',
  state: 'opened',
  web_url: 'https://gitlab/test/-/issues/1',
  labels: [],
  project_id: 999,
};

beforeEach(() => {
  useIssueRefineryStore.getState().reset();
});

describe('RefinedIssueCard', () => {
  it('renders nothing when refinedDraft is null', () => {
    const { container } = render(<RefinedIssueCard />);
    expect(container.firstChild).toBeNull();
  });

  it('renders both Original and Refined panes when draft is present', () => {
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(EPIC, [ISSUE]);
    s.setSelectedChild(ISSUE.iid);
    s.setRefinedDraft('## Summary\nrefined content', false);

    render(<RefinedIssueCard />);

    expect(screen.queryByTestId('refined-card')).not.toBeNull();
    expect(screen.queryByTestId('refined-original')).not.toBeNull();
    expect(screen.queryByTestId('refined-draft-pane')).not.toBeNull();
    const textarea = screen.getByTestId('refined-textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('## Summary\nrefined content');
  });

  it('displays the original body in the left pane', () => {
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(EPIC, [ISSUE]);
    s.setSelectedChild(ISSUE.iid);
    s.setRefinedDraft('refined', false);

    render(<RefinedIssueCard />);
    expect(screen.queryByText('original body content')).not.toBeNull();
  });

  it('editing the textarea marks userEditedDraft=true', () => {
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(EPIC, [ISSUE]);
    s.setSelectedChild(ISSUE.iid);
    s.setRefinedDraft('initial draft', false);

    render(<RefinedIssueCard />);
    const textarea = screen.getByTestId('refined-textarea');
    fireEvent.change(textarea, { target: { value: 'user-edited content' } });

    const after = useIssueRefineryStore.getState();
    expect(after.refinedDraft).toBe('user-edited content');
    expect(after.userEditedDraft).toBe(true);
  });

  it('shows the "edited" badge only when userEditedDraft is true', () => {
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(EPIC, [ISSUE]);
    s.setSelectedChild(ISSUE.iid);
    s.setRefinedDraft('content', false);

    const { rerender } = render(<RefinedIssueCard />);
    expect(screen.queryByTestId('refined-edited-badge')).toBeNull();

    useIssueRefineryStore.getState().setRefinedDraft('content', true);
    rerender(<RefinedIssueCard />);
    expect(screen.queryByTestId('refined-edited-badge')).not.toBeNull();
  });
});
