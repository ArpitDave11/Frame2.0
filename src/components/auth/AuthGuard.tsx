/**
 * AuthGuard — Route protection component.
 *
 * Shows a loading spinner while auth initialises,
 * a branded login screen when unauthenticated,
 * or the wrapped children when authenticated.
 */

import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import ubsLogo from '@/assets/00ac1239b9b421f7eee8b4e260132b1ac860676a.png';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

// ─── Loading Screen ───────────────────────────────────────────

function LoadingScreen() {
  return (
    <div
      data-testid="auth-loading"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#f7f7f5',
        fontFamily: F,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: '3px solid var(--col-border-illustrative, #E0E0E0)',
          borderTopColor: 'var(--col-background-brand, #E60000)',
          borderRadius: '50%',
          animation: 'auth-spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes auth-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: () => Promise<void> }) {
  return (
    <div
      data-testid="login-screen"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#f7f7f5',
        fontFamily: F,
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 10,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
          maxWidth: 400,
          width: '100%',
          padding: '48px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <img src={ubsLogo} alt="UBS" style={{ width: 80, height: 'auto' }} />

        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: 'var(--col-text-primary, #000000)',
              margin: '0 0 8px 0',
              letterSpacing: '0.04em',
            }}
          >
            FRAME
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              fontWeight: 300,
              color: 'var(--col-text-subtle, #666666)',
              margin: 0,
            }}
          >
            Sign in to continue
          </p>
        </div>

        <button
          onClick={onLogin}
          data-testid="login-btn"
          style={{
            width: '100%',
            padding: '12px 24px',
            fontSize: '0.875rem',
            fontWeight: 500,
            fontFamily: F,
            color: 'var(--col-text-inverted, #FFFFFF)',
            background: 'var(--col-background-brand, #E60000)',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#CC0000';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background =
              'var(--col-background-brand, #E60000)';
          }}
        >
          Sign in with Azure AD
        </button>
      </div>
    </div>
  );
}

// ─── AuthGuard ────────────────────────────────────────────────

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, login } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={login} />;
  }

  return <>{children}</>;
}
