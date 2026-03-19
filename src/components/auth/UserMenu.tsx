/**
 * UserMenu — Avatar + dropdown in workspace sidebar.
 *
 * Shows user initials in a branded circle. Click to reveal
 * a dropdown with user name, email, and sign-out action.
 */

import { useState, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function UserMenu() {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  if (!user) return null;

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        padding: '12px 8px',
        borderTop: '1px solid var(--col-border-illustrative, #E0E0E0)',
      }}
    >
      <button
        onClick={() => setShowMenu(!showMenu)}
        data-testid="user-menu-btn"
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: 'none',
          background: 'var(--col-background-brand, #E60000)',
          color: 'var(--col-text-inverted, #FFFFFF)',
          fontSize: '0.6875rem',
          fontWeight: 500,
          fontFamily: F,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
        }}
      >
        {user.initials}
      </button>

      {showMenu && (
        <div
          data-testid="user-dropdown"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 8,
            marginBottom: 4,
            background: '#FFFFFF',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)',
            border: '1px solid var(--col-border-illustrative, #E0E0E0)',
            minWidth: 200,
            padding: '8px 0',
            fontFamily: F,
            zIndex: 100,
          }}
        >
          <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--col-border-illustrative, #E0E0E0)' }}>
            <div
              data-testid="user-name"
              style={{
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: 'var(--col-text-primary, #000000)',
              }}
            >
              {user.name}
            </div>
            <div
              data-testid="user-email"
              style={{
                fontSize: '0.75rem',
                fontWeight: 300,
                color: 'var(--col-text-subtle, #666666)',
                marginTop: 2,
              }}
            >
              {user.email}
            </div>
          </div>

          <div style={{ padding: '4px 8px' }}>
            <button
              onClick={() => {
                logout();
                setShowMenu(false);
              }}
              data-testid="sign-out-btn"
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '0.8125rem',
                fontWeight: 400,
                fontFamily: F,
                color: 'var(--col-text-primary, #000000)',
                background: 'transparent',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--col-background-ui-10, #F5F5F5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
