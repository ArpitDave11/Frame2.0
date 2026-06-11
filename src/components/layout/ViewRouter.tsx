/**
 * ViewRouter — Switches workspace content based on active tab.
 *
 * Planner: WorkspaceHeader + SplitPane (Editor | Preview)
 * Issues: Full-width Issue Manager (Phase 15)
 * Blueprint: Full-width Blueprints (Phase 16)
 * Analytics: Full AnalyticsPanel (copied from prototype)
 */

import { useUiStore } from '@/stores/uiStore';
import { BlueprintView as BlueprintViewComponent } from '@/components/blueprint/BlueprintView';
import { AnalyticsPanel } from '@/components/views/AnalyticsPanel';
import { IssueManagerView } from '@/components/issues/IssueManagerView';
import { WorkspaceHeader } from '@/components/editor/WorkspaceHeader';
import { RefineReviewBar } from '@/components/editor/RefineReviewBar';
import { SplitPane } from '@/components/layout/SplitPane';
import { EditorPane } from '@/components/editor/EditorPane';
import { PreviewPane } from '@/components/editor/PreviewPane';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import ExtremeInitiativeView from '@/components/initiative/ExtremeInitiativeView';
import DocIntelView from '@/components/docIntel/DocIntelView';
import { IssueRefineryView } from '@/components/issueRefinery/IssueRefineryView';
import { BrpView } from '@/components/brp/BrpView';

// ─── Planner View ───────────────────────────────────────────

function PlannerView() {
  return (
    <div
      data-testid="planner-view"
      style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
    >
      <WorkspaceHeader />
      <RefineReviewBar />
      <SplitPane
        left={<EditorPane />}
        right={<PreviewPane />}
      />
    </div>
  );
}

// ─── Issue Manager View ─────────────────────────────────────

function IssueManagerViewWrapper() {
  return (
    <div data-testid="issues-view" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <IssueManagerView />
    </div>
  );
}

// ─── Blueprint View ─────────────────────────────────────────

function BlueprintView() {
  return (
    <div data-testid="blueprint-view" style={{ flex: 1, overflow: 'auto' }}>
      <BlueprintViewComponent />
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

// ─── BRP View ───────────────────────────────────────────────

function BrpViewWrapper() {
  return (
    <div data-testid="brp-view-wrapper" style={{ display: 'flex', flex: 1, overflow: 'auto' }}>
      <BrpView />
    </div>
  );
}

// ─── Router ─────────────────────────────────────────────────

export function ViewRouter() {
  const activeTab = useUiStore((s) => s.activeTab);

  switch (activeTab) {
    case 'planner':
      return <ErrorBoundary viewName="Epic Planner"><PlannerView /></ErrorBoundary>;
    case 'issues':
      return <ErrorBoundary viewName="Issue Manager"><IssueManagerViewWrapper /></ErrorBoundary>;
    case 'blueprint':
      return <ErrorBoundary viewName="Blueprint"><BlueprintView /></ErrorBoundary>;
    case 'analytics':
      return <ErrorBoundary viewName="Analytics"><AnalyticsView /></ErrorBoundary>;
    case 'initiative':
      return <ErrorBoundary viewName="Extreme Initiative"><ExtremeInitiativeView /></ErrorBoundary>;
    case 'docIntel':
      return <ErrorBoundary viewName="Document Intelligence"><div data-testid="docintel-view-wrapper" style={{ flex: 1, overflow: 'auto' }}><DocIntelView /></div></ErrorBoundary>;
    case 'issueRefinery':
      return <ErrorBoundary viewName="Issue Refinery"><div data-testid="issue-refinery-wrapper" style={{ flex: 1, overflow: 'auto' }}><IssueRefineryView /></div></ErrorBoundary>;
    case 'brp':
      return <ErrorBoundary viewName="BRP"><BrpViewWrapper /></ErrorBoundary>;
    default:
      return <ErrorBoundary viewName="Epic Planner"><PlannerView /></ErrorBoundary>;
  }
}
