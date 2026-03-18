/**
 * Tests for Stage 4 — Content Refinement.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runStage4Refinement } from './runStage4Refinement';
import type { RefinementInput, PipelineConfig, PipelineProgress, ValidationOutput } from '@/pipeline/pipelineTypes';
import type { AIClientConfig } from '@/services/ai/types';

// ─── Mocks ──────────────────────────────────────────────────

vi.mock('@/services/ai/aiClient', () => ({ callAI: vi.fn() }));
vi.mock('@/services/ai/throttler', () => ({ withRetry: vi.fn((fn: () => Promise<unknown>) => fn()) }));

import { callAI } from '@/services/ai/aiClient';
import { withRetry } from '@/services/ai/throttler';

const mockCallAI = vi.mocked(callAI);
const mockWithRetry = vi.mocked(withRetry);

// ─── Fixtures ───────────────────────────────────────────────

const SAMPLE_CONFIG: PipelineConfig = {
  complexity: 'moderate',
  maxIterations: 3,
  passingScore: 85,
  storyCountRange: [10, 15],
  generationTemperature: 0.3,
  validationTemperature: 0.7,
  classificationTemperature: 0.5,
};

const SAMPLE_AI_CONFIG: AIClientConfig = {
  provider: 'openai',
  azure: { endpoint: '', deploymentName: '', apiKey: '', apiVersion: '', model: '' },
  openai: { apiKey: 'key', model: 'gpt-4o', baseUrl: '' },
  endpoints: { gitlabBaseUrl: '', azureEndpoint: '', openaiBaseUrl: 'https://api.openai.com/v1' },
};

const makeInput = (actions: Array<{ sectionId: string; action: string; details: string }>): RefinementInput => ({
  structural: {
    sectionScores: [],
    transformationPlan: actions.map((a) => ({
      sectionId: a.sectionId,
      action: a.action as 'keep' | 'restructure' | 'merge' | 'split' | 'add',
      details: a.details,
    })),
    missingSections: [],
  },
  classification: {
    primaryCategory: 'technical_design',
    confidence: 0.9,
    categoryConfig: {},
    reasoning: 'Tech doc.',
  },
  comprehension: {
    keyEntities: [],
    detectedGaps: [],
    implicitRisks: [],
    semanticSections: [],
    extractedRequirements: [],
    gapAnalysis: [],
  },
  rawContent: '## Overview\nThe auth service.\n\n## Architecture\nMicroservices pattern.',
});

const VALID_REFINED_JSON = JSON.stringify({
  sectionId: 'overview',
  title: 'Overview',
  content: 'Refined overview content with improved structure.',
  formatUsed: 'prose',
});

const SAMPLE_FEEDBACK: ValidationOutput = {
  traceabilityMatrix: [],
  auditChecks: [],
  overallScore: 60,
  passed: false,
  detectedFailures: [],
  feedback: [
    'Section "overview" lacks error handling details.',
    'Section "architecture" needs deployment diagram.',
  ],
};

// ─── Setup ──────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockWithRetry.mockImplementation((fn) => fn());
});

// ─── Tests ──────────────────────────────────────────────────

describe('runStage4Refinement', () => {
  describe('keep action', () => {
    it('passes content through unchanged without AI call', async () => {
      const input = makeInput([{ sectionId: 'overview', action: 'keep', details: 'Good as is' }]);

      const result = await runStage4Refinement(input, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.success).toBe(true);
      expect(result.data.refinedSections).toHaveLength(1);
      expect(result.data.refinedSections[0]!.content).toContain('auth service');
      // No AI call for "keep"
      expect(mockCallAI).not.toHaveBeenCalled();
    });
  });

  describe('restructure action', () => {
    it('calls AI and returns refined content', async () => {
      mockCallAI.mockResolvedValue({
        content: VALID_REFINED_JSON,
        model: 'gpt-4o',
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
      });

      const input = makeInput([{ sectionId: 'overview', action: 'restructure', details: 'Reorder' }]);
      const result = await runStage4Refinement(input, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.success).toBe(true);
      expect(result.data.refinedSections[0]!.content).toContain('Refined overview');
      expect(mockCallAI).toHaveBeenCalledTimes(1);
    });
  });

  describe('add action', () => {
    it('generates new section content', async () => {
      const newSection = JSON.stringify({
        sectionId: 'security',
        title: 'Security',
        content: 'New security section content.',
        formatUsed: 'prose',
      });
      mockCallAI.mockResolvedValue({ content: newSection, model: 'gpt-4o', usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 } });

      const input = makeInput([{ sectionId: 'security', action: 'add', details: 'New section' }]);
      const result = await runStage4Refinement(input, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.success).toBe(true);
      expect(result.data.refinedSections[0]!.sectionId).toBe('security');
      expect(result.data.refinedSections[0]!.content).toContain('security section');
    });
  });

  describe('split action', () => {
    it('produces output section for the focused sub-section', async () => {
      const splitResult = JSON.stringify({
        sectionId: 'architecture-backend',
        title: 'Backend Architecture',
        content: 'Focused backend content.',
        formatUsed: 'prose',
      });
      mockCallAI.mockResolvedValue({ content: splitResult, model: 'gpt-4o' });

      const input = makeInput([{ sectionId: 'architecture', action: 'split', details: 'Split backend/frontend' }]);
      const result = await runStage4Refinement(input, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.success).toBe(true);
      expect(result.data.refinedSections.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('merge action', () => {
    it('calls AI and returns merged content', async () => {
      const mergedSection = JSON.stringify({
        sectionId: 'overview-combined',
        title: 'Overview',
        content: 'Merged overview content combining both sources.',
        formatUsed: 'prose',
      });
      mockCallAI.mockResolvedValue({ content: mergedSection, model: 'gpt-4o' });

      const input = makeInput([{ sectionId: 'overview', action: 'merge', details: 'Merge with intro' }]);
      const result = await runStage4Refinement(input, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.success).toBe(true);
      expect(result.data.refinedSections[0]!.content).toContain('Merged overview');
      expect(mockCallAI).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry with feedback', () => {
    it('includes relevant feedback in prompt on retry', async () => {
      mockCallAI.mockResolvedValue({ content: VALID_REFINED_JSON, model: 'gpt-4o' });

      const input: RefinementInput = {
        ...makeInput([{ sectionId: 'overview', action: 'restructure', details: 'Fix' }]),
        previousFeedback: SAMPLE_FEEDBACK,
      };

      await runStage4Refinement(input, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      const prompt = mockCallAI.mock.calls[0]![1]!.systemPrompt;
      expect(prompt).toContain('error handling');
    });

    it('only includes feedback relevant to the current section', async () => {
      mockCallAI.mockResolvedValue({ content: VALID_REFINED_JSON, model: 'gpt-4o' });

      const input: RefinementInput = {
        ...makeInput([{ sectionId: 'overview', action: 'restructure', details: 'Fix' }]),
        previousFeedback: SAMPLE_FEEDBACK,
      };

      await runStage4Refinement(input, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      const prompt = mockCallAI.mock.calls[0]![1]!.systemPrompt;
      // Should include overview feedback but not architecture feedback
      expect(prompt).toContain('overview');
      expect(prompt).not.toContain('deployment diagram');
    });
  });

  describe('progress reporting', () => {
    it('fires progress for each section', async () => {
      mockCallAI.mockResolvedValue({ content: VALID_REFINED_JSON, model: 'gpt-4o' });

      const input = makeInput([
        { sectionId: 'overview', action: 'restructure', details: '' },
        { sectionId: 'architecture', action: 'restructure', details: '' },
      ]);

      const calls: PipelineProgress[] = [];
      await runStage4Refinement(input, SAMPLE_CONFIG, SAMPLE_AI_CONFIG, (p) => calls.push(p));

      // Initial + 2 per-section + final
      expect(calls.length).toBeGreaterThanOrEqual(4);
      expect(calls.some((c) => c.message?.includes('1/2'))).toBe(true);
      expect(calls.some((c) => c.message?.includes('2/2'))).toBe(true);
    });
  });

  describe('token aggregation', () => {
    it('aggregates tokens across all section calls', async () => {
      mockCallAI
        .mockResolvedValueOnce({ content: VALID_REFINED_JSON, model: 'gpt-4o', usage: { promptTokens: 100, completionTokens: 100, totalTokens: 200 } })
        .mockResolvedValueOnce({ content: VALID_REFINED_JSON, model: 'gpt-4o', usage: { promptTokens: 150, completionTokens: 150, totalTokens: 300 } });

      const input = makeInput([
        { sectionId: 'overview', action: 'restructure', details: '' },
        { sectionId: 'architecture', action: 'restructure', details: '' },
      ]);

      const result = await runStage4Refinement(input, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.metadata.tokensUsed).toBe(500);
    });
  });

  describe('partial failure', () => {
    it('continues after one section fails', async () => {
      let callCount = 0;
      mockWithRetry.mockImplementation((fn) => {
        callCount++;
        if (callCount === 1) return Promise.reject(new Error('AI timeout'));
        return fn();
      });
      mockCallAI.mockResolvedValue({ content: VALID_REFINED_JSON, model: 'gpt-4o' });

      const input = makeInput([
        { sectionId: 'overview', action: 'restructure', details: '' },
        { sectionId: 'architecture', action: 'restructure', details: '' },
      ]);

      const result = await runStage4Refinement(input, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.success).toBe(true);
      expect(result.data.refinedSections).toHaveLength(2);
      expect(result.data.refinedSections[0]!.content).toContain('Refinement failed');
      expect(result.data.refinedSections[1]!.content).toContain('Refined overview content');
    });
  });

  describe('error handling', () => {
    it('returns success: false when all sections fail', async () => {
      mockWithRetry.mockRejectedValue(new Error('All fail'));

      const input = makeInput([{ sectionId: 'overview', action: 'restructure', details: '' }]);
      const result = await runStage4Refinement(input, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.success).toBe(false);
      expect(result.data.refinedSections[0]!.content).toContain('Refinement failed');
    });
  });
});
