/**
 * Welcome Screen sidebar — minimal navigation for the landing page.
 * Replaced in Phase 6 with full Welcome Screen content.
 */

import { useUiStore } from '@/stores/uiStore';

export function WelcomeSidebar() {
  const setActiveView = useUiStore((s) => s.setActiveView);

  return (
    <aside
      data-testid="welcome-sidebar"
      style={{
        width: 240,
        background: '#fff',
        borderRight: '1px solid #e5e5e5',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 24 }}>
        Epic Generator
      </div>
      <button
        onClick={() => setActiveView('workspace')}
        style={{
          padding: '10px 16px',
          background: '#E60000',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        Open Workspace
      </button>
    </aside>
  );
}
