/**
 * B-37 — provider-swap behavior tests for getEstimator().
 *
 * Each path produces a different observable signal:
 *   - simulator path → modelVersion contains 'simulator'
 *   - Azure path → the underlying fetch is invoked (mocked) and a
 *                  successful done event uses the Azure-supplied
 *                  modelVersion
 *
 * Identity equality would be brittle (createSimulatedEstimator returns
 * a fresh object each call); behavior assertions are the right level.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getEstimator } from './estimatorProvider';
import { useConfigStore } from '@/stores/configStore';
import { SIMULATOR_MODEL_VERSION } from './simulatedEstimator';
import type { AnalysisEvent } from './types';
import type { Epic } from '@/domain/brp';

const baseEpic: Epic = {
  id: 'gid://e/1',
  iid: 1,
  title: 'Improve checkout',
  description: 'a'.repeat(200),
  gitlabWebUrl: 'https://gitlab/1',
  podId: 'p1',
  source: 'gitlab',
  humanEstimate: null,
  analysisStatus: 'raw',
  frameResult: null,
};

async function collect(iter: AsyncIterable<AnalysisEvent>): Promise<AnalysisEvent[]> {
  const out: AnalysisEvent[] = [];
  for await (const ev of iter) out.push(ev);
  return out;
}

beforeEach(() => {
  // Reset config to the unconfigured default (provider 'none').
  useConfigStore.setState((s) => ({
    config: {
      ...s.config,
      ai: {
        ...s.config.ai,
        provider: 'none',
        azure: {
          ...s.config.ai.azure,
          endpoint: '',
          deploymentName: '',
          apiKey: '',
          apiVersion: '2024-02-01',
          model: 'gpt-4',
        },
      },
      endpoints: {
        ...s.config.endpoints,
        azureEndpoint: '',
      },
    },
  }));
});

describe('getEstimator runtime swap', () => {
  it('uses the simulator when provider is "none"', async () => {
    const events = await collect(getEstimator().analyzeEpic(baseEpic, []));
    const done = events.find((e) => e.kind === 'done');
    expect(done).toBeDefined();
    expect((done as Extract<AnalysisEvent, { kind: 'done' }>).result.modelVersion).toBe(
      SIMULATOR_MODEL_VERSION,
    );
  });

  it('uses the simulator when provider is "azure" but endpoint is missing', async () => {
    useConfigStore.setState((s) => ({
      config: {
        ...s.config,
        ai: {
          ...s.config.ai,
          provider: 'azure',
          azure: { ...s.config.ai.azure, apiKey: 'k' },
        },
        endpoints: { ...s.config.endpoints, azureEndpoint: '' },
      },
    }));
    const events = await collect(getEstimator().analyzeEpic(baseEpic, []));
    const done = events.find((e) => e.kind === 'done');
    expect((done as Extract<AnalysisEvent, { kind: 'done' }>).result.modelVersion).toBe(
      SIMULATOR_MODEL_VERSION,
    );
  });

  it('uses the simulator when provider is "azure" but apiKey is missing', async () => {
    useConfigStore.setState((s) => ({
      config: {
        ...s.config,
        ai: {
          ...s.config.ai,
          provider: 'azure',
          azure: { ...s.config.ai.azure, apiKey: '' },
        },
        endpoints: { ...s.config.endpoints, azureEndpoint: 'https://az.example' },
      },
    }));
    const events = await collect(getEstimator().analyzeEpic(baseEpic, []));
    const done = events.find((e) => e.kind === 'done');
    expect((done as Extract<AnalysisEvent, { kind: 'done' }>).result.modelVersion).toBe(
      SIMULATOR_MODEL_VERSION,
    );
  });

  it('uses the Azure estimator when provider is "azure" with full credentials (network goes through fetch)', async () => {
    useConfigStore.setState((s) => ({
      config: {
        ...s.config,
        ai: {
          ...s.config.ai,
          provider: 'azure',
          azure: {
            ...s.config.ai.azure,
            endpoint: 'https://az.example',
            deploymentName: 'gpt-4',
            apiKey: 'k',
            apiVersion: '2024-02-01',
            model: 'gpt-4',
          },
        },
        endpoints: { ...s.config.endpoints, azureEndpoint: 'https://az.example' },
      },
    }));

    // Intercept fetch and respond with an Azure-shaped chat-completion
    // body. We don't assert request details here — the azureEstimator
    // unit tests cover that. We just want to confirm the SWAP picked
    // the Azure path (i.e., a network call was attempted at all).
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  frameEstimate: 5,
                  breakdown: [{ title: 'Backend', points: 5 }],
                  rationale: 'r',
                  confidence: 0.7,
                  references: [],
                  generatedStories: null,
                  modelVersion: 'azure-stub',
                  analyzedAt: '2026-05-23T00:00:00Z',
                }),
              },
            },
          ],
          model: 'gpt-4',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const events = await collect(getEstimator().analyzeEpic(baseEpic, []));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const done = events.find((e) => e.kind === 'done');
    expect((done as Extract<AnalysisEvent, { kind: 'done' }>).result.modelVersion).toBe(
      'azure-stub',
    );
    fetchSpy.mockRestore();
  });
});
