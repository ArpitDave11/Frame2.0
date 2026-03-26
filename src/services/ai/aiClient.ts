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

  if (limits.isReasoning) {
    bodyObj.max_completion_tokens = request.maxTokens ?? limits.maxTokens;
  } else {
    bodyObj.max_tokens = request.maxTokens ?? limits.maxTokens;
    if (request.temperature != null) {
      bodyObj.temperature = request.temperature;
    }
  }

  const body = JSON.stringify(bodyObj);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI request failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0]?.message?.content ?? '';

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
  const base = azure.endpoint.replace(/\/$/, '');
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

export function getSafeModelParams(config: AppConfig): { maxTokens: number; temperature: number; isReasoning: boolean } {
  const model = config.ai.provider === 'azure'
    ? config.ai.azure.model
    : config.ai.provider === 'openai'
      ? config.ai.openai.model
      : 'gpt-4';

  return MODEL_LIMITS[detectModelFamily(model)];
}
