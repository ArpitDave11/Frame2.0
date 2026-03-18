/**
 * Tests for Stage 2 — Category Classification.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runStage2Classification, summarizeComprehension } from './runStage2Classification';
import type {
  ClassificationInput,
  ComprehensionOutput,
  PipelineConfig,
  PipelineProgress,
} from '@/pipeline/pipelineTypes';
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

const SAMPLE_COMPREHENSION: ComprehensionOutput = {
  keyEntities: [
    { name: 'PaymentService', type: 'service', relationships: ['Database', 'Gateway'] },
    { name: 'Database', type: 'data_store', relationships: ['PaymentService'] },
  ],
  detectedGaps: ['No retry strategy defined'],
  implicitRisks: ['Gateway single point of failure'],
  semanticSections: [
    { id: 'sec-1', title: 'Overview', content: 'Payment processing', purpose: 'Introduce scope' },
  ],
  extractedRequirements: [
    { id: 'REQ-001', description: 'Process transactions', priority: 'high', source: 'Section 1' },
  ],
  gapAnalysis: [],
};

const SAMPLE_INPUT: ClassificationInput = {
  comprehension: SAMPLE_COMPREHENSION,
  rawContent: 'The payment service processes transactions via the payment gateway.',
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

const VALID_CLASSIFICATION_JSON = JSON.stringify({
  primaryCategory: 'technical_design',
  confidence: 0.91,
  categoryConfig: { tone: 'precise and technical' },
  reasoning: 'Document describes system architecture with microservices.',
});

// ─── Setup ──────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockWithRetry.mockImplementation((fn) => fn());
});

// ─── Tests ──────────────────────────────────────────────────

describe('runStage2Classification', () => {
  describe('successful classification', () => {
    it('produces correct ClassificationOutput from valid JSON', async () => {
      mockCallAI.mockResolvedValue({
        content: VALID_CLASSIFICATION_JSON,
        model: 'gpt-4o',
        usage: { promptTokens: 300, completionTokens: 100, totalTokens: 400 },
      });

      const result = await runStage2Classification(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.success).toBe(true);
      expect(result.data.primaryCategory).toBe('technical_design');
      expect(result.data.confidence).toBe(0.91);
      expect(result.data.reasoning).toContain('microservices');
    });

    it('parses JSON from code block', async () => {
      mockCallAI.mockResolvedValue({
        content: '```json\n' + VALID_CLASSIFICATION_JSON + '\n```',
        model: 'gpt-4o',
      });

      const result = await runStage2Classification(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.success).toBe(true);
      expect(result.data.primaryCategory).toBe('technical_design');
    });
  });

  describe('category validation', () => {
    it('accepts all 7 valid categories', async () => {
      const categories = [
        'business_requirement', 'technical_design', 'feature_specification',
        'api_specification', 'infrastructure_design', 'migration_plan', 'integration_spec',
      ];

      for (const cat of categories) {
        mockCallAI.mockResolvedValue({
          content: JSON.stringify({
            primaryCategory: cat,
            confidence: 0.9,
            categoryConfig: {},
            reasoning: `Classified as ${cat}`,
          }),
          model: 'gpt-4o',
        });

        const result = await runStage2Classification(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);
        expect(result.data.primaryCategory).toBe(cat);
      }
    });

    it('normalizes invalid category name to default', async () => {
      mockCallAI.mockResolvedValue({
        content: JSON.stringify({
          primaryCategory: 'invalid_category',
          confidence: 0.8,
          categoryConfig: {},
          reasoning: 'Some reasoning.',
        }),
        model: 'gpt-4o',
      });

      const result = await runStage2Classification(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.success).toBe(true);
      expect(result.data.primaryCategory).toBe('technical_design');
    });
  });

  describe('confidence validation', () => {
    it('clamps confidence above 1 to 1', async () => {
      mockCallAI.mockResolvedValue({
        content: JSON.stringify({
          primaryCategory: 'technical_design',
          confidence: 1.5,
          categoryConfig: {},
          reasoning: 'High confidence.',
        }),
        model: 'gpt-4o',
      });

      const result = await runStage2Classification(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.data.confidence).toBe(1);
    });

    it('clamps negative confidence to 0', async () => {
      mockCallAI.mockResolvedValue({
        content: JSON.stringify({
          primaryCategory: 'technical_design',
          confidence: -0.3,
          categoryConfig: {},
          reasoning: 'Negative confidence.',
        }),
        model: 'gpt-4o',
      });

      const result = await runStage2Classification(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.data.confidence).toBe(0);
    });

    it('defaults non-numeric confidence to 0.5', async () => {
      mockCallAI.mockResolvedValue({
        content: JSON.stringify({
          primaryCategory: 'technical_design',
          confidence: 'high',
          categoryConfig: {},
          reasoning: 'Non-numeric confidence.',
        }),
        model: 'gpt-4o',
      });

      const result = await runStage2Classification(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.data.confidence).toBe(0.5);
    });
  });

  describe('failure handling', () => {
    it('returns success: false for malformed JSON', async () => {
      mockCallAI.mockResolvedValue({
        content: 'not json at all',
        model: 'gpt-4o',
      });

      const result = await runStage2Classification(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.success).toBe(false);
    });

    it('returns success: false for empty object with no category or reasoning', async () => {
      mockCallAI.mockResolvedValue({
        content: JSON.stringify({}),
        model: 'gpt-4o',
      });

      const result = await runStage2Classification(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.success).toBe(false);
    });

    it('handles network error gracefully', async () => {
      mockWithRetry.mockRejectedValue(new Error('Network timeout'));

      const result = await runStage2Classification(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.success).toBe(false);
      expect(result.metadata.stageName).toBe('classification');
    });
  });

  describe('progress reporting', () => {
    it('reports running then complete', async () => {
      mockCallAI.mockResolvedValue({
        content: VALID_CLASSIFICATION_JSON,
        model: 'gpt-4o',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const calls: PipelineProgress[] = [];
      await runStage2Classification(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG, (p) => calls.push(p));

      expect(calls[0]!.status).toBe('running');
      expect(calls[calls.length - 1]!.status).toBe('complete');
    });

    it('reports failed on parse error', async () => {
      mockCallAI.mockResolvedValue({ content: 'bad', model: 'gpt-4o' });

      const calls: PipelineProgress[] = [];
      await runStage2Classification(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG, (p) => calls.push(p));

      expect(calls[calls.length - 1]!.status).toBe('failed');
    });
  });

  describe('metadata', () => {
    it('populates tokensUsed and model', async () => {
      mockCallAI.mockResolvedValue({
        content: VALID_CLASSIFICATION_JSON,
        model: 'gpt-4o-2024',
        usage: { promptTokens: 300, completionTokens: 100, totalTokens: 400 },
      });

      const result = await runStage2Classification(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(result.metadata.tokensUsed).toBe(400);
      expect(result.metadata.model).toBe('gpt-4o-2024');
      expect(result.metadata.stageName).toBe('classification');
      expect(result.metadata.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('integration', () => {
    it('uses withRetry wrapper', async () => {
      mockCallAI.mockResolvedValue({ content: VALID_CLASSIFICATION_JSON, model: 'gpt-4o' });

      await runStage2Classification(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      expect(mockWithRetry).toHaveBeenCalledWith(expect.any(Function), 'classification', 3);
    });

    it('passes comprehension summary as readable text, not raw JSON', async () => {
      mockCallAI.mockResolvedValue({ content: VALID_CLASSIFICATION_JSON, model: 'gpt-4o' });

      await runStage2Classification(SAMPLE_INPUT, SAMPLE_CONFIG, SAMPLE_AI_CONFIG);

      const callArgs = mockCallAI.mock.calls[0]!;
      const systemPrompt = callArgs[1]!.systemPrompt;
      // Should contain readable entity format, not JSON braces
      expect(systemPrompt).toContain('PaymentService');
      expect(systemPrompt).toContain('[service]');
      expect(systemPrompt).toContain('REQ-001');
      // Should NOT be raw JSON
      expect(systemPrompt).not.toContain('"keyEntities"');
    });
  });
});

// ─── summarizeComprehension ─────────────────────────────────

describe('summarizeComprehension', () => {
  it('produces readable text with entities', () => {
    const result = summarizeComprehension(SAMPLE_COMPREHENSION);
    expect(result).toContain('Key Entities:');
    expect(result).toContain('PaymentService [service]');
    expect(result).toContain('relates to: Database, Gateway');
  });

  it('includes requirements with IDs and priorities', () => {
    const result = summarizeComprehension(SAMPLE_COMPREHENSION);
    expect(result).toContain('REQ-001: Process transactions [high]');
  });

  it('includes detected gaps', () => {
    const result = summarizeComprehension(SAMPLE_COMPREHENSION);
    expect(result).toContain('No retry strategy defined');
  });

  it('includes implicit risks', () => {
    const result = summarizeComprehension(SAMPLE_COMPREHENSION);
    expect(result).toContain('Gateway single point of failure');
  });

  it('includes semantic sections with purpose', () => {
    const result = summarizeComprehension(SAMPLE_COMPREHENSION);
    expect(result).toContain('Overview: Introduce scope');
  });

  it('handles empty comprehension gracefully', () => {
    const empty: ComprehensionOutput = {
      keyEntities: [],
      detectedGaps: [],
      implicitRisks: [],
      semanticSections: [],
      extractedRequirements: [],
      gapAnalysis: [],
    };
    const result = summarizeComprehension(empty);
    expect(result).toBe('');
  });

  it('does not contain JSON syntax', () => {
    const result = summarizeComprehension(SAMPLE_COMPREHENSION);
    expect(result).not.toContain('{');
    expect(result).not.toContain('"keyEntities"');
  });
});
