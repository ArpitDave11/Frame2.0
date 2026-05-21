/**
 * Issue Refinery — boundary-action tests (R-9).
 *
 * The orchestrator and gitlab updateIssue are module-mocked. Stores are
 * exercised live (Zustand is trivial to reset between tests).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { refineSelectedIssue, publishRefinedIssue } from './refineIssueAction';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';
import { useConfigStore } from '@/stores/configStore';
import { useUiStore } from '@/stores/uiStore';
import type { GitLabIssue } from '@/services/gitlab/types';
import type { ComprehensionResult, RefinementResult, ValidationResult } from '@/pipeline/issue/types';
import type { IssuePipelineResult } from '@/pipeline/issue/runIssuePipeline';

vi.mock('@/pipeline/issue/runIssuePipeline', () => ({ runIssuePipeline: vi.fn() }));
vi.mock('@/services/gitlab/gitlabClient', () => ({ updateIssue: vi.fn() }));

import { runIssuePipeline } from '@/pipeline/issue/runIssuePipeline';
import { updateIssue } from '@/services/gitlab/gitlabClient';

const EPIC = {
  groupId: '42',
  epicIid: 7,
  title: 'Payments revamp',
  body: 'Replace legacy gateway.',
};

const ISSUE: GitLabIssue = {
  id: 100,
  iid: 1,
  title: 'Wire SDK',
  description: 'add the SDK',
  state: 'opened',
  web_url: 'https://gitlab/test/-/issues/1',
  labels: [],
  project_id: 999,
};

const COMP: ComprehensionResult = {
  epicIntent: 'X',
  issueIntent: 'Y',
  gaps: [],
  ambiguities: [],
  alignmentNotes: [],
};
const REF: RefinementResult = {
  refinedBody: '## Summary\nrefined\n\n## Acceptance Criteria\n- one',
};
const VAL: ValidationResult = { score: 85, findings: ['[nit] tighten'] };

const PIPE_OK: IssuePipelineResult = {
  comprehension: COMP,
  refined: REF,
  validation: VAL,
  cachedTokens: [0, 2200, 2200],
};

function lastToast() {
  const toasts = useUiStore.getState().toasts;
  return toasts[toasts.length - 1];
}

beforeEach(() => {
  vi.clearAllMocks();
  useIssueRefineryStore.getState().reset();
  // Drain any leftover toasts so each test gets a clean slate.
  const toasts = useUiStore.getState().toasts;
  for (const t of toasts) useUiStore.getState().removeToast(t.id);
});

describe('refineSelectedIssue', () => {
  it('is a no-op when no child is selected (toasts an error)', async () => {
    await refineSelectedIssue();

    expect(runIssuePipeline).not.toHaveBeenCalled();
    expect(lastToast()?.type).toBe('error');
    expect(useIssueRefineryStore.getState().phase).toBe('idle');
  });

  it('happy path — phase ends ready, store gets all 3 results', async () => {
    vi.mocked(runIssuePipeline).mockResolvedValueOnce(PIPE_OK);
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(EPIC, [ISSUE]);
    s.setSelectedChild(ISSUE.iid);

    await refineSelectedIssue();

    const after = useIssueRefineryStore.getState();
    expect(after.phase).toBe('ready');
    expect(after.comprehension).toEqual(COMP);
    expect(after.refinedDraft).toBe(REF.refinedBody);
    expect(after.userEditedDraft).toBe(false);
    expect(after.validation).toEqual(VAL);
    expect(after.lastCachedTokens).toEqual([0, 2200, 2200]);
    expect(after.error).toBeNull();
  });

  it('flips phase to comprehending before the orchestrator call', async () => {
    let phaseAtCallTime = '';
    vi.mocked(runIssuePipeline).mockImplementationOnce(async () => {
      phaseAtCallTime = useIssueRefineryStore.getState().phase;
      return PIPE_OK;
    });
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(EPIC, [ISSUE]);
    s.setSelectedChild(ISSUE.iid);

    await refineSelectedIssue();

    expect(phaseAtCallTime).toBe('comprehending');
  });

  it('on pipeline failure, phase becomes error with the message', async () => {
    vi.mocked(runIssuePipeline).mockRejectedValueOnce(new Error('refine boom'));
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(EPIC, [ISSUE]);
    s.setSelectedChild(ISSUE.iid);

    await refineSelectedIssue();

    const after = useIssueRefineryStore.getState();
    expect(after.phase).toBe('error');
    expect(after.error).toBe('refine boom');
    expect(lastToast()?.type).toBe('error');
  });

  it('reads aiConfig from configStore (provider, azure, openai, endpoints)', async () => {
    vi.mocked(runIssuePipeline).mockResolvedValueOnce(PIPE_OK);
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(EPIC, [ISSUE]);
    s.setSelectedChild(ISSUE.iid);

    await refineSelectedIssue();

    const call = vi.mocked(runIssuePipeline).mock.calls[0];
    if (!call) throw new Error('pipeline not called');
    const [aiConfig, epicBody, issueBody] = call;
    const cfg = useConfigStore.getState().config;
    expect(aiConfig.provider).toBe(cfg.ai.provider);
    expect(aiConfig.azure).toBe(cfg.ai.azure);
    expect(aiConfig.openai).toBe(cfg.ai.openai);
    expect(aiConfig.endpoints).toBe(cfg.endpoints);
    expect(epicBody).toBe(EPIC.body);
    expect(issueBody).toBe('add the SDK');
  });
});

describe('publishRefinedIssue', () => {
  it('is a no-op when there is no draft (toasts an error)', async () => {
    await publishRefinedIssue();
    expect(updateIssue).not.toHaveBeenCalled();
    expect(lastToast()?.type).toBe('error');
  });

  it('happy path — calls updateIssue with the refined body and ends idle', async () => {
    vi.mocked(updateIssue).mockResolvedValueOnce({
      success: true,
      data: { ...ISSUE, description: REF.refinedBody },
    });
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(EPIC, [ISSUE]);
    s.setSelectedChild(ISSUE.iid);
    s.setRefinedDraft(REF.refinedBody, false);

    await publishRefinedIssue();

    const call = vi.mocked(updateIssue).mock.calls[0];
    if (!call) throw new Error('updateIssue not called');
    const [, projectId, issueIid, payload] = call;
    expect(projectId).toBe(ISSUE.project_id);
    expect(issueIid).toBe(ISSUE.iid);
    expect(payload).toEqual({ description: REF.refinedBody });

    const after = useIssueRefineryStore.getState();
    expect(after.phase).toBe('idle');
    expect(lastToast()?.type).toBe('success');
  });

  it('publish failure leaves the draft intact and phase=error', async () => {
    vi.mocked(updateIssue).mockResolvedValueOnce({ success: false, error: '403 forbidden' });
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(EPIC, [ISSUE]);
    s.setSelectedChild(ISSUE.iid);
    s.setRefinedDraft(REF.refinedBody, true);

    await publishRefinedIssue();

    const after = useIssueRefineryStore.getState();
    expect(after.phase).toBe('error');
    expect(after.error).toContain('403');
    // Draft preserved so the user can retry / copy out.
    expect(after.refinedDraft).toBe(REF.refinedBody);
    expect(after.userEditedDraft).toBe(true);
  });

  it('flips phase to publishing during the gitlab call', async () => {
    let phaseAtCallTime = '';
    vi.mocked(updateIssue).mockImplementationOnce(async () => {
      phaseAtCallTime = useIssueRefineryStore.getState().phase;
      return { success: true, data: ISSUE };
    });
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(EPIC, [ISSUE]);
    s.setSelectedChild(ISSUE.iid);
    s.setRefinedDraft(REF.refinedBody, false);

    await publishRefinedIssue();

    expect(phaseAtCallTime).toBe('publishing');
  });

  it('rejects an empty / whitespace-only refined draft', async () => {
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(EPIC, [ISSUE]);
    s.setSelectedChild(ISSUE.iid);
    s.setRefinedDraft('   \n  ', false);

    await publishRefinedIssue();

    expect(updateIssue).not.toHaveBeenCalled();
  });
});
