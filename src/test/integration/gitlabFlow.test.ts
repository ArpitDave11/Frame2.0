/**
 * Integration Test — GitLab load and publish flows (T-16.4).
 *
 * Tests the GitLab integration: fetching epics, loading epic content,
 * creating epics, and error handling — all via store + service mocks.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useEpicStore } from '@/stores/epicStore';
import { useConfigStore } from '@/stores/configStore';
import { useGitlabStore } from '@/stores/gitlabStore';

// ─── Mock fetch globally ────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mock setup so the module sees the mocked fetch
import { fetchGroupEpics, createGitLabEpic } from '@/services/gitlab/gitlabClient';
import type { GitLabConfig } from '@/domain/configTypes';

// ─── Reset ──────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  useEpicStore.setState(useEpicStore.getInitialState());
  useConfigStore.setState(useConfigStore.getInitialState());
  useGitlabStore.setState(useGitlabStore.getInitialState());
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Fixtures ───────────────────────────────────────────────

const GITLAB_CONFIG: GitLabConfig = {
  enabled: true,
  rootGroupId: '42',
  accessToken: 'glpat-test-token',
  authMode: 'pat',
};

const MOCK_EPICS = [
  {
    id: 101,
    iid: 1,
    title: 'Payment Gateway Redesign',
    description: '## Objective\n\nRedesign the payment flow.',
    state: 'opened',
    web_url: 'https://gitlab.example.com/epics/1',
    labels: ['backend', 'priority::high'],
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-03-01T14:30:00Z',
    group_id: 42,
  },
  {
    id: 102,
    iid: 2,
    title: 'Mobile App Refresh',
    description: '## Objective\n\nRefresh mobile experience.',
    state: 'opened',
    web_url: 'https://gitlab.example.com/epics/2',
    labels: ['mobile'],
    created_at: '2025-02-10T09:00:00Z',
    updated_at: '2025-03-05T11:00:00Z',
    group_id: 42,
  },
];

// ─── Tests ──────────────────────────────────────────────────

describe('GitLab load and publish flows', () => {
  it('fetchGroupEpics returns mock epic list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_EPICS,
      headers: new Headers({ 'x-total': '2' }),
    });

    const result = await fetchGroupEpics(GITLAB_CONFIG, '42');

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data![0].title).toBe('Payment Gateway Redesign');
    expect(result.totalCount).toBe(2);
  });

  it('loading an epic populates epicStore markdown', async () => {
    // Simulate what the UI does: fetch epic, then set markdown from description
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_EPICS,
      headers: new Headers({ 'x-total': '2' }),
    });

    const result = await fetchGroupEpics(GITLAB_CONFIG, '42');
    const epic = result.data![0];

    // Set markdown from epic description (what the Load modal does)
    useEpicStore.getState().setMarkdown(epic.description);

    const state = useEpicStore.getState();
    expect(state.markdown).toContain('## Objective');
    expect(state.markdown).toContain('Redesign the payment flow');
    expect(state.document).not.toBeNull();
  });

  it('loading an epic also updates gitlabStore selectedEpic', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_EPICS,
      headers: new Headers({ 'x-total': '2' }),
    });

    const result = await fetchGroupEpics(GITLAB_CONFIG, '42');
    const epic = result.data![0];

    useGitlabStore.getState().setSelectedEpic(epic);

    expect(useGitlabStore.getState().selectedEpic).not.toBeNull();
    expect(useGitlabStore.getState().selectedEpic!.title).toBe('Payment Gateway Redesign');
  });

  it('createGitLabEpic sends correct body via fetch', async () => {
    const createdEpic = {
      id: 200,
      iid: 10,
      title: 'New Epic',
      description: '## Objective\n\nA new epic.',
      state: 'opened',
      web_url: 'https://gitlab.example.com/epics/10',
      labels: ['backend'],
      created_at: '2025-03-19T10:00:00Z',
      updated_at: '2025-03-19T10:00:00Z',
      group_id: 42,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => createdEpic,
    });

    const result = await createGitLabEpic(GITLAB_CONFIG, {
      title: 'New Epic',
      description: '## Objective\n\nA new epic.',
      labels: ['backend'],
    });

    expect(result.success).toBe(true);
    expect(result.data!.title).toBe('New Epic');

    // Verify fetch was called with correct body
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/groups/42/epics');
    const body = JSON.parse(options.body);
    expect(body.title).toBe('New Epic');
    expect(body.description).toBe('## Objective\n\nA new epic.');
    expect(body.labels).toBe('backend');
  });

  it('fetchGroupEpics with search param passes query string', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [MOCK_EPICS[0]],
      headers: new Headers({ 'x-total': '1' }),
    });

    await fetchGroupEpics(GITLAB_CONFIG, '42', { search: 'Payment' });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('search=Payment');
  });

  it('error handling: fetch rejects -> error returned gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

    const result = await fetchGroupEpics(GITLAB_CONFIG, '42');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Network timeout');
  });

  it('error handling: HTTP error -> error returned gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    });

    const result = await fetchGroupEpics(GITLAB_CONFIG, '42');

    expect(result.success).toBe(false);
    expect(result.error).toContain('403');
  });

  it('auth guard: unconfigured GitLab returns error', async () => {
    const noAuthConfig: GitLabConfig = {
      enabled: false,
      rootGroupId: '',
      accessToken: '',
      authMode: 'pat',
    };

    const result = await fetchGroupEpics(noAuthConfig, '42');

    expect(result.success).toBe(false);
    expect(result.error).toContain('not configured');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
