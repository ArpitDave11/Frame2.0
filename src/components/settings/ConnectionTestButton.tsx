/**
 * ConnectionTestButton — Phase 7 (T-7.4).
 *
 * Shared button for testing service connections (AI providers, GitLab).
 * States: idle → testing → success/error → idle (auto-reset).
 * Pixel-matched to prototype App.tsx lines 411-426.
 */

import { useState } from 'react';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

type TestState = 'idle' | 'testing' | 'success' | 'error';

export interface ConnectionTestButtonProps {
  onTest: () => Promise<{ success: boolean; error?: string }>;
  label?: string;
}

export function ConnectionTestButton({ onTest, label = 'Test connection' }: ConnectionTestButtonProps) {
  const [state, setState] = useState<TestState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleClick = async () => {
    if (state === 'testing') return;
    setState('testing');
    setErrorMsg('');

    try {
      const result = await onTest();
      if (result.success) {
        setState('success');
        setTimeout(() => setState('idle'), 3000);
      } else {
        setErrorMsg(result.error ?? 'Connection failed');
        setState('error');
        setTimeout(() => { setState('idle'); setErrorMsg(''); }, 5000);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setState('error');
      setTimeout(() => { setState('idle'); setErrorMsg(''); }, 5000);
    }
  };

  const base: React.CSSProperties = {
    alignSelf: 'flex-start',
    padding: '7px 18px',
    borderRadius: '0.375rem',
    fontSize: 13,
    fontFamily: F,
    fontWeight: 400,
    outline: 'none',
    transition: 'all 0.15s ease',
  };

  if (state === 'testing') {
    return (
      <button
        type="button"
        style={{
          ...base,
          border: '1px solid var(--col-border-illustrative)',
          background: 'var(--col-background-ui-10)',
          color: 'var(--col-text-subtle)',
          cursor: 'not-allowed',
        }}
        disabled
        data-testid="connection-test-btn"
      >
        Testing…
      </button>
    );
  }

  if (state === 'success') {
    return (
      <button
        type="button"
        style={{
          ...base,
          border: '1px solid #bbf7d0',
          background: '#f0fdf4',
          color: '#166534',
          cursor: 'default',
        }}
        disabled
        data-testid="connection-test-btn"
      >
        Connected ✓
      </button>
    );
  }

  if (state === 'error') {
    return (
      <div style={{ alignSelf: 'flex-start' }}>
        <button
          type="button"
          style={{
            ...base,
            border: '1px solid #fecaca',
            background: '#fef2f2',
            color: '#991b1b',
            cursor: 'default',
          }}
          disabled
          data-testid="connection-test-btn"
        >
          {label}
        </button>
        {errorMsg && (
          <div
            style={{ color: '#991b1b', fontSize: 12, marginTop: 4, fontFamily: F, fontWeight: 300 }}
            data-testid="connection-test-error-msg"
          >
            {errorMsg}
          </div>
        )}
      </div>
    );
  }

  // Idle
  return (
    <button
      type="button"
      style={{
        ...base,
        border: '1px solid var(--col-border-illustrative)',
        background: 'var(--col-background-ui-10)',
        color: 'var(--col-text-primary)',
        cursor: 'pointer',
      }}
      onClick={handleClick}
      data-testid="connection-test-btn"
    >
      {label}
    </button>
  );
}
