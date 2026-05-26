/**
 * BrpView — Tab root for Breakdown & Re-groom Planning (B-17 placeholder).
 *
 * This is a minimal placeholder that lets the tab register and route
 * cleanly. The real implementation comes in later tasks (B-25/B-26/B-28
 * land PortfolioView, PodView, and the BrpView switch that selects
 * between them based on `brpStore.view`).
 *
 * Keeping the placeholder ensures the entire integration surface
 * (TabId in uiStore + case in ViewRouter + sidebar entry in
 * WorkspaceSidebar) can be wired and tested ahead of the components,
 * so the rest of the build doesn't carry "missing route" risk.
 */

import { useBrpStore } from '@/stores/brpStore';

export function BrpView() {
  const crewCount = useBrpStore((s) => s.crews.length);

  return (
    <div
      data-testid="brp-view"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        padding: 24,
        gap: 12,
        color: 'var(--col-text-primary)',
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 400, margin: 0 }}>BRP — Breakdown & Re-groom Planning</h1>
      <p style={{ margin: 0, color: 'var(--col-text-subtle)' }}>
        Headless layer shipped. UI lands in tasks B-18 through B-28.
      </p>
      <p style={{ margin: 0, color: 'var(--col-text-subtle)', fontSize: 13 }}>
        Store check: {crewCount} crew(s) currently loaded.
      </p>
    </div>
  );
}
