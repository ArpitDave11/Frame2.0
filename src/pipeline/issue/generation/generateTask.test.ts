import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/ai/aiClient', () => ({ callAI: vi.fn() }));
vi.mock('@/services/ai/throttler', () => ({ withRetry: (fn: () => unknown) => fn() }));

import { callAI } from '@/services/ai/aiClient';
import { runTaskGeneration } from './generateTask';
import type { AIClientConfig } from '@/services/ai/types';

const mockCallAI = vi.mocked(callAI);
const AI = { provider: 'azure', azure: {}, openai: {}, endpoints: {} } as unknown as AIClientConfig;
const VALID = { title: 'Write unit tests for evaluate', description: 'Add a unit test suite.', acceptanceCriteria: ['covers all operators'], suggestedWeight: 3 };

beforeEach(() => vi.clearAllMocks());

describe('runTaskGeneration', () => {
  it('parses a valid task and embeds parent context', async () => {
    mockCallAI.mockResolvedValue({ content: JSON.stringify(VALID), usage: {} } as never);
    const out = await runTaskGeneration(AI, { prompt: 'add tests', parent: { title: 'US-001', body: 'do math' } });
    expect(out.title).toBe('Write unit tests for evaluate');
    expect(out.suggestedWeight).toBe(3);
    const userPrompt = (mockCallAI.mock.calls[0]![1] as { userPrompt: string }).userPrompt;
    expect(userPrompt).toContain('US-001');
    expect(userPrompt).toContain('do math');
  });

  it('retries once on schema failure then succeeds', async () => {
    mockCallAI
      .mockResolvedValueOnce({ content: '{"title":"x"}', usage: {} } as never)
      .mockResolvedValueOnce({ content: JSON.stringify(VALID), usage: {} } as never);
    const out = await runTaskGeneration(AI, { prompt: 'p', parent: { title: 't', body: '' } });
    expect(out.title).toBe('Write unit tests for evaluate');
    expect(mockCallAI).toHaveBeenCalledTimes(2);
  });
});
