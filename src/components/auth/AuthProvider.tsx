/**
 * AuthProvider — Top-level authentication wrapper.
 *
 * In production with real Azure AD config, this would use MsalProvider.
 * For development and until Azure AD is configured, delegates to MockAuthProvider.
 */

import type { ReactNode } from 'react';
import { MockAuthProvider } from './MockAuthProvider';

export function AuthProvider({ children }: { children: ReactNode }) {
  // Future: check for Azure AD config in environment
  // const hasAzureConfig = !!import.meta.env.VITE_AZURE_AD_CLIENT_ID;
  // if (hasAzureConfig) return <MsalAuthProvider>{children}</MsalAuthProvider>;

  return <MockAuthProvider>{children}</MockAuthProvider>;
}
