/**
 * Tests for Pipeline Orchestrator — T-4.15.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runPremiumPipeline, buildPipelineConfig } from './pipelineOrchestrator';
import type { PipelineProgress } from '@/pipeline/pipelineTypes';
import type { AIClientConfig } from '@/services/ai/types';

// ─── Mock All 6 Stages ─────────────────────────────────────

vi.mock('@/pipeline/stages/runStage1Comprehension', () => ({ runStage1Comprehension: vi.fn() }));
vi.mock('@/pipeline/stages/runStage2Classification', () => ({ runStage2Classification: vi.fn() }));
vi.mock('@/pipeline/stages/runStage3Structural', () => ({ runStage3Structural: vi.fn() }));
vi.mock('@/pipeline/stages/runStage4Refinement', () => ({ runStage4Refinement: vi.fn() }));
vi.mock('@/pipeline/stages/runStage4bCoherence', () => ({ runStage4bCoherence: vi.fn() }));
vi.mock('@/pipeline/stages/runStage5Mandatory', () => ({ runStage5Mandatory: vi.fn() }));
vi.mock('@/pipeline/stages/runStage6Validation', () => ({ runStage6Validation: vi.fn() }));

import { runStage1Comprehension } from '@/pipeline/stages/runStage1Comprehension';
import { runStage2Classification } from '@/pipeline/stages/runStage2Classification';
import { runStage3Structural } from '@/pipeline/stages/runStage3Structural';
import { runStage4Refinement } from '@/pipeline/stages/runStage4Refinement';
import { runStage4bCoherence } from '@/pipeline/stages/runStage4bCoherence';
import { runStage5Mandatory } from '@/pipeline/stages/runStage5Mandatory';
import { runStage6Validation } from '@/pipeline/stages/runStage6Validation';

const mockS1 = vi.mocked(runStage1Comprehension);
const mockS2 = vi.mocked(runStage2Classification);
const mockS3 = vi.mocked(runStage3Structural);
const mockS4 = vi.mocked(runStage4Refinement);
const mockS4b = vi.mocked(runStage4bCoherence);
const mockS5 = vi.mocked(runStage5Mandatory);
const mockS6 = vi.mocked(runStage6Validation);

// ─── Fixtures ───────────────────────────────────────────────

const AI_CONFIG: AIClientConfig = {
  provider: 'openai',
  azure: { endpoint: '', deploymentName: '', apiKey: '', apiVersion: '', model: '' },
  openai: { apiKey: 'key', model: 'gpt-4o', baseUrl: '' },
  endpoints: { gitlabBaseUrl: '', azureEndpoint: '', openaiBaseUrl: '' },
};

const META = { stageName: 'test', duration: 100, tokensUsed: 500, model: 'gpt-4o' };

const COMP_DATA = { keyEntities: [{ name: 'Svc', type: 'service', relationships: [] }], detectedGaps: [], implicitRisks: [], semanticSections: [], extractedRequirements: [{ id: 'REQ-001', description: 'x', priority: 'high' as const, source: 'S1' }], gapAnalysis: [] };
const CLASS_DATA = { primaryCategory: 'technical_design' as const, confidence: 0.9, categoryConfig: {}, reasoning: 'tech' };
const STRUCT_DATA = { sectionScores: [], transformationPlan: [{ sectionId: 'overview', displayName: 'Overview', action: 'keep' as const, details: '' }], missingSections: [] };
const REFINE_DATA = { refinedSections: [{ sectionId: 'overview', title: 'Overview', content: 'Refined content.', formatUsed: 'prose' }] };
const MANDATORY_DATA = { architectureDiagram: 'graph TD\n  A-->B', userStories: [{ id: 'US-001', title: 'Login', asA: 'user', iWant: 'login', soThat: 'access', acceptanceCriteria: ['AC1'], priority: 'high' as const }], assembledEpic: { title: 'Epic', sections: [{ id: 'overview', title: 'Overview', content: 'Content' }], metadata: {} } };

function makeValidation(score: number, passed: boolean) {
  return { traceabilityMatrix: [], auditChecks: [], overallScore: score, passed, detectedFailures: [], feedback: passed ? [] : ['Fix section overview'] };
}

function setupSuccessfulStages(validationPassed = true) {
  mockS1.mockResolvedValue({ success: true, data: COMP_DATA, metadata: META });
  mockS2.mockResolvedValue({ success: true, data: CLASS_DATA, metadata: META });
  mockS3.mockResolvedValue({ success: true, data: STRUCT_DATA, metadata: META });
  mockS4.mockResolvedValue({ success: true, data: REFINE_DATA, metadata: META });
  mockS4b.mockResolvedValue({ success: true, data: { refinedSections: REFINE_DATA.refinedSections, fixes: [] }, metadata: META });
  mockS5.mockResolvedValue({ success: true, data: MANDATORY_DATA, metadata: META });
  mockS6.mockResolvedValue({ success: true, data: makeValidation(validationPassed ? 90 : 70, validationPassed), metadata: META });
}

// ─── Setup ──────────────────────────────────────────────────

beforeEach(() => { vi.clearAllMocks(); });

// ─── Tests ──────────────────────────────────────────────────

describe('buildPipelineConfig', () => {
  it('simple complexity returns lower thresholds', () => {
    const config = buildPipelineConfig('simple');
    expect(config.passingScore).toBe(70);
    expect(config.maxIterations).toBe(2);
    expect(config.storyCountRange[0]).toBeLessThan(config.storyCountRange[1]);
  });

  it('complex complexity returns higher thresholds', () => {
    const config = buildPipelineConfig('complex');
    expect(config.passingScore).toBe(85);
    expect(config.maxIterations).toBe(5);
  });

  it('moderate is between simple and complex', () => {
    const simple = buildPipelineConfig('simple');
    const complex = buildPipelineConfig('complex');
    const moderate = buildPipelineConfig('moderate');
    expect(moderate.passingScore).toBeGreaterThanOrEqual(simple.passingScore);
    expect(moderate.passingScore).toBeLessThanOrEqual(complex.passingScore);
  });
});

describe('runPremiumPipeline', () => {
  describe('happy path', () => {
    it('runs all 6 stages and returns success with iterations=1', async () => {
      setupSuccessfulStages(true);

      const result = await runPremiumPipeline({
        rawContent: 'Test content', title: 'Test', complexity: 'moderate', aiConfig: AI_CONFIG,
      });

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(1);
      expect(result.comprehension).toBe(COMP_DATA);
      expect(result.classification).toBe(CLASS_DATA);
      expect(result.structural).toBe(STRUCT_DATA);
      expect(result.epicContent).toContain('Overview');
      expect(mockS1).toHaveBeenCalledTimes(1);
      expect(mockS2).toHaveBeenCalledTimes(1);
      expect(mockS3).toHaveBeenCalledTimes(1);
      expect(mockS4).toHaveBeenCalledTimes(1);
      expect(mockS5).toHaveBeenCalledTimes(1);
      expect(mockS6).toHaveBeenCalledTimes(1);
    });

    it('duration is positive', async () => {
      setupSuccessfulStages(true);

      const result = await runPremiumPipeline({
        rawContent: 'x', title: 'x', complexity: 'moderate', aiConfig: AI_CONFIG,
      });

      expect(result.totalDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('retry path', () => {
    it('retries when validation fails then succeeds', async () => {
      mockS1.mockResolvedValue({ success: true, data: COMP_DATA, metadata: META });
      mockS2.mockResolvedValue({ success: true, data: CLASS_DATA, metadata: META });
      mockS3.mockResolvedValue({ success: true, data: STRUCT_DATA, metadata: META });
      mockS4.mockResolvedValue({ success: true, data: REFINE_DATA, metadata: META });
      mockS5.mockResolvedValue({ success: true, data: MANDATORY_DATA, metadata: META });

      // Fail twice, pass third time
      mockS6
        .mockResolvedValueOnce({ success: true, data: makeValidation(70, false), metadata: META })
        .mockResolvedValueOnce({ success: true, data: makeValidation(80, false), metadata: META })
        .mockResolvedValueOnce({ success: true, data: makeValidation(90, true), metadata: META });

      const result = await runPremiumPipeline({
        rawContent: 'x', title: 'x', complexity: 'moderate', aiConfig: AI_CONFIG,
      });

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(3);
      expect(mockS4).toHaveBeenCalledTimes(3);
      expect(mockS5).toHaveBeenCalledTimes(3);
      expect(mockS6).toHaveBeenCalledTimes(3);
    });

    it('forwards feedback to Stage 4 on retry', async () => {
      mockS1.mockResolvedValue({ success: true, data: COMP_DATA, metadata: META });
      mockS2.mockResolvedValue({ success: true, data: CLASS_DATA, metadata: META });
      mockS3.mockResolvedValue({ success: true, data: STRUCT_DATA, metadata: META });
      mockS4.mockResolvedValue({ success: true, data: REFINE_DATA, metadata: META });
      mockS5.mockResolvedValue({ success: true, data: MANDATORY_DATA, metadata: META });

      const failedValidation = makeValidation(70, false);
      mockS6
        .mockResolvedValueOnce({ success: true, data: failedValidation, metadata: META })
        .mockResolvedValueOnce({ success: true, data: makeValidation(90, true), metadata: META });

      await runPremiumPipeline({
        rawContent: 'x', title: 'x', complexity: 'moderate', aiConfig: AI_CONFIG,
      });

      // Second call to S4 should have previousFeedback
      const secondS4Call = mockS4.mock.calls[1]!;
      expect(secondS4Call[0].previousFeedback).toBeDefined();
      expect(secondS4Call[0].previousFeedback!.overallScore).toBe(70);
    });
  });

  describe('max iterations', () => {
    it('returns success=false after max iterations', async () => {
      mockS1.mockResolvedValue({ success: true, data: COMP_DATA, metadata: META });
      mockS2.mockResolvedValue({ success: true, data: CLASS_DATA, metadata: META });
      mockS3.mockResolvedValue({ success: true, data: STRUCT_DATA, metadata: META });
      mockS4.mockResolvedValue({ success: true, data: REFINE_DATA, metadata: META });
      mockS5.mockResolvedValue({ success: true, data: MANDATORY_DATA, metadata: META });
      mockS6.mockResolvedValue({ success: true, data: makeValidation(60, false), metadata: META });

      const result = await runPremiumPipeline({
        rawContent: 'x', title: 'x', complexity: 'simple', aiConfig: AI_CONFIG,
      });

      // simple complexity has maxIterations=2
      expect(result.success).toBe(false);
      expect(result.iterations).toBe(2);
      expect(result.epicContent).toBeTruthy(); // best effort content still returned
    });
  });

  describe('phase 1 failure', () => {
    it('aborts immediately when Stage 1 fails', async () => {
      mockS1.mockResolvedValue({ success: false, data: COMP_DATA, metadata: META });

      const result = await runPremiumPipeline({
        rawContent: 'x', title: 'x', complexity: 'moderate', aiConfig: AI_CONFIG,
      });

      expect(result.success).toBe(false);
      expect(mockS2).not.toHaveBeenCalled();
      expect(mockS3).not.toHaveBeenCalled();
    });

    it('aborts when Stage 2 fails (Stage 1 output preserved)', async () => {
      mockS1.mockResolvedValue({ success: true, data: COMP_DATA, metadata: META });
      mockS2.mockResolvedValue({ success: false, data: CLASS_DATA, metadata: META });

      const result = await runPremiumPipeline({
        rawContent: 'x', title: 'x', complexity: 'moderate', aiConfig: AI_CONFIG,
      });

      expect(result.success).toBe(false);
      expect(result.comprehension).toBe(COMP_DATA);
      expect(mockS3).not.toHaveBeenCalled();
    });
  });

  describe('progress events', () => {
    it('forwards stage progress and emits pipeline-level events', async () => {
      setupSuccessfulStages(true);
      const events: PipelineProgress[] = [];

      await runPremiumPipeline({
        rawContent: 'x', title: 'x', complexity: 'moderate', aiConfig: AI_CONFIG,
        onProgress: (p) => events.push(p),
      });

      // Should have pipeline-level 'complete' event
      const pipelineEvents = events.filter((e) => e.stageName === 'pipeline');
      expect(pipelineEvents.length).toBeGreaterThan(0);
      expect(pipelineEvents[pipelineEvents.length - 1]!.status).toBe('complete');
    });

    it('emits retrying events on iteration loop', async () => {
      mockS1.mockResolvedValue({ success: true, data: COMP_DATA, metadata: META });
      mockS2.mockResolvedValue({ success: true, data: CLASS_DATA, metadata: META });
      mockS3.mockResolvedValue({ success: true, data: STRUCT_DATA, metadata: META });
      mockS4.mockResolvedValue({ success: true, data: REFINE_DATA, metadata: META });
      mockS5.mockResolvedValue({ success: true, data: MANDATORY_DATA, metadata: META });
      mockS6
        .mockResolvedValueOnce({ success: true, data: makeValidation(70, false), metadata: META })
        .mockResolvedValueOnce({ success: true, data: makeValidation(90, true), metadata: META });

      const events: PipelineProgress[] = [];
      await runPremiumPipeline({
        rawContent: 'x', title: 'x', complexity: 'moderate', aiConfig: AI_CONFIG,
        onProgress: (p) => events.push(p),
      });

      const retryEvents = events.filter((e) => e.status === 'retrying');
      expect(retryEvents.length).toBeGreaterThanOrEqual(1);
      expect(retryEvents[0]!.score).toBe(70);
    });
  });

  describe('error handling', () => {
    it('never throws — returns PipelineResult on unexpected error', async () => {
      mockS1.mockRejectedValue(new Error('Unexpected crash'));

      const result = await runPremiumPipeline({
        rawContent: 'x', title: 'x', complexity: 'moderate', aiConfig: AI_CONFIG,
      });

      expect(result.success).toBe(false);
      expect(result.totalDuration).toBeGreaterThanOrEqual(0);
    });
  });
});
