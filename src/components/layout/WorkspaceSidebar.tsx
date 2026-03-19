/**
 * Workspace sidebar — 5-item navigation + back to welcome.
 * Icons will be added in Phase 6; for now uses text labels.
 */

import { useUiStore } from '@/stores/uiStore';
import type { TabId } from '@/stores/uiStore';

const NAV_ITEMS: { id: TabId; label: string }[] = [
  { id: 'planner', label: 'Planner' },
  { id: 'issues', label: 'Issues' },
  { id: 'blueprint', label: 'Blueprint' },
  { id: 'analytics', label: 'Analytics' },
];

export function WorkspaceSidebar() {
  const activeTab = useUiStore((s) => s.activeTab);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const setActiveView = useUiStore((s) => s.setActiveView);
  const openModal = useUiStore((s) => s.openModal);

  return (
    <aside
      data-testid="workspace-sidebar"
      style={{
        width: 200,
        background: '#1a1a1a',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 0',
      }}
    >
      <div style={{ padding: '0 16px', marginBottom: 24 }}>
        <button
          onClick={() => setActiveView('welcome')}
          style={{
            background: 'none',
            border: 'none',
            color: '#999',
            cursor: 'pointer',
            fontSize: 12,
            padding: 0,
          }}
        >
          &larr; Back
        </button>
      </div>

      <nav style={{ flex: 1 }}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            data-testid={`nav-${item.id}`}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 20px',
              background: activeTab === item.id ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: activeTab === item.id ? '#fff' : '#aaa',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: activeTab === item.id ? 600 : 400,
              borderLeft: activeTab === item.id ? '3px solid #E60000' : '3px solid transparent',
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div style={{ padding: '0 16px' }}>
        <button
          onClick={() => openModal('settings')}
          data-testid="nav-settings"
          style={{
            background: 'none',
            border: 'none',
            color: '#999',
            cursor: 'pointer',
            fontSize: 13,
            padding: '8px 0',
          }}
        >
          Settings
        </button>
      </div>
    </aside>
  );
}
