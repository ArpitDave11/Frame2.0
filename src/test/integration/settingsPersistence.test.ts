/**
 * Integration Test — Settings persistence via localStorage (T-16.3).
 *
 * Verifies that config changes survive save/load cycles through localStorage,
 * including deep merge behavior and schema evolution safety.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useConfigStore } from '@/stores/configStore';
import { DEFAULT_CONFIG } from '@/domain/configTypes';

// ─── Reset ──────────────────────────────────────────────────

beforeEach(() => {
  useConfigStore.setState(useConfigStore.getInitialState());
  localStorage.clear();
});

// ─── Tests ──────────────────────────────────────────────────

describe('Settings persistence via localStorage', () => {
  it('updateConfig -> saveToStorage -> loadFromStorage round-trips correctly', () => {
    const store = useConfigStore.getState();

    store.updateConfig({ ai: { provider: 'openai', openai: { apiKey: 'sk-test123', model: 'gpt-4o' } } });
    store.saveToStorage();

    // Reset store to defaults
    useConfigStore.setState(useConfigStore.getInitialState());
    expect(useConfigStore.getState().config.ai.provider).toBe('none');

    // Load from storage
    useConfigStore.getState().loadFromStorage();

    const loaded = useConfigStore.getState().config;
    expect(loaded.ai.provider).toBe('openai');
    expect(loaded.ai.openai.apiKey).toBe('sk-test123');
    expect(loaded.ai.openai.model).toBe('gpt-4o');
  });

  it('deep merge: updating nested ai.azure.endpoint preserves other fields', () => {
    const store = useConfigStore.getState();

    // Set azure config
    store.updateConfig({
      ai: {
        provider: 'azure',
        azure: {
          endpoint: 'https://myazure.openai.azure.com',
          apiKey: 'azure-key-123',
          deploymentName: 'gpt4-deploy',
        },
      },
    });

    // Now update only the endpoint
    useConfigStore.getState().updateConfig({
      ai: { azure: { endpoint: 'https://newazure.openai.azure.com' } },
    });

    const cfg = useConfigStore.getState().config;
    expect(cfg.ai.azure.endpoint).toBe('https://newazure.openai.azure.com');
    // Other fields preserved
    expect(cfg.ai.azure.apiKey).toBe('azure-key-123');
    expect(cfg.ai.azure.deploymentName).toBe('gpt4-deploy');
    expect(cfg.ai.provider).toBe('azure');
  });

  it('provider change persists across save/load cycle', () => {
    useConfigStore.getState().updateConfig({ ai: { provider: 'azure' } });
    useConfigStore.getState().saveToStorage();

    useConfigStore.setState(useConfigStore.getInitialState());
    useConfigStore.getState().loadFromStorage();

    expect(useConfigStore.getState().config.ai.provider).toBe('azure');
  });

  it('loadFromStorage with missing keys uses defaults (schema evolution)', () => {
    // Simulate old config that lacks some new fields
    const partialConfig = {
      ai: { provider: 'openai', openai: { apiKey: 'old-key' } },
      // No endpoints, no gitlab — simulates schema evolution
    };
    localStorage.setItem('epic-generator-config', JSON.stringify(partialConfig));

    useConfigStore.getState().loadFromStorage();

    const cfg = useConfigStore.getState().config;
    // Old value preserved
    expect(cfg.ai.provider).toBe('openai');
    expect(cfg.ai.openai.apiKey).toBe('old-key');
    // Defaults filled in for missing fields
    expect(cfg.endpoints.openaiBaseUrl).toBe(DEFAULT_CONFIG.endpoints.openaiBaseUrl);
    expect(cfg.gitlab.enabled).toBe(false);
    expect(cfg.ai.azure.apiVersion).toBe(DEFAULT_CONFIG.ai.azure.apiVersion);
  });

  it('clear localStorage -> loadFromStorage returns defaults', () => {
    // Set and save some config
    useConfigStore.getState().updateConfig({ ai: { provider: 'openai' } });
    useConfigStore.getState().saveToStorage();

    // Clear localStorage
    localStorage.clear();

    // Reset store and reload
    useConfigStore.setState(useConfigStore.getInitialState());
    useConfigStore.getState().loadFromStorage();

    const cfg = useConfigStore.getState().config;
    expect(cfg.ai.provider).toBe(DEFAULT_CONFIG.ai.provider);
    expect(cfg.ai.openai.apiKey).toBe(DEFAULT_CONFIG.ai.openai.apiKey);
  });

  it('loadFromStorage with invalid JSON resets to defaults', () => {
    localStorage.setItem('epic-generator-config', 'not-valid-json!!!');

    useConfigStore.getState().loadFromStorage();

    const cfg = useConfigStore.getState().config;
    expect(cfg.ai.provider).toBe(DEFAULT_CONFIG.ai.provider);
  });

  it('loadFromStorage with array JSON resets to defaults', () => {
    localStorage.setItem('epic-generator-config', '[1, 2, 3]');

    useConfigStore.getState().loadFromStorage();

    const cfg = useConfigStore.getState().config;
    expect(cfg.ai.provider).toBe(DEFAULT_CONFIG.ai.provider);
  });

  it('gitlab config persists across save/load cycle', () => {
    useConfigStore.getState().updateConfig({
      gitlab: {
        enabled: true,
        rootGroupId: '12345',
        accessToken: 'glpat-token',
        authMode: 'pat',
      },
    });
    useConfigStore.getState().saveToStorage();

    useConfigStore.setState(useConfigStore.getInitialState());
    useConfigStore.getState().loadFromStorage();

    const cfg = useConfigStore.getState().config;
    expect(cfg.gitlab.enabled).toBe(true);
    expect(cfg.gitlab.rootGroupId).toBe('12345');
    expect(cfg.gitlab.accessToken).toBe('glpat-token');
  });
});
