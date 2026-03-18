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
export type ModelFamily = 'gpt-4' | 'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo';

/** Safe parameter limits per model family */
export const MODEL_LIMITS: Record<ModelFamily, { maxTokens: number; temperature: number }> = {
  'gpt-4': { maxTokens: 8192, temperature: 0.7 },
  'gpt-4o': { maxTokens: 128000, temperature: 0.7 },
  'gpt-4o-mini': { maxTokens: 128000, temperature: 0.7 },
  'gpt-3.5-turbo': { maxTokens: 4096, temperature: 0.7 },
};

/** Available OpenAI model options */
export const OPENAI_MODELS: readonly string[] = [
  'gpt-4',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-3.5-turbo',
];

/** Available Azure API version options */
export const AZURE_API_VERSIONS: readonly string[] = [
  '2024-02-15-preview',
  '2024-05-01-preview',
  '2024-06-01',
  '2024-08-01-preview',
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
      apiVersion: '2024-02-15-preview',
      model: 'gpt-4',
    },
    openai: {
      apiKey: '',
      model: 'gpt-4',
    },
  },
  gitlab: {
    enabled: false,
    rootGroupId: '',
    accessToken: '',
    authMode: 'pat',
  },
};
