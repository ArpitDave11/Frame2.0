/**
 * IssueRow — Single issue row in the list panel.
 * Matches prototype lines 190-280.
 */

import { useState } from 'react';
import { CaretRight } from '@phosphor-icons/react';
import { StatusIcon } from './StatusIcon';
import { F, getPriorityColor, getPriorityLabel } from './types';
import type { MockIssue } from './types';

export interface IssueRowProps {
  issue: MockIssue;
  isSelected: boolean;
  onClick: () => void;
}

export function IssueRow({ issue, isSelected, onClick }: IssueRowProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      data-testid={`issue-row-${issue.id}`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '14px 24px',
        cursor: 'pointer',
        borderLeft: isSelected
          ? '3px solid var(--col-background-brand)'
          : '3px solid transparent',
        background: isSelected ? '#fafafa' : hovered ? '#fafafa' : 'transparent',
        transition: 'all 0.15s ease',
        position: 'relative',
      }}
    >
      {/* Top row: ID + Status dot + Priority */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 6,
        }}
      >
        <StatusIcon status={issue.status} />
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--col-text-subtle)',
            fontFamily: F,
            letterSpacing: '0.02em',
          }}
        >
          {issue.id}
        </span>
        {/* Priority pill */}
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 4,
            background:
              issue.priority === 'high'
                ? '#fef2f2'
                : issue.priority === 'medium'
                  ? '#fffbeb'
                  : '#f9fafb',
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: getPriorityColor(issue.priority),
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 300,
              color: getPriorityColor(issue.priority),
              fontFamily: F,
            }}
          >
            {getPriorityLabel(issue.priority)}
          </span>
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 13,
          fontWeight: isSelected ? 400 : 300,
          color: 'var(--col-text-primary)',
          lineHeight: 1.45,
          marginBottom: 8,
          fontFamily: F,
        }}
      >
        {issue.title}
      </div>

      {/* Bottom row: assignee + time */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: 'var(--col-text-subtle)',
          fontWeight: 300,
          fontFamily: F,
        }}
      >
        <span>{issue.assignee}</span>
        <span>{issue.updated}</span>
      </div>

      {/* Active indicator arrow */}
      {isSelected && (
        <CaretRight
          size={12}
          color="var(--col-background-brand)"
          weight="bold"
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        />
      )}
    </div>
  );
}
