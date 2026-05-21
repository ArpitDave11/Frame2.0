/**
 * Issue Refinery — full end-to-end integration test (R-16).
 *
 * The only mocks are `fetch` (gitlab) and `aiClient.callAI`. Stores,
 * orchestrator, stage runners, action layer, and components all run live.
 *
 * Covers:
 *   1. Bridge gitlabStore.selectedEpic → fetchEpicIssues → issueRefineryStore
 *   2. Child selection populates originalBody + originalProjectId
 *   3. Refine button drives the 3-stage pipeline
 *   4. Strict-schema discipline: $schema + minLength stripped before callAI
 *   5. Comprehension / Refined / Validation cards render
 *   6. Publish calls updateIssue, ends idle + success toast
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { IssueRefineryView } from '@/components/issueRefinery/IssueRefineryView';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';
import { useGitlabStore } from '@/stores/gitlabStore';
import { useUiStore } from '@/stores/uiStore';
import { useConfigStore } from '@/stores/configStore';
import { DEFAULT_CONFIG } from '@/domain/configTypes';
import type { GitLabEpic, GitLabIssue } from '@/services/gitlab/types';

vi.mock('@/services/ai/aiClient', () => ({ callAI: vi.fn() }));
import { callAI } from '@/services/ai/aiClient';

const mockFetch = vi.fn();

const EPIC: GitLabEpic = {
  id: 200,
  iid: 7,
  title: 'Payments revamp',
  description: 'Replace legacy gateway with Stripe.',
  state: 'opened',
  web_url: 'https://gitlab/test/-/epics/7',
  labels: [],
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  group_id: 42,
};

const ISSUE: GitLabIssue = {
  id: 100,
  iid: 12,
  title: 'Wire Stripe SDK',
  description: 'Add the SDK to checkout flow.',
  state: 'opened',
  web_url: 'https://gitlab/test/-/issues/12',
  labels: [],
  project_id: 999,
};

const REFINED_BODY =
  '## Summary\nWire Stripe SDK into the checkout flow.\n\n' +
  '## Context\nReplaces the legacy gateway per epic §2.\n\n' +
  '## Acceptance Criteria\n- [ ] Checkout uses Stripe in test mode\n- [ ] Errors surface to user\n\n' +
  '## Technical Notes\n- Use @stripe/stripe-js';

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useIssueRefineryStore.getState().reset();
  useGitlabStore.setState({ selectedEpic: null, loadedEpicIid: null, loadedGroupId: null });

  // Configure gitlab so `isGitLabAuthConfigured` returns true and the bridge
  // actually issues fetchEpicIssues.
  useConfigStore.setState({
    config: {
      ...DEFAULT_CONFIG,
      gitlab: {
        enabled: true,
        rootGroupId: '42',
        streamGroupId: '42',
        accessToken: 'glpat-token',
        authMode: 'pat',
      },
    },
  });

  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
});

describe('Issue Refinery — full end-to-end happy path', () => {
  it('refines and publishes a child issue', async () => {
    // (1) Gitlab fetchEpicIssues
    mockFetch.mockResolvedValueOnce(jsonResponse([ISSUE]));

    // (2-4) Three sequential callAI invocations
    vi.mocked(callAI)
      .mockResolvedValueOnce({
        content: JSON.stringify({
          epicIntent: 'Replace gateway.',
          issueIntent: 'Wire Stripe SDK.',
          gaps: ['Test-mode flag missing.'],
          ambiguities: [],
          alignmentNotes: ['Mirror epic §2.'],
        }),
        model: 'sonnet',
      })
      .mockResolvedValueOnce({
        content: JSON.stringify({ refinedBody: REFINED_BODY }),
        model: 'sonnet',
      })
      .mockResolvedValueOnce({
        content: JSON.stringify({ score: 82, findings: ['[nit] tighten summary'] }),
        model: 'sonnet',
      });

    // (5) updateIssue PUT
    mockFetch.mockResolvedValueOnce(jsonResponse({ ...ISSUE, description: REFINED_BODY }));

    render(<IssueRefineryView />);

    act(() => {
      useGitlabStore.setState({
        selectedEpic: EPIC,
        loadedEpicIid: EPIC.iid,
        loadedGroupId: '42',
      });
    });

    // Wait for fetchEpicIssues → child list render
    await waitFor(() => {
      expect(screen.queryByTestId('childlist-item-12')).not.toBeNull();
    });

    // Verify the gitlab GET URL used per_page=100 (R-1 pagination fix)
    const getCall = mockFetch.mock.calls[0];
    if (!getCall) throw new Error('expected at least one fetch call');
    expect(getCall[0]).toBe('/gitlab-api/groups/42/epics/7/issues?per_page=100');

    // Select the child.
    fireEvent.click(screen.getByTestId('childlist-item-12'));
    expect(useIssueRefineryStore.getState().selectedChildIid).toBe(12);

    // Refine.
    fireEvent.click(screen.getByTestId('refine-btn'));

    await waitFor(
      () => {
        expect(useIssueRefineryStore.getState().phase).toBe('ready');
      },
      { timeout: 3000 },
    );

    // All three calls happened; all used strict json_schema.
    expect(callAI).toHaveBeenCalledTimes(3);
    for (const call of vi.mocked(callAI).mock.calls) {
      const req = call[1];
      expect(req.responseFormat?.type).toBe('json_schema');
      expect(req.responseFormat?.json_schema.strict).toBe(true);
    }

    // Strict-stripping discipline at the wire.
    const schemaSent = vi.mocked(callAI).mock.calls[0]?.[1].responseFormat?.json_schema.schema;
    expect(schemaSent).not.toHaveProperty('$schema');
    const props = (schemaSent as { properties: Record<string, Record<string, unknown>> }).properties;
    expect(props.epicIntent).not.toHaveProperty('minLength');

    // Cards rendered with real data.
    expect(screen.queryByTestId('comprehension-card')).not.toBeNull();
    expect(screen.queryByTestId('refined-card')).not.toBeNull();
    expect(screen.queryByTestId('validation-card')).not.toBeNull();
    expect(screen.queryByText('Wire Stripe SDK.')).not.toBeNull();
    expect(screen.queryByTestId('validation-score')?.textContent).toContain('82');

    const textarea = screen.getByTestId('refined-textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe(REFINED_BODY);

    // Publish.
    fireEvent.click(screen.getByTestId('publish-btn'));

    await waitFor(() => {
      expect(useIssueRefineryStore.getState().phase).toBe('idle');
    });

    // Confirm the PUT happened with the refined body.
    const putCall = mockFetch.mock.calls.find(
      (c) => (c[1] as RequestInit)?.method === 'PUT',
    );
    expect(putCall).toBeDefined();
    if (!putCall) throw new Error('PUT call not found');
    expect(putCall[0]).toBe('/gitlab-api/projects/999/issues/12');
    const body = JSON.parse((putCall[1] as RequestInit).body as string);
    expect(body).toEqual({ description: REFINED_BODY });

    // Success toast surfaced.
    expect(useUiStore.getState().toasts.find((t) => t.type === 'success')).toBeDefined();
  });
});
