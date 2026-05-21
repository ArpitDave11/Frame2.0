/**
 * Issue Refinery — orchestrator tests (R-8).
 *
 * The three stage runners are mocked at module level so we can drive the
 * orchestrator's branches without touching aiClient.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runIssuePipeline, type IssuePipelineError, type StageId } from './runIssuePipeline';
import type { AIClientConfig } from '@/services/ai/types';
import type { ComprehensionResult, RefinementResult, ValidationResult } from './types';

vi.mock('./comprehension/runComprehension', () => ({ runComprehension: vi.fn() }));
vi.mock('./refinement/runRefinement', () => ({ runRefinement: vi.fn() }));
vi.mock('./validation/runValidation', () => ({ runValidation: vi.fn() }));

import { runComprehension } from './comprehension/runComprehension';
import { runRefinement } from './refinement/runRefinement';
import { runValidation } from './validation/runValidation';

const CFG: AIClientConfig = {
  provider: 'azure',
  azure: {} as never,
  openai: {} as never,
  endpoints: {} as never,
};

const COMP: ComprehensionResult = {
  epicIntent: 'X',
  issueIntent: 'Y',
  gaps: [],
  ambiguities: [],
  alignmentNotes: [],
};
const REF: RefinementResult = { refinedBody: '## Summary\nbody\n\n## AC\n- a' };
const VAL: ValidationResult = { score: 90, findings: [] };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('runIssuePipeline', () => {
  it('happy path — runs the three stages in order and returns the bundle', async () => {
    vi.mocked(runComprehension).mockResolvedValueOnce(COMP);
    vi.mocked(runRefinement).mockResolvedValueOnce(REF);
    vi.mocked(runValidation).mockResolvedValueOnce(VAL);

    const result = await runIssuePipeline(CFG, 'epic', 'issue');

    expect(result.comprehension).toEqual(COMP);
    expect(result.refined).toEqual(REF);
    expect(result.validation).toEqual(VAL);
    // Note: cachedTokens field intentionally absent — see C3 in
    // docs/reviews/2026-05-21-issue-refinery-phase-A-review.md.
    expect(result).not.toHaveProperty('cachedTokens');

    expect(runComprehension).toHaveBeenCalledTimes(1);
    expect(runRefinement).toHaveBeenCalledTimes(1);
    expect(runValidation).toHaveBeenCalledTimes(1);
  });

  it('passes the comprehension output forward to the refinement stage', async () => {
    vi.mocked(runComprehension).mockResolvedValueOnce(COMP);
    vi.mocked(runRefinement).mockResolvedValueOnce(REF);
    vi.mocked(runValidation).mockResolvedValueOnce(VAL);

    await runIssuePipeline(CFG, 'epic', 'issue');

    const refinementArgs = vi.mocked(runRefinement).mock.calls[0];
    if (!refinementArgs) throw new Error('refinement not called');
    expect(refinementArgs[3]).toEqual(COMP);
  });

  it('passes the refined body forward to the validation stage', async () => {
    vi.mocked(runComprehension).mockResolvedValueOnce(COMP);
    vi.mocked(runRefinement).mockResolvedValueOnce(REF);
    vi.mocked(runValidation).mockResolvedValueOnce(VAL);

    await runIssuePipeline(CFG, 'epic', 'issue');

    const validationArgs = vi.mocked(runValidation).mock.calls[0];
    if (!validationArgs) throw new Error('validation not called');
    expect(validationArgs[3]).toBe(REF.refinedBody);
  });

  it('on Comprehension failure, refinement and validation are never invoked', async () => {
    vi.mocked(runComprehension).mockRejectedValueOnce(new Error('boom'));

    await expect(runIssuePipeline(CFG, 'e', 'i')).rejects.toMatchObject({
      stage: 'comprehension',
    } satisfies Partial<IssuePipelineError>);
    expect(runRefinement).not.toHaveBeenCalled();
    expect(runValidation).not.toHaveBeenCalled();
  });

  it('on Refinement failure, validation is never invoked and error is tagged', async () => {
    vi.mocked(runComprehension).mockResolvedValueOnce(COMP);
    vi.mocked(runRefinement).mockRejectedValueOnce(new Error('refine boom'));

    await expect(runIssuePipeline(CFG, 'e', 'i')).rejects.toMatchObject({
      stage: 'refinement',
    } satisfies Partial<IssuePipelineError>);
    expect(runValidation).not.toHaveBeenCalled();
  });

  it('on Validation failure, the error carries stage="validation"', async () => {
    vi.mocked(runComprehension).mockResolvedValueOnce(COMP);
    vi.mocked(runRefinement).mockResolvedValueOnce(REF);
    vi.mocked(runValidation).mockRejectedValueOnce(new Error('val boom'));

    await expect(runIssuePipeline(CFG, 'e', 'i')).rejects.toMatchObject({
      stage: 'validation',
    } satisfies Partial<IssuePipelineError>);
  });

  it('invokes onStageStart before each stage, in order', async () => {
    vi.mocked(runComprehension).mockResolvedValueOnce(COMP);
    vi.mocked(runRefinement).mockResolvedValueOnce(REF);
    vi.mocked(runValidation).mockResolvedValueOnce(VAL);
    const seen: StageId[] = [];

    await runIssuePipeline(CFG, 'e', 'i', { onStageStart: (s) => seen.push(s) });

    expect(seen).toEqual(['comprehension', 'refinement', 'validation']);
  });

  it('onStageStart is optional — pipeline works without it', async () => {
    vi.mocked(runComprehension).mockResolvedValueOnce(COMP);
    vi.mocked(runRefinement).mockResolvedValueOnce(REF);
    vi.mocked(runValidation).mockResolvedValueOnce(VAL);

    const result = await runIssuePipeline(CFG, 'e', 'i');
    expect(result.comprehension).toEqual(COMP);
  });

  it('does not invoke onStageStart for stages that never run after a failure', async () => {
    vi.mocked(runComprehension).mockResolvedValueOnce(COMP);
    vi.mocked(runRefinement).mockRejectedValueOnce(new Error('refine boom'));
    const seen: StageId[] = [];

    await expect(
      runIssuePipeline(CFG, 'e', 'i', { onStageStart: (s) => seen.push(s) }),
    ).rejects.toThrow();
    // Comprehension and refinement started; validation never did.
    expect(seen).toEqual(['comprehension', 'refinement']);
  });
});
