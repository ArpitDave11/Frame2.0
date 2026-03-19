/**
 * SettingsPanel — Phase 7 (T-7.1).
 *
 * Tabbed settings panel with AI Provider and GitLab configuration.
 * Renders inside the Settings modal via ModalHost.
 * Pixel-matched to prototype App.tsx lines 322-353.
 */

import { useState } from 'react';
import { AIProviderConfig } from './AIProviderConfig';
import { GitLabConfig } from './GitLabConfig';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

type SettingsTab = 'ai' | 'gitlab';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'ai', label: 'AI Provider' },
  { id: 'gitlab', label: 'GitLab' },
];

export function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai');

  return (
    <div data-testid="settings-panel">
      {/* Tab bar — matching prototype */}
      <div
        data-testid="settings-tab-bar"
        style={{
          display: 'flex',
          gap: 0,
          marginBottom: 20,
          borderBottom: '1px solid var(--col-border-illustrative)',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              data-testid={`settings-tab-${tab.id}`}
              style={{
                padding: '8px 20px',
                border: 'none',
                borderBottom: isActive
                  ? '2px solid var(--col-background-brand)'
                  : '2px solid transparent',
                background: 'transparent',
                color: isActive ? 'var(--col-text-primary)' : 'var(--col-text-subtle)',
                fontSize: 13,
                fontWeight: isActive ? 400 : 300,
                cursor: 'pointer',
                fontFamily: F,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'ai' && <AIProviderConfig />}
      {activeTab === 'gitlab' && <GitLabConfig />}
    </div>
  );
}
