import { describe, it, expect, vi } from 'vitest';
import { createAzureEstimator } from './azureEstimator';
import type { AIClientConfig, AIRequest, AIResponse } from '@/services/ai/types';
import type { AnalysisEvent } from './types';
import type { Epic, FrameResult } from '@/domain/brp';

const baseConfig = (): AIClientConfig => ({
  provider: 'azure',
  azure: {
    endpoint: 'https://az.example',
    deploymentName: 'gpt-4',
    apiKey: 'k',
    apiVersion: '2024-02-01',
    model: 'gpt-4',
  },
  openai: { apiKey: '', model: '' },
  endpoints: {
    gitlabBaseUrl: 'https://gitlab.example/api/v4',
    azureEndpoint: 'https://az.example',
    openaiBaseUrl: 'https://api.openai.com/v1',
  },
});

const epic = (overrides: Partial<Epic> = {}): Epic => ({
  id: 'gid://e/1',
  iid: 42,
  title: 'Improve checkout',
  description: 'a'.repeat(200),
  gitlabWebUrl: 'https://gitlab/1',
  podId: 'p1',
  source: 'gitlab',
  humanEstimate: null,
  analysisStatus: 'raw',
  frameResult: null,
  ...overrides,
});

const goodFrameResult: FrameResult = {
  frameEstimate: 8 as FrameResult['frameEstimate'],
  breakdown: [
    { title: 'Backend', points: 5 as FrameResult['frameEstimate'] },
    { title: 'UI', points: 3 as FrameResult['frameEstimate'] },
  ],
  rationale: 'Two subsystems involved.',
  confidence: 0.8,
  references: [],
  generatedStories: null,
  modelVersion: 'azure-test',
  analyzedAt: '2026-05-23T00:00:00Z',
};

async function collect(iter: AsyncIterable<AnalysisEvent>): Promise<AnalysisEvent[]> {
  const out: AnalysisEvent[] = [];
  for await (const ev of iter) out.push(ev);
  return out;
}

type CallFn = (cfg: unknown, ep: string, req: AIRequest) => Promise<AIResponse>;

function stubCallString(body: string): CallFn {
  return async () => ({ content: body, model: 'stub' });
}

