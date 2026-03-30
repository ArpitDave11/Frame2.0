/**
 * Tests for generateCustomStories — custom issue creation via AI.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCustomStories } from './generateCustomStories';
import type { AIClientConfig } from '@/services/ai/types';

vi.mock('@/services/ai/aiClient', () => ({ callAI: vi.fn() }));

import { callAI } from '@/services/ai/aiClient';

const mockCallAI = vi.mocked(callAI);

const MOCK_AI_CONFIG: AIClientConfig = {
  provider: 'openai',
  azure: { endpoint: '', deploymentName: '', apiKey: '', apiVersion: '', model: '' },
  openai: { apiKey: 'key', model: 'gpt-4.1', baseUrl: '' },
  endpoints: { gitlabBaseUrl: '', azureEndpoint: '', openaiBaseUrl: '' },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('generateCustomStories', () => {
  it('parses AI JSON response into ParsedUserStory array', async () => {
    mockCallAI.mockResolvedValue({
      content: JSON.stringify([{
        title: 'Set up CI/CD pipeline',
        persona: 'DevOps engineer',
        goal: 'automate deployments',
        benefit: 'faster releases',
        acceptanceCriteria: ['Pipeline triggers on merge', 'Deploys to staging'],
      }]),
      model: 'gpt-4.1',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    });

    const result = await generateCustomStories(
      MOCK_AI_CONFIG,
      'Set up CI/CD',
      'Epic content here',
      [],
      [],
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toMatch(/^custom-/);
    expect(result[0]!.title).toBe('Set up CI/CD pipeline');
    expect(result[0]!.asA).toBe('DevOps engineer');
    expect(result[0]!.iWant).toBe('automate deployments');
    expect(result[0]!.soThat).toBe('faster releases');
    expect(result[0]!.acceptanceCriteria).toHaveLength(2);
  });

  it('returns empty array when AI returns empty array', async () => {
    mockCallAI.mockResolvedValue({
      content: '[]',
      model: 'gpt-4.1',
    });

    const result = await generateCustomStories(MOCK_AI_CONFIG, 'nothing', '', [], []);
    expect(result).toHaveLength(0);
  });

  it('handles markdown-wrapped JSON', async () => {
    mockCallAI.mockResolvedValue({
      content: '```json\n[{"title":"Test","persona":"user","goal":"test","benefit":"yes","acceptanceCriteria":["AC1"]}]\n```',
      model: 'gpt-4.1',
    });

    const result = await generateCustomStories(MOCK_AI_CONFIG, 'test', 'epic', [], []);
    expect(result).toHaveLength(1);
    expect(result[0]!.title).toBe('Test');
  });

  it('throws on unparseable response', async () => {
    mockCallAI.mockResolvedValue({
      content: 'This is not JSON at all',
      model: 'gpt-4.1',
    });

    await expect(
      generateCustomStories(MOCK_AI_CONFIG, 'test', 'epic', [], []),
    ).rejects.toThrow();
  });

  it('generates multiple stories from broad request', async () => {
    mockCallAI.mockResolvedValue({
      content: JSON.stringify([
        { title: 'Story A', persona: 'dev', goal: 'do A', benefit: 'benefit A', acceptanceCriteria: ['AC1'] },
        { title: 'Story B', persona: 'pm', goal: 'do B', benefit: 'benefit B', acceptanceCriteria: ['AC2'] },
      ]),
      model: 'gpt-4.1',
    });

    const result = await generateCustomStories(MOCK_AI_CONFIG, 'broad feature', 'epic', [], []);
    expect(result).toHaveLength(2);
    expect(result[0]!.id).not.toBe(result[1]!.id);
  });
});
