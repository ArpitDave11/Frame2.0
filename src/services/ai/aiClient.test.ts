import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  callAI,
  isAIEnabled,
  getActiveAIProvider,
  detectModelFamily,
  getSafeModelParams,
} from './aiClient';
import type { AIClientConfig, AIRequest } from './types';
import type { AppConfig } from '@/domain/configTypes';
import { DEFAULT_CONFIG, MODEL_LIMITS } from '@/domain/configTypes';

// ─── Fixtures ───────────────────────────────────────────────

const AZURE_CONFIG: AIClientConfig = {
  provider: 'azure',
  azure: {
    endpoint: 'https://my-resource.openai.azure.com',
    deploymentName: 'gpt-4-deploy',
    apiKey: 'azure-key-123',
    apiVersion: '2024-02-15-preview',
    model: 'gpt-4',
  },
  openai: { apiKey: '', model: 'gpt-4' },
  endpoints: DEFAULT_CONFIG.endpoints,
};

const OPENAI_CONFIG: AIClientConfig = {
  provider: 'openai',
  azure: DEFAULT_CONFIG.ai.azure,
  openai: { apiKey: 'sk-test-123', model: 'gpt-4o' },
  endpoints: DEFAULT_CONFIG.endpoints,
};

const NONE_CONFIG: AIClientConfig = {
  provider: 'none',
  azure: DEFAULT_CONFIG.ai.azure,
  openai: DEFAULT_CONFIG.ai.openai,
  endpoints: DEFAULT_CONFIG.endpoints,
};

const REQUEST: AIRequest = {
  systemPrompt: 'You are a helpful assistant.',
  userPrompt: 'Hello',
};

// ─── Mock fetch ─────────────────────────────────────────────

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
});

function mockAzureResponse() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: 'Azure response' } }],
      model: 'gpt-4',
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    }),
  });
}

function mockOpenAIResponse() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: 'OpenAI response' } }],
      model: 'gpt-4o',
      usage: { prompt_tokens: 15, completion_tokens: 25, total_tokens: 40 },
    }),
  });
}

// ─── callAI ─────────────────────────────────────────────────

describe('callAI', () => {
  it('throws when provider is none', async () => {
    await expect(callAI(NONE_CONFIG, REQUEST)).rejects.toThrow('No AI provider configured');
  });

  it('routes to Azure and returns AIResponse', async () => {
    mockAzureResponse();
    const result = await callAI(AZURE_CONFIG, REQUEST);

    expect(result.content).toBe('Azure response');
    expect(result.model).toBe('gpt-4');
    expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 20, totalTokens: 30 });

    // Verify Azure endpoint was called
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('openai.azure.com');
    expect(url).toContain('gpt-4-deploy');
    expect(options.headers['api-key']).toBe('azure-key-123');
  });

  it('routes to OpenAI and returns AIResponse', async () => {
    mockOpenAIResponse();
    const result = await callAI(OPENAI_CONFIG, REQUEST);

    expect(result.content).toBe('OpenAI response');
    expect(result.model).toBe('gpt-4o');
    expect(result.usage).toEqual({ promptTokens: 15, completionTokens: 25, totalTokens: 40 });

    // Verify OpenAI endpoint was called with model in body
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/v1/chat/completions');
    expect(options.headers['Authorization']).toBe('Bearer sk-test-123');
    const body = JSON.parse(options.body);
    expect(body.model).toBe('gpt-4o');
  });

  it('sends correct message format', async () => {
    mockAzureResponse();
    await callAI(AZURE_CONFIG, REQUEST);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages).toEqual([
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello' },
    ]);
  });

  it('passes maxTokens and temperature when provided', async () => {
    mockAzureResponse();
    await callAI(AZURE_CONFIG, { ...REQUEST, maxTokens: 500, temperature: 0.5 });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.max_tokens).toBe(500);
    expect(body.temperature).toBe(0.5);
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      text: async () => 'Rate limited',
      headers: { get: () => null },
    });
    await expect(callAI(AZURE_CONFIG, REQUEST)).rejects.toThrow('Rate limit exceeded (429)');
  });
});

