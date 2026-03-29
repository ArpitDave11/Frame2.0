/**
 * ErrorBoundary — Catches render errors per-view to prevent full app crash.
 *
 * Wraps each view in ViewRouter. On error: shows recovery UI with
 * "Try Again" button instead of blank white screen.
 */

import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

interface Props {
  viewName: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary] ${this.props.viewName} crashed:`, error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        data-testid="error-boundary"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          padding: 48,
          fontFamily: F,
          background: 'var(--col-background-ui-10, #fff)',
        }}
      >
        {/* Red accent bar */}
        <div style={{
          width: 32,
          height: 3,
          background: 'var(--col-background-brand, #E60000)',
          borderRadius: 2,
          marginBottom: 20,
        }} />

        <h2 style={{
          fontSize: 16,
          fontWeight: 500,
          color: 'var(--col-text-primary, #000)',
          margin: '0 0 8px 0',
          letterSpacing: '-0.01em',
        }}>
          {this.props.viewName} encountered an error
        </h2>

        <p style={{
          fontSize: 13,
          fontWeight: 300,
          color: 'var(--col-text-subtle, #666)',
          margin: '0 0 24px 0',
          maxWidth: 400,
          textAlign: 'center',
          lineHeight: 1.5,
        }}>
          {this.state.error?.message || 'An unexpected error occurred.'}
        </p>

        <button
          type="button"
          onClick={this.handleRetry}
          data-testid="error-boundary-retry"
          style={{
            padding: '8px 24px',
            fontSize: 13,
            fontWeight: 400,
            fontFamily: F,
            color: '#fff',
            background: 'var(--col-background-brand, #E60000)',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            letterSpacing: '0.01em',
            transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={(e) => { (e.currentTarget).style.opacity = '0.85'; }}
          onMouseLeave={(e) => { (e.currentTarget).style.opacity = '1'; }}
        >
          Try Again
        </button>

        {/* Collapsed error detail for debugging */}
        <details style={{ marginTop: 32, maxWidth: 500, width: '100%' }}>
          <summary style={{
            fontSize: 11,
            fontWeight: 300,
            color: 'var(--col-text-subtle, #888)',
            cursor: 'pointer',
            fontFamily: F,
          }}>
            Technical details
          </summary>
          <pre style={{
            marginTop: 8,
            padding: 12,
            background: 'var(--input-background, #F3F3F5)',
            borderRadius: 4,
            fontSize: 11,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            color: 'var(--col-text-subtle, #666)',
            overflow: 'auto',
            maxHeight: 120,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {this.state.error?.stack || this.state.error?.message || 'No details available'}
          </pre>
        </details>
      </div>
    );
  }
}
