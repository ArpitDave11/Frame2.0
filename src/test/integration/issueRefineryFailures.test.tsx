/**
 * Issue Refinery — integration failure paths (B-C3).
 *
 * Companion to issueRefineryFlow.test.tsx (happy path). Covers:
 *   1. gitlab fetchEpicIssues failure → error toast, no card render
 *   2. Pipeline mid-stage failure → phase='error', error banner, refine re-enabled
 *   3. Publish PUT failure → phase='error', error toast, draft preserved
 *
 * Mocks: fetch + aiClient.callAI only.
 *
 * Note: `vi.resetAllMocks()` rather than `clearAllMocks()` so mock
 * implementations from prior tests don't leak into the next.
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
  description: 'Replace legacy gateway.',
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
  title: 'Wire SDK',
  description: 'add the SDK',
  state: 'opened',
  web_url: 'https://gitlab/test/-/issues/12',
  labels: [],
  project_id: 999,
};

const COMP_JSON = JSON.stringify({
  epicIntent: 'Replace gateway.',
  issueIntent: 'Wire SDK.',
  gaps: [],
  ambiguities: [],
  alignmentNotes: [],
});
const REFINED_BODY = '## Summary\nx\n\n## Context\ny\n\n## Acceptance Criteria\n- one';

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
  // resetAllMocks clears the queued mockResolvedValueOnce / mockRejectedValueOnce
  // setups so the next test starts with a clean implementation slate.
  vi.resetAllMocks();
  useIssueRefineryStore.getState().reset();
  useGitlabStore.setState({ selectedEpic: null, loadedEpicIid: null, loadedGroupId: null });
  useUiStore.setState({ toasts: [], activeModal: null });
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

describe('Issue Refinery — failure paths', () => {
  it('gitlab fetchEpicIssues failure → error toast + no children rendered', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ message: 'Forbidden' }, 403));

    render(<IssueRefineryView />);
    act(() => {
      useGitlabStore.setState({
        selectedEpic: EPIC,
        loadedEpicIid: EPIC.iid,
        loadedGroupId: '42',
      });
    });

    await waitFor(() => {
      const toasts = useUiStore.getState().toasts;
      expect(toasts.find((t) => t.type === 'error')).toBeDefined();
    });
    expect(useIssueRefineryStore.getState().children).toEqual([]);
    expect(screen.queryByTestId('childlist-item-12')).toBeNull();
  });

  it('pipeline mid-stage failure → phase=error, banner, refine re-enabled', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([ISSUE]));
    vi.mocked(callAI)
      .mockResolvedValueOnce({ content: COMP_JSON, model: 'sonnet' })
      .mockRejectedValueOnce(new Error('refinement boom'))
      .mockRejectedValueOnce(new Error('refinement boom retry'));

    render(<IssueRefineryView />);
    act(() => {
      useGitlabStore.setState({
        selectedEpic: EPIC,
        loadedEpicIid: EPIC.iid,
        loadedGroupId: '42',
      });
    });
    await waitFor(() => expect(screen.queryByTestId('childlist-item-12')).not.toBeNull());

    fireEvent.click(screen.getByTestId('childlist-item-12'));
    fireEvent.click(screen.getByTestId('refine-btn'));

    await waitFor(
      () => {
        expect(useIssueRefineryStore.getState().phase).toBe('error');
      },
      { timeout: 3000 },
    );

    expect(screen.queryByTestId('ir-error')).not.toBeNull();
    expect(screen.queryByTestId('ir-error')?.textContent).toMatch(/refinement/i);
    expect((screen.getByTestId('refine-btn') as HTMLButtonElement).disabled).toBe(false);
  });

  it('publish PUT failure → phase=error, draft preserved, error toast', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([ISSUE]));
    vi.mocked(callAI)
      .mockResolvedValueOnce({ content: COMP_JSON, model: 'sonnet' })
      .mockResolvedValueOnce({ content: JSON.stringify({ refinedBody: REFINED_BODY }), model: 'sonnet' })
      .mockResolvedValueOnce({ content: JSON.stringify({ score: 80, findings: [] }), model: 'sonnet' });
    mockFetch.mockResolvedValueOnce(jsonResponse({ message: 'Server error' }, 500));

    render(<IssueRefineryView />);
    act(() => {
      useGitlabStore.setState({
        selectedEpic: EPIC,
        loadedEpicIid: EPIC.iid,
        loadedGroupId: '42',
      });
    });
    await waitFor(() => expect(screen.queryByTestId('childlist-item-12')).not.toBeNull());

    fireEvent.click(screen.getByTestId('childlist-item-12'));
    fireEvent.click(screen.getByTestId('refine-btn'));
    await waitFor(() => expect(useIssueRefineryStore.getState().phase).toBe('ready'), { timeout: 3000 });

    fireEvent.click(screen.getByTestId('publish-btn'));

    await waitFor(() => {
      expect(useIssueRefineryStore.getState().phase).toBe('error');
    });

    expect(useIssueRefineryStore.getState().refinedDraft).toBe(REFINED_BODY);
    const toasts = useUiStore.getState().toasts;
    expect(toasts.find((t) => t.type === 'error' && /Publish failed/.test(t.title))).toBeDefined();
  });
});