describe('createAzureEstimator', () => {
  it('emits started → done with the parsed FrameResult on a happy path', async () => {
    const estimator = createAzureEstimator({
      readConfig: baseConfig,
      call: stubCallString(JSON.stringify(goodFrameResult)),
    });
    const events = await collect(estimator.analyzeEpic(epic(), []));
    expect(events.map((e) => e.kind)).toEqual(['started', 'done']);
    const done = events[1] as Extract<AnalysisEvent, { kind: 'done' }>;
    expect(done.result.frameEstimate).toBe(8);
    expect(done.result.breakdown).toHaveLength(2);
  });

  it('strips a ```json ...``` fence the model sometimes wraps the JSON in', async () => {
    const fenced = '```json\n' + JSON.stringify(goodFrameResult) + '\n```';
    const estimator = createAzureEstimator({
      readConfig: baseConfig,
      call: stubCallString(fenced),
    });
    const events = await collect(estimator.analyzeEpic(epic(), []));
    expect(events.map((e) => e.kind)).toEqual(['started', 'done']);
  });

  it('emits started → error when the response is not JSON', async () => {
    const estimator = createAzureEstimator({
      readConfig: baseConfig,
      call: stubCallString('this is just prose, sorry'),
    });
    const events = await collect(estimator.analyzeEpic(epic(), []));
    expect(events.map((e) => e.kind)).toEqual(['started', 'error']);
    const err = events[1] as Extract<AnalysisEvent, { kind: 'error' }>;
    expect(err.message).toMatch(/non-JSON/);
  });

  it('emits error when the JSON fails schema validation', async () => {
    const bad = { ...goodFrameResult, frameEstimate: 7 };
    const estimator = createAzureEstimator({
      readConfig: baseConfig,
      call: stubCallString(JSON.stringify(bad)),
    });
    const events = await collect(estimator.analyzeEpic(epic(), []));
    expect(events.map((e) => e.kind)).toEqual(['started', 'error']);
    const err = events[1] as Extract<AnalysisEvent, { kind: 'error' }>;
    expect(err.message).toMatch(/schema/i);
  });

  it('emits error when the underlying call throws', async () => {
    const estimator = createAzureEstimator({
      readConfig: baseConfig,
      call: async () => {
        throw new Error('429 Too Many Requests');
      },
    });
    const events = await collect(estimator.analyzeEpic(epic(), []));
    expect(events.map((e) => e.kind)).toEqual(['started', 'error']);
    const err = events[1] as Extract<AnalysisEvent, { kind: 'error' }>;
    expect(err.message).toMatch(/429/);
  });

  it('emits error when azureEndpoint is not configured', async () => {
    const estimator = createAzureEstimator({
      readConfig: () => ({
        ...baseConfig(),
        endpoints: {
          gitlabBaseUrl: '',
          azureEndpoint: '',
          openaiBaseUrl: '',
        },
      }),
      call: stubCallString(JSON.stringify(goodFrameResult)),
    });
    const events = await collect(estimator.analyzeEpic(epic(), []));
    expect(events.map((e) => e.kind)).toEqual(['started', 'error']);
    expect(
      (events[1] as Extract<AnalysisEvent, { kind: 'error' }>).message,
    ).toMatch(/not configured/);
  });

  it('honors an AbortSignal aborted before the request', async () => {
    const call = vi.fn();
    const estimator = createAzureEstimator({
      readConfig: baseConfig,
      call: call as unknown as CallFn,
    });
    const controller = new AbortController();
    controller.abort();
    const events = await collect(
      estimator.analyzeEpic(epic(), [], controller.signal),
    );
    expect(call).not.toHaveBeenCalled();
    expect(events.map((e) => e.kind)).toEqual(['started', 'error']);
    expect(
      (events[1] as Extract<AnalysisEvent, { kind: 'error' }>).message,
    ).toMatch(/Aborted before/);
  });

  it('honors an AbortSignal aborted after the request', async () => {
    const controller = new AbortController();
    const estimator = createAzureEstimator({
      readConfig: baseConfig,
      call: async () => {
        controller.abort();
        return { content: JSON.stringify(goodFrameResult), model: 'stub' };
      },
    });
    const events = await collect(
      estimator.analyzeEpic(epic(), [], controller.signal),
    );
    expect(events.map((e) => e.kind)).toEqual(['started', 'error']);
    expect(
      (events[1] as Extract<AnalysisEvent, { kind: 'error' }>).message,
    ).toMatch(/Aborted after/);
  });

  it('forwards a user prompt that mentions the epic title + iid', async () => {
    let observedUser = '';
    const estimator = createAzureEstimator({
      readConfig: baseConfig,
      call: async (_cfg, _ep, req) => {
        observedUser = req.userPrompt;
        return { content: JSON.stringify(goodFrameResult), model: 'stub' };
      },
    });
    await collect(estimator.analyzeEpic(epic({ title: 'Refactor billing', iid: 99 }), []));
    expect(observedUser).toContain('Refactor billing');
    expect(observedUser).toContain('!99');
  });

  it('includes reference epics in the user prompt when supplied', async () => {
    let observedUser = '';
    const estimator = createAzureEstimator({
      readConfig: baseConfig,
      call: async (_cfg, _ep, req) => {
        observedUser = req.userPrompt;
        return { content: JSON.stringify(goodFrameResult), model: 'stub' };
      },
    });
    await collect(
      estimator.analyzeEpic(epic(), [
        { epicId: 'r1', title: 'Past similar', similarity: 0.7, actualSp: 8 },
      ]),
    );
    expect(observedUser).toContain('Past similar');
    expect(observedUser).toContain('actualSp=8');
  });

  it('renders "NONE" in the references block when no references are supplied', async () => {
    let observedUser = '';
    const estimator = createAzureEstimator({
      readConfig: baseConfig,
      call: async (_cfg, _ep, req) => {
        observedUser = req.userPrompt;
        return { content: JSON.stringify(goodFrameResult), model: 'stub' };
      },
    });
    await collect(estimator.analyzeEpic(epic(), []));
    expect(observedUser).toContain('NONE');
  });
});
