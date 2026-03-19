/**
 * IssueManagerView — Full layout: IssueList (left) + IssueDetail (right).
 * Uses mock data directly (same approach as AnalyticsPanel).
 */

import { useState } from 'react';
import { IssueList } from './IssueList';
import { IssueDetail } from './IssueDetail';
import { MOCK_ISSUES } from './types';
import type { IssueFilter } from './IssueList';

export function IssueManagerView() {
  const [selectedId, setSelectedId] = useState<string | null>('AUTH-101');
  const [filter, setFilter] = useState<IssueFilter>('all');
  const [search, setSearch] = useState('');

  // Filter logic
  const filtered = MOCK_ISSUES.filter((issue) => {
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

  const selectedIssue = MOCK_ISSUES.find((i) => i.id === selectedId) ?? null;

  return (
    <div
      data-testid="issue-manager-view"
      style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        background: '#f7f7f5',
      }}
    >
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
  );
}
