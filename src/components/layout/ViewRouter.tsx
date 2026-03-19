/**
 * ViewRouter — Switches workspace content based on active tab.
 *
 * Planner: WorkspaceHeader + SplitPane (Editor | Preview)
 * Issues: Full-width Issue Manager (Phase 15)
 * Blueprint: Full-width Blueprints (Phase 16)
 * Analytics: Full AnalyticsPanel (copied from prototype)
 */

import { useUiStore } from '@/stores/uiStore';
import { PlaceholderView } from '@/components/layout/PlaceholderView';
import { AnalyticsPanel } from '@/components/views/AnalyticsPanel';

// ─── Planner View ───────────────────────────────────────────

function PlannerView() {
  return (
    <div
      data-testid="planner-view"
      style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
    >
      {/* WorkspaceHeader — Phase 6, T-6.2 */}
      <PlaceholderView name="WorkspaceHeader" />
      {/* SplitPane(Editor | Preview) — Phase 6, T-6.3/T-6.4 */}
    </div>
  );
}

// ─── Issue Manager View ─────────────────────────────────────

function IssueManagerView() {
  return (
    <div data-testid="issues-view" style={{ flex: 1, overflow: 'auto' }}>
      <PlaceholderView name="Issue Manager — coming in Phase 15" />
    </div>
  );
}

// ─── Blueprint View ─────────────────────────────────────────

function BlueprintView() {
  return (
    <div data-testid="blueprint-view" style={{ flex: 1, overflow: 'auto' }}>
      <PlaceholderView name="Blueprints — coming in Phase 16" />
    </div>
  );
}

// ─── Analytics View ─────────────────────────────────────────

function AnalyticsView() {
  return (
    <div data-testid="analytics-view" style={{ flex: 1, overflow: 'auto' }}>
      <AnalyticsPanel />
    </div>
  );
}

// ─── Router ─────────────────────────────────────────────────

export function ViewRouter() {
  const activeTab = useUiStore((s) => s.activeTab);

  switch (activeTab) {
    case 'planner':
      return <PlannerView />;
    case 'issues':
      return <IssueManagerView />;
    case 'blueprint':
      return <BlueprintView />;
    case 'analytics':
      return <AnalyticsView />;
    default:
      return <PlannerView />;
  }
}
