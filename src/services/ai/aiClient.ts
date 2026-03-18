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

  const body = JSON.stringify({
    messages: [
      { role: 'system', content: request.systemPrompt },
      { role: 'user', content: request.userPrompt },
    ],
    ...(config.provider === 'openai' && { model: config.openai.model }),
    ...(request.maxTokens != null && { max_tokens: request.maxTokens }),
    ...(request.temperature != null && { temperature: request.temperature }),
  });

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
  if (modelName.includes('gpt-4o-mini')) return 'gpt-4o-mini';
  if (modelName.includes('gpt-4o')) return 'gpt-4o';
  if (modelName.includes('gpt-3.5-turbo')) return 'gpt-3.5-turbo';
  if (modelName.includes('gpt-4')) return 'gpt-4';
  return 'gpt-4'; // fallback
}

export function getSafeModelParams(config: AppConfig): { maxTokens: number; temperature: number } {
  const model = config.ai.provider === 'azure'
    ? config.ai.azure.model
    : config.ai.provider === 'openai'
      ? config.ai.openai.model
      : 'gpt-4';

  return MODEL_LIMITS[detectModelFamily(model)];
}
