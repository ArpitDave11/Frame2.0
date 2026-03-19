/**
 * Tests for Pipeline Action — T-8.2 (updated from T-4.16).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { refinePipelineAction } from './refinePipelineAction';

// ─── Mock Stores ────────────────────────────────────────────

const mockEpicState = {
  markdown: '## Overview\nTest content.',
  document: { title: 'Test Epic', sections: [], metadata: { createdAt: 0, lastRefined: null, complexity: 'moderate' as const } },
  complexity: 'moderate' as const,
  applyRefinedEpic: vi.fn(),
  setQualityScore: vi.fn(),
};

const mockPipelineState = {
  isRunning: false,
  startPipeline: vi.fn(),
  updateStage: vi.fn(),
  completePipeline: vi.fn(),
  failPipeline: vi.fn(),
  setCurrentIteration: vi.fn(),
};

const mockConfigState = {
  config: {
    ai: {
      provider: 'openai' as string,
      azure: { endpoint: '', deploymentName: '', apiKey: '', apiVersion: '', model: '' },
      openai: { apiKey: 'key', model: 'gpt-4o', baseUrl: '' },
    },
    endpoints: { gitlabBaseUrl: '', azureEndpoint: '', openaiBaseUrl: '' },
  },
};

const mockUiState = {
  addToast: vi.fn(),
};

const mockBlueprintState = {
  setCode: vi.fn(),
};

vi.mock('@/stores/epicStore', () => ({
  useEpicStore: { getState: () => mockEpicState },
}));

vi.mock('@/stores/pipelineStore', () => ({
  usePipelineStore: { getState: () => mockPipelineState },
}));

vi.mock('@/stores/configStore', () => ({
  useConfigStore: { getState: () => mockConfigState },
}));

vi.mock('@/stores/uiStore', () => ({
  useUiStore: { getState: () => mockUiState },
}));

vi.mock('@/stores/blueprintStore', () => ({
  useBlueprintStore: { getState: () => mockBlueprintState },
}));

vi.mock('@/services/ai/aiClient', () => ({
  isAIEnabled: (cfg: unknown) => (cfg as { ai: { provider: string } }).ai.provider !== 'none',
}));

// ─── Mock Orchestrator ──────────────────────────────────────

vi.mock('@/pipeline/pipelineOrchestrator', () => ({
  runPremiumPipeline: vi.fn(),
}));

import { runPremiumPipeline } from '@/pipeline/pipelineOrchestrator';
const mockOrchestrator = vi.mocked(runPremiumPipeline);

// ─── Fixtures ───────────────────────────────────────────────

const SUCCESSFUL_RESULT = {
  success: true,
  epicContent: '# Refined Epic\n\n## Overview\nRefined content.',
  comprehension: { keyEntities: [{ name: 'Svc', type: 'service', relationships: [] }], detectedGaps: [], implicitRisks: [], semanticSections: [], extractedRequirements: [], gapAnalysis: [] },
  classification: { primaryCategory: 'technical_design' as const, confidence: 0.9, categoryConfig: {}, reasoning: '' },
  structural: { sectionScores: [], transformationPlan: [], missingSections: [] },
  refinement: { refinedSections: [{ sectionId: 'overview', title: 'Overview', content: 'Refined', formatUsed: 'prose' }] },
  mandatory: { architectureDiagram: 'graph TD', userStories: [{ id: 'US-001', title: 'Login', asA: 'user', iWant: 'login', soThat: 'access', acceptanceCriteria: ['AC1'], priority: 'high' as const }], assembledEpic: { title: 'Epic', sections: [{ id: 'o', title: 'Overview', content: 'x' }], metadata: {} } },
  validation: { traceabilityMatrix: [], auditChecks: [], overallScore: 90, passed: true, detectedFailures: [], feedback: [] },
  iterations: 1,
  totalDuration: 5000,
};

// ─── Setup ──────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockEpicState.markdown = '## Overview\nTest content.';
  mockEpicState.document = { title: 'Test Epic', sections: [], metadata: { createdAt: 0, lastRefined: null, complexity: 'moderate' as const } };
  mockEpicState.complexity = 'moderate';
  mockPipelineState.isRunning = false;
  mockConfigState.config.ai.provider = 'openai';
});

// ─── Tests ──────────────────────────────────────────────────

describe('refinePipelineAction', () => {
  describe('happy path', () => {
    it('calls orchestrator and updates stores on success', async () => {
      mockOrchestrator.mockResolvedValue(SUCCESSFUL_RESULT);

      await refinePipelineAction();

      expect(mockPipelineState.startPipeline).toHaveBeenCalledTimes(1);
      expect(mockOrchestrator).toHaveBeenCalledTimes(1);
      expect(mockEpicState.applyRefinedEpic).toHaveBeenCalledWith(SUCCESSFUL_RESULT.epicContent);
      expect(mockPipelineState.completePipeline).toHaveBeenCalledTimes(1);
    });

    it('passes correct params to orchestrator', async () => {
      mockOrchestrator.mockResolvedValue(SUCCESSFUL_RESULT);

      await refinePipelineAction();

      expect(mockOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          rawContent: mockEpicState.markdown,
          title: 'Test Epic',
          complexity: 'moderate',
        }),
      );
    });

    it('sets quality score and diagram on success', async () => {
      mockOrchestrator.mockResolvedValue(SUCCESSFUL_RESULT);

      await refinePipelineAction();

      expect(mockEpicState.setQualityScore).toHaveBeenCalledWith(9); // 90/10
      expect(mockBlueprintState.setCode).toHaveBeenCalledWith('graph TD');
    });
  });

  describe('failure handling', () => {
    it('calls failPipeline when orchestrator returns success: false', async () => {
      mockOrchestrator.mockResolvedValue({ ...SUCCESSFUL_RESULT, success: false, epicContent: '' });

      await refinePipelineAction();

      expect(mockPipelineState.failPipeline).toHaveBeenCalledTimes(1);
    });

    it('calls failPipeline when orchestrator throws', async () => {
      mockOrchestrator.mockRejectedValue(new Error('Network explosion'));

      await refinePipelineAction();

      expect(mockPipelineState.failPipeline).toHaveBeenCalledWith(
        expect.stringContaining('Network explosion'),
      );
    });
  });

  describe('double-run prevention', () => {
    it('returns silently when pipeline is already running', async () => {
      mockPipelineState.isRunning = true;

      await refinePipelineAction();

      expect(mockPipelineState.startPipeline).not.toHaveBeenCalled();
    });
  });

  describe('input validation', () => {
    it('shows error toast when no AI provider configured', async () => {
      mockConfigState.config.ai.provider = 'none';

      await refinePipelineAction();

      expect(mockUiState.addToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' }),
      );
      expect(mockPipelineState.startPipeline).not.toHaveBeenCalled();
    });

    it('shows error toast when no epic content', async () => {
      mockEpicState.markdown = '';

      await refinePipelineAction();

      expect(mockUiState.addToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' }),
      );
    });
  });

  describe('progress forwarding', () => {
    it('forwards progress to pipelineStore.updateStage', async () => {
      mockOrchestrator.mockImplementation(async (opts) => {
        opts.onProgress?.({ stageName: 'comprehension', status: 'running', message: 'Analyzing...', timestamp: Date.now() });
        opts.onProgress?.({ stageName: 'comprehension', status: 'complete', message: 'Done', timestamp: Date.now() });
        return SUCCESSFUL_RESULT;
      });

      await refinePipelineAction();

      expect(mockPipelineState.updateStage).toHaveBeenCalledWith(1, 'running', 'Analyzing...');
      expect(mockPipelineState.updateStage).toHaveBeenCalledWith(1, 'complete', 'Done');
    });
  });

  describe('store interaction order', () => {
    it('reads epic first, starts pipeline, then calls orchestrator', async () => {
      const callOrder: string[] = [];

      mockPipelineState.startPipeline.mockImplementation(() => { callOrder.push('start'); });
      mockOrchestrator.mockImplementation(async () => { callOrder.push('orchestrate'); return SUCCESSFUL_RESULT; });
      mockEpicState.applyRefinedEpic.mockImplementation(() => { callOrder.push('applyEpic'); });
      mockPipelineState.completePipeline.mockImplementation(() => { callOrder.push('complete'); });

      await refinePipelineAction();

      expect(callOrder).toEqual(['start', 'orchestrate', 'applyEpic', 'complete']);
    });
  });
});
