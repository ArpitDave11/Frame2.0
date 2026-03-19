/**
 * SettingsPanel — Phase 7 (T-7.1).
 *
 * Tabbed settings panel with AI Provider and GitLab configuration.
 * Renders inside the Settings modal via ModalHost.
 */

import { useState } from 'react';
import { AIProviderConfig } from './AIProviderConfig';
import { GitLabConfig } from './GitLabConfig';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

type SettingsTab = 'ai' | 'gitlab';

// ─── Styles ────────────────────────────────────────────────

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid var(--col-border, #ccc)',
  marginBottom: '16px',
  gap: 0,
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 20px',
  fontSize: '13px',
  fontWeight: active ? 500 : 400,
  fontFamily: F,
  color: active ? 'var(--col-text, #222)' : 'var(--col-text-subtle, #888)',
  background: 'none',
  border: 'none',
  borderBottom: active ? '2px solid red' : '2px solid transparent',
  cursor: 'pointer',
  outline: 'none',
  marginBottom: '-1px',
});

// ─── Component ─────────────────────────────────────────────

export function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai');

  return (
    <div data-testid="settings-panel">
      {/* Tab bar */}
      <div style={tabBarStyle} data-testid="settings-tab-bar">
        <button
          type="button"
          style={tabStyle(activeTab === 'ai')}
          onClick={() => setActiveTab('ai')}
          data-testid="settings-tab-ai"
        >
          AI Provider
        </button>
        <button
          type="button"
          style={tabStyle(activeTab === 'gitlab')}
          onClick={() => setActiveTab('gitlab')}
          data-testid="settings-tab-gitlab"
        >
          GitLab
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'ai' && <AIProviderConfig />}
      {activeTab === 'gitlab' && <GitLabConfig />}
    </div>
  );
}
