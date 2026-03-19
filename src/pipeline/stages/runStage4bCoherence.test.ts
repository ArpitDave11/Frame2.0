/**
 * Tests for Stage 4b — Cross-Section Coherence Pass.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runStage4bCoherence } from './runStage4bCoherence';
import type { PipelineConfig, PipelineProgress } from '@/pipeline/pipelineTypes';
import type { AIClientConfig } from '@/services/ai/types';
import type { CoherenceInput } from './runStage4bCoherence';

vi.mock('@/services/ai/aiClient', () => ({ callAI: vi.fn() }));
vi.mock('@/services/ai/throttler', () => ({ withRetry: vi.fn((fn: () => Promise<unknown>) => fn()) }));

import { callAI } from '@/services/ai/aiClient';
import { withRetry } from '@/services/ai/throttler';

const mockCallAI = vi.mocked(callAI);
const mockWithRetry = vi.mocked(withRetry);

const CONFIG: PipelineConfig = {
  complexity: 'moderate', maxIterations: 3, passingScore: 85,
  storyCountRange: [10, 15], generationTemperature: 0.3,
  validationTemperature: 0.7, classificationTemperature: 0.5,
  userApprovedSections: [],
};

const AI_CONFIG: AIClientConfig = {
  provider: 'openai',
  azure: { endpoint: '', deploymentName: '', apiKey: '', apiVersion: '', model: '' },
  openai: { apiKey: 'key', model: 'gpt-4o', baseUrl: '' },
  endpoints: { gitlabBaseUrl: '', azureEndpoint: '', openaiBaseUrl: '' },
};

const SAMPLE_INPUT: CoherenceInput = {
  refinement: {
    refinedSections: [
      { sectionId: 'overview', title: 'Overview', content: 'Uses PostgreSQL for storage.', formatUsed: 'prose' },
      { sectionId: 'architecture', title: 'Architecture', content: 'Uses MongoDB for storage.', formatUsed: 'prose' },
    ],
  },
  classification: { primaryCategory: 'technical_design', confidence: 0.9, categoryConfig: {}, reasoning: 'Tech doc.' },
};

const COHERENCE_RESPONSE_WITH_FIXES = JSON.stringify({
  refinedSections: [
    { sectionId: 'overview', title: 'Overview', content: 'Uses PostgreSQL for storage.', formatUsed: 'prose' },
    { sectionId: 'architecture', title: 'Architecture', content: 'Uses PostgreSQL for storage (consistent with overview).', formatUsed: 'prose' },
  ],
  fixes: [
    { type: 'contradiction', sections: ['overview', 'architecture'], description: 'Unified database reference from MongoDB to PostgreSQL' },
  ],
});

const COHERENCE_RESPONSE_NO_FIXES = JSON.stringify({
  refinedSections: [
    { sectionId: 'overview', title: 'Overview', content: 'Uses PostgreSQL for storage.', formatUsed: 'prose' },
    { sectionId: 'architecture', title: 'Architecture', content: 'Uses MongoDB for storage.', formatUsed: 'prose' },
  ],
  fixes: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  mockWithRetry.mockImplementation((fn) => fn());
});

describe('runStage4bCoherence', () => {
  it('detects and fixes contradictions', async () => {
    mockCallAI.mockResolvedValue({ content: COHERENCE_RESPONSE_WITH_FIXES, model: 'gpt-4o' });

    const result = await runStage4bCoherence(SAMPLE_INPUT, CONFIG, AI_CONFIG);

    expect(result.success).toBe(true);
    expect(result.data.fixes).toHaveLength(1);
    expect(result.data.fixes[0]!.type).toBe('contradiction');
    expect(result.data.fixes[0]!.sections).toContain('overview');
    expect(result.data.fixes[0]!.sections).toContain('architecture');
    expect(result.data.refinedSections[1]!.content).toContain('PostgreSQL');
  });

  it('passes through sections unchanged when no issues found', async () => {
    mockCallAI.mockResolvedValue({ content: COHERENCE_RESPONSE_NO_FIXES, model: 'gpt-4o' });

    const result = await runStage4bCoherence(SAMPLE_INPUT, CONFIG, AI_CONFIG);

    expect(result.success).toBe(true);
    expect(result.data.fixes).toHaveLength(0);
    expect(result.data.refinedSections).toHaveLength(2);
  });

  it('gracefully degrades on API error — returns original sections', async () => {
    mockWithRetry.mockRejectedValue(new Error('timeout'));

    const result = await runStage4bCoherence(SAMPLE_INPUT, CONFIG, AI_CONFIG);

    expect(result.success).toBe(true); // graceful degradation
    expect(result.data.fixes).toHaveLength(0);
    expect(result.data.refinedSections).toBe(SAMPLE_INPUT.refinement.refinedSections);
  });

  it('gracefully degrades on malformed JSON — returns original sections', async () => {
    mockCallAI.mockResolvedValue({ content: 'not json', model: 'gpt-4o' });

    const result = await runStage4bCoherence(SAMPLE_INPUT, CONFIG, AI_CONFIG);

    expect(result.success).toBe(true);
    expect(result.data.refinedSections).toBe(SAMPLE_INPUT.refinement.refinedSections);
  });

  it('reports progress', async () => {
    mockCallAI.mockResolvedValue({ content: COHERENCE_RESPONSE_WITH_FIXES, model: 'gpt-4o' });
    const calls: PipelineProgress[] = [];

    await runStage4bCoherence(SAMPLE_INPUT, CONFIG, AI_CONFIG, (p) => calls.push(p));

    expect(calls[0]!.status).toBe('running');
    expect(calls[calls.length - 1]!.message).toContain('1 coherence issue');
  });

  it('uses generationTemperature', async () => {
    mockCallAI.mockResolvedValue({ content: COHERENCE_RESPONSE_NO_FIXES, model: 'gpt-4o' });

    await runStage4bCoherence(SAMPLE_INPUT, CONFIG, AI_CONFIG);

    expect(mockCallAI.mock.calls[0]![1]!.temperature).toBe(0.3);
  });
});
