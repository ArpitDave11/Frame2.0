/**
 * Issue Refinery — Publish button (R-13).
 *
 * Disabled unless phase === 'ready' AND the refinedDraft is non-empty.
 * If the user has edited the draft inline, a window.confirm() dialog runs
 * before the actual publish — D6 / locked-decision-friendly nudge so that
 * tweaks made in the textarea aren't silently shipped on a stray click.
 *
 * The actual GitLab PUT lives in `publishRefinedIssue()`; this component
 * just decides when the action is callable and surfaces in-flight state.
 */

import React from 'react';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';
import { publishRefinedIssue } from '@/actions/refineIssueAction';

export interface PublishButtonProps {
  /** Injectable for tests so we can avoid `window.confirm`. Returns true to proceed. */
  confirmFn?: (message: string) => boolean;
}

export const PublishButton: React.FC<PublishButtonProps> = ({
  confirmFn = (msg) => window.confirm(msg),
}) => {
  const phase = useIssueRefineryStore((s) => s.phase);
  const refinedDraft = useIssueRefineryStore((s) => s.refinedDraft);
  const userEdited = useIssueRefineryStore((s) => s.userEditedDraft);

  const ready = phase === 'ready' && refinedDraft !== null && refinedDraft.trim().length > 0;
  const publishing = phase === 'publishing';
  const disabled = !ready || publishing;

  const onClick = () => {
    if (disabled) return;
    if (userEdited) {
      const proceed = confirmFn(
        'Publish your edited version of the refined issue body to GitLab?',
      );
      if (!proceed) return;
    }
    void publishRefinedIssue();
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`ir-publish-btn${publishing ? ' ir-publish-btn--publishing' : ''}`}
      data-testid="publish-btn"
      data-state={publishing ? 'publishing' : ready ? 'ready' : 'disabled'}
    >
      {publishing ? 'Publishing…' : 'Publish to GitLab'}
    </button>
  );
};
