import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callOpenAI, testOpenAI } from './openaiClient';
import type { AIRequest } from './types';
import type { OpenAIConfig } from '@/domain/configTypes';

// ─── Fixtures ───────────────────────────────────────────────

const OPENAI_CONFIG: OpenAIConfig = {
  apiKey: 'sk-test-123',
  model: 'gpt-4o',
};

const BASE_URL = 'https://api.openai.com/v1';

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

function mockSuccessResponse(model = 'gpt-4o') {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: 'OpenAI says hello' } }],
      model,
      usage: { prompt_tokens: 15, completion_tokens: 25, total_tokens: 40 },
    }),
  });
}

// ─── callOpenAI — URL construction ──────────────────────────

describe('callOpenAI URL construction', () => {
  it('constructs correct URL from baseUrl', async () => {
    mockSuccessResponse();
    await callOpenAI(OPENAI_CONFIG, BASE_URL, REQUEST);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
  });

  it('strips trailing slash from baseUrl', async () => {
    mockSuccessResponse();
    await callOpenAI(OPENAI_CONFIG, 'https://api.openai.com/v1/', REQUEST);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
  });

  it('respects custom baseUrl', async () => {
    mockSuccessResponse();
    await callOpenAI(OPENAI_CONFIG, 'https://my-proxy.example.com/v1', REQUEST);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('https://my-proxy.example.com/v1/chat/completions');
  });
});

// ─── callOpenAI — headers ───────────────────────────────────

describe('callOpenAI headers', () => {
  it('sets Authorization: Bearer header', async () => {
    mockSuccessResponse();
    await callOpenAI(OPENAI_CONFIG, BASE_URL, REQUEST);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['Authorization']).toBe('Bearer sk-test-123');
  });

  it('sets Content-Type to application/json', async () => {
    mockSuccessResponse();
    await callOpenAI(OPENAI_CONFIG, BASE_URL, REQUEST);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  it('does not set api-key header', async () => {
    mockSuccessResponse();
    await callOpenAI(OPENAI_CONFIG, BASE_URL, REQUEST);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['api-key']).toBeUndefined();
  });
});

// ─── callOpenAI — request body ──────────────────────────────

describe('callOpenAI request body', () => {
  it('includes model in body', async () => {
    mockSuccessResponse();
    await callOpenAI(OPENAI_CONFIG, BASE_URL, REQUEST);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('gpt-4o');
  });

  it('sends messages in correct format', async () => {
    mockSuccessResponse();
    await callOpenAI(OPENAI_CONFIG, BASE_URL, REQUEST);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages).toEqual([
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello' },
    ]);
  });

  it('includes maxTokens and temperature when provided', async () => {
    mockSuccessResponse();
    await callOpenAI(OPENAI_CONFIG, BASE_URL, { ...REQUEST, maxTokens: 1000, temperature: 0.5 });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.max_tokens).toBe(1000);
    expect(body.temperature).toBe(0.5);
  });
});

// ─── callOpenAI — response parsing ─────────────────────────

describe('callOpenAI response parsing', () => {
  it('parses content, model, and usage', async () => {
    mockSuccessResponse();
    const result = await callOpenAI(OPENAI_CONFIG, BASE_URL, REQUEST);

    expect(result.content).toBe('OpenAI says hello');
    expect(result.model).toBe('gpt-4o');
    expect(result.usage).toEqual({
      promptTokens: 15,
      completionTokens: 25,
      totalTokens: 40,
    });
  });

  it('handles response without usage', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'No usage' } }],
        model: 'gpt-4o',
      }),
    });
    const result = await callOpenAI(OPENAI_CONFIG, BASE_URL, REQUEST);
    expect(result.content).toBe('No usage');
    expect(result.usage).toBeUndefined();
  });
});

// ─── callOpenAI — error handling ────────────────────────────

describe('callOpenAI error handling', () => {
  it('throws on 401 Unauthorized', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers(),
      text: async () => 'Invalid API key',
    });
    await expect(callOpenAI(OPENAI_CONFIG, BASE_URL, REQUEST)).rejects.toThrow(
      'OpenAI authentication failed (401): Invalid API key',
    );
  });

  it('throws on 429 with Retry-After', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: new Headers({ 'Retry-After': '20' }),
      text: async () => 'Rate limited',
    });
    await expect(callOpenAI(OPENAI_CONFIG, BASE_URL, REQUEST)).rejects.toThrow(
      'OpenAI rate limited (429). Retry after 20s',
    );
  });

  it('throws on 500+ server error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      headers: new Headers(),
      text: async () => 'Bad gateway',
    });
    await expect(callOpenAI(OPENAI_CONFIG, BASE_URL, REQUEST)).rejects.toThrow(
      'OpenAI server error (502): Bad gateway',
    );
  });
});

// ─── testOpenAI ─────────────────────────────────────────────

describe('testOpenAI', () => {
  it('returns success with model name', async () => {
    mockSuccessResponse('gpt-4o-2024-08-06');
    const result = await testOpenAI(OPENAI_CONFIG, BASE_URL);
    expect(result.success).toBe(true);
    expect(result.model).toBe('gpt-4o-2024-08-06');
    expect(result.error).toBeUndefined();
  });

  it('returns failure with error message on rejection', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers(),
      text: async () => 'Bad key',
    });
    const result = await testOpenAI(OPENAI_CONFIG, BASE_URL);
    expect(result.success).toBe(false);
    expect(result.error).toContain('401');
    expect(result.model).toBeUndefined();
  });

  it('returns failure on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const result = await testOpenAI(OPENAI_CONFIG, BASE_URL);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Network error');
  });
});
