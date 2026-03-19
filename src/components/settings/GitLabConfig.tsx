/**
 * GitLabConfig — Phase 7 (T-7.3).
 *
 * Configuration panel for GitLab integration.
 * Supports PAT authentication (OAuth placeholder for future).
 * Reads/writes to configStore, tests connection via gitlabClient.
 */

import { useState } from 'react';
import { useConfigStore } from '@/stores/configStore';
import { useUiStore } from '@/stores/uiStore';
import { testGitLabConnection } from '@/services/gitlab/gitlabClient';
import type { GitLabAuthMode } from '@/domain/configTypes';
import { ConnectionTestButton } from './ConnectionTestButton';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

// ─── Styles ────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 400,
  color: 'var(--col-text-subtle, #888)',
  fontFamily: F,
  marginBottom: '4px',
  display: 'block',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '0.375rem',
  border: '1px solid var(--col-border, #ccc)',
  fontSize: '13px',
  fontWeight: 300,
  fontFamily: F,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--col-bg-surface, #fff)',
  color: 'var(--col-text, #222)',
};

const toggleBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: '6px 16px',
  fontSize: '12px',
  fontFamily: F,
  fontWeight: active ? 500 : 400,
  border: '1px solid var(--col-border, #ccc)',
  background: active ? 'var(--col-bg-active, #f0f0f0)' : 'var(--col-bg-surface, #fff)',
  color: active ? 'var(--col-text, #222)' : 'var(--col-text-subtle, #888)',
  cursor: 'pointer',
  outline: 'none',
});

// ─── Component ─────────────────────────────────────────────

export function GitLabConfig() {
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const addToast = useUiStore((s) => s.addToast);

  const [showToken, setShowToken] = useState(false);

  const authMode = config.gitlab.authMode;

  const handleAuthModeChange = (mode: GitLabAuthMode) => {
    updateConfig({ gitlab: { authMode: mode } });
  };

  const handleTestConnection = async (): Promise<{ success: boolean; error?: string }> => {
    // Enable gitlab for the test
    if (!config.gitlab.enabled) {
      updateConfig({ gitlab: { enabled: true } });
    }
    const testConfig = { ...config.gitlab, enabled: true };
    const result = await testGitLabConnection(testConfig);
    if (result.success) {
      addToast({ type: 'success', title: 'GitLab connected successfully' });
    } else {
      addToast({ type: 'error', title: result.error ?? 'GitLab connection failed' });
    }
    return result;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} data-testid="gitlab-config">
      {/* Auth mode toggle */}
      <div>
        <label style={labelStyle}>Authentication Mode</label>
        <div style={{ display: 'flex' }}>
          <button
            type="button"
            style={{
              ...toggleBtnStyle(authMode === 'pat'),
              borderRadius: '0.375rem 0 0 0.375rem',
            }}
            onClick={() => handleAuthModeChange('pat')}
            data-testid="gitlab-auth-pat"
          >
            PAT
          </button>
          <button
            type="button"
            style={{
              ...toggleBtnStyle(authMode === 'oauth'),
              borderRadius: '0 0.375rem 0.375rem 0',
              borderLeft: 'none',
            }}
            onClick={() => handleAuthModeChange('oauth')}
            data-testid="gitlab-auth-oauth"
          >
            OAuth
          </button>
        </div>
      </div>

      {/* PAT token */}
      {authMode === 'pat' && (
        <div>
          <label style={labelStyle}>Personal Access Token</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showToken ? 'text' : 'password'}
              style={{ ...inputStyle, paddingRight: '60px' }}
              value={config.gitlab.accessToken}
              onChange={(e) => updateConfig({ gitlab: { accessToken: e.target.value } })}
              placeholder="glpat-..."
              data-testid="gitlab-token"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                color: 'var(--col-text-subtle, #888)',
                fontFamily: F,
              }}
              data-testid="gitlab-token-toggle"
            >
              {showToken ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
      )}

      {/* OAuth placeholder */}
      {authMode === 'oauth' && (
        <div
          style={{ fontSize: '13px', color: 'var(--col-text-subtle, #888)', fontFamily: F }}
          data-testid="gitlab-oauth-placeholder"
        >
          OAuth integration coming soon. Please use PAT for now.
        </div>
      )}

      {/* Root Group ID */}
      <div>
        <label style={labelStyle}>Root Group ID</label>
        <input
          type="text"
          style={inputStyle}
          value={config.gitlab.rootGroupId}
          onChange={(e) => updateConfig({ gitlab: { rootGroupId: e.target.value } })}
          placeholder="12345"
          data-testid="gitlab-group-id"
        />
      </div>

      {/* Test connection */}
      <ConnectionTestButton onTest={handleTestConnection} />
    </div>
  );
}
