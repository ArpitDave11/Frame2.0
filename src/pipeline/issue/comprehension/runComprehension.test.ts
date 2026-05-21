/**
 * Issue Refinery — runComprehension tests (R-5).
 *
 * aiClient is mocked at the module level. The throttler's withRetry passes
 * through synchronously in the happy path (single attempt, no real waiting).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runComprehension } from './runComprehension';
import type { AIClientConfig, AIRequest } from '@/services/ai/types';
import type { ComprehensionResult } from '../types';

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

const VALID: ComprehensionResult = {
  epicIntent: 'Replace gateway.',
  issueIntent: 'Wire SDK.',
  gaps: ['No test mode.'],
  ambiguities: [],
  alignmentNotes: ['Align with epic §2.'],
};

function aiReply(content: unknown) {
  return {
    content: typeof content === 'string' ? content : JSON.stringify(content),
    model: 'sonnet',
  };
}

/** Helper: read the Nth recorded call to the mocked callAI. */
function callNth(n: number): { config: AIClientConfig; request: AIRequest } {
  const c = vi.mocked(callAI).mock.calls[n];
  if (!c) throw new Error(`expected at least ${n + 1} calls, got ${vi.mocked(callAI).mock.calls.length}`);
  return { config: c[0], request: c[1] };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('runComprehension', () => {
  it('happy path — returns parsed result from a valid response', async () => {
    vi.mocked(callAI).mockResolvedValueOnce(aiReply(VALID));

    const result = await runComprehension(CFG, 'epic body', 'issue body');

    expect(result).toEqual(VALID);
    expect(callAI).toHaveBeenCalledTimes(1);
  });

  it('passes temperature=0.2 and strict json_schema response_format', async () => {
    vi.mocked(callAI).mockResolvedValueOnce(aiReply(VALID));

    await runComprehension(CFG, 'epic', 'issue');

    const { request } = callNth(0);
    expect(request.temperature).toBe(0.2);
    expect(request.responseFormat?.type).toBe('json_schema');
    expect(request.responseFormat?.json_schema.strict).toBe(true);
    expect(request.responseFormat?.json_schema.name).toBe('ComprehensionResult');
  });

  it('retries once with the validation error appended when first response is invalid', async () => {
    // First response: missing required `alignmentNotes`.
    const invalid = { ...VALID } as Partial<ComprehensionResult>;
    delete invalid.alignmentNotes;
    vi.mocked(callAI)
      .mockResolvedValueOnce(aiReply(invalid))
      .mockResolvedValueOnce(aiReply(VALID));

    const result = await runComprehension(CFG, 'epic', 'issue');

    expect(result).toEqual(VALID);
    expect(callAI).toHaveBeenCalledTimes(2);
    const { request: second } = callNth(1);
    expect(second.userPrompt).toContain('PREVIOUS ATTEMPT FAILED JSON-SCHEMA VALIDATION');
  });

  it('throws when both attempts fail schema validation', async () => {
    const broken = { epicIntent: '', issueIntent: 'x', gaps: [], ambiguities: [], alignmentNotes: [] };
    vi.mocked(callAI)
      .mockResolvedValueOnce(aiReply(broken))
      .mockResolvedValueOnce(aiReply(broken));

    await expect(runComprehension(CFG, 'epic', 'issue')).rejects.toThrow(
      /schema validation failed twice/,
    );
    expect(callAI).toHaveBeenCalledTimes(2);
  });

  it('throws when the response is not valid JSON', async () => {
    vi.mocked(callAI)
      .mockResolvedValueOnce(aiReply('not json at all'))
      .mockResolvedValueOnce(aiReply('still not json'));

    await expect(runComprehension(CFG, 'epic', 'issue')).rejects.toThrow();
  });
});
