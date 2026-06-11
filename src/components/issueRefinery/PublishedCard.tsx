/**
 * Issue Refinery — published success card (Figma node 6:15).
 *
 * Shown after a successful Publish. Confirms the GitLab write, echoes the
 * issue's assignee / iteration / weight, and offers "Open in GitLab" plus
 * "Refine another" (clears the published flag to return to the editor).
 */

import React from 'react';
import type { GitLabIssue } from '@/services/gitlab/types';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';
import { initials } from './MetaEditors';

export const PublishedCard: React.FC<{ issue: GitLabIssue }> = ({ issue }) => {
  const setPublished = useIssueRefineryStore((s) => s.setPublished);
  const assignee = issue.assignees?.[0] ?? issue.assignee ?? null;

  return (
    <section className="ir-published" data-testid="ir-published">
      <div className="ir-published__top">
        <span className="ir-published__check" aria-hidden="true">✓</span>
        <div>
          <h3 className="ir-published__title">Published to GitLab</h3>
          <p className="ir-published__sub">Issue #{issue.iid} updated</p>
        </div>
      </div>

      <div className="ir-published__meta">
        {assignee && (
          <>
            <span className="ir-avatar" aria-hidden="true">{initials(assignee)}</span>
            <span>{assignee.name || assignee.username}</span>
            <span className="ir-published__sep">·</span>
          </>
        )}
        <span>◷ {issue.iteration?.title?.trim() ? issue.iteration.title : 'No iteration'}</span>
        {issue.weight != null && (
          <>
            <span className="ir-published__sep">·</span>
            <span>⚖ {issue.weight} SP</span>
          </>
        )}
      </div>

      <div className="ir-published__acts">
        <a
          className="ir-link-btn ir-link-btn--primary"
          href={issue.web_url}
          target="_blank"
          rel="noreferrer noopener"
          data-testid="ir-open-gitlab"
        >
          Open #{issue.iid} in GitLab <span aria-hidden="true">↗</span>
        </a>
        <button
          type="button"
          className="ir-link-btn"
          onClick={() => setPublished(false)}
          data-testid="ir-refine-another"
        >
          Refine another
        </button>
      </div>
    </section>
  );
};
