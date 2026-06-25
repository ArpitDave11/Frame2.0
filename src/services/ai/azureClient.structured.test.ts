import { describe, it, expect, vi, afterEach } from 'vitest';
import { callAzure } from './azureClient';
import type { AzureOpenAIConfig } from '@/domain/configTypes';

const cfg: AzureOpenAIConfig = {
  endpoint: 'https://az.example',
  deploymentName: 'gpt-4',
  apiKey: 'k',
  apiVersion: '2024-02-01',
  model: 'gpt-4',
};

function mockFetchOnce() {
  const spy = vi.fn(async () =>
    new Response(JSON.stringify({ choices: [{ message: { content: '{}' } }], model: 'gpt-4' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', spy);
  return spy;
}

/** Pull the request body of the Nth fetch call, typed loosely (mock args are untyped). */
function bodyOf(spy: ReturnType<typeof vi.fn>, n = 0): Record<string, unknown> {
  const init = (spy.mock.calls[n] as unknown as [string, RequestInit])[1];
  return JSON.parse(init.body as string);
}

afterEach(() => vi.unstubAllGlobals());

describe('callAzure — structured output + seed forwarding (T4)', () => {
  it('forwards response_format and seed into the request body', async () => {
    const spy = mockFetchOnce();
    const responseFormat = {
      type: 'json_schema' as const,
      json_schema: { name: 'x', strict: true, schema: { type: 'object' } },
    };
    await callAzure(cfg, 'https://az.example', {
      systemPrompt: 's',
      userPrompt: 'u',
      maxTokens: 100,
      temperature: 0.2,
      responseFormat,
      seed: 12345,
    });

    const body = bodyOf(spy);
    expect(body.response_format).toEqual(responseFormat);
    expect(body.seed).toBe(12345);
  });

  it('omits response_format and seed when not provided (existing callers unaffected)', async () => {
    const spy = mockFetchOnce();
    await callAzure(cfg, 'https://az.example', { systemPrompt: 's', userPrompt: 'u', maxTokens: 5 });
    const body = bodyOf(spy);
    expect(body).not.toHaveProperty('response_format');
    expect(body).not.toHaveProperty('seed');
  });
});