// ─── isAIEnabled ────────────────────────────────────────────

describe('isAIEnabled', () => {
  it('returns false when provider is none', () => {
    expect(isAIEnabled(DEFAULT_CONFIG)).toBe(false);
  });

  it('returns true when provider is azure', () => {
    const config: AppConfig = {
      ...DEFAULT_CONFIG,
      ai: { ...DEFAULT_CONFIG.ai, provider: 'azure' },
    };
    expect(isAIEnabled(config)).toBe(true);
  });

  it('returns true when provider is openai', () => {
    const config: AppConfig = {
      ...DEFAULT_CONFIG,
      ai: { ...DEFAULT_CONFIG.ai, provider: 'openai' },
    };
    expect(isAIEnabled(config)).toBe(true);
  });
});

// ─── getActiveAIProvider ────────────────────────────────────

describe('getActiveAIProvider', () => {
  it('returns "None" for provider none', () => {
    expect(getActiveAIProvider(DEFAULT_CONFIG)).toBe('None');
  });

  it('returns formatted string for azure with model', () => {
    const config: AppConfig = {
      ...DEFAULT_CONFIG,
      ai: { ...DEFAULT_CONFIG.ai, provider: 'azure' },
    };
    expect(getActiveAIProvider(config)).toBe('Azure OpenAI (gpt-4.1)');
  });

  it('returns formatted string for openai with model', () => {
    const config: AppConfig = {
      ...DEFAULT_CONFIG,
      ai: { ...DEFAULT_CONFIG.ai, provider: 'openai', openai: { apiKey: 'sk-x', model: 'gpt-5' } },
    };
    expect(getActiveAIProvider(config)).toBe('OpenAI (gpt-5)');
  });
});

// ─── detectModelFamily ──────────────────────────────────────

describe('detectModelFamily', () => {
  it('detects gpt-4.1 as standard', () => {
    expect(detectModelFamily('gpt-4.1')).toBe('gpt-4.1');
  });

  it('detects gpt-5 as reasoning', () => {
    expect(detectModelFamily('gpt-5')).toBe('reasoning');
  });

  it('detects gpt-5-mini as reasoning', () => {
    expect(detectModelFamily('gpt-5-mini')).toBe('reasoning');
  });

  it('detects gpt-5.2 as reasoning', () => {
    expect(detectModelFamily('gpt-5.2')).toBe('reasoning');
  });

  it('detects gpt-5.4 as reasoning', () => {
    expect(detectModelFamily('gpt-5.4')).toBe('reasoning');
  });

  it('detects o1 series as reasoning', () => {
    expect(detectModelFamily('o1-preview')).toBe('reasoning');
  });

  it('detects o3 series as reasoning', () => {
    expect(detectModelFamily('o3-mini')).toBe('reasoning');
  });

  it('falls back to gpt-4.1 for unknown model', () => {
    expect(detectModelFamily('some-custom-model')).toBe('gpt-4.1');
  });
});

// ─── getSafeModelParams ─────────────────────────────────────

describe('getSafeModelParams', () => {
  it('returns gpt-4.1 limits for azure gpt-4.1 config', () => {
    const config: AppConfig = {
      ...DEFAULT_CONFIG,
      ai: { ...DEFAULT_CONFIG.ai, provider: 'azure' },
    };
    expect(getSafeModelParams(config)).toEqual(MODEL_LIMITS['gpt-4.1']);
  });

  it('returns reasoning limits for openai gpt-5 config', () => {
    const config: AppConfig = {
      ...DEFAULT_CONFIG,
      ai: { ...DEFAULT_CONFIG.ai, provider: 'openai', openai: { apiKey: 'sk-x', model: 'gpt-5' } },
    };
    expect(getSafeModelParams(config)).toEqual(MODEL_LIMITS['reasoning']);
  });

  it('returns gpt-4.1 limits for provider none (fallback)', () => {
    expect(getSafeModelParams(DEFAULT_CONFIG)).toEqual(MODEL_LIMITS['gpt-4.1']);
  });
});
