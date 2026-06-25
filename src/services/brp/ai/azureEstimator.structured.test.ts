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

const epic = (id = 'gid://e/1'): Epic => ({
  id, iid: 42, title: 'Improve checkout', description: 'a'.repeat(200),
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

describe('azureEstimator — structured output + seed (T4)', () => {
  it('sends a strict json_schema response format', async () => {
    const cap = captureCall();
    await drain(createAzureEstimator({ readConfig: baseConfig, call: cap.fn }).analyzeEpic(epic(), []));
    const rf = cap.reqs[0]!.responseFormat!;
    expect(rf.type).toBe('json_schema');
    expect(rf.json_schema.strict).toBe(true);
    expect(rf.json_schema.schema.additionalProperties).toBe(false);
  });

  it('constrains points to the canonical Fibonacci enum (breakdown + frameEstimate)', async () => {
    const cap = captureCall();
    await drain(createAzureEstimator({ readConfig: baseConfig, call: cap.fn }).analyzeEpic(epic(), []));
    const schema = cap.reqs[0]!.responseFormat!.json_schema.schema as Record<string, any>;
    expect(schema.properties.breakdown.items.properties.points.enum).toEqual([...FIBONACCI_POINTS]);
    expect(schema.properties.frameEstimate.enum).toEqual([...FIBONACCI_POINTS]);
  });

  it('seeds the request reproducibly from the epic id', async () => {
    const cap = captureCall();
    const est = createAzureEstimator({ readConfig: baseConfig, call: cap.fn });
    await drain(est.analyzeEpic(epic('gid://e/A'), []));
    await drain(est.analyzeEpic(epic('gid://e/A'), [])); // same id → same seed
    await drain(est.analyzeEpic(epic('gid://e/B'), [])); // different id → different seed
    expect(cap.reqs[0]!.seed).toBeTypeOf('number');
    expect(cap.reqs[0]!.seed).toBe(cap.reqs[1]!.seed);
    expect(cap.reqs[0]!.seed).not.toBe(cap.reqs[2]!.seed);
  });
});
