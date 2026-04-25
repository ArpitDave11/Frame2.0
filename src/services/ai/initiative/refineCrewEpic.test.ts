/**
 * Tests for refineCrewEpic — AI-generated crew-level epics.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { refineCrewEpic } from './refineCrewEpic';
import type { AzureOpenAIConfig } from '@/domain/configTypes';
import type { Header } from '@/stores/initiativeStore';

vi.mock('@/services/ai/azureClient', () => ({ callAzure: vi.fn() }));

import { callAzure } from '@/services/ai/azureClient';

const mockCallAzure = vi.mocked(callAzure);

const MOCK_CONFIG: AzureOpenAIConfig = {
  endpoint: 'https://test.openai.azure.com',
  deploymentName: 'gpt-4.1',
  apiKey: 'test-key',
  apiVersion: '2024-02-01',
  model: 'gpt-4.1',
};

const MOCK_HEADERS: Header[] = [
  { id: 'h1', text: 'Risk Assessment', level: 2, assignedCrewIds: ['c1'], aiAssigned: false },
  { id: 'h2', text: 'Compliance Checks', level: 3, assignedCrewIds: ['c1'], aiAssigned: false },
];

const STREAM_CONTEXT = '## Risk Assessment\nAssess risks.\n### Compliance Checks\nVerify compliance.';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('refineCrewEpic', () => {
  it('returns ok with markdown data on success', async () => {
    const mockMarkdown = '# Alpha Crew Epic\n\n## Risk Assessment\nDetailed risk analysis...';
    mockCallAzure.mockResolvedValue({
      content: mockMarkdown,
      model: 'gpt-4.1',
      usage: { promptTokens: 200, completionTokens: 150, totalTokens: 350 },
    });

    const result = await refineCrewEpic(
      MOCK_CONFIG,
      'https://test.openai.azure.com',
      'Alpha',
      MOCK_HEADERS,
      STREAM_CONTEXT,
    );

    expect(result).toEqual({ ok: true, data: mockMarkdown });
    expect(mockCallAzure).toHaveBeenCalledOnce();
    expect(mockCallAzure).toHaveBeenCalledWith(
      MOCK_CONFIG,
      'https://test.openai.azure.com',
      expect.objectContaining({
        systemPrompt: expect.stringContaining('Alpha'),
        userPrompt: expect.stringContaining('Alpha'),
        temperature: 0.4,
        maxTokens: 4000,
      }),
    );
  });

  it('includes header names in the system prompt', async () => {
    mockCallAzure.mockResolvedValue({
      content: 'epic content',
      model: 'gpt-4.1',
    });

    await refineCrewEpic(MOCK_CONFIG, 'https://test.openai.azure.com', 'Beta', MOCK_HEADERS, STREAM_CONTEXT);

    const systemPrompt = mockCallAzure.mock.calls[0]![2].systemPrompt;
    expect(systemPrompt).toContain('Risk Assessment');
    expect(systemPrompt).toContain('Compliance Checks');
  });

  it('returns ok: false with error message on failure', async () => {
    mockCallAzure.mockRejectedValue(new Error('Azure OpenAI rate limited (429). Retry after 30s'));

    const result = await refineCrewEpic(
      MOCK_CONFIG,
      'https://test.openai.azure.com',
      'Alpha',
      MOCK_HEADERS,
      STREAM_CONTEXT,
    );

    expect(result).toEqual({
      ok: false,
      error: 'Azure OpenAI rate limited (429). Retry after 30s',
    });
  });

  it('handles non-Error thrown values', async () => {
    mockCallAzure.mockRejectedValue('unexpected string error');

    const result = await refineCrewEpic(
      MOCK_CONFIG,
      'https://test.openai.azure.com',
      'Alpha',
      MOCK_HEADERS,
      STREAM_CONTEXT,
    );

    expect(result).toEqual({ ok: false, error: 'unexpected string error' });
  });
});
