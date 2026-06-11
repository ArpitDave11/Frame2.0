/**
 * AI Service Types — Phase 3 (T-3.1).
 *
 * Request/response types for the unified AI client.
 * Provider-agnostic — works with both Azure OpenAI and OpenAI direct.
 */

import type { AzureOpenAIConfig, OpenAIConfig, AIProvider, APIEndpoints } from '@/domain/configTypes';

// ─── Request / Response ─────────────────────────────────────

export interface AIRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  /** Strict JSON schema output — only used by DocIntel. Existing callers unaffected. */
  responseFormat?: {
    type: 'json_schema';
    json_schema: { name: string; strict: boolean; schema: Record<string, unknown> };
  };
  /** Azure AI Foundry reasoning effort — only used by DocIntel. */
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
  /** Azure AI Foundry output verbosity — only used by DocIntel. */
  verbosity?: 'low' | 'medium' | 'high';
  /** Deterministic seed for reproducible evals — only used by DocIntel. */
  seed?: number;
  /** Routes to AZURE_DOCEX_DEPLOYMENT instead of default. Only used by DocIntel. */
  isDocIntel?: boolean;
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ─── Client Config ──────────────────────────────────────────

export interface AIClientConfig {
  provider: AIProvider;
  azure: AzureOpenAIConfig;
  openai: OpenAIConfig;
  endpoints: APIEndpoints;
  /** Aborts in-flight AI requests (pipeline cancel). Rides with the config so stages need no changes. */
  signal?: AbortSignal;
}
