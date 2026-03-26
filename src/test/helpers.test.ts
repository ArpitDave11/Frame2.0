import { describe, it, expect } from 'vitest';
import {
  createMockEpicContent,
  createMockConfig,
  createMockPipelineResult,
  waitFor,
} from './helpers';

// ─── createMockEpicContent ──────────────────────────────────

describe('createMockEpicContent', () => {
  it('returns valid markdown with default 3 sections', () => {
    const md = createMockEpicContent();
    expect(md).toContain('# Mock Epic Title');

    const sectionHeadings = md.match(/^## \d+\./gm) ?? [];
    expect(sectionHeadings).toHaveLength(3);
  });

  it('returns exactly 5 sections when passed 5', () => {
    const md = createMockEpicContent(5);
    const sectionHeadings = md.match(/^## \d+\./gm) ?? [];
    expect(sectionHeadings).toHaveLength(5);
  });

  it('returns 1 section minimum even when passed 0', () => {
    const md = createMockEpicContent(0);
    const sectionHeadings = md.match(/^## \d+\./gm) ?? [];
    expect(sectionHeadings).toHaveLength(1);
  });

  it('caps at 17 sections (max available)', () => {
    const md = createMockEpicContent(100);
    const sectionHeadings = md.match(/^## \d+\./gm) ?? [];
    expect(sectionHeadings).toHaveLength(17);
  });

  it('sections are numbered sequentially starting from 1', () => {
    const md = createMockEpicContent(5);
    for (let i = 1; i <= 5; i++) {
      expect(md).toContain(`## ${i}.`);
    }
  });

  it('each section has non-empty content', () => {
    const md = createMockEpicContent(3);
    const sections = md.split(/^## \d+\./m).slice(1); // skip title
    for (const section of sections) {
      const content = section.trim();
      expect(content.length).toBeGreaterThan(10);
    }
  });

  it('starts with a level-1 heading', () => {
    const md = createMockEpicContent();
    expect(md.trimStart()).toMatch(/^# /);
  });

  it('contains known section titles', () => {
    const md = createMockEpicContent(3);
    expect(md).toContain('Executive Summary');
    expect(md).toContain('Objective');
    expect(md).toContain('Background & Context');
  });
});

// ─── createMockConfig ───────────────────────────────────────

describe('createMockConfig', () => {
  it('returns a valid AppConfig with all required fields', () => {
    const config = createMockConfig();
    expect(config.endpoints).toBeDefined();
    expect(config.ai).toBeDefined();
    expect(config.ai.provider).toBeDefined();
    expect(config.ai.azure).toBeDefined();
    expect(config.ai.openai).toBeDefined();
    expect(config.gitlab).toBeDefined();
  });

  it('endpoints has correct defaults from .env.example', () => {
    const config = createMockConfig();
    expect(config.endpoints.gitlabBaseUrl).toBe('https://devcloud.ubs.net/api/v4');
    expect(config.endpoints.azureEndpoint).toBe('');
    expect(config.endpoints.openaiBaseUrl).toBe('https://api.openai.com/v1');
  });

  it('does not have mockMode field', () => {
    const config = createMockConfig();
    expect(config.ai).not.toHaveProperty('mockMode');
  });

  it('defaults ai.provider to "none"', () => {
    const config = createMockConfig();
    expect(config.ai.provider).toBe('none');
  });

  it('defaults gitlab.enabled to false', () => {
    const config = createMockConfig();
    expect(config.gitlab.enabled).toBe(false);
  });

  it('defaults gitlab.authMode to "pat"', () => {
    const config = createMockConfig();
    expect(config.gitlab.authMode).toBe('pat');
  });

  it('merges ai.provider override correctly', () => {
    const config = createMockConfig({ ai: { provider: 'azure' } });
    expect(config.ai.provider).toBe('azure');
  });

  it('preserves other fields when merging overrides', () => {
    const config = createMockConfig({ ai: { provider: 'azure' } });
    // Azure sub-config should still have defaults
    expect(config.ai.azure.apiVersion).toBe('2025-04-01-preview');
    expect(config.ai.openai.model).toBe('gpt-4.1');
    expect(config.gitlab.enabled).toBe(false);
  });

  it('deep-merges nested overrides', () => {
    const config = createMockConfig({
      ai: {
        azure: { endpoint: 'https://my-instance.openai.azure.com' },
      },
    });
    expect(config.ai.azure.endpoint).toBe('https://my-instance.openai.azure.com');
    expect(config.ai.azure.model).toBe('gpt-4.1'); // preserved from default
  });

  it('merges gitlab overrides', () => {
    const config = createMockConfig({
      gitlab: { enabled: true, rootGroupId: '12345' },
    });
    expect(config.gitlab.enabled).toBe(true);
    expect(config.gitlab.rootGroupId).toBe('12345');
    expect(config.gitlab.authMode).toBe('pat'); // preserved
  });

  it('returns a new object each time (no shared references)', () => {
    const a = createMockConfig();
    const b = createMockConfig();
    expect(a).not.toBe(b);
    a.ai.provider = 'openai';
    expect(b.ai.provider).toBe('none');
  });

  it('azure config has all required fields', () => {
    const config = createMockConfig();
    const az = config.ai.azure;
    expect(az).toHaveProperty('endpoint');
    expect(az).toHaveProperty('deploymentName');
    expect(az).toHaveProperty('apiKey');
    expect(az).toHaveProperty('apiVersion');
    expect(az).toHaveProperty('model');
  });
});

// ─── createMockPipelineResult ───────────────────────────────

describe('createMockPipelineResult', () => {
  it('returns a valid PipelineResult with all fields', () => {
    const result = createMockPipelineResult();
    expect(result.refinedMarkdown).toBeDefined();
    expect(result.category).toBeDefined();
    expect(result.categoryConfidence).toBeDefined();
    expect(result.sectionCount).toBeDefined();
    expect(result.storyCount).toBeDefined();
    expect(result.wordCount).toBeDefined();
    expect(result.validationScore).toBeDefined();
    expect(result.stages).toBeDefined();
  });

  it('has all 6 pipeline stages', () => {
    const result = createMockPipelineResult();
    expect(Object.keys(result.stages)).toHaveLength(6);
    for (let i = 1; i <= 6; i++) {
      const stage = result.stages[i as 1 | 2 | 3 | 4 | 5 | 6];
      expect(stage.status).toBe('complete');
      expect(stage.message.length).toBeGreaterThan(0);
      expect(stage.durationMs).toBeGreaterThan(0);
    }
  });

  it('refinedMarkdown is valid epic content', () => {
    const result = createMockPipelineResult();
    expect(result.refinedMarkdown).toContain('# Mock Epic Title');
  });

  it('category is a valid EpicCategory', () => {
    const validCategories = [
      'business_requirement', 'technical_design', 'feature_specification',
      'api_specification', 'infrastructure_design', 'migration_plan', 'integration_spec',
    ];
    const result = createMockPipelineResult();
    expect(validCategories).toContain(result.category);
  });

  it('categoryConfidence is between 0 and 1', () => {
    const result = createMockPipelineResult();
    expect(result.categoryConfidence).toBeGreaterThanOrEqual(0);
    expect(result.categoryConfidence).toBeLessThanOrEqual(1);
  });

  it('validationScore is a positive number', () => {
    const result = createMockPipelineResult();
    expect(result.validationScore).toBeGreaterThan(0);
  });

  it('sectionCount and storyCount are positive integers', () => {
    const result = createMockPipelineResult();
    expect(Number.isInteger(result.sectionCount)).toBe(true);
    expect(result.sectionCount).toBeGreaterThan(0);
    expect(Number.isInteger(result.storyCount)).toBe(true);
    expect(result.storyCount).toBeGreaterThan(0);
  });
});

// ─── waitFor ────────────────────────────────────────────────

describe('waitFor', () => {
  it('resolves immediately when condition is already true', async () => {
    await expect(waitFor(() => true)).resolves.toBeUndefined();
  });

  it('waits until condition becomes true', async () => {
    let flag = false;
    setTimeout(() => { flag = true; }, 100);
    await waitFor(() => flag, 1000);
    expect(flag).toBe(true);
  });

  it('throws on timeout when condition never becomes true', async () => {
    await expect(
      waitFor(() => false, 200),
    ).rejects.toThrow('waitFor timed out after 200ms');
  });

  it('respects custom timeout', async () => {
    const start = Date.now();
    try {
      await waitFor(() => false, 300);
    } catch {
      // expected
    }
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(250);
    expect(elapsed).toBeLessThan(600);
  });
});
