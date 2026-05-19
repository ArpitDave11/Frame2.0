/**
 * Issue Refinery — store unit tests (R-2).
 *
 * Tests the Zustand store in isolation. No network, no UI. Each test
 * resets the store first so state doesn't leak between cases.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useIssueRefineryStore } from './issueRefineryStore';
import type { GitLabIssue } from '@/services/gitlab/types';
import type {
  ComprehensionResult,
  ValidationResult,
} from '@/pipeline/issue/types';

const EPIC = {
  groupId: '42',
  epicIid: 7,
  title: 'Payments revamp',
  body: 'Replace legacy gateway with Stripe.',
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

const COMP: ComprehensionResult = {
  epicIntent: 'Replace legacy payment gateway.',
  issueIntent: 'Wire Stripe SDK.',
  gaps: ['No mention of test mode.'],
  ambiguities: [],
  alignmentNotes: ['Should follow epic §2.'],
};

const VAL: ValidationResult = {
  score: 85,
  findings: ['[nit] Tighten summary.'],
};

beforeEach(() => {
  useIssueRefineryStore.getState().reset();
});

describe('issueRefineryStore — initial state', () => {
  it('starts idle with all references null/empty', () => {
    const s = useIssueRefineryStore.getState();
    expect(s.phase).toBe('idle');
    expect(s.selectedEpic).toBeNull();
    expect(s.children).toEqual([]);
    expect(s.selectedChildIid).toBeNull();
    expect(s.originalBody).toBeNull();
    expect(s.comprehension).toBeNull();
    expect(s.refinedDraft).toBeNull();
    expect(s.userEditedDraft).toBe(false);
    expect(s.validation).toBeNull();
    expect(s.error).toBeNull();
    expect(s.lastCachedTokens).toEqual([]);
  });
});

describe('issueRefineryStore — setSelectedEpic', () => {
  it('populates epic + children and resets per-child state', () => {
    const s = useIssueRefineryStore.getState();
    // First set a child and some derived state.
    s.setSelectedEpic(EPIC, [ISSUE_A, ISSUE_B]);
    s.setSelectedChild(ISSUE_A.iid);
    s.setComprehension(COMP);
    s.setRefinedDraft('draft', true);
    s.setValidation(VAL);

    // Loading a new epic must clear per-child state.
    s.setSelectedEpic({ ...EPIC, epicIid: 8 }, []);

    const after = useIssueRefineryStore.getState();
    expect(after.selectedEpic?.epicIid).toBe(8);
    expect(after.children).toEqual([]);
    expect(after.selectedChildIid).toBeNull();
    expect(after.comprehension).toBeNull();
    expect(after.refinedDraft).toBeNull();
    expect(after.userEditedDraft).toBe(false);
    expect(after.validation).toBeNull();
    expect(after.phase).toBe('idle');
  });
});

describe('issueRefineryStore — setSelectedChild', () => {
  it('pulls description + project_id from the matching child', () => {
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(EPIC, [ISSUE_A, ISSUE_B]);
    s.setSelectedChild(ISSUE_B.iid);

    const after = useIssueRefineryStore.getState();
    expect(after.selectedChildIid).toBe(ISSUE_B.iid);
    expect(after.originalBody).toBe('rotate tokens');
    expect(after.originalProjectId).toBe(999);
  });

  it('falls back to empty body when child has no description', () => {
    const s = useIssueRefineryStore.getState();
    const noBody: GitLabIssue = { ...ISSUE_A, description: undefined };
    s.setSelectedEpic(EPIC, [noBody]);
    s.setSelectedChild(noBody.iid);

    expect(useIssueRefineryStore.getState().originalBody).toBe('');
  });

  it('is a no-op for an unknown iid', () => {
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(EPIC, [ISSUE_A]);
    s.setSelectedChild(999); // not in children

    const after = useIssueRefineryStore.getState();
    expect(after.selectedChildIid).toBeNull();
    expect(after.originalBody).toBeNull();
  });

  it('clears derived state when switching to a different child', () => {
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(EPIC, [ISSUE_A, ISSUE_B]);
    s.setSelectedChild(ISSUE_A.iid);
    s.setComprehension(COMP);
    s.setRefinedDraft('a-draft', false);
    s.setValidation(VAL);
    s.recordCachedTokens(2200);

    // Switch to a different child.
    s.setSelectedChild(ISSUE_B.iid);

    const after = useIssueRefineryStore.getState();
    expect(after.selectedChildIid).toBe(ISSUE_B.iid);
    expect(after.comprehension).toBeNull();
    expect(after.refinedDraft).toBeNull();
    expect(after.validation).toBeNull();
    expect(after.lastCachedTokens).toEqual([]);
    expect(after.phase).toBe('idle');
  });
});

describe('issueRefineryStore — setRefinedDraft userEdited flag', () => {
  it('keeps userEditedDraft=false when refiner writes the draft', () => {
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(EPIC, [ISSUE_A]);
    s.setSelectedChild(ISSUE_A.iid);
    s.setRefinedDraft('## Summary\nfresh', false);

    expect(useIssueRefineryStore.getState().userEditedDraft).toBe(false);
  });

  it('marks userEditedDraft=true when the user edits inline', () => {
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(EPIC, [ISSUE_A]);
    s.setSelectedChild(ISSUE_A.iid);
    s.setRefinedDraft('## Summary\nfresh', false);
    s.setRefinedDraft('## Summary\nuser tweaked', true);

    expect(useIssueRefineryStore.getState().userEditedDraft).toBe(true);
  });
});

describe('issueRefineryStore — setPhase', () => {
  it('updates phase and error together', () => {
    const s = useIssueRefineryStore.getState();
    s.setPhase('error', 'comprehension failed');

    const after = useIssueRefineryStore.getState();
    expect(after.phase).toBe('error');
    expect(after.error).toBe('comprehension failed');
  });

  it('defaults error to null when not provided', () => {
    const s = useIssueRefineryStore.getState();
    s.setPhase('comprehending');

    expect(useIssueRefineryStore.getState().error).toBeNull();
  });
});

describe('issueRefineryStore — recordCachedTokens', () => {
  it('appends each call in order', () => {
    const s = useIssueRefineryStore.getState();
    s.recordCachedTokens(0);
    s.recordCachedTokens(2200);
    s.recordCachedTokens(2200);

    expect(useIssueRefineryStore.getState().lastCachedTokens).toEqual([0, 2200, 2200]);
  });
});

describe('issueRefineryStore — reset', () => {
  it('returns to initial state from any state', () => {
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(EPIC, [ISSUE_A]);
    s.setSelectedChild(ISSUE_A.iid);
    s.setComprehension(COMP);
    s.setRefinedDraft('x', true);
    s.setValidation(VAL);
    s.setPhase('error', 'boom');
    s.recordCachedTokens(100);

    s.reset();

    const after = useIssueRefineryStore.getState();
    expect(after.phase).toBe('idle');
    expect(after.selectedEpic).toBeNull();
    expect(after.children).toEqual([]);
    expect(after.selectedChildIid).toBeNull();
    expect(after.comprehension).toBeNull();
    expect(after.refinedDraft).toBeNull();
    expect(after.userEditedDraft).toBe(false);
    expect(after.validation).toBeNull();
    expect(after.error).toBeNull();
    expect(after.lastCachedTokens).toEqual([]);
  });
});
