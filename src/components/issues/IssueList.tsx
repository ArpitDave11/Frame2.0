/**
 * IssueList — Left panel with header, search, filter tabs, and issue rows.
 * Matches prototype lines 164-300.
 */

import { MagnifyingGlass } from '@phosphor-icons/react';
import { IssueRow } from './IssueRow';
import { F } from './types';
import type { MockIssue } from './types';

export type IssueFilter = 'all' | 'active' | 'blocked';

interface IssueListProps {
  issues: MockIssue[];
  selectedId: string | null;
  filter: IssueFilter;
  search: string;
  onSelectIssue: (id: string) => void;
  onFilterChange: (filter: IssueFilter) => void;
  onSearchChange: (query: string) => void;
  emptyState?: string;
}

const FILTER_TABS: { key: IssueFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'blocked', label: 'Blocked' },
];

export function IssueList({
  issues,
  selectedId,
  filter,
  search,
  onSelectIssue,
  onFilterChange,
  onSearchChange,
  emptyState,
}: IssueListProps) {
  return (
    <div
      data-testid="issue-list-panel"
      style={{
        width: 380,
        minWidth: 380,
        background: '#ffffff',
        borderRight: '1px solid var(--col-border-illustrative)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* List Header */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--col-border-illustrative)',
        }}
      >
        {/* Title row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: 'var(--col-text-primary)',
                fontFamily: F,
              }}
            >
              Issues
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: '#ffffff',
                background: 'var(--col-background-brand)',
                borderRadius: 10,
                padding: '2px 8px',
                fontFamily: F,
              }}
            >
              {issues.length}
            </span>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <MagnifyingGlass
            size={14}
            color="var(--col-text-subtle)"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          />
          <input
            type="text"
            data-testid="issue-search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search issues..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              border: '1px solid var(--col-border-illustrative)',
              borderRadius: 6,
              fontFamily: F,
              fontSize: 12,
              fontWeight: 300,
              color: 'var(--col-text-primary)',
              background: 'var(--input-background)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        data-testid="issue-filter-tabs"
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--col-border-illustrative)',
          padding: '0 24px',
        }}
      >
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            data-testid={`filter-tab-${tab.key}`}
            onClick={() => onFilterChange(tab.key)}
            style={{
              padding: '10px 16px',
              fontSize: 12,
              fontWeight: filter === tab.key ? 500 : 300,
              color:
                filter === tab.key
                  ? 'var(--col-background-brand)'
                  : 'var(--col-text-subtle)',
              fontFamily: F,
              background: 'transparent',
              border: 'none',
              borderBottom:
                filter === tab.key
                  ? '2px solid var(--col-background-brand)'
                  : '2px solid transparent',
              cursor: 'pointer',
              letterSpacing: '0.02em',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Issue Count */}
      <div
        style={{
          padding: '10px 24px',
          fontSize: 12,
          fontWeight: 300,
          color: 'var(--col-text-subtle)',
          fontFamily: F,
          borderBottom: '1px solid var(--col-border-illustrative)',
          letterSpacing: '0.02em',
        }}
      >
        {issues.length} issues
      </div>

      {/* Issue Rows or Empty State */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 0',
        }}
      >
        {emptyState ? (
          <div style={{
            padding: '32px 24px',
            fontSize: 13,
            fontWeight: 300,
            color: 'var(--col-text-subtle)',
            fontFamily: F,
            textAlign: 'center',
            lineHeight: 1.5,
          }}>
            {emptyState}
          </div>
        ) : (
          issues.map((issue) => (
            <IssueRow
              key={issue.id}
              issue={issue}
              isSelected={selectedId === issue.id}
              onClick={() => onSelectIssue(issue.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
