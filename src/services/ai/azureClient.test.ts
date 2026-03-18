import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callAzure, testAzure } from './azureClient';
import type { AIRequest } from './types';
import type { AzureOpenAIConfig } from '@/domain/configTypes';

// ─── Fixtures ───────────────────────────────────────────────

const AZURE_CONFIG: AzureOpenAIConfig = {
  endpoint: 'https://my-resource.openai.azure.com',
  deploymentName: 'gpt-4-deploy',
  apiKey: 'azure-key-123',
  apiVersion: '2024-02-15-preview',
  model: 'gpt-4',
};

const ENDPOINT = 'https://my-resource.openai.azure.com';

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

function mockSuccessResponse() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: 'Azure says hello' } }],
      model: 'gpt-4',
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    }),
  });
}

// ─── callAzure — URL construction ───────────────────────────

describe('callAzure URL construction', () => {
  it('constructs correct URL with deployment name and API version', async () => {
    mockSuccessResponse();
    await callAzure(AZURE_CONFIG, ENDPOINT, REQUEST);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(
      'https://my-resource.openai.azure.com/openai/deployments/gpt-4-deploy/chat/completions?api-version=2024-02-15-preview',
    );
  });

  it('strips trailing slash from endpoint', async () => {
    mockSuccessResponse();
    await callAzure(AZURE_CONFIG, 'https://my-resource.openai.azure.com/', REQUEST);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('azure.com/openai/');
    expect(url).not.toContain('azure.com//');
  });
});

// ─── callAzure — headers ────────────────────────────────────

describe('callAzure headers', () => {
  it('sets api-key header (not Bearer)', async () => {
    mockSuccessResponse();
    await callAzure(AZURE_CONFIG, ENDPOINT, REQUEST);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['api-key']).toBe('azure-key-123');
    expect(options.headers['Authorization']).toBeUndefined();
  });

  it('sets Content-Type to application/json', async () => {
    mockSuccessResponse();
    await callAzure(AZURE_CONFIG, ENDPOINT, REQUEST);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['Content-Type']).toBe('application/json');
  });
});

// ─── callAzure — request body ───────────────────────────────

describe('callAzure request body', () => {
  it('sends messages in correct format', async () => {
    mockSuccessResponse();
    await callAzure(AZURE_CONFIG, ENDPOINT, REQUEST);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages).toEqual([
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello' },
    ]);
  });

  it('includes maxTokens and temperature when provided', async () => {
    mockSuccessResponse();
    await callAzure(AZURE_CONFIG, ENDPOINT, { ...REQUEST, maxTokens: 500, temperature: 0.3 });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.max_tokens).toBe(500);
    expect(body.temperature).toBe(0.3);
  });

  it('omits maxTokens and temperature when not provided', async () => {
    mockSuccessResponse();
    await callAzure(AZURE_CONFIG, ENDPOINT, REQUEST);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.max_tokens).toBeUndefined();
    expect(body.temperature).toBeUndefined();
  });
});

// ─── callAzure — response parsing ──────────────────────────

describe('callAzure response parsing', () => {
  it('parses content, model, and usage', async () => {
    mockSuccessResponse();
    const result = await callAzure(AZURE_CONFIG, ENDPOINT, REQUEST);

    expect(result.content).toBe('Azure says hello');
    expect(result.model).toBe('gpt-4');
    expect(result.usage).toEqual({
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
    });
  });

  it('handles response without usage', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'No usage data' } }],
        model: 'gpt-4',
      }),
    });
    const result = await callAzure(AZURE_CONFIG, ENDPOINT, REQUEST);
    expect(result.content).toBe('No usage data');
    expect(result.usage).toBeUndefined();
  });
});

// ─── callAzure — error handling ─────────────────────────────

describe('callAzure error handling', () => {
  it('throws descriptive error on 401 Unauthorized', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers(),
      text: async () => 'Invalid API key',
    });
    await expect(callAzure(AZURE_CONFIG, ENDPOINT, REQUEST)).rejects.toThrow(
      'Azure OpenAI authentication failed (401): Invalid API key',
    );
  });

  it('throws descriptive error on 404 Not Found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers(),
      text: async () => 'Deployment not found',
    });
    await expect(callAzure(AZURE_CONFIG, ENDPOINT, REQUEST)).rejects.toThrow(
      'Azure OpenAI deployment not found (404): Deployment not found',
    );
  });

  it('throws descriptive error on 429 with Retry-After header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: new Headers({ 'Retry-After': '30' }),
      text: async () => 'Rate limited',
    });
    await expect(callAzure(AZURE_CONFIG, ENDPOINT, REQUEST)).rejects.toThrow(
      'Azure OpenAI rate limited (429). Retry after 30s',
    );
  });

  it('throws descriptive error on 429 without Retry-After', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: new Headers(),
      text: async () => 'Rate limited',
    });
    await expect(callAzure(AZURE_CONFIG, ENDPOINT, REQUEST)).rejects.toThrow(
      'Azure OpenAI rate limited (429). Retry after unknown delay',
    );
  });

  it('throws generic error on 500+', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      headers: new Headers(),
      text: async () => 'Service unavailable',
    });
    await expect(callAzure(AZURE_CONFIG, ENDPOINT, REQUEST)).rejects.toThrow(
      'Azure OpenAI server error (503): Service unavailable',
    );
  });
});

// ─── testAzure ──────────────────────────────────────────────

describe('testAzure', () => {
  it('returns success on valid response', async () => {
    mockSuccessResponse();
    const result = await testAzure(AZURE_CONFIG, ENDPOINT);
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns failure with error message on rejection', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers(),
      text: async () => 'Bad key',
    });
    const result = await testAzure(AZURE_CONFIG, ENDPOINT);
    expect(result.success).toBe(false);
    expect(result.error).toContain('401');
  });

  it('returns failure on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const result = await testAzure(AZURE_CONFIG, ENDPOINT);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Network error');
  });
});
