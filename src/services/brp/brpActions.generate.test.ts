import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the pure pipeline orchestrator and the estimator provider BEFORE
// importing the action layer, so generation runs without real LLM calls.
vi.mock('@/pipeline/pipelineOrchestrator', () => ({
  runPremiumPipeline: vi.fn(),
}));
vi.mock('./ai/estimatorProvider', () => ({
  getEstimator: vi.fn(),
}));

import { generateEpicFromRequirement } from './brpActions';
import { runPremiumPipeline } from '@/pipeline/pipelineOrchestrator';
import { getEstimator } from './ai/estimatorProvider';
import { useConfigStore } from '@/stores/configStore';
import { useEpicStore } from '@/stores/epicStore';
import type { AnalysisEvent } from './ai/types';
import type { FrameResult, SizedStory } from '@/domain/brp';

const mockPipeline = vi.mocked(runPremiumPipeline);
const mockGetEstimator = vi.mocked(getEstimator);

function story(p: SizedStory['points']): SizedStory {
  return { title: `s${p}`, points: p, acceptanceCriteria: ['ac'], splitPattern: 'Path', provenance: 'frame-generated' };
}

const frameResult: FrameResult = {
  frameEstimate: 13, breakdown: [], stories: [story(5), story(8)], rationale: 'r',
  confidence: 0.7, references: [], generatedStories: null, modelVersion: 'azure-v2', analyzedAt: '2026-06-25T00:00:00Z',
};

/** An estimator stub yielding started → done(frameResult). */
function estimatorYielding(result: FrameResult) {
  return {
    async *analyzeEpic(): AsyncIterable<AnalysisEvent> {
      yield { kind: 'started', epicId: 'generated:pending' };
      yield { kind: 'done', epicId: 'generated:pending', result };
    },
  };
}

function setProvider(provider: 'azure' | 'none') {
  const cfg = useConfigStore.getState().config;
  useConfigStore.setState({ config: { ...cfg, ai: { ...cfg.ai, provider } } });
}

beforeEach(() => {
  vi.clearAllMocks();
  setProvider('azure');
  mockPipeline.mockResolvedValue({
    success: true, epicContent: '# Generated Epic\n\nbody',
    comprehension: {}, classification: {}, structural: {}, refinement: {}, mandatory: {}, validation: {},
    iterations: 1, totalDuration: 1,
  } as never);
  mockGetEstimator.mockReturnValue(estimatorYielding(frameResult) as never);
});

describe('generateEpicFromRequirement (T11)', () => {
  it('runs the pipeline then the estimator and returns the draft', async () => {
    const res = await generateEpicFromRequirement('let users export reports');
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(mockPipeline).toHaveBeenCalledTimes(1);
    expect(mockPipeline.mock.calls[0]![0].rawContent).toBe('let users export reports');
    expect(res.data.epicContent).toContain('Generated Epic');
    expect(res.data.frameResult.stories!.map((s) => s.points)).toEqual([5, 8]);
  });

  it('does NOT mutate epicStore (INV5)', async () => {
    const spy = vi.spyOn(useEpicStore.getState(), 'setMarkdown');
    await generateEpicFromRequirement('something');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('errors when no AI provider is configured', async () => {
    setProvider('none');
    const res = await generateEpicFromRequirement('x');
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.message).toMatch(/no ai provider/i);
    expect(mockPipeline).not.toHaveBeenCalled();
  });

  it('errors on an empty requirement without calling the pipeline', async () => {
    const res = await generateEpicFromRequirement('   ');
    expect(res.success).toBe(false);
    expect(mockPipeline).not.toHaveBeenCalled();
  });

  it('propagates a pipeline failure', async () => {
    mockPipeline.mockResolvedValue({ success: false, epicContent: '', error: 'stage 3 failed' } as never);
    const res = await generateEpicFromRequirement('x');
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.message).toMatch(/stage 3 failed/);
  });

  it('errors when the estimator yields an error event', async () => {
    mockGetEstimator.mockReturnValue({
      async *analyzeEpic(): AsyncIterable<AnalysisEvent> {
        yield { kind: 'started', epicId: 'generated:pending' };
        yield { kind: 'error', epicId: 'generated:pending', message: 'rate limited' };
      },
    } as never);
    const res = await generateEpicFromRequirement('x');
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.message).toMatch(/rate limited/);
  });
});
