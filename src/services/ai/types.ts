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
}
