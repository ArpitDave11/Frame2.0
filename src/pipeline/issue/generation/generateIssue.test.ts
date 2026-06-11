/**
 * Tests for the One-Click generation stage — schema validation + Instructor retry.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/ai/aiClient', () => ({ callAI: vi.fn() }));
vi.mock('@/services/ai/throttler', () => ({ withRetry: (fn: () => unknown) => fn() }));

import { callAI } from '@/services/ai/aiClient';
import { runIssueGeneration } from './generateIssue';
import type { AIClientConfig } from '@/services/ai/types';

const mockCallAI = vi.mocked(callAI);
const AI = { provider: 'azure', azure: {}, openai: {}, endpoints: {} } as unknown as AIClientConfig;

const VALID = {
  title: 'Add Apple Pay one-tap checkout',
  description: '## Summary\nEnable Apple Pay.\n\n## User Story\nAs a user I want one tap so that checkout is fast.',
  acceptanceCriteria: ['Button shows for eligible devices', 'One tap completes payment'],
  dependencies: ['Tokenized vault #1192'],
  risks: ['Region eligibility undefined'],
  suggestedWeight: 5,
  suggestedPriority: 'high',
  suggestedLabels: ['payments'],
  suggestedAssignee: 'pnair',
  rationale: { weight: 'medium complexity', priority: 'revenue impacting', assignee: 'owns payments', labels: 'matched content' },
};

beforeEach(() => vi.clearAllMocks());

describe('runIssueGeneration', () => {
  it('parses a valid generation response', async () => {
    mockCallAI.mockResolvedValue({ content: JSON.stringify(VALID), usage: {} } as never);
    const out = await runIssueGeneration(AI, { prompt: 'Add Apple Pay to checkout' });
    expect(out.title).toBe('Add Apple Pay one-tap checkout');
    expect(out.acceptanceCriteria).toHaveLength(2);
    expect(out.suggestedWeight).toBe(5);
    expect(out.suggestedAssignee).toBe('pnair');
    expect(mockCallAI).toHaveBeenCalledTimes(1);
  });

  it('retries once (Instructor) when the first response fails schema validation', async () => {
    mockCallAI
      .mockResolvedValueOnce({ content: '{"title":"x"}', usage: {} } as never) // missing required fields
      .mockResolvedValueOnce({ content: JSON.stringify(VALID), usage: {} } as never);
    const out = await runIssueGeneration(AI, { prompt: 'Add Apple Pay' });
    expect(out.title).toBe('Add Apple Pay one-tap checkout');
    expect(mockCallAI).toHaveBeenCalledTimes(2);
  });

  it('throws after two schema failures', async () => {
    mockCallAI.mockResolvedValue({ content: '{"nope":1}', usage: {} } as never);
    await expect(runIssueGeneration(AI, { prompt: 'x' })).rejects.toThrow(/schema validation failed twice/i);
  });

  it('includes epic + label + member context in the prompt', async () => {
    mockCallAI.mockResolvedValue({ content: JSON.stringify(VALID), usage: {} } as never);
    await runIssueGeneration(AI, {
      prompt: 'Add Apple Pay',
      epic: { title: 'Checkout revamp', body: 'modernize checkout' },
      labels: ['payments', 'feature'],
      members: [{ name: 'Priya Nair', username: 'pnair' }],
    });
    const userPrompt = (mockCallAI.mock.calls[0]![1] as { userPrompt: string }).userPrompt;
    expect(userPrompt).toContain('Checkout revamp');
    expect(userPrompt).toContain('payments, feature');
    expect(userPrompt).toContain('pnair — Priya Nair');
  });
});
