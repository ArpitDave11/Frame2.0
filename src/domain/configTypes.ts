/**
 * App Configuration Types — Phase 1 (T-1.5).
 *
 * Central type definitions for application configuration:
 * API endpoints, AI provider settings, GitLab integration, and model limits.
 *
 * NO functions — only types and constants.
 * NO mock mode — AIProvider does not include 'mock'.
 * NO GitLab API functions — those go in the service layer.
 */

// ─── API Endpoints ──────────────────────────────────────────

/** Central API endpoint control — the single place to change all API URLs */
export interface APIEndpoints {
  /** GitLab API base — switch between test/staging/prod here */
  gitlabBaseUrl: string;
  /** Azure OpenAI endpoint URL */
  azureEndpoint: string;
  /** OpenAI Direct API base URL */
  openaiBaseUrl: string;
}

// ─── AI Provider ────────────────────────────────────────────

/** AI provider selection. No 'mock' — all calls are real. */
export type AIProvider = 'none' | 'openai' | 'azure';

/** Azure OpenAI configuration */
export interface AzureOpenAIConfig {
  endpoint: string;
  deploymentName: string;
  apiKey: string;
  apiVersion: string;
  model: string;
}

/** OpenAI direct configuration */
export interface OpenAIConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

// ─── GitLab ─────────────────────────────────────────────────

/** GitLab authentication mode */
export type GitLabAuthMode = 'pat' | 'oauth';

/** GitLab integration configuration */
export interface GitLabConfig {
  enabled: boolean;
  rootGroupId: string;
  accessToken: string;
  authMode: GitLabAuthMode;
}

// ─── Model Limits ───────────────────────────────────────────

/** AI model family identifier */
export type ModelFamily = 'gpt-4.1' | 'reasoning';

/** Safe parameter limits per model family */
export const MODEL_LIMITS: Record<ModelFamily, { maxTokens: number; defaultTokens: number; temperature: number; isReasoning: boolean }> = {
  'gpt-4.1':    { maxTokens: 32768,  defaultTokens: 16384, temperature: 0.7, isReasoning: false },
  'reasoning':  { maxTokens: 128000, defaultTokens: 65536, temperature: 1.0, isReasoning: true },
};

/** Available OpenAI model options */
export const OPENAI_MODELS: readonly string[] = [
  'gpt-4.1',
  'gpt-5',
  'gpt-5-mini',
  'gpt-5.2',
  'gpt-5.4',
];

/** Available Azure API version options */
export const AZURE_API_VERSIONS: readonly string[] = [
  '2025-04-01-preview',
  '2025-01-01-preview',
  '2024-12-01-preview',
  '2024-10-21',
];

// ─── App Config ─────────────────────────────────────────────

/** Full application configuration */
export interface AppConfig {
  endpoints: APIEndpoints;
  ai: {
    provider: AIProvider;
    azure: AzureOpenAIConfig;
    openai: OpenAIConfig;
  };
  gitlab: GitLabConfig;
}

/** Default configuration — reads endpoints from Vite env vars with fallbacks */
export const DEFAULT_CONFIG: AppConfig = {
  endpoints: {
    gitlabBaseUrl: import.meta.env.VITE_GITLAB_BASE_URL || 'https://devcloud.ubs.net/api/v4',
    azureEndpoint: import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || '',
    openaiBaseUrl: import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1',
  },
  ai: {
    provider: 'none',
    azure: {
      endpoint: '',
      deploymentName: '',
      apiKey: '',
      apiVersion: '2025-04-01-preview',
      model: 'gpt-4.1',
    },
    openai: {
      apiKey: '',
      model: 'gpt-4.1',
    },
  },
  gitlab: {
    enabled: false,
    rootGroupId: '',
    accessToken: '',
    authMode: 'pat',
  },
};
