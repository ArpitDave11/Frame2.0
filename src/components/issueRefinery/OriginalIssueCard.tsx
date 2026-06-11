/**
 * Issue Refinery — original issue content card.
 *
 * Shows the selected child issue's body from GitLab the moment it's selected,
 * BEFORE refining — so the user can actually read the issue without first
 * running the (~minute-long) AI pipeline. Self-gates: renders only while the
 * issue is un-refined (no comprehension / refined draft yet); once refined, the
 * Refined-draft card's "Original" pane takes over and this returns null.
 */

import React from 'react';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';

export const OriginalIssueCard: React.FC = () => {
  const selectedChildIid = useIssueRefineryStore((s) => s.selectedChildIid);
  const originalBody = useIssueRefineryStore((s) => s.originalBody);
  const comprehension = useIssueRefineryStore((s) => s.comprehension);
  const refinedDraft = useIssueRefineryStore((s) => s.refinedDraft);

  // Only the pre-refine state; the refined cards own the content afterwards.
  if (selectedChildIid === null || comprehension !== null || refinedDraft !== null) {
    return null;
  }

  const body = (originalBody ?? '').trim();

  return (
    <section className="ir-card ir-original-card" data-testid="original-issue-card">
      <header className="ir-card__header">
        <h3 className="ir-card__title">Issue content</h3>
        <span className="ir-card__subtitle">from GitLab</span>
      </header>
      {body ? (
        <pre className="ir-refined-card__pre" data-testid="original-issue-body">{body}</pre>
      ) : (
        <p className="ir-comprehension-card__empty" data-testid="original-issue-empty">
          This issue has no description in GitLab yet. Click “Refine” to draft one.
        </p>
      )}
    </section>
  );
};
