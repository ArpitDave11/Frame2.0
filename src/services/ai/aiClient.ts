/**
 * AI Client — Phase 3 (T-3.1).
 *
 * Unified AI client that routes requests to Azure OpenAI or OpenAI direct
 * based on provider configuration. Receives config as param — no global state.
 */

import type { AppConfig, ModelFamily } from '@/domain/configTypes';
import { MODEL_LIMITS } from '@/domain/configTypes';
import type { AIClientConfig, AIRequest, AIResponse } from './types';

// ─── Provider Routing ───────────────────────────────────────

export async function callAI(config: AIClientConfig, request: AIRequest): Promise<AIResponse> {
  if (config.provider === 'none') {
    throw new Error('No AI provider configured');
  }

  const { url, headers } = config.provider === 'azure'
    ? buildAzureRequest(config)
    : buildOpenAIRequest(config);

  const modelName = config.provider === 'azure'
    ? (config.azure.deploymentName || config.azure.model)
    : config.openai.model;
  const family = detectModelFamily(modelName);
  const limits = MODEL_LIMITS[family];

  const bodyObj: Record<string, unknown> = {
    messages: [
      { role: 'system', content: request.systemPrompt },
      { role: 'user', content: request.userPrompt },
    ],
  };

  if (config.provider === 'openai') {
    bodyObj.model = config.openai.model;
  }

  // V4 pattern: caller > user config > safe default, all capped at model max
  const userMaxTokens = config.provider === 'azure'
    ? config.azure.maxTokens
    : config.openai.maxTokens;
  const effectiveMaxTokens = Math.min(
    request.maxTokens ?? userMaxTokens ?? limits.defaultTokens,
    limits.maxTokens,
  );

  if (limits.isReasoning) {
    bodyObj.max_completion_tokens = effectiveMaxTokens;
  } else {
    bodyObj.max_tokens = effectiveMaxTokens;
    const userTemp = config.provider === 'azure'
      ? config.azure.temperature
      : config.openai.temperature;
    bodyObj.temperature = request.temperature ?? userTemp ?? limits.temperature;
  }

  const body = JSON.stringify(bodyObj);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    const status = response.status;

    if (status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 10000;
      await new Promise(resolve => setTimeout(resolve, Math.min(waitMs, 30000)));
      throw new Error(`AI rate limited (429). Waited ${Math.round(waitMs / 1000)}s — please retry.`);
    }
    if (status === 401) {
      throw new Error('AI authentication failed (401). Check your API key in Settings.');
    }
    if (status === 404) {
      throw new Error('AI deployment not found (404). Check your deployment name and endpoint in Settings.');
    }
    if (text.includes('max_tokens') || text.includes('max_completion_tokens')) {
      throw new Error(`Token limit error: ${text}. The model may have stricter output limits.`);
    }
    if (text.includes('temperature')) {
      throw new Error(`Temperature error: ${text}. Reasoning models (GPT-5) do not support temperature.`);
    }
    if (status >= 500) {
      throw new Error(`AI server error (${status}). The service may be temporarily unavailable.`);
    }
    throw new Error(`AI request failed (${status}): ${text}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0]?.message?.content ?? '';

  if (!choice || choice.trim().length === 0) {
    const finishReason = data.choices?.[0]?.finish_reason ?? 'unknown';
    throw new Error(`AI returned an empty response (finish_reason: ${finishReason}). The model may have run out of tokens or content was filtered.`);
  }

  return {
    content: choice,
    model: data.model ?? '',
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
  };
}

// ─── Request Builders ───────────────────────────────────────

function buildAzureRequest(config: AIClientConfig): { url: string; headers: Record<string, string> } {
  const { azure } = config;
  // Use azure.endpoint if set, otherwise fall back to endpoints.azureEndpoint
  // (Settings UI writes to endpoints.azureEndpoint, not azure.endpoint)
  const base = (azure.endpoint || config.endpoints.azureEndpoint).replace(/\/$/, '');
  if (!base) {
    throw new Error('Azure OpenAI endpoint is not configured. Please set it in Settings.');
  }
  const url = `${base}/openai/deployments/${azure.deploymentName}/chat/completions?api-version=${azure.apiVersion}`;
  return { url, headers: { 'api-key': azure.apiKey } };
}

function buildOpenAIRequest(config: AIClientConfig): { url: string; headers: Record<string, string> } {
  const base = (config.openai.baseUrl || config.endpoints.openaiBaseUrl).replace(/\/$/, '');
  const url = `${base}/chat/completions`;
  return { url, headers: { Authorization: `Bearer ${config.openai.apiKey}` } };
}

// ─── Config Helpers ─────────────────────────────────────────

export function isAIEnabled(config: AppConfig): boolean {
  return config.ai.provider !== 'none';
}

export function getActiveAIProvider(config: AppConfig): string {
  switch (config.ai.provider) {
    case 'azure':
      return `Azure OpenAI (${config.ai.azure.model})`;
    case 'openai':
      return `OpenAI (${config.ai.openai.model})`;
    default:
      return 'None';
  }
}

export function detectModelFamily(modelName: string): ModelFamily {
  const name = modelName.toLowerCase();

  // GPT-5 series — all are reasoning models
  if (name.includes('gpt-5')) return 'reasoning';

  // o-series — all are reasoning models
  if (name.includes('o1') || name.includes('o3') || name.includes('o4')) return 'reasoning';

  // GPT-4.1 and everything else — standard
  return 'gpt-4.1';
}

export function getSafeModelParams(config: AppConfig): { maxTokens: number; defaultTokens: number; temperature: number; isReasoning: boolean } {
  const model = config.ai.provider === 'azure'
    ? config.ai.azure.model
    : config.ai.provider === 'openai'
      ? config.ai.openai.model
      : 'gpt-4.1';

  return MODEL_LIMITS[detectModelFamily(model)];
}
