/**
 * Issue Refinery — boundary-action tests (R-9).
 *
 * The orchestrator and gitlab updateIssue are module-mocked. Stores are
 * exercised live (Zustand is trivial to reset between tests).
 *
 * Updated post-deep-review (2026-05-21):
 *   - cachedTokens dropped from IssuePipelineResult (C3)
 *   - onStageStart callback drives phase machine (C4)
 *   - Concurrency guard + stale-child check (C2)
 *   - clearResults at kickoff (I1)
 *   - 50KB body-size cap (I8)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { refineSelectedIssue, publishRefinedIssue } from './refineIssueAction';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';
import { useConfigStore } from '@/stores/configStore';
import { useUiStore } from '@/stores/uiStore';
import type { GitLabIssue } from '@/services/gitlab/types';
import type { ComprehensionResult, RefinementResult, ValidationResult } from '@/pipeline/issue/types';
import type {
  IssuePipelineResult,
  RunPipelineOptions,
  StageId,
} from '@/pipeline/issue/runIssuePipeline';

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

const ISSUE_B: GitLabIssue = {
  id: 101,
  iid: 2,
  title: 'Other',
  description: 'other body',
  state: 'opened',
  web_url: 'https://gitlab/test/-/issues/2',
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
};

function lastToast() {
  const toasts = useUiStore.getState().toasts;
  return toasts[toasts.length - 1];
}

beforeEach(() => {
  vi.clearAllMocks();
  useIssueRefineryStore.getState().reset();
  const toasts = useUiStore.getState().toasts;
  for (const t of toasts) useUiStore.getState().removeToast(t.id);
});

describe('refineSelectedIssue — preconditions', () => {
  it('is a no-op when no child is selected (toasts an error)', async () => {
    await refineSelectedIssue();

    expect(runIssuePipeline).not.toHaveBeenCalled();
    expect(lastToast()?.type).toBe('error');
    expect(useIssueRefineryStore.getState().phase).toBe('idle');
  });

  it('rejects an oversize epic body (>50KB) with an error toast', async () => {
    const oversize = { ...EPIC, body: 'x'.repeat(50_001) };
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(oversize, [ISSUE]);
    s.setSelectedChild(ISSUE.iid);

    await refineSelectedIssue();

    expect(runIssuePipeline).not.toHaveBeenCalled();
    expect(lastToast()?.type).toBe('error');
    expect(lastToast()?.title).toMatch(/50,000/);
  });

  it('rejects an oversize issue body (>50KB) with an error toast', async () => {
    const huge = { ...ISSUE, description: 'x'.repeat(50_001) };
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(EPIC, [huge]);
    s.setSelectedChild(huge.iid);

    await refineSelectedIssue();

    expect(runIssuePipeline).not.toHaveBeenCalled();
    expect(lastToast()?.type).toBe('error');
  });

  it('skips re-entry while phase is in-flight (concurrency guard)', async () => {
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(EPIC, [ISSUE]);
    s.setSelectedChild(ISSUE.iid);
    s.setPhase('refining', null); // simulate an in-flight refine.

    await refineSelectedIssue();

    expect(runIssuePipeline).not.toHaveBeenCalled();
  });
});

describe('refineSelectedIssue — happy path', () => {
  it('phase ends ready, store gets all 3 results', async () => {
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
    expect(after.error).toBeNull();
  });

  it('advances phase through comprehending → refining → validating → ready via onStageStart', async () => {
    const seenPhases: string[] = [];
    vi.mocked(runIssuePipeline).mockImplementationOnce(
      async (_cfg: unknown, _e: unknown, _i: unknown, options?: RunPipelineOptions) => {
        // Simulate the orchestrator's calls.
        const stages: StageId[] = ['comprehension', 'refinement', 'validation'];
        for (const stage of stages) {
          options?.onStageStart?.(stage);
          seenPhases.push(useIssueRefineryStore.getState().phase);
        }
        return PIPE_OK;
      },
    );
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(EPIC, [ISSUE]);
    s.setSelectedChild(ISSUE.iid);

    await refineSelectedIssue();

    expect(seenPhases).toEqual(['comprehending', 'refining', 'validating']);
    expect(useIssueRefineryStore.getState().phase).toBe('ready');
  });

  it('clears stale per-issue results before starting (I1)', async () => {
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(EPIC, [ISSUE]);
    s.setSelectedChild(ISSUE.iid);
    // Seed stale state from a prior run.
    s.setComprehension({
      epicIntent: 'stale',
      issueIntent: 'stale',
      gaps: [],
      ambiguities: [],
      alignmentNotes: [],
    });
    s.setRefinedDraft('stale draft', true);
    s.setValidation({ score: 10, findings: [] });
    s.setPhase('error', 'old error');

    // Pipeline never returns — so we can observe the cleared state mid-flight.
    let observed: ReturnType<typeof useIssueRefineryStore.getState> | null = null;
    vi.mocked(runIssuePipeline).mockImplementationOnce(async () => {
      observed = useIssueRefineryStore.getState();
      return PIPE_OK;
    });

    await refineSelectedIssue();

    expect(observed!.comprehension).toBeNull();
    expect(observed!.refinedDraft).toBeNull();
    expect(observed!.validation).toBeNull();
    expect(observed!.userEditedDraft).toBe(false);
    expect(observed!.error).toBeNull();
  });
});

describe('refineSelectedIssue — stale-child race (C2)', () => {
  it('discards pipeline results when selectedChildIid changes mid-refine', async () => {
    vi.mocked(runIssuePipeline).mockImplementationOnce(async () => {
      // User switches child while pipeline is running.
      useIssueRefineryStore.getState().setSelectedChild(ISSUE_B.iid);
      return PIPE_OK;
    });

    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(EPIC, [ISSUE, ISSUE_B]);
    s.setSelectedChild(ISSUE.iid);

    await refineSelectedIssue();

    const after = useIssueRefineryStore.getState();
    // We do NOT clobber the new child with results from the abandoned run.
    expect(after.selectedChildIid).toBe(ISSUE_B.iid);
    expect(after.comprehension).toBeNull();
    expect(after.refinedDraft).toBeNull();
    expect(after.validation).toBeNull();
  });

  it('does not advance phase via onStageStart for an abandoned run', async () => {
    vi.mocked(runIssuePipeline).mockImplementationOnce(
      async (_cfg: unknown, _e: unknown, _i: unknown, options?: RunPipelineOptions) => {
        useIssueRefineryStore.getState().setSelectedChild(ISSUE_B.iid);
        options?.onStageStart?.('refinement');
        return PIPE_OK;
      },
    );
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(EPIC, [ISSUE, ISSUE_B]);
    s.setSelectedChild(ISSUE.iid);

    await refineSelectedIssue();

    // After selectedChild switched to B, B's phase should stay 'idle' (the
    // store was cleared on setSelectedChild).
    expect(useIssueRefineryStore.getState().phase).toBe('idle');
  });
});

describe('refineSelectedIssue — failure handling', () => {
  it('pipeline failure sets phase=error and toasts', async () => {
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

  it('failure of an abandoned run is suppressed', async () => {
    vi.mocked(runIssuePipeline).mockImplementationOnce(async () => {
      useIssueRefineryStore.getState().setSelectedChild(ISSUE_B.iid);
      throw new Error('boom');
    });
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(EPIC, [ISSUE, ISSUE_B]);
    s.setSelectedChild(ISSUE.iid);

    await refineSelectedIssue();

    // setSelectedChild cleared state to idle/null; the abandoned error doesn't
    // overwrite it.
    expect(useIssueRefineryStore.getState().phase).toBe('idle');
  });
});

describe('refineSelectedIssue — config plumbing', () => {
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

  it('is a no-op when a refine is in flight (concurrency guard)', async () => {
    const s = useIssueRefineryStore.getState();
    s.setSelectedEpic(EPIC, [ISSUE]);
    s.setSelectedChild(ISSUE.iid);
    s.setRefinedDraft(REF.refinedBody, false);
    s.setPhase('refining', null);

    await publishRefinedIssue();

    expect(updateIssue).not.toHaveBeenCalled();
  });
});
