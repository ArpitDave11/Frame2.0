/**
 * Tests for Stage 1 — Deep Comprehension.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runStage1Comprehension } from './runStage1Comprehension';
import type { ComprehensionInput, PipelineConfig, PipelineProgress } from '@/pipeline/pipelineTypes';
import type { AIClientConfig } from '@/services/ai/types';

// ─── Mocks ──────────────────────────────────────────────────

vi.mock('@/services/ai/aiClient', () => ({
  callAI: vi.fn(),
}));

vi.mock('@/services/ai/throttler', () => ({
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

import { callAI } from '@/services/ai/aiClient';
import { withRetry } from '@/services/ai/throttler';

const mockCallAI = vi.mocked(callAI);
const mockWithRetry = vi.mocked(withRetry);

// ─── Fixtures ───────────────────────────────────────────────

const SAMPLE_INPUT: ComprehensionInput = {
  rawContent: 'The payment service processes transactions via the payment gateway. It stores records in PostgreSQL.',
  title: 'Payment Service Epic',
};

const SAMPLE_CONFIG: PipelineConfig = {
  complexity: 'moderate',
  maxIterations: 3,
  passingScore: 85,
  storyCountRange: [10, 15],
};

const SAMPLE_AI_CONFIG: AIClientConfig = {
  provider: 'openai',
  azure: { endpoint: '', deploymentName: '', apiKey: '', apiVersion: '', model: '' },
  openai: { apiKey: 'test-key', model: 'gpt-4o', baseUrl: '' },
  endpoints: { gitlabBaseUrl: '', azureEndpoint: '', openaiBaseUrl: 'https://api.openai.com/v1' },
};

const VALID_COMPREHENSION_JSON = JSON.stringify({
  keyEntities: [
    { name: 'PaymentService', type: 'service', relationships: ['Database', 'Gateway'] },
    { name: 'Database', type: 'data_store', relationships: ['PaymentService'] },
  ],
  detectedGaps: ['No retry strategy defined'],
  implicitRisks: ['Gateway single point of failure'],
  semanticSections: [
    { id: 'sec-overview', title: 'Overview', content: 'Payment processing overview', purpose: 'Introduce scope' },
  ],
  extractedRequirements: [
    { id: 'REQ-001', description: 'Process transactions', priority: 'high', source: 'Section 1' },
    { id: 'REQ-002', description: 'Store records in PostgreSQL', priority: 'medium', source: 'Section 1' },
  ],
  gapAnalysis: [
    { requirementId: 'REQ-001', gapType: 'missing-error-handling', severity: 'major', suggestion: 'Add timeout handling' },
  ],
});

// ─── Setup ──────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Default: withRetry calls the fn directly
  mockWithRetry.mockImplementation((fn) => fn());
});

// ─── Tests ──────────────────────────────────────────────────

describe('runStage1Comprehension', () => {
  describe('successful parsing', () => {
    it('produces correct ComprehensionOutput from valid JSON', async () => {
      mockCallAI.mockResolvedValue({
        content: VALID_COMPREHENSION_JSON,
        model: 'gpt-4o',
        usage: { promptTokens: 500, completionTokens: 800, totalTokens: 1300 },
      });

      const result = await runStage1Comprehension(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.success).toBe(true);
      expect(result.data.keyEntities).toHaveLength(2);
      expect(result.data.keyEntities[0]!.name).toBe('PaymentService');
      expect(result.data.extractedRequirements).toHaveLength(2);
      expect(result.data.detectedGaps).toContain('No retry strategy defined');
      expect(result.data.gapAnalysis).toHaveLength(1);
    });

    it('parses JSON wrapped in ```json code block', async () => {
      mockCallAI.mockResolvedValue({
        content: '```json\n' + VALID_COMPREHENSION_JSON + '\n```',
        model: 'gpt-4o',
        usage: { promptTokens: 500, completionTokens: 800, totalTokens: 1300 },
      });

      const result = await runStage1Comprehension(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.success).toBe(true);
      expect(result.data.keyEntities).toHaveLength(2);
    });

    it('parses JSON wrapped in ``` code block without json tag', async () => {
      mockCallAI.mockResolvedValue({
        content: '```\n' + VALID_COMPREHENSION_JSON + '\n```',
        model: 'gpt-4o',
      });

      const result = await runStage1Comprehension(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.success).toBe(true);
      expect(result.data.keyEntities).toHaveLength(2);
    });
  });

  describe('failure handling', () => {
    it('returns success: false for malformed JSON', async () => {
      mockCallAI.mockResolvedValue({
        content: 'This is not JSON at all {broken',
        model: 'gpt-4o',
      });

      const result = await runStage1Comprehension(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.success).toBe(false);
      expect(result.data.keyEntities).toEqual([]);
    });

    it('returns success: false for valid JSON with empty required fields', async () => {
      mockCallAI.mockResolvedValue({
        content: JSON.stringify({
          keyEntities: [],
          detectedGaps: [],
          implicitRisks: [],
          semanticSections: [],
          extractedRequirements: [],
          gapAnalysis: [],
        }),
        model: 'gpt-4o',
      });

      const result = await runStage1Comprehension(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.success).toBe(false);
    });

    it('handles network error via withRetry and returns gracefully', async () => {
      mockWithRetry.mockRejectedValue(new Error('Network timeout after 3 retries'));

      const result = await runStage1Comprehension(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.success).toBe(false);
      expect(result.metadata.stageName).toBe('comprehension');
    });

    it('never throws — always returns StageResult', async () => {
      mockWithRetry.mockRejectedValue(new Error('Catastrophic failure'));

      // Should NOT throw
      const result = await runStage1Comprehension(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
    });
  });

  describe('progress reporting', () => {
    it('calls onProgress with running then complete', async () => {
      mockCallAI.mockResolvedValue({
        content: VALID_COMPREHENSION_JSON,
        model: 'gpt-4o',
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
      });

      const progressCalls: PipelineProgress[] = [];
      const onProgress = (p: PipelineProgress) => { progressCalls.push(p); };

      await runStage1Comprehension(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG, onProgress);

      expect(progressCalls.length).toBeGreaterThanOrEqual(2);
      expect(progressCalls[0]!.status).toBe('running');
      expect(progressCalls[progressCalls.length - 1]!.status).toBe('complete');
    });

    it('calls onProgress with failed status on error', async () => {
      mockCallAI.mockResolvedValue({
        content: 'not json',
        model: 'gpt-4o',
      });

      const progressCalls: PipelineProgress[] = [];
      const onProgress = (p: PipelineProgress) => { progressCalls.push(p); };

      await runStage1Comprehension(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG, onProgress);

      const lastStatus = progressCalls[progressCalls.length - 1]!.status;
      expect(lastStatus).toBe('failed');
    });
  });

  describe('metadata', () => {
    it('duration is a positive number', async () => {
      mockCallAI.mockResolvedValue({
        content: VALID_COMPREHENSION_JSON,
        model: 'gpt-4o',
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
      });

      const result = await runStage1Comprehension(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.metadata.duration).toBeGreaterThanOrEqual(0);
    });

    it('tokensUsed is populated from AI response', async () => {
      mockCallAI.mockResolvedValue({
        content: VALID_COMPREHENSION_JSON,
        model: 'gpt-4o',
        usage: { promptTokens: 500, completionTokens: 800, totalTokens: 1300 },
      });

      const result = await runStage1Comprehension(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.metadata.tokensUsed).toBe(1300);
    });

    it('model is populated from AI response', async () => {
      mockCallAI.mockResolvedValue({
        content: VALID_COMPREHENSION_JSON,
        model: 'gpt-4o-2024-08-06',
      });

      const result = await runStage1Comprehension(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.metadata.model).toBe('gpt-4o-2024-08-06');
    });

    it('stageName is always comprehension', async () => {
      mockCallAI.mockResolvedValue({
        content: VALID_COMPREHENSION_JSON,
        model: 'gpt-4o',
      });

      const result = await runStage1Comprehension(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.metadata.stageName).toBe('comprehension');
    });
  });

  describe('integration', () => {
    it('uses withRetry wrapper', async () => {
      mockCallAI.mockResolvedValue({
        content: VALID_COMPREHENSION_JSON,
        model: 'gpt-4o',
      });

      await runStage1Comprehension(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(mockWithRetry).toHaveBeenCalledTimes(1);
      expect(mockWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        'comprehension',
        3,
      );
    });

    it('uses buildComprehensionPrompt (prompt appears in callAI args)', async () => {
      mockCallAI.mockResolvedValue({
        content: VALID_COMPREHENSION_JSON,
        model: 'gpt-4o',
      });

      await runStage1Comprehension(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(mockCallAI).toHaveBeenCalledWith(
        SAMPLE_AI_CONFIG,
        expect.objectContaining({
          systemPrompt: expect.stringContaining(SAMPLE_INPUT.title),
          userPrompt: expect.stringContaining('Analyze'),
        }),
      );
    });
  });

  describe('validation edge cases', () => {
    it('normalizes missing priority to medium', async () => {
      const json = JSON.stringify({
        keyEntities: [{ name: 'Svc', type: 'service', relationships: [] }],
        extractedRequirements: [{ id: 'REQ-1', description: 'test', priority: 'INVALID', source: 'x' }],
        detectedGaps: [],
        implicitRisks: [],
        semanticSections: [],
        gapAnalysis: [],
      });
      mockCallAI.mockResolvedValue({ content: json, model: 'gpt-4o' });

      const result = await runStage1Comprehension(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.success).toBe(true);
      expect(result.data.extractedRequirements[0]!.priority).toBe('medium');
    });

    it('normalizes missing severity to minor', async () => {
      const json = JSON.stringify({
        keyEntities: [{ name: 'Svc', type: 'service', relationships: [] }],
        extractedRequirements: [{ id: 'REQ-1', description: 'test', priority: 'high', source: 'x' }],
        detectedGaps: [],
        implicitRisks: [],
        semanticSections: [],
        gapAnalysis: [{ requirementId: 'REQ-1', gapType: 'test', severity: 'BOGUS', suggestion: 'fix' }],
      });
      mockCallAI.mockResolvedValue({ content: json, model: 'gpt-4o' });

      const result = await runStage1Comprehension(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.data.gapAnalysis[0]!.severity).toBe('minor');
    });

    it('handles non-array fields gracefully', async () => {
      const json = JSON.stringify({
        keyEntities: 'not an array',
        extractedRequirements: [{ id: 'REQ-1', description: 'test', priority: 'high', source: 'x' }],
        detectedGaps: 42,
        implicitRisks: null,
        semanticSections: {},
        gapAnalysis: undefined,
      });
      mockCallAI.mockResolvedValue({ content: json, model: 'gpt-4o' });

      const result = await runStage1Comprehension(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.success).toBe(true);
      expect(result.data.keyEntities).toEqual([]);
      expect(result.data.detectedGaps).toEqual([]);
    });
  });
});
