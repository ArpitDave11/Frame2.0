/**
 * AIProviderConfig — Phase 7 (T-7.2).
 *
 * Configuration panel for AI providers (Azure OpenAI / OpenAI Direct).
 * Reads/writes to configStore, tests connection via service clients.
 */

import { useState } from 'react';
import { useConfigStore } from '@/stores/configStore';
import { useUiStore } from '@/stores/uiStore';
import { testAzure } from '@/services/ai/azureClient';
import { testOpenAI } from '@/services/ai/openaiClient';
import type { AIProvider } from '@/domain/configTypes';
import { AZURE_API_VERSIONS } from '@/domain/configTypes';
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

const fieldGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const hintStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 300,
  color: 'var(--col-text-subtle, #888)',
  fontFamily: F,
  marginTop: '4px',
  display: 'block',
};

// ─── Component ─────────────────────────────────────────────

export function AIProviderConfig() {
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const addToast = useUiStore((s) => s.addToast);

  const [showAzureKey, setShowAzureKey] = useState(false);

  const provider = config.ai.provider;

  const handleProviderChange = (value: string) => {
    updateConfig({ ai: { provider: value as AIProvider } });
  };

  const handleTestConnection = async (): Promise<{ success: boolean; error?: string }> => {
    if (provider === 'azure') {
      const result = await testAzure(config.ai.azure, config.endpoints.azureEndpoint);
      if (result.success) {
        addToast({ type: 'success', title: 'Azure OpenAI connected successfully' });
      } else {
        addToast({ type: 'error', title: result.error ?? 'Azure connection failed' });
      }
      return result;
    }
    if (provider === 'openai') {
      const result = await testOpenAI(config.ai.openai, config.endpoints.openaiBaseUrl);
      if (result.success) {
        addToast({ type: 'success', title: 'OpenAI connected successfully' });
      } else {
        addToast({ type: 'error', title: result.error ?? 'OpenAI connection failed' });
      }
      return result;
    }
    return { success: false, error: 'No provider selected' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} data-testid="ai-provider-config">
      {/* Provider select */}
      <div>
        <label style={labelStyle}>AI Provider</label>
        <select
          value={provider === 'none' ? '' : provider}
          onChange={(e) => handleProviderChange(e.target.value || 'none')}
          style={{ ...inputStyle, cursor: 'pointer' }}
          data-testid="ai-provider-select"
        >
          <option value="">Select a provider...</option>
          <option value="azure">Azure OpenAI</option>
        </select>
      </div>

      {/* Azure fields */}
      {provider === 'azure' && (
        <div style={fieldGroupStyle} data-testid="azure-fields">
          <div>
            <label style={labelStyle}>Endpoint</label>
            <input
              type="text"
              style={inputStyle}
              value={config.endpoints.azureEndpoint}
              onChange={(e) => updateConfig({ endpoints: { azureEndpoint: e.target.value } })}
              placeholder="https://your-resource.openai.azure.com"
              data-testid="azure-endpoint"
            />
            <span style={hintStyle}>Azure portal &rarr; your resource &rarr; Keys and Endpoint</span>
          </div>
          <div>
            <label style={labelStyle}>Deployment Name</label>
            <input
              type="text"
              style={inputStyle}
              value={config.ai.azure.deploymentName}
              onChange={(e) => updateConfig({ ai: { azure: { deploymentName: e.target.value } } })}
              placeholder="gpt-4"
              data-testid="azure-deployment"
            />
            <span style={hintStyle}>Azure portal &rarr; Model deployments &rarr; deployment name</span>
          </div>
          <div>
            <label style={labelStyle}>API Key</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showAzureKey ? 'text' : 'password'}
                style={{ ...inputStyle, paddingRight: '60px' }}
                value={config.ai.azure.apiKey}
                onChange={(e) => updateConfig({ ai: { azure: { apiKey: e.target.value } } })}
                placeholder="Enter API key"
                data-testid="azure-api-key"
                title="Azure portal → Keys and Endpoint → Key 1 or Key 2"
              />
              <button
                type="button"
                onClick={() => setShowAzureKey(!showAzureKey)}
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
                data-testid="azure-key-toggle"
              >
                {showAzureKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>API Version</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={config.ai.azure.apiVersion}
              onChange={(e) => updateConfig({ ai: { azure: { apiVersion: e.target.value } } })}
              data-testid="azure-api-version"
            >
              {AZURE_API_VERSIONS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          {/* Max Tokens + Temperature */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Max Tokens</label>
              <input
                type="number"
                style={inputStyle}
                value={config.ai.azure.maxTokens ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                  updateConfig({ ai: { azure: { maxTokens: val } } });
                }}
                placeholder="16384"
                min={1}
                max={128000}
                data-testid="azure-max-tokens"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Temperature</label>
              <input
                type="number"
                style={inputStyle}
                value={config.ai.azure.temperature ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? parseFloat(e.target.value) : undefined;
                  updateConfig({ ai: { azure: { temperature: val } } });
                }}
                placeholder="0.7"
                min={0}
                max={2}
                step={0.1}
                data-testid="azure-temperature"
              />
            </div>
          </div>
          <ConnectionTestButton onTest={handleTestConnection} />
        </div>
      )}

      {/* OpenAI Direct fields hidden — Azure-only for now */}
    </div>
  );
}
