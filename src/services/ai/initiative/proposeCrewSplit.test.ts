import { describe, it, expect, vi } from 'vitest';
import { proposeCrewSplit } from './proposeCrewSplit';
import type { Header, Crew } from '@/stores/initiativeStore';
import type { AzureOpenAIConfig } from '@/domain/configTypes';

// ─── Mock ─────────────────────────────────────────────────────

const mockCallAzure = vi.fn();

vi.mock('@/services/ai/azureClient', () => ({
  callAzure: (...args: unknown[]) => mockCallAzure(...args),
}));

// ─── Fixtures ─────────────────────────────────────────────────

const headers: Header[] = [
  { id: 'h1', text: 'Risk Assessment', level: 2, assignedCrewIds: [], aiAssigned: false },
  { id: 'h2', text: 'Compliance', level: 2, assignedCrewIds: [], aiAssigned: false },
  { id: 'h3', text: 'KYC', level: 3, assignedCrewIds: [], aiAssigned: false },
];

const crews: Crew[] = [
  { id: 'c1', name: 'Alpha', refineStatus: 'pending' },
  { id: 'c2', name: 'Beta', refineStatus: 'pending' },
];

const config = {} as AzureOpenAIConfig;
const endpoint = 'https://test.openai.azure.com';

// ─── Tests ────────────────────────────────────────────────────

describe('proposeCrewSplit', () => {
  it('parses valid JSON with assignments and reasoning', async () => {
    mockCallAzure.mockResolvedValueOnce({
      content: JSON.stringify({
        assignments: { h1: ['c1'], h2: ['c1', 'c2'], h3: ['c2'] },
        reasoning: 'Risk goes to Alpha, Compliance is cross-cutting, KYC to Beta.',
      }),
      model: 'gpt-4.1',
    });

    const result = await proposeCrewSplit(config, endpoint, headers, crews);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.assignments).toEqual({
        h1: ['c1'],
        h2: ['c1', 'c2'],
        h3: ['c2'],
      });
      expect(result.data.reasoning).toContain('cross-cutting');
    }
  });

  it('returns ok: false for malformed JSON', async () => {
    mockCallAzure.mockResolvedValueOnce({
      content: 'This is not valid JSON at all {{{',
      model: 'gpt-4.1',
    });

    const result = await proposeCrewSplit(config, endpoint, headers, crews);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeTruthy();
    }
  });

  it('returns ok: false when JSON is missing required fields', async () => {
    mockCallAzure.mockResolvedValueOnce({
      content: JSON.stringify({ assignments: { h1: ['c1'] } }),
      model: 'gpt-4.1',
    });

    const result = await proposeCrewSplit(config, endpoint, headers, crews);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('missing required fields');
    }
  });

  it('returns ok: false when callAzure throws', async () => {
    mockCallAzure.mockRejectedValueOnce(new Error('Network timeout'));

    const result = await proposeCrewSplit(config, endpoint, headers, crews);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Network timeout');
    }
  });
});
