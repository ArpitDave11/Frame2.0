/**
 * OpenAI Direct Client — Phase 3 (T-3.3).
 *
 * Dedicated OpenAI client with Bearer token auth, model in request body,
 * and rich error handling. Supports custom baseUrl for compatible endpoints.
 * BaseUrl received as parameter — never hardcoded.
 */

import type { OpenAIConfig } from '@/domain/configTypes';
import type { AIRequest, AIResponse } from './types';

// ─── Main Call ──────────────────────────────────────────────

export async function callOpenAI(
  config: OpenAIConfig,
  baseUrl: string,
  request: AIRequest,
): Promise<AIResponse> {
  const base = baseUrl.replace(/\/$/, '');
  const url = `${base}/chat/completions`;

  const body = JSON.stringify({
    model: config.model,
    messages: [
      { role: 'system', content: request.systemPrompt },
      { role: 'user', content: request.userPrompt },
    ],
    ...(request.maxTokens != null && { max_tokens: request.maxTokens }),
    ...(request.temperature != null && { temperature: request.temperature }),
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body,
  });

  if (!response.ok) {
    throw await buildOpenAIError(response);
  }

  const data = await response.json();
  return parseOpenAIResponse(data);
}

// ─── Connection Test ────────────────────────────────────────

export async function testOpenAI(
  config: OpenAIConfig,
  baseUrl: string,
): Promise<{ success: boolean; error?: string; model?: string }> {
  try {
    const result = await callOpenAI(config, baseUrl, {
      systemPrompt: 'You are a test assistant.',
      userPrompt: 'Reply with "ok".',
      maxTokens: 5,
      temperature: 0,
    });
    return { success: true, model: result.model };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Error Handling ─────────────────────────────────────────

async function buildOpenAIError(response: Response): Promise<Error> {
  const text = await response.text();
  const { status } = response;

  switch (status) {
    case 401:
      return new Error(`OpenAI authentication failed (401): ${text}`);
    case 429: {
      const retryAfter = response.headers.get('Retry-After');
      const retryMsg = retryAfter ? `Retry after ${retryAfter}s` : 'Retry after unknown delay';
      return new Error(`OpenAI rate limited (429). ${retryMsg}`);
    }
    default:
      if (status >= 500) {
        return new Error(`OpenAI server error (${status}): ${text}`);
      }
      return new Error(`OpenAI request failed (${status}): ${text}`);
  }
}

// ─── Response Parsing ───────────────────────────────────────

function parseOpenAIResponse(data: Record<string, unknown>): AIResponse {
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
