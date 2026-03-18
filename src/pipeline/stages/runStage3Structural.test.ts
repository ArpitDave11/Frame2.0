/**
 * Tests for Stage 3 — Structural Assessment.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runStage3Structural } from './runStage3Structural';
import type { StructuralInput, PipelineConfig, PipelineProgress } from '@/pipeline/pipelineTypes';
import type { AIClientConfig } from '@/services/ai/types';

// ─── Mocks ──────────────────────────────────────────────────

vi.mock('@/services/ai/aiClient', () => ({ callAI: vi.fn() }));
vi.mock('@/services/ai/throttler', () => ({ withRetry: vi.fn((fn: () => Promise<unknown>) => fn()) }));

import { callAI } from '@/services/ai/aiClient';
import { withRetry } from '@/services/ai/throttler';

const mockCallAI = vi.mocked(callAI);
const mockWithRetry = vi.mocked(withRetry);

// ─── Fixtures ───────────────────────────────────────────────

const SAMPLE_INPUT: StructuralInput = {
  comprehension: {
    keyEntities: [{ name: 'AuthService', type: 'service', relationships: [] }],
    detectedGaps: [],
    implicitRisks: [],
    semanticSections: [],
    extractedRequirements: [{ id: 'REQ-001', description: 'OAuth2', priority: 'high', source: 'S1' }],
    gapAnalysis: [],
  },
  classification: {
    primaryCategory: 'technical_design',
    confidence: 0.9,
    categoryConfig: {},
    reasoning: 'Architecture document.',
  },
  rawContent: '## Overview\nThe auth service.\n\n## Architecture\nMicroservices pattern.\n\n## Deployment\nKubernetes.',
};

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

const VALID_STRUCTURAL_JSON = JSON.stringify({
  sectionScores: [
    { sectionId: 'overview', completeness: 6, relevance: 8, placement: 9, overall: 7 },
    { sectionId: 'architecture', completeness: 7, relevance: 9, placement: 8, overall: 8 },
    { sectionId: 'deployment', completeness: 4, relevance: 7, placement: 7, overall: 6 },
  ],
  transformationPlan: [
    { sectionId: 'overview', action: 'keep', details: 'Good as is' },
    { sectionId: 'architecture', action: 'restructure', details: 'Reorder subsections' },
    { sectionId: 'deployment', action: 'add', details: 'Needs CI/CD details' },
  ],
  missingSections: ['Security', 'Testing Strategy'],
});

// ─── Setup ──────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockWithRetry.mockImplementation((fn) => fn());
});

// ─── Tests ──────────────────────────────────────────────────

describe('runStage3Structural', () => {
  describe('successful assessment', () => {
    it('produces valid StructuralOutput from AI response', async () => {
      mockCallAI.mockResolvedValue({ content: VALID_STRUCTURAL_JSON, model: 'gpt-4o', usage: { promptTokens: 500, completionTokens: 200, totalTokens: 700 } });

      const result = await runStage3Structural(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.success).toBe(true);
      expect(result.data.sectionScores).toHaveLength(3);
      expect(result.data.transformationPlan).toHaveLength(3);
      expect(result.data.missingSections).toContain('Security');
    });

    it('validates all scores are in 1-10 range', async () => {
      mockCallAI.mockResolvedValue({ content: VALID_STRUCTURAL_JSON, model: 'gpt-4o' });

      const result = await runStage3Structural(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      for (const score of result.data.sectionScores) {
        expect(score.completeness).toBeGreaterThanOrEqual(1);
        expect(score.completeness).toBeLessThanOrEqual(10);
        expect(score.relevance).toBeGreaterThanOrEqual(1);
        expect(score.relevance).toBeLessThanOrEqual(10);
        expect(score.placement).toBeGreaterThanOrEqual(1);
        expect(score.placement).toBeLessThanOrEqual(10);
        expect(score.overall).toBeGreaterThanOrEqual(1);
        expect(score.overall).toBeLessThanOrEqual(10);
      }
    });

    it('clamps out-of-range scores', async () => {
      const outOfRange = JSON.stringify({
        sectionScores: [{ sectionId: 'x', completeness: 0, relevance: 11, placement: -5, overall: 15 }],
        transformationPlan: [{ sectionId: 'x', action: 'keep', details: '' }],
        missingSections: [],
      });
      mockCallAI.mockResolvedValue({ content: outOfRange, model: 'gpt-4o' });

      const result = await runStage3Structural(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      const s = result.data.sectionScores[0]!;
      expect(s.completeness).toBe(1);   // clamped from 0
      expect(s.relevance).toBe(10);     // clamped from 11
      expect(s.placement).toBe(1);      // clamped from -5
      expect(s.overall).toBe(10);       // clamped from 15
    });
  });

  describe('transformation validation', () => {
    it('each section gets exactly one valid action', async () => {
      mockCallAI.mockResolvedValue({ content: VALID_STRUCTURAL_JSON, model: 'gpt-4o' });

      const result = await runStage3Structural(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      const validActions = ['keep', 'restructure', 'merge', 'split', 'add'];
      for (const action of result.data.transformationPlan) {
        expect(validActions).toContain(action.action);
      }
    });

    it('normalizes invalid action to restructure', async () => {
      const badAction = JSON.stringify({
        sectionScores: [{ sectionId: 'x', completeness: 5, relevance: 5, placement: 5, overall: 5 }],
        transformationPlan: [{ sectionId: 'x', action: 'INVALID', details: '' }],
        missingSections: [],
      });
      mockCallAI.mockResolvedValue({ content: badAction, model: 'gpt-4o' });

      const result = await runStage3Structural(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.data.transformationPlan[0]!.action).toBe('restructure');
    });
  });

  describe('missing section detection', () => {
    it('identifies missing template sections', async () => {
      mockCallAI.mockResolvedValue({ content: VALID_STRUCTURAL_JSON, model: 'gpt-4o' });

      const result = await runStage3Structural(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.data.missingSections).toContain('Security');
      expect(result.data.missingSections).toContain('Testing Strategy');
    });
  });

  describe('integration', () => {
    it('passes discovered section titles to prompt via callAI', async () => {
      mockCallAI.mockResolvedValue({ content: VALID_STRUCTURAL_JSON, model: 'gpt-4o' });

      await runStage3Structural(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      const prompt = mockCallAI.mock.calls[0]![1]!.systemPrompt;
      expect(prompt).toContain('Overview');
      expect(prompt).toContain('Architecture');
      expect(prompt).toContain('Deployment');
    });

    it('uses withRetry wrapper', async () => {
      mockCallAI.mockResolvedValue({ content: VALID_STRUCTURAL_JSON, model: 'gpt-4o' });

      await runStage3Structural(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(mockWithRetry).toHaveBeenCalledWith(expect.any(Function), 'structural', 3);
    });
  });

  describe('fallback', () => {
    it('uses local fallback when AI returns unparseable response', async () => {
      mockCallAI.mockResolvedValue({ content: 'not json', model: 'gpt-4o' });

      const result = await runStage3Structural(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      // Fallback produces a result from local analysis
      expect(result.success).toBe(true);
      expect(result.data.sectionScores.length).toBeGreaterThan(0);
    });
  });

  describe('progress and errors', () => {
    it('reports running then complete', async () => {
      mockCallAI.mockResolvedValue({ content: VALID_STRUCTURAL_JSON, model: 'gpt-4o' });
      const calls: PipelineProgress[] = [];

      await runStage3Structural(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG, (p) => calls.push(p));

      expect(calls[0]!.status).toBe('running');
      expect(calls[calls.length - 1]!.status).toBe('complete');
    });

    it('handles network error gracefully', async () => {
      mockWithRetry.mockRejectedValue(new Error('timeout'));

      const result = await runStage3Structural(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.success).toBe(false);
      expect(result.metadata.stageName).toBe('structural');
    });
  });
});
