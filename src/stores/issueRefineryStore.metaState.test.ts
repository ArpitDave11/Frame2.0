/**
 * Tests for the Issue-Refinery store fields added for the Figma redesign:
 * pristine-draft / Reset, the published flag, and updateSelectedChild.
 *
 * Separate file from issueRefineryStore.test.ts (kit hook forbids editing
 * existing test files).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useIssueRefineryStore } from './issueRefineryStore';
import type { GitLabIssue } from '@/services/gitlab/types';

function issue(iid: number, over: Partial<GitLabIssue> = {}): GitLabIssue {
  return { id: iid * 10, iid, title: `Issue ${iid}`, state: 'opened', web_url: '', labels: [], ...over };
}

const epic = { groupId: '20', epicIid: 7, title: 'Epic', body: 'epic body' };

beforeEach(() => {
  useIssueRefineryStore.getState().reset();
});

describe('issueRefineryStore — redesign state', () => {
  it('captures a pristine baseline and reverts user edits via resetRefinedDraft', () => {
    const s = useIssueRefineryStore.getState();
    s.setRefinedDraft('MODEL OUTPUT', false); // model write → baseline
    s.setRefinedDraft('user tweaked', true);  // user edit → baseline untouched

    let st = useIssueRefineryStore.getState();
    expect(st.refinedDraft).toBe('user tweaked');
    expect(st.userEditedDraft).toBe(true);
    expect(st.pristineRefinedDraft).toBe('MODEL OUTPUT');

    st.resetRefinedDraft();
    st = useIssueRefineryStore.getState();
    expect(st.refinedDraft).toBe('MODEL OUTPUT');
    expect(st.userEditedDraft).toBe(false);
  });

  it('patches only the selected child via updateSelectedChild', () => {
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(epic, [issue(1), issue(2)]);
    s.setSelectedChild(2);
    s.updateSelectedChild({ weight: 5 });

    const children = useIssueRefineryStore.getState().children;
    expect(children.find((c) => c.iid === 2)?.weight).toBe(5);
    expect(children.find((c) => c.iid === 1)?.weight).toBeUndefined();
  });

  it('tracks published and clears it when a different child is selected', () => {
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(epic, [issue(1), issue(2)]);
    s.setSelectedChild(1);
    s.setPublished(true);
    expect(useIssueRefineryStore.getState().published).toBe(true);

    s.setSelectedChild(2);
    expect(useIssueRefineryStore.getState().published).toBe(false);
  });
});
