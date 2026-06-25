import { describe, it, expect } from 'vitest';
import { createAzureEstimator } from './azureEstimator';
import type { AIClientConfig, AIRequest, AIResponse } from '@/services/ai/types';
import type { AnalysisEvent } from './types';
import type { Epic, FrameResult } from '@/domain/brp';
import { FIBONACCI_POINTS } from '@/domain/brp.constants';

const baseConfig = (): AIClientConfig => ({
  provider: 'azure',
  azure: { endpoint: 'https://az.example', deploymentName: 'gpt-4', apiKey: 'k', apiVersion: '2024-02-01', model: 'gpt-4' },
  openai: { apiKey: '', model: '' },
  endpoints: { gitlabBaseUrl: 'g', azureEndpoint: 'https://az.example', openaiBaseUrl: 'o' },
});

const epic = (): Epic => ({
  id: 'gid://e/1', iid: 42, title: 'Improve checkout', description: 'a'.repeat(200),
  gitlabWebUrl: 'https://gitlab/1', podId: 'p1', source: 'gitlab',
  humanEstimate: null, analysisStatus: 'raw', frameResult: null,
});

const okResult: FrameResult = {
  frameEstimate: 8, breakdown: [{ title: 'x', points: 8 }], rationale: 'r',
  confidence: 0.8, references: [], generatedStories: null,
  modelVersion: 'm', analyzedAt: '2026-06-25T00:00:00Z',
};

/** Capture the AIRequest the estimator sends so we can assert on the prompt. */
function captureCall(): { fn: (c: unknown, e: string, r: AIRequest) => Promise<AIResponse>; last: () => AIRequest } {
  let captured: AIRequest | undefined;
  return {
    fn: async (_c, _e, req) => { captured = req; return { content: JSON.stringify(okResult), model: 'stub' }; },
    last: () => captured!,
  };
}

async function drain(iter: AsyncIterable<AnalysisEvent>) { for await (const _ of iter) { /* consume */ } }

describe('azureEstimator — Fibonacci ladder (T3)', () => {
  it('system prompt advertises the canonical ladder and forbids 34/55/89', async () => {
    const cap = captureCall();
    const estimator = createAzureEstimator({ readConfig: baseConfig, call: cap.fn });
    await drain(estimator.analyzeEpic(epic(), []));

    const prompt = cap.last().systemPrompt;
    // Every canonical value must appear.
    for (const p of FIBONACCI_POINTS) expect(prompt).toContain(String(p));
    // The bogus ladder values must NOT appear.
    expect(prompt).not.toMatch(/\b34\b/);
    expect(prompt).not.toMatch(/\b55\b/);
    expect(prompt).not.toMatch(/\b89\b/);
  });
});
