/**
 * Tests for SettingsPanel — Phase 7.
 *
 * Covers tab switching, active tab styling, provider dropdown,
 * conditional field rendering, and password field types.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPanel } from './SettingsPanel';
import { useConfigStore } from '@/stores/configStore';

beforeEach(() => {
  useConfigStore.setState(useConfigStore.getInitialState());
});

describe('SettingsPanel', () => {
  it('default tab is AI Provider', () => {
    render(<SettingsPanel />);
    expect(screen.getByTestId('ai-provider-config')).toBeDefined();
    expect(screen.queryByTestId('gitlab-config')).toBeNull();
  });

  it('clicking GitLab tab shows GitLab config', () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByTestId('settings-tab-gitlab'));
    expect(screen.getByTestId('gitlab-config')).toBeDefined();
    expect(screen.queryByTestId('ai-provider-config')).toBeNull();
  });

  it('clicking AI Provider tab returns to AI config', () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByTestId('settings-tab-gitlab'));
    fireEvent.click(screen.getByTestId('settings-tab-ai'));
    expect(screen.getByTestId('ai-provider-config')).toBeDefined();
    expect(screen.queryByTestId('gitlab-config')).toBeNull();
  });

  it('active tab has red underline', () => {
    render(<SettingsPanel />);
    const aiTab = screen.getByTestId('settings-tab-ai');
    const gitlabTab = screen.getByTestId('settings-tab-gitlab');

    expect(aiTab.style.borderBottom).toContain('red');
    expect(gitlabTab.style.borderBottom).toContain('transparent');

    fireEvent.click(gitlabTab);
    expect(gitlabTab.style.borderBottom).toContain('red');
    expect(aiTab.style.borderBottom).toContain('transparent');
  });

  it('provider dropdown shows Azure and OpenAI options', () => {
    render(<SettingsPanel />);
    const select = screen.getByTestId('ai-provider-select') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain('azure');
    expect(options).toContain('openai');
  });

  it('selecting Azure provider shows Azure-specific fields', () => {
    render(<SettingsPanel />);
    const select = screen.getByTestId('ai-provider-select');
    fireEvent.change(select, { target: { value: 'azure' } });
    expect(screen.getByTestId('azure-fields')).toBeDefined();
    expect(screen.getByTestId('azure-endpoint')).toBeDefined();
    expect(screen.getByTestId('azure-deployment')).toBeDefined();
    expect(screen.getByTestId('azure-api-key')).toBeDefined();
    expect(screen.getByTestId('azure-api-version')).toBeDefined();
    expect(screen.queryByTestId('openai-fields')).toBeNull();
  });

  it('selecting OpenAI provider shows OpenAI-specific fields', () => {
    render(<SettingsPanel />);
    const select = screen.getByTestId('ai-provider-select');
    fireEvent.change(select, { target: { value: 'openai' } });
    expect(screen.getByTestId('openai-fields')).toBeDefined();
    expect(screen.getByTestId('openai-api-key')).toBeDefined();
    expect(screen.getByTestId('openai-model')).toBeDefined();
    expect(screen.getByTestId('openai-base-url')).toBeDefined();
    expect(screen.queryByTestId('azure-fields')).toBeNull();
  });

  it('API key fields are type="password" by default', () => {
    render(<SettingsPanel />);
    const select = screen.getByTestId('ai-provider-select');

    // Azure key
    fireEvent.change(select, { target: { value: 'azure' } });
    const azureKey = screen.getByTestId('azure-api-key') as HTMLInputElement;
    expect(azureKey.type).toBe('password');

    // OpenAI key
    fireEvent.change(select, { target: { value: 'openai' } });
    const openaiKey = screen.getByTestId('openai-api-key') as HTMLInputElement;
    expect(openaiKey.type).toBe('password');
  });
});
