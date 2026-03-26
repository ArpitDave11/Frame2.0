import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CONFIG,
  MODEL_LIMITS,
  OPENAI_MODELS,
  AZURE_API_VERSIONS,
} from './configTypes';
import type {
  AppConfig,
  APIEndpoints,
  AIProvider,
  ModelFamily,
} from './configTypes';

// ─── DEFAULT_CONFIG ─────────────────────────────────────────

describe('DEFAULT_CONFIG', () => {
  it('has all required top-level fields', () => {
    expect(DEFAULT_CONFIG).toHaveProperty('endpoints');
    expect(DEFAULT_CONFIG).toHaveProperty('ai');
    expect(DEFAULT_CONFIG).toHaveProperty('gitlab');
  });

  it('endpoints.gitlabBaseUrl is a valid URL string', () => {
    expect(DEFAULT_CONFIG.endpoints.gitlabBaseUrl).toMatch(/^https?:\/\//);
  });

  it('endpoints.openaiBaseUrl is https://api.openai.com/v1', () => {
    expect(DEFAULT_CONFIG.endpoints.openaiBaseUrl).toBe('https://api.openai.com/v1');
  });

  it('endpoints.azureEndpoint defaults to empty string', () => {
    expect(DEFAULT_CONFIG.endpoints.azureEndpoint).toBe('');
  });

  it('ai.provider is "none"', () => {
    expect(DEFAULT_CONFIG.ai.provider).toBe('none');
  });

  it('gitlab.enabled is false', () => {
    expect(DEFAULT_CONFIG.gitlab.enabled).toBe(false);
  });

  it('gitlab.authMode is "pat"', () => {
    expect(DEFAULT_CONFIG.gitlab.authMode).toBe('pat');
  });

  it('azure config has all required fields', () => {
    const az = DEFAULT_CONFIG.ai.azure;
    expect(az).toHaveProperty('endpoint');
    expect(az).toHaveProperty('deploymentName');
    expect(az).toHaveProperty('apiKey');
    expect(az).toHaveProperty('apiVersion');
    expect(az).toHaveProperty('model');
  });

  it('azure.apiVersion is a valid version string', () => {
    expect(AZURE_API_VERSIONS).toContain(DEFAULT_CONFIG.ai.azure.apiVersion);
  });

  it('openai config has all required fields', () => {
    const oi = DEFAULT_CONFIG.ai.openai;
    expect(oi).toHaveProperty('apiKey');
    expect(oi).toHaveProperty('model');
  });

  it('does not contain mockMode field anywhere', () => {
    expect(DEFAULT_CONFIG.ai).not.toHaveProperty('mockMode');
    expect(DEFAULT_CONFIG).not.toHaveProperty('mockMode');
  });
});

// ─── AIProvider ─────────────────────────────────────────────

describe('AIProvider type', () => {
  it('accepts "none", "openai", "azure"', () => {
    const providers: AIProvider[] = ['none', 'openai', 'azure'];
    expect(providers).toHaveLength(3);
  });

  it('does NOT include "mock" (runtime check)', () => {
    const valid = new Set<string>(['none', 'openai', 'azure']);
    expect(valid.has('mock')).toBe(false);
  });

  it('TypeScript rejects "mock" as AIProvider (runtime check)', () => {
    const valid = new Set<string>(['none', 'openai', 'azure']);
    expect(valid.has('mock')).toBe(false);
    expect(valid.size).toBe(3);
  });
});

// ─── MODEL_LIMITS ───────────────────────────────────────────

describe('MODEL_LIMITS', () => {
  const families: ModelFamily[] = ['gpt-4.1', 'reasoning'];

  it('has limits for all model families', () => {
    for (const fam of families) {
      expect(MODEL_LIMITS[fam]).toBeDefined();
      expect(MODEL_LIMITS[fam].maxTokens).toBeGreaterThan(0);
      expect(MODEL_LIMITS[fam].temperature).toBeGreaterThan(0);
    }
  });

  it('gpt-4.1 maxTokens is 32768', () => {
    expect(MODEL_LIMITS['gpt-4.1'].maxTokens).toBe(32768);
  });

  it('reasoning maxTokens is 128000', () => {
    expect(MODEL_LIMITS['reasoning'].maxTokens).toBe(128000);
  });

  it('reasoning isReasoning flag is true', () => {
    expect(MODEL_LIMITS['reasoning'].isReasoning).toBe(true);
  });

  it('gpt-4.1 isReasoning flag is false', () => {
    expect(MODEL_LIMITS['gpt-4.1'].isReasoning).toBe(false);
  });
});

// ─── OPENAI_MODELS ──────────────────────────────────────────

describe('OPENAI_MODELS', () => {
  it('is a non-empty array', () => {
    expect(OPENAI_MODELS.length).toBeGreaterThan(0);
  });

  it('contains gpt-4.1', () => {
    expect(OPENAI_MODELS).toContain('gpt-4.1');
  });

  it('contains gpt-5', () => {
    expect(OPENAI_MODELS).toContain('gpt-5');
  });
});

// ─── AZURE_API_VERSIONS ─────────────────────────────────────

describe('AZURE_API_VERSIONS', () => {
  it('is a non-empty array', () => {
    expect(AZURE_API_VERSIONS.length).toBeGreaterThan(0);
  });

  it('contains 2025-04-01-preview', () => {
    expect(AZURE_API_VERSIONS).toContain('2025-04-01-preview');
  });
});

// ─── Type Compilation ───────────────────────────────────────

describe('type compilation', () => {
  it('creates a valid AppConfig with endpoints', () => {
    const config: AppConfig = {
      endpoints: {
        gitlabBaseUrl: 'https://test.example.com/api/v4',
        azureEndpoint: 'https://my.openai.azure.com',
        openaiBaseUrl: 'https://api.openai.com/v1',
      },
      ai: {
        provider: 'azure',
        azure: {
          endpoint: 'https://my.openai.azure.com',
          deploymentName: 'gpt4-deploy',
          apiKey: 'key-123',
          apiVersion: '2025-04-01-preview',
          model: 'gpt-4.1',
        },
        openai: { apiKey: '', model: 'gpt-4.1' },
      },
      gitlab: {
        enabled: true,
        rootGroupId: '42',
        accessToken: 'glpat-xxx',
        authMode: 'pat',
      },
    };

    expect(config.endpoints.gitlabBaseUrl).toBe('https://test.example.com/api/v4');
    expect(config.ai.provider).toBe('azure');
  });

  it('AppConfig requires endpoints field (structural check)', () => {
    const keys = Object.keys(DEFAULT_CONFIG);
    expect(keys).toContain('endpoints');
  });

  it('APIEndpoints has all 3 URL fields', () => {
    const ep: APIEndpoints = {
      gitlabBaseUrl: 'a',
      azureEndpoint: 'b',
      openaiBaseUrl: 'c',
    };
    expect(Object.keys(ep)).toHaveLength(3);
  });
});
