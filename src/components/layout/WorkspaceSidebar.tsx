/**
 * Workspace Sidebar — Main app navigation.
 *
 * 5 items: Epic Planner, Issue Manager, Blueprints, Analytics, Settings.
 * Settings opens a modal instead of switching views.
 * UBS logo click returns to Welcome Screen.
 * Collapsible: 220px ↔ 56px, synced with uiStore.sidebarCollapsed.
 *
 * Pixel-matched to UI_Prototype Sidebar.tsx.
 */

import {
  ClipboardText,
  Kanban,
  SquaresFour,
  ChartBar,
  GearSix,
  List,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { useUiStore } from '@/stores/uiStore';
import type { TabId } from '@/stores/uiStore';
import ubsLogo from '@/assets/00ac1239b9b421f7eee8b4e260132b1ac860676a.png';
import { UserMenu } from '@/components/auth/UserMenu';

// ─── Navigation Config ──────────────────────────────────────

interface NavItem {
  id: string;
  icon: Icon;
  label: string;
  isModal?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'planner', icon: ClipboardText, label: 'Epic Planner' },
  { id: 'issues', icon: Kanban, label: 'Issue Manager' },
  { id: 'blueprint', icon: SquaresFour, label: 'Blueprints' },
  { id: 'analytics', icon: ChartBar, label: 'Analytics' },
  { id: 'settings', icon: GearSix, label: 'Settings', isModal: true },
];

const FONT = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

// ─── Component ──────────────────────────────────────────────

export function WorkspaceSidebar() {
  const activeTab = useUiStore((s) => s.activeTab);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const setActiveView = useUiStore((s) => s.setActiveView);
  const openModal = useUiStore((s) => s.openModal);

  const open = !sidebarCollapsed;
  const sW = open ? 220 : 56;

  const handleNav = (item: NavItem) => {
    if (item.isModal) {
      openModal('settings');
    } else {
      setActiveTab(item.id as TabId);
    }
  };

  return (
    <nav
      data-testid="workspace-sidebar"
      style={{
        width: sW,
        minWidth: sW,
        background: 'var(--col-background-ui-10)',
        borderRight: '1px solid var(--col-border-illustrative)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        transition: 'width .2s ease, min-width .2s ease',
        fontFamily: FONT,
      }}
    >
      {/* UBS Logo */}
      <div
        onClick={() => setActiveView('welcome')}
        data-testid="workspace-logo"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') setActiveView('welcome'); }}
        style={{
          padding: '16px 12px',
          borderBottom: '1px solid var(--col-border-illustrative)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'flex-start' : 'center',
          gap: open ? 6 : 0,
          marginRight: open ? 8 : 0,
          cursor: 'pointer',
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <img
          src={ubsLogo}
          alt="UBS"
          data-testid="workspace-ubs-logo"
          style={{
            width: open ? 83 : 40,
            minWidth: open ? 83 : 40,
            height: 'auto',
            transition: 'width 0.2s ease',
          }}
        />
        {open && (
          <span
            data-testid="workspace-frame-text"
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
        {/* Collapse Button */}
        <button
          onClick={toggleSidebar}
          data-testid="workspace-collapse"
          style={{
            width: '100%',
            height: 36,
            borderRadius: '0.375rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: open ? 'flex-start' : 'center',
            padding: open ? '0 12px' : '0',
            gap: 10,
            color: 'var(--col-text-subtle)',
            marginBottom: 8,
            fontFamily: FONT,
            fontSize: 12,
          }}
        >
          <List size={16} weight="regular" />
          {open && <span style={{ fontWeight: 300 }}>Collapse</span>}
        </button>

        {/* Nav Items */}
        {NAV_ITEMS.map((item) => {
          const IconComponent = item.icon;
          const isActive = !item.isModal && activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleNav(item)}
              data-testid={`nav-${item.id}`}
              title={open ? undefined : item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: open ? '8px 12px' : '8px 0',
                justifyContent: open ? 'flex-start' : 'center',
                width: '100%',
                height: 38,
                border: 'none',
                borderRadius: '0.375rem',
                background: isActive ? 'var(--input-background)' : 'transparent',
                color: isActive ? 'var(--col-text-primary)' : 'var(--col-text-subtle)',
                cursor: 'pointer',
                fontSize: 13,
                fontFamily: FONT,
                fontWeight: isActive ? 400 : 300,
                transition: 'all .12s',
              }}
            >
              <IconComponent size={16} />
              {open && <span>{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* User Menu */}
      <UserMenu />
    </nav>
  );
}
