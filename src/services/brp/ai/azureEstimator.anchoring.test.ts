import { describe, it, expect } from 'vitest';
import { createAzureEstimator } from './azureEstimator';
import type { AIClientConfig, AIRequest, AIResponse } from '@/services/ai/types';
import type { AnalysisEvent } from './types';
import type { Epic, FrameResult, ReferenceEpic } from '@/domain/brp';

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
  confidence: 0.8, references: [], generatedStories: null, modelVersion: 'm',
  analyzedAt: '2026-06-25T00:00:00Z',
};

function captureCall() {
  const reqs: AIRequest[] = [];
  const fn = async (_c: unknown, _e: string, req: AIRequest): Promise<AIResponse> => {
    reqs.push(req);
    return { content: JSON.stringify(okResult), model: 'stub' };
  };
  return { fn, reqs };
}

async function drain(iter: AsyncIterable<AnalysisEvent>) { for await (const _ of iter) { /* consume */ } }

const refs: ReferenceEpic[] = [
  { epicId: 'gid://ref/big', title: 'Big migration', similarity: 0.6, actualSp: 21 },
  { epicId: 'gid://ref/small', title: 'Small tweak', similarity: 0.9, actualSp: 3 },
  { epicId: 'gid://ref/mid', title: 'Mid feature', similarity: 0.7, actualSp: 8 },
];

describe('azureEstimator — reference-class anchoring (T5)', () => {
  it('includes references sorted by actual story points (low → high)', async () => {
    const cap = captureCall();
    await drain(createAzureEstimator({ readConfig: baseConfig, call: cap.fn }).analyzeEpic(epic(), refs));
    const prompt = cap.reqs[0]!.userPrompt;
    const iSmall = prompt.indexOf('gid://ref/small');
    const iMid = prompt.indexOf('gid://ref/mid');
    const iBig = prompt.indexOf('gid://ref/big');
    expect(iSmall).toBeGreaterThan(-1);
    expect(iSmall).toBeLessThan(iMid);
    expect(iMid).toBeLessThan(iBig);
  });

  it('surfaces each reference actualSp and instructs relative sizing + citation', async () => {
    const cap = captureCall();
    await drain(createAzureEstimator({ readConfig: baseConfig, call: cap.fn }).analyzeEpic(epic(), refs));
    const prompt = cap.reqs[0]!.userPrompt;
    expect(prompt).toContain('actualSp=3');
    expect(prompt).toContain('actualSp=21');
    expect(prompt.toLowerCase()).toContain('relative comparison');
    expect(prompt.toLowerCase()).toContain('epicid');
  });

  it('degrades gracefully and lowers confidence guidance when there are no references', async () => {
    const cap = captureCall();
    await drain(createAzureEstimator({ readConfig: baseConfig, call: cap.fn }).analyzeEpic(epic(), []));
    const prompt = cap.reqs[0]!.userPrompt;
    expect(prompt).toContain('NONE');
    expect(prompt.toLowerCase()).toContain('lower your confidence');
  });
});
