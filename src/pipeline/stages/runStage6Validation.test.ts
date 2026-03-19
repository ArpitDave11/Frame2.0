/**
 * Tests for Stage 6 — Validation Gate.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runStage6Validation, validateFeedbackQuality, isActionableFeedback } from './runStage6Validation';
import type { ValidationInput, PipelineConfig, PipelineProgress } from '@/pipeline/pipelineTypes';
import type { AIClientConfig } from '@/services/ai/types';

vi.mock('@/services/ai/aiClient', () => ({ callAI: vi.fn() }));
vi.mock('@/services/ai/throttler', () => ({ withRetry: vi.fn((fn: () => Promise<unknown>) => fn()) }));

import { callAI } from '@/services/ai/aiClient';
import { withRetry } from '@/services/ai/throttler';

const mockCallAI = vi.mocked(callAI);
const mockWithRetry = vi.mocked(withRetry);

const SAMPLE_CONFIG: PipelineConfig = {
  complexity: 'moderate',
  maxIterations: 3,
  passingScore: 85,
  storyCountRange: [10, 15],
  generationTemperature: 0.3,
  validationTemperature: 0.7,
  classificationTemperature: 0.5,
  userApprovedSections: [],
};

const AI_CONFIG: AIClientConfig = {
  provider: 'openai',
  azure: { endpoint: '', deploymentName: '', apiKey: '', apiVersion: '', model: '' },
  openai: { apiKey: 'key', model: 'gpt-4o', baseUrl: '' },
  endpoints: { gitlabBaseUrl: '', azureEndpoint: '', openaiBaseUrl: 'https://api.openai.com/v1' },
};

const SAMPLE_INPUT: ValidationInput = {
  mandatory: {
    architectureDiagram: 'graph TD\n  A-->B',
    userStories: [
      { id: 'US-001', title: 'Login', asA: 'user', iWant: 'to login', soThat: 'access dashboard', acceptanceCriteria: ['AC1'], priority: 'high' },
    ],
    assembledEpic: {
      title: 'Test Epic',
      sections: [
        { id: 'overview', title: 'Overview', content: 'The system implements OAuth2 authentication with JWT tokens for secure API access.' },
        { id: 'architecture', title: 'Architecture', content: 'Microservice architecture with API gateway pattern deployed on Kubernetes.' },
      ],
      metadata: {},
    },
  },
  comprehension: {
    keyEntities: [{ name: 'AuthService', type: 'service', relationships: [] }],
    detectedGaps: [],
    implicitRisks: [],
    semanticSections: [],
    extractedRequirements: [
      { id: 'REQ-001', description: 'OAuth2 support', priority: 'high', source: 'S1' },
      { id: 'REQ-002', description: 'Token refresh', priority: 'medium', source: 'S2' },
      { id: 'REQ-003', description: 'Audit logging', priority: 'low', source: 'S3' },
    ],
    gapAnalysis: [],
  },
  classification: { primaryCategory: 'technical_design', confidence: 0.9, categoryConfig: {}, reasoning: 'Tech.' },
  config: SAMPLE_CONFIG,
};

function makeValidationJSON(score: number, feedback: string[] = []) {
  return JSON.stringify({
    traceabilityMatrix: [
      { requirementId: 'REQ-001', coveredBy: ['overview'], coverage: 'full' },
      { requirementId: 'REQ-002', coveredBy: ['overview'], coverage: 'partial' },
      { requirementId: 'REQ-003', coveredBy: [], coverage: 'missing' },
    ],
    auditChecks: [
      { checkName: 'Section Completeness', passed: score >= 70, score: Math.round(score / 10), details: 'OK' },
      { checkName: 'Requirements Coverage', passed: true, score: 8, details: 'Good' },
    ],
    overallScore: score,
    passed: score >= 85,
    detectedFailures: [
      { pattern: 'Vague Acceptance Criteria', severity: 'major', recommendation: 'Add measurable criteria to US-001' },
    ],
    feedback,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockWithRetry.mockImplementation((fn) => fn());
});

describe('runStage6Validation', () => {
  describe('passing validation', () => {
    it('passes when blended score >= threshold (with low threshold)', async () => {
      // AI: 95, local: ~12 for short sections, blend = 0.7*95 + 0.3*12 ≈ 70
      // Use a lower threshold to account for local scoring on short fixture content
      mockCallAI.mockResolvedValue({
        content: makeValidationJSON(95),
        model: 'gpt-4o',
        usage: { promptTokens: 500, completionTokens: 300, totalTokens: 800 },
      });

      const lowThresholdConfig: PipelineConfig = { ...SAMPLE_CONFIG, passingScore: 65 };
      const lowThresholdInput: ValidationInput = { ...SAMPLE_INPUT, config: lowThresholdConfig };
      const result = await runStage6Validation(lowThresholdInput, lowThresholdConfig, AI_CONFIG);

      expect(result.success).toBe(true);
      expect(result.data.passed).toBe(true);
      expect(result.data.overallScore).toBeGreaterThanOrEqual(65);
      expect(result.data.feedback).toEqual([]);
    });
  });

  describe('failing validation', () => {
    it('fails when blended score < threshold with actionable feedback', async () => {
      mockCallAI.mockResolvedValue({
        content: makeValidationJSON(60, [
          'Section "overview" lacks error handling for token expiry — add retry logic.',
          'REQ-003 (audit logging) has zero coverage — add dedicated section.',
        ]),
        model: 'gpt-4o',
      });

      const result = await runStage6Validation(SAMPLE_INPUT, SAMPLE_CONFIG, AI_CONFIG);

      expect(result.data.passed).toBe(false);
      expect(result.data.feedback.length).toBeGreaterThan(0);
    });
  });

  describe('score blending', () => {
    it('blends AI score (70%) with local score (30%)', async () => {
      // AI returns 100 — local will add some lower value
      mockCallAI.mockResolvedValue({
        content: makeValidationJSON(100),
        model: 'gpt-4o',
      });

      const result = await runStage6Validation(SAMPLE_INPUT, SAMPLE_CONFIG, AI_CONFIG);

      // Blended = 0.7 * 100 + 0.3 * localScore
      // localScore is from epicScorer on the assembled sections
      expect(result.data.overallScore).toBeLessThan(100); // local score pulls it down
      expect(result.data.overallScore).toBeGreaterThan(50); // but AI 100 keeps it high
    });

    it('blended score is between 0 and 100', async () => {
      mockCallAI.mockResolvedValue({ content: makeValidationJSON(75), model: 'gpt-4o' });

      const result = await runStage6Validation(SAMPLE_INPUT, SAMPLE_CONFIG, AI_CONFIG);

      expect(result.data.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.data.overallScore).toBeLessThanOrEqual(100);
    });
  });

  describe('traceability', () => {
    it('populates traceability matrix with coverage statuses', async () => {
      mockCallAI.mockResolvedValue({ content: makeValidationJSON(80), model: 'gpt-4o' });

      const result = await runStage6Validation(SAMPLE_INPUT, SAMPLE_CONFIG, AI_CONFIG);

      const matrix = result.data.traceabilityMatrix;
      expect(matrix.length).toBe(3);
      expect(matrix[0]!.coverage).toBe('full');
      expect(matrix[1]!.coverage).toBe('partial');
      expect(matrix[2]!.coverage).toBe('missing');
    });
  });

  describe('failure detection', () => {
    it('includes detected failure patterns', async () => {
      mockCallAI.mockResolvedValue({ content: makeValidationJSON(75), model: 'gpt-4o' });

      const result = await runStage6Validation(SAMPLE_INPUT, SAMPLE_CONFIG, AI_CONFIG);

      expect(result.data.detectedFailures.length).toBeGreaterThan(0);
      expect(result.data.detectedFailures[0]!.pattern).toContain('Vague Acceptance');
      expect(result.data.detectedFailures[0]!.severity).toBe('major');
    });
  });

  describe('progress and errors', () => {
    it('reports running then complete', async () => {
      mockCallAI.mockResolvedValue({ content: makeValidationJSON(90), model: 'gpt-4o' });
      const calls: PipelineProgress[] = [];

      await runStage6Validation(SAMPLE_INPUT, SAMPLE_CONFIG, AI_CONFIG, (p) => calls.push(p));

      expect(calls[0]!.status).toBe('running');
      expect(calls[calls.length - 1]!.status).toBe('complete');
    });

    it('handles network error gracefully', async () => {
      mockWithRetry.mockRejectedValue(new Error('timeout'));

      const result = await runStage6Validation(SAMPLE_INPUT, SAMPLE_CONFIG, AI_CONFIG);

      expect(result.success).toBe(false);
      expect(result.data.passed).toBe(false);
    });

    it('handles malformed JSON', async () => {
      mockCallAI.mockResolvedValue({ content: 'not json', model: 'gpt-4o' });

      const result = await runStage6Validation(SAMPLE_INPUT, SAMPLE_CONFIG, AI_CONFIG);

      expect(result.success).toBe(false);
    });
  });
});

describe('isActionableFeedback', () => {
  it('accepts feedback with section reference', () => {
    expect(isActionableFeedback('Section 3 lacks error handling for payment timeouts')).toBe(true);
  });

  it('accepts feedback with requirement ID', () => {
    expect(isActionableFeedback('REQ-007 has zero coverage in the epic')).toBe(true);
  });

  it('accepts feedback with action verb', () => {
    expect(isActionableFeedback('Add a dedicated audit logging section with retention policy details')).toBe(true);
  });

  it('rejects generic "improve quality"', () => {
    expect(isActionableFeedback('improve quality')).toBe(false);
  });

  it('rejects "needs improvement"', () => {
    expect(isActionableFeedback('needs improvement')).toBe(false);
  });

  it('rejects very short non-specific text', () => {
    expect(isActionableFeedback('fix it')).toBe(false);
  });
});

describe('validateFeedbackQuality', () => {
  it('filters out generic feedback', () => {
    const input = [
      'Section "overview" lacks error handling — add retry logic.',
      'improve quality',
      'needs improvement',
    ];
    const result = validateFeedbackQuality(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('error handling');
  });

  it('provides default feedback when all items are generic', () => {
    const result = validateFeedbackQuality(['needs work', 'improve']);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toContain('quality threshold');
  });
});
