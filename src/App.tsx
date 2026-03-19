/**
 * App.tsx — Layout Shell & View Router.
 *
 * ~80 lines. Two modes: Welcome Screen and Workspace.
 * All state lives in Zustand stores — zero useState hooks.
 * Reads activeView from uiStore and delegates to child components.
 */

import { useUiStore } from '@/stores/uiStore';
import { font } from '@/theme/tokens';
import { WelcomeSidebar } from '@/components/layout/WelcomeSidebar';
import { WorkspaceSidebar } from '@/components/layout/WorkspaceSidebar';
import { ViewRouter } from '@/components/layout/ViewRouter';
import { WelcomeScreen } from '@/components/views/WelcomeScreen';
import { ModalHost } from '@/components/layout/ModalHost';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { ToastContainer } from '@/components/shared/ToastContainer';
import { AuthGuard } from '@/components/auth/AuthGuard';

// ─── Layouts ────────────────────────────────────────────────

function WelcomeLayout() {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <WelcomeSidebar />
      <WelcomeScreen />
    </div>
  );
}

function WorkspaceLayout() {
  return (
    <>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <WorkspaceSidebar />
        <ViewRouter />
      </div>
      <ChatPanel />
      <ModalHost />
    </>
  );
}

// ─── App ────────────────────────────────────────────────────

export default function App() {
  const activeView = useUiStore((s) => s.activeView);

  return (
    <AuthGuard>
      <div
        data-testid="app-root"
        style={{
          fontFamily: font.sans,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          background: '#f7f7f5',
          overflow: activeView === 'welcome' ? 'auto' : 'hidden',
          position: 'relative',
          color: 'var(--ubs-color-text-primary)',
        }}
      >
        {activeView === 'welcome' ? <WelcomeLayout /> : <WorkspaceLayout />}
        <ToastContainer />
      </div>
    </AuthGuard>
  );
}
