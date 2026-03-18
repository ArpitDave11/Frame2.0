import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useConfigStore } from './configStore';
import { DEFAULT_CONFIG } from '@/domain/configTypes';

const STORAGE_KEY = 'epic-generator-config';

beforeEach(() => {
  useConfigStore.setState(useConfigStore.getInitialState());
  localStorage.clear();
});

// ─── Initial State ──────────────────────────────────────────

describe('initial state', () => {
  it('config matches DEFAULT_CONFIG', () => {
    expect(useConfigStore.getState().config).toEqual(DEFAULT_CONFIG);
  });

  it('all test statuses are null', () => {
    const state = useConfigStore.getState();
    expect(state.gitlabTestStatus).toBeNull();
    expect(state.azureTestStatus).toBeNull();
    expect(state.openaiTestStatus).toBeNull();
  });
});

// ─── updateConfig ───────────────────────────────────────────

describe('updateConfig', () => {
  it('deep-merges partial ai.provider update', () => {
    useConfigStore.getState().updateConfig({ ai: { provider: 'azure' } });
    expect(useConfigStore.getState().config.ai.provider).toBe('azure');
  });

  it('does not lose other config values (deep merge, not replace)', () => {
    useConfigStore.getState().updateConfig({ ai: { provider: 'azure' } });
    const config = useConfigStore.getState().config;
    // Azure sub-config should remain intact
    expect(config.ai.azure.apiVersion).toBe(DEFAULT_CONFIG.ai.azure.apiVersion);
    // GitLab config should remain intact
    expect(config.gitlab).toEqual(DEFAULT_CONFIG.gitlab);
    // Endpoints should remain intact
    expect(config.endpoints).toEqual(DEFAULT_CONFIG.endpoints);
  });

  it('deep-merges nested azure config', () => {
    useConfigStore.getState().updateConfig({
      ai: { azure: { apiKey: 'test-key', deploymentName: 'gpt-4-deploy' } },
    });
    const azure = useConfigStore.getState().config.ai.azure;
    expect(azure.apiKey).toBe('test-key');
    expect(azure.deploymentName).toBe('gpt-4-deploy');
    // Other azure fields remain
    expect(azure.endpoint).toBe(DEFAULT_CONFIG.ai.azure.endpoint);
    expect(azure.apiVersion).toBe(DEFAULT_CONFIG.ai.azure.apiVersion);
  });
});

// ─── isAIEnabled / getActiveProvider ────────────────────────

describe('computed helpers', () => {
  it('isAIEnabled returns false when provider is none', () => {
    expect(useConfigStore.getState().isAIEnabled()).toBe(false);
  });

  it('isAIEnabled returns true when provider is azure', () => {
    useConfigStore.getState().updateConfig({ ai: { provider: 'azure' } });
    expect(useConfigStore.getState().isAIEnabled()).toBe(true);
  });

  it('isAIEnabled returns true when provider is openai', () => {
    useConfigStore.getState().updateConfig({ ai: { provider: 'openai' } });
    expect(useConfigStore.getState().isAIEnabled()).toBe(true);
  });

  it('getActiveProvider returns current provider string', () => {
    expect(useConfigStore.getState().getActiveProvider()).toBe('none');
    useConfigStore.getState().updateConfig({ ai: { provider: 'azure' } });
    expect(useConfigStore.getState().getActiveProvider()).toBe('azure');
  });
});

// ─── Test Status Setters ────────────────────────────────────

describe('test status setters', () => {
  it('setGitlabTestStatus', () => {
    useConfigStore.getState().setGitlabTestStatus({ success: true, message: 'Connected' });
    expect(useConfigStore.getState().gitlabTestStatus).toEqual({ success: true, message: 'Connected' });
  });

  it('setAzureTestStatus', () => {
    useConfigStore.getState().setAzureTestStatus({ success: false, message: 'Auth failed' });
    expect(useConfigStore.getState().azureTestStatus).toEqual({ success: false, message: 'Auth failed' });
  });

  it('setOpenaiTestStatus', () => {
    useConfigStore.getState().setOpenaiTestStatus({ success: true, message: 'OK' });
    expect(useConfigStore.getState().openaiTestStatus).toEqual({ success: true, message: 'OK' });
  });
});

// ─── localStorage round-trip ────────────────────────────────

describe('localStorage persistence', () => {
  it('loadFromStorage with no stored data keeps DEFAULT_CONFIG', () => {
    useConfigStore.getState().loadFromStorage();
    expect(useConfigStore.getState().config).toEqual(DEFAULT_CONFIG);
  });

  it('saveToStorage writes to localStorage', () => {
    useConfigStore.getState().updateConfig({ ai: { provider: 'azure' } });
    useConfigStore.getState().saveToStorage();
    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.ai.provider).toBe('azure');
  });

  it('loadFromStorage with valid JSON restores config', () => {
    const custom = { ...DEFAULT_CONFIG, ai: { ...DEFAULT_CONFIG.ai, provider: 'openai' as const } };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
    useConfigStore.getState().loadFromStorage();
    expect(useConfigStore.getState().config.ai.provider).toBe('openai');
  });

  it('loadFromStorage with invalid JSON falls back to DEFAULT_CONFIG', () => {
    localStorage.setItem(STORAGE_KEY, '{{not valid json');
    useConfigStore.getState().loadFromStorage();
    expect(useConfigStore.getState().config).toEqual(DEFAULT_CONFIG);
  });

  it('round-trip: save then load preserves config', () => {
    useConfigStore.getState().updateConfig({
      ai: { provider: 'azure', azure: { apiKey: 'round-trip-key' } },
      gitlab: { enabled: true, accessToken: 'glpat-abc' },
    });
    useConfigStore.getState().saveToStorage();

    // Reset store to defaults
    useConfigStore.setState(useConfigStore.getInitialState());
    expect(useConfigStore.getState().config.ai.provider).toBe('none');

    // Load back
    useConfigStore.getState().loadFromStorage();
    const config = useConfigStore.getState().config;
    expect(config.ai.provider).toBe('azure');
    expect(config.ai.azure.apiKey).toBe('round-trip-key');
    expect(config.gitlab.enabled).toBe(true);
    expect(config.gitlab.accessToken).toBe('glpat-abc');
  });
});
