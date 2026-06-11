/**
 * Issue Refinery — workspace child header (Figma node 2:2).
 *
 * Shows the selected child issue's title + iid, a row of meta chips
 * (status · weight · assignee · iteration), and the Refine / Publish actions.
 *
 * Phase 1 renders the chips from real GitLab issue data (display). The
 * weight / assignee / iteration chips become interactive editors in Phase 2
 * (MetaEditors), opened from here.
 */

import React from 'react';
import type { GitLabIssue } from '@/services/gitlab/types';
import type { Phase } from '@/pipeline/issue/types';
import { refineSelectedIssue } from '@/actions/refineIssueAction';
import { PublishButton } from './PublishButton';
import { WeightChip, AssigneeChip, IterationChip } from './MetaEditors';

export interface ChildHeaderProps {
  issue: GitLabIssue;
  phase: Phase;
}

function statusFor(phase: Phase): { tone: string; label: string } {
  switch (phase) {
    case 'ready':
      return { tone: 'ready', label: 'Ready to publish' };
    case 'comprehending':
    case 'refining':
    case 'validating':
      return { tone: 'busy', label: 'Refining…' };
    case 'publishing':
      return { tone: 'busy', label: 'Publishing…' };
    case 'error':
      return { tone: 'error', label: 'Refine failed' };
    default:
      return { tone: 'idle', label: 'Not refined' };
  }
}

export const ChildHeader: React.FC<ChildHeaderProps> = ({ issue, phase }) => {
  const status = statusFor(phase);
  const refineDisabled =
    phase === 'comprehending' || phase === 'refining' || phase === 'validating' || phase === 'publishing';
  const refineLabel =
    phase === 'comprehending' || phase === 'refining' || phase === 'validating'
      ? 'Refining…'
      : phase === 'ready'
        ? 'Refine again'
        : 'Refine';

  return (
    <header className="ir-childhdr" data-testid="ir-childhdr">
      <div className="ir-childhdr__lead">
        <div className="ir-childhdr__titlerow">
          <h2 className="ir-childhdr__title">{issue.title}</h2>
          <span className="ir-childhdr__iid">#{issue.iid}</span>
        </div>
        <div className="ir-meta">
          <span className="ir-pill ir-pill--status" data-tone={status.tone} data-testid="ir-status-pill">
            <span className="ir-dot" aria-hidden="true" />
            {status.label}
          </span>
          <WeightChip issue={issue} />
          <AssigneeChip issue={issue} />
          <IterationChip issue={issue} />
        </div>
      </div>

      <div className="ir-childhdr__acts">
        <button
          type="button"
          onClick={() => void refineSelectedIssue()}
          disabled={refineDisabled}
          className="ir-refine-btn"
          data-testid="refine-btn"
          data-phase={phase}
        >
          <span aria-hidden="true">↻</span>
          {refineLabel}
        </button>
        <PublishButton />
      </div>
    </header>
  );
};
