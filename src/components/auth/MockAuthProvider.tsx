/**
 * MockAuthProvider — Development auth provider.
 *
 * Auto-authenticates with a mock UBS user.
 * Used during local development and until Azure AD is configured.
 */

import { useState, type ReactNode } from 'react';
import { AuthContext, type AuthUser } from './AuthContext';

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [user] = useState<AuthUser>({
    name: 'Dev User',
    email: 'dev.user@ubs.com',
    initials: 'DU',
  });

  const login = async () => setIsAuthenticated(true);
  const logout = () => setIsAuthenticated(false);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading: false }}>
      {children}
    </AuthContext.Provider>
  );
}
