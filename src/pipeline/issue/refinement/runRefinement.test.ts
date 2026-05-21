/**
 * Issue Refinery — runRefinement tests (R-6).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runRefinement } from './runRefinement';
import type { AIClientConfig, AIRequest } from '@/services/ai/types';
import type { ComprehensionResult, RefinementResult } from '../types';

vi.mock('@/services/ai/aiClient', () => ({
  callAI: vi.fn(),
}));

import { callAI } from '@/services/ai/aiClient';

const CFG: AIClientConfig = {
  provider: 'azure',
  azure: {} as never,
  openai: {} as never,
  endpoints: {} as never,
};

const COMP: ComprehensionResult = {
  epicIntent: 'Replace gateway.',
  issueIntent: 'Wire SDK.',
  gaps: ['No test mode.'],
  ambiguities: [],
  alignmentNotes: ['Align with epic §2.'],
};

const VALID: RefinementResult = {
  refinedBody:
    '## Summary\nWire Stripe SDK into the checkout flow.\n\n' +
    '## Context\nReplaces the legacy gateway per epic §2.\n\n' +
    '## Acceptance Criteria\n- [ ] Checkout uses Stripe in test mode\n- [ ] Errors surface to user\n\n' +
    '## Technical Notes\n- Use the official @stripe/stripe-js SDK\n- Persist customer id on user record',
};

function aiReply(content: unknown) {
  return { content: typeof content === 'string' ? content : JSON.stringify(content), model: 'sonnet' };
}

function callNth(n: number): { config: AIClientConfig; request: AIRequest } {
  const c = vi.mocked(callAI).mock.calls[n];
  if (!c) throw new Error(`expected at least ${n + 1} calls, got ${vi.mocked(callAI).mock.calls.length}`);
  return { config: c[0], request: c[1] };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('runRefinement', () => {
  it('happy path — returns parsed refinedBody', async () => {
    vi.mocked(callAI).mockResolvedValueOnce(aiReply(VALID));

    const result = await runRefinement(CFG, 'epic body', 'issue body', COMP);

    expect(result).toEqual(VALID);
    expect(callAI).toHaveBeenCalledTimes(1);
  });

  it('uses temperature=0.4 and strict json_schema response_format', async () => {
    vi.mocked(callAI).mockResolvedValueOnce(aiReply(VALID));

    await runRefinement(CFG, 'e', 'i', COMP);

    const { request } = callNth(0);
    expect(request.temperature).toBe(0.4);
    expect(request.responseFormat?.type).toBe('json_schema');
    expect(request.responseFormat?.json_schema.strict).toBe(true);
    expect(request.responseFormat?.json_schema.name).toBe('RefinementResult');
  });

  it('embeds the comprehension JSON in the user prompt', async () => {
    vi.mocked(callAI).mockResolvedValueOnce(aiReply(VALID));

    await runRefinement(CFG, 'e', 'i', COMP);

    const { request } = callNth(0);
    expect(request.userPrompt).toContain('<comprehension>');
    expect(request.userPrompt).toContain(JSON.stringify(COMP));
  });

  it('preserves a GitLab quick-action when the model returns one', async () => {
    // Reaches the stage runner unchanged because runRefinement is a thin wrapper.
    const withQuickAction: RefinementResult = {
      refinedBody: VALID.refinedBody + '\n\n/label ~stripe-migration @arpit #145',
    };
    vi.mocked(callAI).mockResolvedValueOnce(aiReply(withQuickAction));

    const result = await runRefinement(CFG, 'e', 'i', COMP);
    expect(result.refinedBody).toContain('/label ~stripe-migration');
    expect(result.refinedBody).toContain('@arpit');
    expect(result.refinedBody).toContain('#145');
  });

  it('Instructor retry — second attempt embeds the prior validation error', async () => {
    // First response: refinedBody too short to pass the 50-char floor.
    vi.mocked(callAI)
      .mockResolvedValueOnce(aiReply({ refinedBody: 'too short' }))
      .mockResolvedValueOnce(aiReply(VALID));

    const result = await runRefinement(CFG, 'e', 'i', COMP);

    expect(result).toEqual(VALID);
    expect(callAI).toHaveBeenCalledTimes(2);
    const { request: second } = callNth(1);
    expect(second.userPrompt).toContain('PREVIOUS ATTEMPT FAILED JSON-SCHEMA VALIDATION');
  });

  it('throws when both attempts fail schema validation', async () => {
    vi.mocked(callAI)
      .mockResolvedValueOnce(aiReply({ refinedBody: 'short' }))
      .mockResolvedValueOnce(aiReply({ refinedBody: 'still short' }));

    await expect(runRefinement(CFG, 'e', 'i', COMP)).rejects.toThrow(/schema validation failed twice/);
    expect(callAI).toHaveBeenCalledTimes(2);
  });
});
