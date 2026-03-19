/**
 * Welcome Sidebar — Landing page navigation.
 *
 * 5 sections that scroll the welcome content to corresponding anchors.
 * Collapsible: 220px (open) ↔ 56px (icon-only).
 * UBS logo + FRAME branding at top.
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

// ─── Section Config ─────────────────────────────────────────

interface SidebarSection {
  id: string;
  label: string;
  icon: Icon;
}

const SECTIONS: SidebarSection[] = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'actions', label: 'What You Can Do', icon: Target },
  { id: 'lifecycle', label: 'Epic Lifecycle', icon: Path },
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
        background: 'var(--ubs-color-background-ui-10)',
        borderRight: '1px solid var(--ubs-color-border-illustrative)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* Logo Area */}
      <div
        style={{
          padding: 16,
          borderBottom: '1px solid var(--ubs-color-border-illustrative)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minHeight: 56,
        }}
      >
        <img
          src={ubsLogo}
          alt="UBS Logo"
          data-testid="ubs-logo"
          style={{ width: isOpen ? 83 : 40, height: 'auto', transition: 'width 0.2s ease' }}
        />
        {isOpen && (
          <span
            data-testid="frame-text"
            style={{ fontWeight: 700, fontSize: 16, letterSpacing: 1.5, color: 'var(--ubs-color-text-primary)' }}
          >
            FRAME
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
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
                width: '100%',
                height: 38,
                padding: isOpen ? '0 12px' : '0 8px',
                background: isActive ? 'var(--ubs-color-input-background)' : 'transparent',
                color: isActive ? 'var(--ubs-color-text-primary)' : 'var(--ubs-color-text-subtle)',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: isActive ? 400 : 300,
                textAlign: 'left',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              <IconComponent size={16} weight={isActive ? 'fill' : 'regular'} />
              {isOpen && section.label}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--ubs-color-border-illustrative)' }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          data-testid="collapse-toggle"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            height: 38,
            padding: isOpen ? '0 12px' : '0 8px',
            background: 'transparent',
            color: 'var(--ubs-color-text-subtle)',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 300,
          }}
        >
          <List size={16} />
          {isOpen && 'Collapse'}
        </button>
      </div>
    </aside>
  );
}
