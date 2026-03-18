/**
 * Tests for Pipeline Action — T-4.16.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { refinePipelineAction } from './refinePipelineAction';
import type { AIClientConfig } from '@/services/ai/types';

// ─── Mock Stores ────────────────────────────────────────────

const mockEpicState = {
  markdown: '## Overview\nTest content.',
  document: { title: 'Test Epic', sections: [], metadata: { createdAt: 0, lastRefined: null, complexity: 'moderate' as const } },
  applyRefinedEpic: vi.fn(),
};

const mockPipelineState = {
  isRunning: false,
  startPipeline: vi.fn(),
  updateStage: vi.fn(),
  completePipeline: vi.fn(),
  failPipeline: vi.fn(),
};

vi.mock('@/stores/epicStore', () => ({
  useEpicStore: { getState: () => mockEpicState },
}));

vi.mock('@/stores/pipelineStore', () => ({
  usePipelineStore: { getState: () => mockPipelineState },
}));

// ─── Mock Orchestrator ──────────────────────────────────────

vi.mock('@/pipeline/pipelineOrchestrator', () => ({
  runPremiumPipeline: vi.fn(),
}));

import { runPremiumPipeline } from '@/pipeline/pipelineOrchestrator';
const mockOrchestrator = vi.mocked(runPremiumPipeline);

// ─── Fixtures ───────────────────────────────────────────────

const AI_CONFIG: AIClientConfig = {
  provider: 'openai',
  azure: { endpoint: '', deploymentName: '', apiKey: '', apiVersion: '', model: '' },
  openai: { apiKey: 'key', model: 'gpt-4o', baseUrl: '' },
  endpoints: { gitlabBaseUrl: '', azureEndpoint: '', openaiBaseUrl: '' },
};

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
  mockPipelineState.isRunning = false;
});

// ─── Tests ──────────────────────────────────────────────────

describe('refinePipelineAction', () => {
  describe('happy path', () => {
    it('calls orchestrator and updates stores on success', async () => {
      mockOrchestrator.mockResolvedValue(SUCCESSFUL_RESULT);

      await refinePipelineAction({ complexity: 'moderate', aiConfig: AI_CONFIG });

      expect(mockPipelineState.startPipeline).toHaveBeenCalledTimes(1);
      expect(mockOrchestrator).toHaveBeenCalledTimes(1);
      expect(mockEpicState.applyRefinedEpic).toHaveBeenCalledWith(SUCCESSFUL_RESULT.epicContent);
      expect(mockPipelineState.completePipeline).toHaveBeenCalledTimes(1);
    });

    it('passes correct params to orchestrator', async () => {
      mockOrchestrator.mockResolvedValue(SUCCESSFUL_RESULT);

      await refinePipelineAction({ complexity: 'complex', aiConfig: AI_CONFIG });

      expect(mockOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          rawContent: mockEpicState.markdown,
          title: 'Test Epic',
          complexity: 'complex',
          aiConfig: AI_CONFIG,
        }),
      );
    });
  });

  describe('failure handling', () => {
    it('sets pipeline status to failed when orchestrator returns success: false', async () => {
      mockOrchestrator.mockResolvedValue({ ...SUCCESSFUL_RESULT, success: false, epicContent: '' });

      await refinePipelineAction({ complexity: 'moderate', aiConfig: AI_CONFIG });

      expect(mockPipelineState.failPipeline).toHaveBeenCalledTimes(1);
      expect(mockEpicState.applyRefinedEpic).not.toHaveBeenCalled();
    });

    it('sets pipeline status to failed when orchestrator throws', async () => {
      mockOrchestrator.mockRejectedValue(new Error('Network explosion'));

      await refinePipelineAction({ complexity: 'moderate', aiConfig: AI_CONFIG });

      expect(mockPipelineState.failPipeline).toHaveBeenCalledWith(
        expect.stringContaining('Network explosion'),
      );
    });
  });

  describe('double-run prevention', () => {
    it('throws when pipeline is already running', async () => {
      mockPipelineState.isRunning = true;

      await expect(
        refinePipelineAction({ complexity: 'moderate', aiConfig: AI_CONFIG }),
      ).rejects.toThrow('already running');
    });
  });

  describe('input validation', () => {
    it('throws when no epic content exists', async () => {
      mockEpicState.markdown = '';

      await expect(
        refinePipelineAction({ complexity: 'moderate', aiConfig: AI_CONFIG }),
      ).rejects.toThrow('No epic content');
    });

    it('throws when epic is whitespace only', async () => {
      mockEpicState.markdown = '   \n  \n  ';

      await expect(
        refinePipelineAction({ complexity: 'moderate', aiConfig: AI_CONFIG }),
      ).rejects.toThrow('No epic content');
    });
  });

  describe('progress forwarding', () => {
    it('forwards progress to pipelineStore.updateStage', async () => {
      mockOrchestrator.mockImplementation(async (opts) => {
        // Simulate progress callbacks
        opts.onProgress?.({ stageName: 'comprehension', status: 'running', message: 'Analyzing...', timestamp: Date.now() });
        opts.onProgress?.({ stageName: 'comprehension', status: 'complete', message: 'Done', timestamp: Date.now() });
        return SUCCESSFUL_RESULT;
      });

      await refinePipelineAction({ complexity: 'moderate', aiConfig: AI_CONFIG });

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

      await refinePipelineAction({ complexity: 'moderate', aiConfig: AI_CONFIG });

      expect(callOrder).toEqual(['start', 'orchestrate', 'applyEpic', 'complete']);
    });
  });
});
