/**
 * AuthContext — Shared authentication state.
 *
 * Provides user identity, login/logout actions, and loading state.
 * Must be consumed inside an AuthProvider (Mock or MSAL).
 */

import { createContext, useContext } from 'react';

export interface AuthUser {
  name: string;
  email: string;
  initials: string;
}

export interface AuthContextValue {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: () => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
