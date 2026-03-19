/**
 * GitLabConfig — Phase 7 (T-7.3).
 *
 * Configuration panel for GitLab integration.
 * PAT token, root group ID, base URL (read-only), connection test.
 * Reads/writes to configStore, tests connection via gitlabClient.
 */

import { useState } from 'react';
import { useConfigStore } from '@/stores/configStore';
import { useUiStore } from '@/stores/uiStore';
import { testGitLabConnection } from '@/services/gitlab/gitlabClient';
import type { GitLabAuthMode } from '@/domain/configTypes';
import { ConnectionTestButton } from './ConnectionTestButton';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 400,
  color: 'var(--col-text-subtle)',
  fontFamily: F,
  marginBottom: 4,
  display: 'block',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '0.375rem',
  border: '1px solid var(--col-border-illustrative)',
  fontSize: 13,
  fontWeight: 300,
  fontFamily: F,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} data-testid="gitlab-config">
      {/* Auth mode toggle */}
      <div>
        <label style={labelStyle}>Authentication Mode</label>
        <div style={{ display: 'flex' }}>
          {(['pat', 'oauth'] as GitLabAuthMode[]).map((mode, i) => (
            <button
              key={mode}
              type="button"
              onClick={() => handleAuthModeChange(mode)}
              data-testid={`gitlab-auth-${mode}`}
              style={{
                padding: '6px 16px',
                fontSize: 12,
                fontFamily: F,
                fontWeight: authMode === mode ? 500 : 300,
                border: '1px solid var(--col-border-illustrative)',
                borderLeft: i > 0 ? 'none' : undefined,
                borderRadius: i === 0 ? '0.375rem 0 0 0.375rem' : '0 0.375rem 0.375rem 0',
                background: authMode === mode ? 'var(--input-background)' : 'var(--col-background-ui-10)',
                color: authMode === mode ? 'var(--col-text-primary)' : 'var(--col-text-subtle)',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {mode.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* PAT token */}
      {authMode === 'pat' && (
        <div>
          <label style={labelStyle}>Personal Access Token</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showToken ? 'text' : 'password'}
              style={{ ...inputStyle, paddingRight: 60 }}
              value={config.gitlab.accessToken}
              onChange={(e) => updateConfig({ gitlab: { accessToken: e.target.value } })}
              placeholder="glpat-..."
              data-testid="gitlab-token"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              data-testid="gitlab-token-toggle"
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                color: 'var(--col-text-subtle)',
                fontFamily: F,
              }}
            >
              {showToken ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
      )}

      {/* OAuth placeholder */}
      {authMode === 'oauth' && (
        <div
          style={{ fontSize: 13, color: 'var(--col-text-subtle)', fontFamily: F }}
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
          placeholder="e.g., 12345"
          data-testid="gitlab-group-id"
        />
      </div>

      {/* Base URL (read-only, from environment) */}
      <div>
        <label style={labelStyle}>GitLab Base URL</label>
        <input
          type="text"
          style={{ ...inputStyle, background: 'var(--input-background)', color: 'var(--col-text-subtle)' }}
          value={config.endpoints.gitlabBaseUrl}
          readOnly
          data-testid="gitlab-base-url"
        />
        <span style={{ fontSize: 11, fontWeight: 300, color: 'var(--col-text-subtle)', fontFamily: F, marginTop: 4, display: 'block' }}>
          Configure via environment variables (.env)
        </span>
      </div>

      {/* Test connection */}
      <ConnectionTestButton onTest={handleTestConnection} />
    </div>
  );
}
