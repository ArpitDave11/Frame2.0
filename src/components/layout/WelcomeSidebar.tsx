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
  ClipboardText,
  LinkSimple,
  Kanban,
  Lightning,
  FileMagnifyingGlass,
  Wrench,
  Compass,
  ChartBar,
  GearSix,
  ChatCircle,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import ubsLogo from '@/assets/00ac1239b9b421f7eee8b4e260132b1ac860676a.png';
import { UserMenu } from '@/components/auth/UserMenu';
import { useUiStore } from '@/stores/uiStore';
import type { TabId, IssueSubTab, ModalId } from '@/stores/uiStore';

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

// Mirror of the workspace sidebar — same items, icons, and naming, so the
// welcome screen offers direct entry to every module.
interface WorkspaceLink {
  id: string;
  label: string;
  icon: Icon;
  tab?: TabId;
  issueSubTab?: IssueSubTab;
  modal?: ModalId;
  indent?: boolean;
}

const WORKSPACE_LINKS: WorkspaceLink[] = [
  { id: 'planner', label: 'Requirement Design', icon: ClipboardText, tab: 'planner' },
  { id: 'linked-issues', label: 'Linked Issues', icon: LinkSimple, tab: 'issues', issueSubTab: 'epic', indent: true },
  { id: 'blueprints', label: 'Blueprints', icon: SquaresFour, tab: 'blueprint', indent: true },
  { id: 'sprint', label: 'Performa - Sprint', icon: Kanban, tab: 'issues', issueSubTab: 'sprint' },
  { id: 'initiative', label: 'Extreme Initiative', icon: Lightning, tab: 'initiative' },
  { id: 'docIntel', label: 'Doc Intelligence', icon: FileMagnifyingGlass, tab: 'docIntel' },
  { id: 'issueRefinery', label: 'Issue Refinery', icon: Wrench, tab: 'issueRefinery' },
  { id: 'brp', label: 'BRP', icon: Compass, tab: 'brp' },
  { id: 'analytics', label: 'Analytics', icon: ChartBar, tab: 'analytics' },
];

const BOTTOM_LINKS: WorkspaceLink[] = [
  { id: 'settings', label: 'Settings', icon: GearSix, modal: 'settings' },
  { id: 'feedback', label: 'Feedback', icon: ChatCircle, modal: 'feedback' },
];

// ─── Component ──────────────────────────────────────────────

export function WelcomeSidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('home');
  const setActiveView = useUiStore((s) => s.setActiveView);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const setIssueSubTab = useUiStore((s) => s.setIssueSubTab);
  const openModal = useUiStore((s) => s.openModal);

  const handleNavClick = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    const el = document.getElementById(sectionId);
    el?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleWorkspaceLink = useCallback((link: WorkspaceLink) => {
    if (link.modal) {
      openModal(link.modal);
      return;
    }
    setActiveView('workspace');
    if (link.tab) setActiveTab(link.tab);
    if (link.issueSubTab) setIssueSubTab(link.issueSubTab);
  }, [openModal, setActiveView, setActiveTab, setIssueSubTab]);

  const width = isOpen ? 220 : 56;

  const renderWorkspaceLink = (link: WorkspaceLink) => {
    const IconComponent = link.icon;
    return (
      <button
        key={link.id}
        onClick={() => handleWorkspaceLink(link)}
        data-testid={`welcome-ws-${link.id}`}
        title={isOpen ? undefined : link.label}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: isOpen ? (link.indent ? '7px 12px 7px 30px' : '7px 12px') : '7px 0',
          justifyContent: isOpen ? 'flex-start' : 'center',
          width: '100%',
          height: 34,
          border: 'none',
          borderRadius: '0.375rem',
          background: 'transparent',
          color: link.indent ? 'var(--col-text-subtle)' : 'var(--col-text-primary)',
          cursor: 'pointer',
          fontSize: 12.5,
          fontFamily: F,
          fontWeight: 300,
          textAlign: 'left',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          transition: 'all .12s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--input-background)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <IconComponent size={15} weight="regular" />
        {isOpen && <span>{link.label}</span>}
      </button>
    );
  };

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

        {/* Workspace links — same modules, same names as the workspace sidebar */}
        <div
          style={{
            margin: '12px 4px 6px',
            paddingTop: 10,
            borderTop: '1px solid var(--col-border-illustrative)',
          }}
        >
          {isOpen && (
            <div
              style={{
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--col-text-subtle)',
                padding: '0 8px 6px',
              }}
            >
              Workspace
            </div>
          )}
        </div>
        {WORKSPACE_LINKS.map(renderWorkspaceLink)}

        <div style={{ flex: 1 }} />

        {/* Settings · Feedback — same as the workspace sidebar bottom */}
        <div style={{ margin: '6px 4px', borderTop: '1px solid var(--col-border-illustrative)', paddingTop: 6 }} />
        {BOTTOM_LINKS.map(renderWorkspaceLink)}
      </div>

      {/* User Menu — pinned to bottom */}
      <UserMenu />
    </aside>
  );
}
