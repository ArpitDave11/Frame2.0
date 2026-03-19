/**
 * Tests for Stage 5 — Mandatory Sections.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runStage5Mandatory, validateMermaidSyntax } from './runStage5Mandatory';
import type { MandatoryInput, PipelineConfig, PipelineProgress } from '@/pipeline/pipelineTypes';
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

const SAMPLE_INPUT: MandatoryInput = {
  refinement: {
    refinedSections: [
      { sectionId: 'overview', title: 'Overview', content: 'Project overview content.', formatUsed: 'prose' },
      { sectionId: 'architecture', title: 'Architecture', content: 'System architecture.', formatUsed: 'prose' },
    ],
  },
  classification: { primaryCategory: 'technical_design', confidence: 0.9, categoryConfig: {}, reasoning: 'Tech doc.' },
  comprehension: {
    keyEntities: [{ name: 'AuthService', type: 'service', relationships: ['DB'] }],
    detectedGaps: [], implicitRisks: [], semanticSections: [],
    extractedRequirements: [{ id: 'REQ-001', description: 'OAuth2', priority: 'high', source: 'S1' }],
    gapAnalysis: [],
  },
  config: SAMPLE_CONFIG,
};

function makeStories(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `US-${String(i + 1).padStart(3, '0')}`,
    title: `Story ${i + 1}`,
    asA: 'developer',
    iWant: `feature ${i + 1}`,
    soThat: `benefit ${i + 1}`,
    acceptanceCriteria: ['AC1', 'AC2', 'AC3'],
    priority: 'medium' as const,
  }));
}

const VALID_MANDATORY_JSON = JSON.stringify({
  architectureDiagram: 'graph TD\n  A[AuthService] --> B[Database]',
  userStories: makeStories(12),
  assembledEpic: { title: 'Epic', sections: [], metadata: {} },
});

beforeEach(() => {
  vi.clearAllMocks();
  mockWithRetry.mockImplementation((fn) => fn());
});

describe('runStage5Mandatory', () => {
  it('produces valid MandatoryOutput from AI response', async () => {
    mockCallAI.mockResolvedValue({ content: VALID_MANDATORY_JSON, model: 'gpt-4o', usage: { promptTokens: 500, completionTokens: 500, totalTokens: 1000 } });

    const result = await runStage5Mandatory(SAMPLE_INPUT, SAMPLE_CONFIG, AI_CONFIG);

    expect(result.success).toBe(true);
    expect(result.data.userStories.length).toBeGreaterThan(0);
    expect(result.data.architectureDiagram).toContain('graph TD');
    expect(result.data.assembledEpic.sections.length).toBeGreaterThan(0);
  });

  it('assembled epic includes refined sections + diagram + stories', async () => {
    mockCallAI.mockResolvedValue({ content: VALID_MANDATORY_JSON, model: 'gpt-4o' });

    const result = await runStage5Mandatory(SAMPLE_INPUT, SAMPLE_CONFIG, AI_CONFIG);

    const titles = result.data.assembledEpic.sections.map((s) => s.title);
    expect(titles).toContain('Overview');
    expect(titles).toContain('Architecture');
    expect(titles).toContain('Architecture Diagram');
    expect(titles).toContain('User Stories');
  });

  it('truncates stories when AI generates too many', async () => {
    const tooMany = JSON.stringify({
      architectureDiagram: 'graph TD\n  A-->B',
      userStories: makeStories(20), // max is 15
      assembledEpic: { title: 'E', sections: [], metadata: {} },
    });
    mockCallAI.mockResolvedValue({ content: tooMany, model: 'gpt-4o' });

    const result = await runStage5Mandatory(SAMPLE_INPUT, SAMPLE_CONFIG, AI_CONFIG);

    expect(result.data.userStories.length).toBeLessThanOrEqual(15);
  });

  it('story count scales with complexity config', async () => {
    mockCallAI.mockResolvedValue({ content: VALID_MANDATORY_JSON, model: 'gpt-4o' });

    const simpleConfig: PipelineConfig = { ...SAMPLE_CONFIG, storyCountRange: [5, 8] };
    const tooMany = JSON.stringify({
      architectureDiagram: 'graph TD\n  A-->B',
      userStories: makeStories(12),
      assembledEpic: { title: 'E', sections: [], metadata: {} },
    });
    mockCallAI.mockResolvedValue({ content: tooMany, model: 'gpt-4o' });

    const result = await runStage5Mandatory(SAMPLE_INPUT, simpleConfig, AI_CONFIG);

    expect(result.data.userStories.length).toBeLessThanOrEqual(8);
  });

  it('validates story has all required fields', async () => {
    const incomplete = JSON.stringify({
      architectureDiagram: 'graph TD\n  A-->B',
      userStories: [{ id: 'US-001', title: 'Test' }], // missing asA, iWant, soThat
      assembledEpic: { title: 'E', sections: [], metadata: {} },
    });
    mockCallAI.mockResolvedValue({ content: incomplete, model: 'gpt-4o' });

    const result = await runStage5Mandatory(SAMPLE_INPUT, SAMPLE_CONFIG, AI_CONFIG);

    expect(result.success).toBe(true);
    const story = result.data.userStories[0]!;
    expect(story.asA).toBeTruthy(); // defaulted
    expect(story.acceptanceCriteria.length).toBeGreaterThan(0); // defaulted
  });

  it('handles malformed JSON gracefully', async () => {
    mockCallAI.mockResolvedValue({ content: 'not json', model: 'gpt-4o' });

    const result = await runStage5Mandatory(SAMPLE_INPUT, SAMPLE_CONFIG, AI_CONFIG);

    expect(result.success).toBe(false);
  });

  it('reports progress running then complete', async () => {
    mockCallAI.mockResolvedValue({ content: VALID_MANDATORY_JSON, model: 'gpt-4o' });
    const calls: PipelineProgress[] = [];

    await runStage5Mandatory(SAMPLE_INPUT, SAMPLE_CONFIG, AI_CONFIG, (p) => calls.push(p));

    expect(calls[0]!.status).toBe('running');
    expect(calls[calls.length - 1]!.status).toBe('complete');
  });
});

describe('validateMermaidSyntax', () => {
  it('accepts valid graph TD', () => {
    const result = validateMermaidSyntax('graph TD\n  A-->B');
    expect(result).toContain('graph TD');
  });

  it('accepts flowchart LR', () => {
    const result = validateMermaidSyntax('flowchart LR\n  A-->B');
    expect(result).toContain('flowchart LR');
  });

  it('accepts sequenceDiagram', () => {
    const result = validateMermaidSyntax('sequenceDiagram\n  A->>B: msg');
    expect(result).toContain('sequenceDiagram');
  });

  it('rejects random text with fallback diagram', () => {
    const result = validateMermaidSyntax('This is not a diagram');
    expect(result).toContain('graph TD');
    expect(result).toContain('Invalid diagram');
  });

  it('handles empty string with fallback', () => {
    const result = validateMermaidSyntax('');
    expect(result).toContain('graph TD');
  });
});
