/**
 * Azure OpenAI Client — Phase 3 (T-3.2).
 *
 * Dedicated Azure OpenAI client with rich error handling for
 * 401/404/429/500+ status codes and Retry-After support.
 * Endpoint received as parameter — never hardcoded.
 */

import type { AzureOpenAIConfig } from '@/domain/configTypes';
import type { AIRequest, AIResponse } from './types';

// ─── Main Call ──────────────────────────────────────────────

export async function callAzure(
  config: AzureOpenAIConfig,
  endpoint: string,
  request: AIRequest,
): Promise<AIResponse> {
  const base = endpoint.replace(/\/$/, '');
  const url = `${base}/openai/deployments/${config.deploymentName}/chat/completions?api-version=${config.apiVersion}`;

  const name = config.deploymentName.toLowerCase();
  const isReasoning = name.includes('gpt-5') || name.includes('o1') || name.includes('o3') || name.includes('o4');

  const bodyObj: Record<string, unknown> = {
    messages: [
      { role: 'system', content: request.systemPrompt },
      { role: 'user', content: request.userPrompt },
    ],
  };

  if (isReasoning) {
    if (request.maxTokens != null) bodyObj.max_completion_tokens = request.maxTokens;
  } else {
    if (request.maxTokens != null) bodyObj.max_tokens = request.maxTokens;
    if (request.temperature != null) bodyObj.temperature = request.temperature;
  }

  const body = JSON.stringify(bodyObj);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.apiKey,
    },
    body,
  });

  if (!response.ok) {
    throw await buildAzureError(response);
  }

  const data = await response.json();
  return parseAzureResponse(data);
}

// ─── Connection Test ────────────────────────────────────────

export async function testAzure(
  config: AzureOpenAIConfig,
  endpoint: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await callAzure(config, endpoint, {
      systemPrompt: 'You are a test assistant.',
      userPrompt: 'Reply with "ok".',
      maxTokens: 5,
      temperature: 0,
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Error Handling ─────────────────────────────────────────

async function buildAzureError(response: Response): Promise<Error> {
  const text = await response.text();
  const { status } = response;

  switch (status) {
    case 401:
      return new Error(`Azure OpenAI authentication failed (401): ${text}`);
    case 404:
      return new Error(`Azure OpenAI deployment not found (404): ${text}`);
    case 429: {
      const retryAfter = response.headers.get('Retry-After');
      const retryMsg = retryAfter ? `Retry after ${retryAfter}s` : 'Retry after unknown delay';
      return new Error(`Azure OpenAI rate limited (429). ${retryMsg}`);
    }
    default:
      if (status >= 500) {
        return new Error(`Azure OpenAI server error (${status}): ${text}`);
      }
      return new Error(`Azure OpenAI request failed (${status}): ${text}`);
  }
}

// ─── Response Parsing ───────────────────────────────────────

function parseAzureResponse(data: Record<string, unknown>): AIResponse {
  const choices = data.choices as Array<{ message?: { content?: string } }> | undefined;
  const usage = data.usage as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined;

  return {
    content: choices?.[0]?.message?.content ?? '',
    model: (data.model as string) ?? '',
    usage: usage?.prompt_tokens != null
      ? {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens ?? 0,
          totalTokens: usage.total_tokens ?? 0,
        }
      : undefined,
  };
}
