/**
 * Welcome Sidebar — Landing page navigation.
 *
 * 5 sections that scroll the welcome content to corresponding anchors.
 * Collapsible: 220px (open) ↔ 56px (icon-only).
 * UBS logo + FRAME branding at top.
 * Pixel-matched to UI_Prototype Sidebar.tsx style conventions.
 */

import { useState, useCallback } from 'react';
import {
  House,
  Target,
  Path,
  SquaresFour,
  RocketLaunch,
  List,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import ubsLogo from '@/assets/00ac1239b9b421f7eee8b4e260132b1ac860676a.png';
import { UserMenu } from '@/components/auth/UserMenu';

// ─── Section Config ─────────────────────────────────────────

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

interface SidebarSection {
  id: string;
  label: string;
  icon: Icon;
}

const SECTIONS: SidebarSection[] = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'actions', label: 'What You Can Do', icon: Target },
  { id: 'lifecycle', label: 'Model Lifecycle', icon: Path },
  { id: 'templates', label: 'Templates', icon: SquaresFour },
  { id: 'quickstart', label: 'Get Started', icon: RocketLaunch },
];

// ─── Component ──────────────────────────────────────────────

export function WelcomeSidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('home');

  const handleNavClick = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    const el = document.getElementById(sectionId);
    el?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const width = isOpen ? 220 : 56;

  return (
    <aside
      data-testid="welcome-sidebar"
      style={{
        width,
        minWidth: width,
        background: 'var(--col-background-ui-10)',
        borderRight: '1px solid var(--col-border-illustrative)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        transition: 'width 0.2s ease, min-width 0.2s ease',
        fontFamily: F,
        overflow: 'hidden',
      }}
    >
      {/* Logo Area */}
      <div
        style={{
          padding: '16px 12px',
          borderBottom: '1px solid var(--col-border-illustrative)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isOpen ? 'flex-start' : 'center',
          gap: isOpen ? 6 : 0,
          marginRight: isOpen ? 8 : 0,
          minHeight: 56,
        }}
      >
        <img
          src={ubsLogo}
          alt="UBS Logo"
          data-testid="ubs-logo"
          style={{
            width: isOpen ? 83 : 40,
            minWidth: isOpen ? 83 : 40,
            height: 'auto',
            transition: 'width 0.2s ease',
          }}
        />
        {isOpen && (
          <span
            data-testid="frame-text"
            style={{
              fontSize: '0.8125rem',
              fontWeight: 300,
              color: 'var(--col-text-subtle)',
              letterSpacing: '0.02em',
            }}
          >
            FRAME
          </span>
        )}
      </div>

      {/* Navigation */}
      <div style={{ padding: '12px 8px', gap: 2, display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Collapse Button — top of nav (matching prototype placement) */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          data-testid="collapse-toggle"
          style={{
            width: '100%',
            height: 36,
            borderRadius: '0.375rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isOpen ? 'flex-start' : 'center',
            padding: isOpen ? '0 12px' : '0',
            gap: 10,
            color: 'var(--col-text-subtle)',
            marginBottom: 8,
            fontFamily: F,
            fontSize: 12,
          }}
        >
          <List size={16} weight="regular" />
          {isOpen && <span style={{ fontWeight: 300 }}>Collapse</span>}
        </button>

        {/* Nav Items */}
        {SECTIONS.map((section) => {
          const IconComponent = section.icon;
          const isActive = activeSection === section.id;

          return (
            <button
              key={section.id}
              onClick={() => handleNavClick(section.id)}
              data-testid={`welcome-nav-${section.id}`}
              title={isOpen ? undefined : section.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: isOpen ? '8px 12px' : '8px 0',
                justifyContent: isOpen ? 'flex-start' : 'center',
                width: '100%',
                height: 38,
                border: 'none',
                borderRadius: '0.375rem',
                background: isActive ? 'var(--input-background)' : 'transparent',
                color: isActive ? 'var(--col-text-primary)' : 'var(--col-text-subtle)',
                cursor: 'pointer',
                fontSize: 13,
                fontFamily: F,
                fontWeight: isActive ? 400 : 300,
                textAlign: 'left',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                transition: 'all .12s',
              }}
            >
              <IconComponent size={16} weight={isActive ? 'fill' : 'regular'} />
              {isOpen && <span>{section.label}</span>}
            </button>
          );
        })}
      </div>

      {/* User Menu — pinned to bottom */}
      <UserMenu />
    </aside>
  );
}
