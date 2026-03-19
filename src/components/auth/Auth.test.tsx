/**
 * Tests for Phase 15 — Authentication components.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MockAuthProvider } from './MockAuthProvider';
import { AuthGuard } from './AuthGuard';
import { UserMenu } from './UserMenu';
import { useAuth, AuthContext, type AuthContextValue } from './AuthContext';

// ─── Helper: wrap children with a custom auth value ───────────

function TestAuthProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: AuthContextValue;
}) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function makeAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    isAuthenticated: true,
    user: { name: 'Dev User', email: 'dev.user@ubs.com', initials: 'DU' },
    login: vi.fn(async () => {}),
    logout: vi.fn(),
    isLoading: false,
    ...overrides,
  };
}

// ─── MockAuthProvider ──────────────────────────────────────────

describe('MockAuthProvider', () => {
  it('auto-authenticates with isAuthenticated true', () => {
    function Consumer() {
      const { isAuthenticated } = useAuth();
      return <span data-testid="val">{String(isAuthenticated)}</span>;
    }
    render(
      <MockAuthProvider>
        <Consumer />
      </MockAuthProvider>,
    );
    expect(screen.getByTestId('val').textContent).toBe('true');
  });

  it('provides a user with name', () => {
    function Consumer() {
      const { user } = useAuth();
      return <span data-testid="name">{user?.name}</span>;
    }
    render(
      <MockAuthProvider>
        <Consumer />
      </MockAuthProvider>,
    );
    expect(screen.getByTestId('name').textContent).toBe('Dev User');
  });
});

// ─── AuthGuard ────────────────────────────────────────────────

describe('AuthGuard', () => {
  it('shows children when authenticated', () => {
    render(
      <TestAuthProvider value={makeAuthValue()}>
        <AuthGuard>
          <div data-testid="protected">Secret</div>
        </AuthGuard>
      </TestAuthProvider>,
    );
    expect(screen.getByTestId('protected')).toBeDefined();
  });

  it('shows login screen when not authenticated', () => {
    render(
      <TestAuthProvider value={makeAuthValue({ isAuthenticated: false })}>
        <AuthGuard>
          <div data-testid="protected">Secret</div>
        </AuthGuard>
      </TestAuthProvider>,
    );
    expect(screen.getByTestId('login-screen')).toBeDefined();
    expect(screen.queryByTestId('protected')).toBeNull();
  });

  it('shows loading screen when isLoading is true', () => {
    render(
      <TestAuthProvider value={makeAuthValue({ isLoading: true, isAuthenticated: false })}>
        <AuthGuard>
          <div data-testid="protected">Secret</div>
        </AuthGuard>
      </TestAuthProvider>,
    );
    expect(screen.getByTestId('auth-loading')).toBeDefined();
    expect(screen.queryByTestId('protected')).toBeNull();
  });

  it('login button calls login function', () => {
    const login = vi.fn(async () => {});
    render(
      <TestAuthProvider value={makeAuthValue({ isAuthenticated: false, login })}>
        <AuthGuard>
          <div>Secret</div>
        </AuthGuard>
      </TestAuthProvider>,
    );
    fireEvent.click(screen.getByTestId('login-btn'));
    expect(login).toHaveBeenCalledTimes(1);
  });
});

// ─── UserMenu ─────────────────────────────────────────────────

describe('UserMenu', () => {
  it('shows user initials', () => {
    render(
      <TestAuthProvider value={makeAuthValue()}>
        <UserMenu />
      </TestAuthProvider>,
    );
    expect(screen.getByTestId('user-menu-btn').textContent).toBe('DU');
  });

  it('click opens dropdown', () => {
    render(
      <TestAuthProvider value={makeAuthValue()}>
        <UserMenu />
      </TestAuthProvider>,
    );
    expect(screen.queryByTestId('user-dropdown')).toBeNull();
    fireEvent.click(screen.getByTestId('user-menu-btn'));
    expect(screen.getByTestId('user-dropdown')).toBeDefined();
  });

  it('dropdown shows user name and email', () => {
    render(
      <TestAuthProvider value={makeAuthValue()}>
        <UserMenu />
      </TestAuthProvider>,
    );
    fireEvent.click(screen.getByTestId('user-menu-btn'));
    expect(screen.getByTestId('user-name').textContent).toBe('Dev User');
    expect(screen.getByTestId('user-email').textContent).toBe('dev.user@ubs.com');
  });

  it('sign out button calls logout', () => {
    const logout = vi.fn();
    render(
      <TestAuthProvider value={makeAuthValue({ logout })}>
        <UserMenu />
      </TestAuthProvider>,
    );
    fireEvent.click(screen.getByTestId('user-menu-btn'));
    fireEvent.click(screen.getByTestId('sign-out-btn'));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('returns null when user is null', () => {
    const { container } = render(
      <TestAuthProvider value={makeAuthValue({ user: null })}>
        <UserMenu />
      </TestAuthProvider>,
    );
    expect(container.innerHTML).toBe('');
  });
});

// ─── useAuth hook ─────────────────────────────────────────────

describe('useAuth', () => {
  it('throws when used outside provider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within AuthProvider');
  });
});
