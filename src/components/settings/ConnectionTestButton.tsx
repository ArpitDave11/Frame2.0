/**
 * ConnectionTestButton — Phase 7 (T-7.4).
 *
 * Shared button for testing service connections (AI providers, GitLab).
 * Displays idle → loading → success/failure states with auto-reset.
 */

import { useState } from 'react';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

// ─── Types ─────────────────────────────────────────────────

type TestState = 'idle' | 'loading' | 'success' | 'error';

export interface ConnectionTestButtonProps {
  onTest: () => Promise<{ success: boolean; error?: string }>;
  label?: string;
}

// ─── Component ─────────────────────────────────────────────

export function ConnectionTestButton({ onTest, label = 'Test connection' }: ConnectionTestButtonProps) {
  const [state, setState] = useState<TestState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleClick = async () => {
    if (state === 'loading') return;
    setState('loading');
    setErrorMsg('');

    try {
      const result = await onTest();
      if (result.success) {
        setState('success');
        setTimeout(() => setState('idle'), 2000);
      } else {
        setErrorMsg(result.error ?? 'Connection failed');
        setState('error');
        setTimeout(() => {
          setState('idle');
          setErrorMsg('');
        }, 3000);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setState('error');
      setTimeout(() => {
        setState('idle');
        setErrorMsg('');
      }, 3000);
    }
  };

  const baseStyle: React.CSSProperties = {
    alignSelf: 'flex-start',
    padding: '7px 18px',
    border: '1px solid var(--col-border, #ccc)',
    borderRadius: '0.375rem',
    fontSize: '13px',
    fontFamily: F,
    fontWeight: 400,
    cursor: state === 'loading' ? 'not-allowed' : 'pointer',
    background: 'var(--col-bg-surface, #fff)',
    color: 'var(--col-text, #222)',
    outline: 'none',
    transition: 'border-color 0.15s, color 0.15s',
  };

  if (state === 'loading') {
    return (
      <button
        type="button"
        style={{ ...baseStyle, color: 'var(--col-text-subtle, #888)' }}
        disabled
        data-testid="connection-test-btn"
      >
        Testing...
      </button>
    );
  }

  if (state === 'success') {
    return (
      <span
        style={{ ...baseStyle, color: 'green', border: '1px solid green', display: 'inline-block' }}
        data-testid="connection-test-success"
      >
        Connected ✓
      </span>
    );
  }

  if (state === 'error') {
    return (
      <div style={{ alignSelf: 'flex-start' }}>
        <button
          type="button"
          style={{ ...baseStyle, borderColor: 'red', color: 'red' }}
          disabled
          data-testid="connection-test-error"
        >
          {label}
        </button>
        {errorMsg && (
          <div
            style={{ color: 'red', fontSize: '12px', marginTop: '4px', fontFamily: F }}
            data-testid="connection-test-error-msg"
          >
            {errorMsg}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      style={baseStyle}
      onClick={handleClick}
      data-testid="connection-test-btn"
    >
      {label}
    </button>
  );
}
