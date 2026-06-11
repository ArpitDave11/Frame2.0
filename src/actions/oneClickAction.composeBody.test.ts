/**
 * Tests for composeIssueBody — the pure draft → GitLab markdown composer.
 */

import { describe, it, expect } from 'vitest';
import { composeIssueBody } from './oneClickAction';
import type { IssueDraft } from '@/stores/oneClickStore';

function draft(over: Partial<IssueDraft> = {}): IssueDraft {
  return {
    title: 'T',
    description: '## Summary\nA thing.',
    acceptanceCriteria: ['Does A', 'Does B'],
    dependencies: [],
    risks: [],
    weight: 3,
    priority: 'medium',
    labels: [],
    assignee: null,
    iteration: null,
    rationale: { weight: '', priority: '', assignee: '', labels: '' },
    ...over,
  };
}

describe('composeIssueBody', () => {
  it('renders acceptance criteria as a GitLab task list', () => {
    const body = composeIssueBody(draft());
    expect(body).toContain('## Summary');
    expect(body).toContain('## Acceptance Criteria');
    expect(body).toContain('- [ ] Does A');
    expect(body).toContain('- [ ] Does B');
  });

  it('includes Dependencies and Risks sections only when present', () => {
    const withExtras = composeIssueBody(draft({ dependencies: ['Vault #1192'], risks: ['Region rules'] }));
    expect(withExtras).toContain('## Dependencies');
    expect(withExtras).toContain('- Vault #1192');
    expect(withExtras).toContain('## Risks');
    expect(withExtras).toContain('- Region rules');

    const without = composeIssueBody(draft());
    expect(without).not.toContain('## Dependencies');
    expect(without).not.toContain('## Risks');
  });
});
