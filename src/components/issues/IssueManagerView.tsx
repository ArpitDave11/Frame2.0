/**
 * IssueManagerView — Full layout: IssueList (left) + IssueDetail (right).
 * Uses real GitLab data when an epic is loaded; falls back to mock data otherwise.
 */

import { useState, useEffect } from 'react';
import { IssueList } from './IssueList';
import { IssueDetail } from './IssueDetail';
import { MOCK_ISSUES, F } from './types';
import { useGitlabStore } from '@/stores/gitlabStore';
import { useConfigStore } from '@/stores/configStore';
import { fetchIssuesAction } from '@/actions/fetchIssuesAction';
import type { IssueFilter } from './IssueList';
import type { MockIssue } from './types';
import type { GitLabIssue } from '@/stores/gitlabStore';

function mapGitLabIssueToMock(issue: GitLabIssue): MockIssue {
  return {
    id: `#${issue.iid}`,
    title: issue.title,
    status: issue.state === 'opened' ? 'in-progress' : 'done',
    priority: 'medium',
    updated: issue.created_at ? new Date(issue.created_at).toLocaleDateString() : '',
    assignee: issue.assignee ?? 'Unassigned',
    web_url: issue.web_url,
    project_id: issue.project_id,
    iid: issue.iid,
  };
}

export function IssueManagerView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<IssueFilter>('all');
  const [search, setSearch] = useState('');

  const gitlabIssues = useGitlabStore((s) => s.issues);
  const loadedEpicIid = useGitlabStore((s) => s.loadedEpicIid);
  const loadedGroupId = useGitlabStore((s) => s.loadedGroupId);
  const isConfigured = useConfigStore((s) => s.config.gitlab.enabled);

  // Fetch real issues when an epic is loaded
  useEffect(() => {
    if (isConfigured && loadedEpicIid && loadedGroupId) {
      fetchIssuesAction();
    }
  }, [isConfigured, loadedEpicIid, loadedGroupId]);

  // Use real data if available, otherwise mock
  const usingRealData = gitlabIssues.length > 0;
  const issues: MockIssue[] = usingRealData
    ? gitlabIssues.map(mapGitLabIssueToMock)
    : MOCK_ISSUES;

  // Auto-select first issue when data loads
  useEffect(() => {
    if (issues.length > 0 && !selectedId) {
      setSelectedId(issues[0]!.id);
    }
  }, [issues, selectedId]);

  // Filter logic
  const filtered = issues.filter((issue) => {
    // Search: case-insensitive title/id match
    const q = search.toLowerCase();
    if (q && !issue.title.toLowerCase().includes(q) && !issue.id.toLowerCase().includes(q)) {
      return false;
    }

    // Tab filter
    switch (filter) {
      case 'active':
        return issue.status === 'in-progress' || issue.status === 'review';
      case 'blocked':
        return issue.status === 'blocked';
      case 'all':
      default:
        return true;
    }
  });

  const selectedIssue = issues.find((i) => i.id === selectedId) ?? null;

  return (
    <div
      data-testid="issue-manager-view"
      style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        background: '#f7f7f5',
        flexDirection: 'column',
      }}
    >
      {/* Banner when using mock data */}
      {!usingRealData && (
        <div
          data-testid="mock-data-banner"
          style={{
            padding: '8px 24px',
            background: '#fef3c7',
            borderBottom: '1px solid #fde68a',
            fontSize: 12,
            fontWeight: 400,
            color: '#92400e',
            fontFamily: F,
            textAlign: 'center',
          }}
        >
          Showing sample data — load an epic from GitLab to see real issues
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <IssueList
          issues={filtered}
          selectedId={selectedId}
          filter={filter}
          search={search}
          onSelectIssue={setSelectedId}
          onFilterChange={setFilter}
          onSearchChange={setSearch}
        />
        <IssueDetail issue={selectedIssue} />
      </div>
    </div>
  );
}
