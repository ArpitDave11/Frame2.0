import { describe, it, expect, vi } from 'vitest';
import { generateStreamEpic } from './generateStreamEpic';

vi.mock('@/services/ai/azureClient', () => ({
  callAzure: vi.fn().mockResolvedValue({
    content: '## Risk Assessment\nContent\n## Compliance\nMore content',
    model: 'gpt-4.1',
  }),
}));

describe('generateStreamEpic', () => {
  it('returns markdown with H2 sections', async () => {
    const result = await generateStreamEpic(
      {} as any, 'http://endpoint', 'Wealth Onboarding', 'Description here', 3,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('## ');
    }
  });

  it('passes correct parameters to callAzure', async () => {
    const { callAzure } = await import('@/services/ai/azureClient');
    await generateStreamEpic(
      { apiKey: 'key', deploymentName: 'gpt-4.1', apiVersion: '2024-02-01' } as any,
      'http://endpoint',
      'Test Stream',
      'Test description',
      2,
    );
    expect(callAzure).toHaveBeenCalledWith(
      { apiKey: 'key', deploymentName: 'gpt-4.1', apiVersion: '2024-02-01' },
      'http://endpoint',
      expect.objectContaining({
        systemPrompt: expect.stringContaining('6-10 sections'),
        userPrompt: expect.stringContaining('Test Stream'),
        maxTokens: 4000,
        temperature: 0.7,
      }),
    );
  });

  it('returns error on callAzure failure', async () => {
    const { callAzure } = await import('@/services/ai/azureClient');
    (callAzure as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network timeout'));

    const result = await generateStreamEpic(
      {} as any, 'http://endpoint', 'Title', 'Desc', 2,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Network timeout');
    }
  });

  it('handles non-Error thrown values', async () => {
    const { callAzure } = await import('@/services/ai/azureClient');
    (callAzure as ReturnType<typeof vi.fn>).mockRejectedValueOnce('string error');

    const result = await generateStreamEpic(
      {} as any, 'http://endpoint', 'Title', 'Desc', 2,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('string error');
    }
  });
});
