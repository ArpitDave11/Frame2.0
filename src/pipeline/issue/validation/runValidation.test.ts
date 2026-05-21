/**
 * Issue Refinery — runValidation tests (R-7).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runValidation } from './runValidation';
import type { AIClientConfig, AIRequest } from '@/services/ai/types';
import type { ValidationResult } from '../types';

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

const VALID: ValidationResult = {
  score: 82,
  findings: ['[nit] Tighten the summary to one sentence.', '[important] Add a rollback condition.'],
};

const REFINED_BODY = '## Summary\nx\n\n## Context\ny\n\n## Acceptance Criteria\n- z';

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

describe('runValidation', () => {
  it('happy path — returns { score, findings }', async () => {
    vi.mocked(callAI).mockResolvedValueOnce(aiReply(VALID));

    const result = await runValidation(CFG, 'epic', 'issue', REFINED_BODY);

    expect(result).toEqual(VALID);
    expect(callAI).toHaveBeenCalledTimes(1);
  });

  it('uses temperature=0.2 and strict json_schema response_format', async () => {
    vi.mocked(callAI).mockResolvedValueOnce(aiReply(VALID));

    await runValidation(CFG, 'e', 'i', REFINED_BODY);

    const { request } = callNth(0);
    expect(request.temperature).toBe(0.2);
    expect(request.responseFormat?.type).toBe('json_schema');
    expect(request.responseFormat?.json_schema.strict).toBe(true);
    expect(request.responseFormat?.json_schema.name).toBe('ValidationResult');
  });

  it('embeds the refined body verbatim in the user prompt', async () => {
    vi.mocked(callAI).mockResolvedValueOnce(aiReply(VALID));

    await runValidation(CFG, 'e', 'i', REFINED_BODY);

    const { request } = callNth(0);
    expect(request.userPrompt).toContain('<refined>');
    expect(request.userPrompt).toContain(REFINED_BODY);
  });

  it('accepts a perfect score of 100 with empty findings', async () => {
    vi.mocked(callAI).mockResolvedValueOnce(aiReply({ score: 100, findings: [] }));

    const result = await runValidation(CFG, 'e', 'i', REFINED_BODY);
    expect(result).toEqual({ score: 100, findings: [] });
  });

  it('Instructor retry — succeeds on second attempt with corrected score', async () => {
    // First response: score out of range.
    vi.mocked(callAI)
      .mockResolvedValueOnce(aiReply({ score: 150, findings: [] }))
      .mockResolvedValueOnce(aiReply(VALID));

    const result = await runValidation(CFG, 'e', 'i', REFINED_BODY);

    expect(result).toEqual(VALID);
    expect(callAI).toHaveBeenCalledTimes(2);
    const { request: second } = callNth(1);
    expect(second.userPrompt).toContain('PREVIOUS ATTEMPT FAILED JSON-SCHEMA VALIDATION');
  });

  it('throws when both attempts fail schema validation', async () => {
    vi.mocked(callAI)
      .mockResolvedValueOnce(aiReply({ score: -5, findings: [] }))
      .mockResolvedValueOnce(aiReply({ score: 999, findings: [] }));

    await expect(runValidation(CFG, 'e', 'i', REFINED_BODY)).rejects.toThrow(
      /schema validation failed twice/,
    );
  });
});
