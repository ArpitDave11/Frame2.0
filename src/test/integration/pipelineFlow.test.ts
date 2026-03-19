/**
 * Integration Test — Pipeline execution flow (T-16.2).
 *
 * Tests the full pipeline execution via store manipulation: epic content
 * goes in, orchestrator runs, results land in the correct stores.
 * Pure store + action test (no rendering).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useEpicStore } from '@/stores/epicStore';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useConfigStore } from '@/stores/configStore';
import { useBlueprintStore } from '@/stores/blueprintStore';
import { useUiStore } from '@/stores/uiStore';

// ─── Mocks ──────────────────────────────────────────────────

vi.mock('@/pipeline/pipelineOrchestrator', () => ({
  runPremiumPipeline: vi.fn(),
}));

vi.mock('@/services/ai/aiClient', () => ({
  isAIEnabled: () => true,
}));

import { runPremiumPipeline } from '@/pipeline/pipelineOrchestrator';
import { refinePipelineAction } from '@/pipeline/refinePipelineAction';

const mockRunPremiumPipeline = vi.mocked(runPremiumPipeline);

// ─── Reset Stores ───────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  useEpicStore.setState(useEpicStore.getInitialState());
  usePipelineStore.setState(usePipelineStore.getInitialState());
  useConfigStore.setState(useConfigStore.getInitialState());
  useBlueprintStore.setState(useBlueprintStore.getInitialState());
  useUiStore.setState(useUiStore.getInitialState());
});

// ─── Fixtures ───────────────────────────────────────────────

const SAMPLE_MARKDOWN = `# My Epic

## Objective

Build a new feature.

## User Stories

As a user I want...
`;

const REFINED_MARKDOWN = `# My Epic (Refined)

## Objective

Build a comprehensive new feature with clear requirements.

## User Stories

As a user I want to do X so that Y.
`;

const MOCK_PIPELINE_RESULT = {
  success: true,
  epicContent: REFINED_MARKDOWN,
  iterations: 2,
  comprehension: {
    keyEntities: ['user', 'feature', 'system'],
    summary: 'A feature epic',
  },
  classification: {
    primaryCategory: 'feature_specification',
    confidence: 0.92,
  },
  structural: {
    sectionScores: [
      { section: 'Objective', score: 8 },
      { section: 'User Stories', score: 7 },
    ],
  },
  refinement: {
    refinedSections: ['Objective', 'User Stories'],
  },
  mandatory: {
    assembledEpic: {
      sections: [
        { title: 'Objective', content: 'Build a comprehensive new feature' },
        { title: 'User Stories', content: 'As a user...' },
      ],
    },
    userStories: [
      { id: 'US-1', title: 'Story 1' },
      { id: 'US-2', title: 'Story 2' },
    ],
    architectureDiagram: 'graph TD\n  A-->B',
  },
  validation: {
    overallScore: 85,
    sectionScores: [],
    suggestions: [],
  },
};

// ─── Tests ──────────────────────────────────────────────────

describe('Pipeline execution flow', () => {
  it('guards against running without content', async () => {
    // No markdown set => should toast error and return
    useConfigStore.getState().updateConfig({ ai: { provider: 'openai' } });

    await refinePipelineAction();

    expect(mockRunPremiumPipeline).not.toHaveBeenCalled();
    const toasts = useUiStore.getState().toasts;
    expect(toasts.length).toBe(1);
    expect(toasts[0].title).toContain('No epic content');
  });

  it('starts pipeline and calls orchestrator with correct params', async () => {
    // Setup
    useEpicStore.getState().setMarkdown(SAMPLE_MARKDOWN);
    useConfigStore.getState().updateConfig({
      ai: { provider: 'openai', openai: { apiKey: 'sk-test', model: 'gpt-4' } },
    });

    mockRunPremiumPipeline.mockResolvedValueOnce(MOCK_PIPELINE_RESULT);

    await refinePipelineAction();

    expect(mockRunPremiumPipeline).toHaveBeenCalledTimes(1);
    const callArgs = mockRunPremiumPipeline.mock.calls[0][0];
    expect(callArgs.rawContent).toBe(SAMPLE_MARKDOWN);
    expect(callArgs.complexity).toBe('moderate'); // default
    expect(callArgs.aiConfig.provider).toBe('openai');
  });

  it('writes refined markdown to epicStore on success', async () => {
    useEpicStore.getState().setMarkdown(SAMPLE_MARKDOWN);
    useConfigStore.getState().updateConfig({ ai: { provider: 'openai' } });
    mockRunPremiumPipeline.mockResolvedValueOnce(MOCK_PIPELINE_RESULT);

    await refinePipelineAction();

    expect(useEpicStore.getState().markdown).toBe(REFINED_MARKDOWN);
  });

  it('sets quality score in epicStore', async () => {
    useEpicStore.getState().setMarkdown(SAMPLE_MARKDOWN);
    useConfigStore.getState().updateConfig({ ai: { provider: 'openai' } });
    mockRunPremiumPipeline.mockResolvedValueOnce(MOCK_PIPELINE_RESULT);

    await refinePipelineAction();

    // Score is overallScore / 10 = 85 / 10 = 8.5
    const doc = useEpicStore.getState().document;
    expect(doc?.metadata.qualityScore).toBe(8.5);
  });

  it('sets blueprint diagram code', async () => {
    useEpicStore.getState().setMarkdown(SAMPLE_MARKDOWN);
    useConfigStore.getState().updateConfig({ ai: { provider: 'openai' } });
    mockRunPremiumPipeline.mockResolvedValueOnce(MOCK_PIPELINE_RESULT);

    await refinePipelineAction();

    expect(useBlueprintStore.getState().code).toBe('graph TD\n  A-->B');
  });

  it('completes pipeline store with result summary', async () => {
    useEpicStore.getState().setMarkdown(SAMPLE_MARKDOWN);
    useConfigStore.getState().updateConfig({ ai: { provider: 'openai' } });
    mockRunPremiumPipeline.mockResolvedValueOnce(MOCK_PIPELINE_RESULT);

    await refinePipelineAction();

    const pState = usePipelineStore.getState();
    expect(pState.isRunning).toBe(false);
    expect(pState.result).not.toBeNull();
    expect(pState.result!.category).toBe('feature_specification');
    expect(pState.result!.categoryConfidence).toBe(0.92);
    expect(pState.result!.validationScore).toBe(85);
    expect(pState.result!.storyCount).toBe(2);
    expect(pState.result!.sectionCount).toBe(2);
  });

  it('stores validation output for critique UI', async () => {
    useEpicStore.getState().setMarkdown(SAMPLE_MARKDOWN);
    useConfigStore.getState().updateConfig({ ai: { provider: 'openai' } });
    mockRunPremiumPipeline.mockResolvedValueOnce(MOCK_PIPELINE_RESULT);

    await refinePipelineAction();

    expect(usePipelineStore.getState().lastValidation).toEqual(MOCK_PIPELINE_RESULT.validation);
  });

  it('handles pipeline failure gracefully', async () => {
    useEpicStore.getState().setMarkdown(SAMPLE_MARKDOWN);
    useConfigStore.getState().updateConfig({ ai: { provider: 'openai' } });
    mockRunPremiumPipeline.mockRejectedValueOnce(new Error('API rate limit'));

    await refinePipelineAction();

    const pState = usePipelineStore.getState();
    expect(pState.isRunning).toBe(false);
    expect(pState.error).toContain('API rate limit');

    const toasts = useUiStore.getState().toasts;
    expect(toasts.some((t) => t.title.includes('API rate limit'))).toBe(true);
  });

  it('saves previousMarkdown for undo support', async () => {
    useEpicStore.getState().setMarkdown(SAMPLE_MARKDOWN);
    useConfigStore.getState().updateConfig({ ai: { provider: 'openai' } });
    mockRunPremiumPipeline.mockResolvedValueOnce(MOCK_PIPELINE_RESULT);

    await refinePipelineAction();

    // applyRefinedEpic stores the old markdown as previousMarkdown
    expect(useEpicStore.getState().previousMarkdown).toBe(SAMPLE_MARKDOWN);
  });
});
