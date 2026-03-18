import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getGitLabAuthHeaders,
  isGitLabAuthConfigured,
  getBaseUrl,
  fetchGroupEpics,
  createGitLabEpic,
  updateGitLabEpic,
  testGitLabConnection,
  fetchEpicDetails,
  fetchEpicChildren,
  fetchGroupLabels,
  createGitLabIssue,
  fetchGitLabFileContent,
  publishWithMergeRequest,
} from './gitlabClient';
import type { GitLabConfig } from '@/domain/configTypes';

// ─── Fixtures ───────────────────────────────────────────────

const PAT_CONFIG: GitLabConfig = {
  enabled: true,
  rootGroupId: '42',
  accessToken: 'glpat-abc123',
  authMode: 'pat',
};

const OAUTH_CONFIG: GitLabConfig = {
  enabled: true,
  rootGroupId: '42',
  accessToken: 'oauth-token-xyz',
  authMode: 'oauth',
};

const EMPTY_CONFIG: GitLabConfig = {
  enabled: false,
  rootGroupId: '',
  accessToken: '',
  authMode: 'pat',
};

// ─── Mock fetch ─────────────────────────────────────────────

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
});

function mockJsonResponse(data: unknown, status = 200, headers?: Record<string, string>) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: async () => data,
    text: async () => JSON.stringify(data),
  });
}

// ─── getBaseUrl ─────────────────────────────────────────────

describe('getBaseUrl', () => {
  it('returns /gitlab-api proxy path', () => {
    expect(getBaseUrl()).toBe('/gitlab-api');
  });
});

// ─── getGitLabAuthHeaders ───────────────────────────────────

describe('getGitLabAuthHeaders', () => {
  it('returns PRIVATE-TOKEN header for PAT mode', () => {
    const headers = getGitLabAuthHeaders(PAT_CONFIG);
    expect(headers).toEqual({ 'PRIVATE-TOKEN': 'glpat-abc123' });
  });

  it('returns Authorization: Bearer header for OAuth mode', () => {
    const headers = getGitLabAuthHeaders(OAUTH_CONFIG);
    expect(headers).toEqual({ Authorization: 'Bearer oauth-token-xyz' });
  });

  it('returns empty object when no auth configured', () => {
    const headers = getGitLabAuthHeaders(EMPTY_CONFIG);
    expect(headers).toEqual({});
  });
});

// ─── isGitLabAuthConfigured ─────────────────────────────────

describe('isGitLabAuthConfigured', () => {
  it('returns true with PAT token', () => {
    expect(isGitLabAuthConfigured(PAT_CONFIG)).toBe(true);
  });

  it('returns false with empty token', () => {
    expect(isGitLabAuthConfigured(EMPTY_CONFIG)).toBe(false);
  });

  it('returns false when not enabled', () => {
    const config = { ...PAT_CONFIG, enabled: false };
    expect(isGitLabAuthConfigured(config)).toBe(false);
  });
});

// ─── fetchGroupEpics ────────────────────────────────────────

describe('fetchGroupEpics', () => {
  it('constructs correct URL with search params', async () => {
    mockJsonResponse([], 200, { 'x-total': '0' });
    await fetchGroupEpics(PAT_CONFIG, '42', { search: 'auth', state: 'opened' });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/gitlab-api/groups/42/epics');
    expect(url).toContain('search=auth');
    expect(url).toContain('state=opened');
  });

  it('includes pagination params', async () => {
    mockJsonResponse([], 200, { 'x-total': '0' });
    await fetchGroupEpics(PAT_CONFIG, '42', { page: 2, per_page: 10 });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('page=2');
    expect(url).toContain('per_page=10');
  });

  it('uses /gitlab-api/ prefix (proxy path)', async () => {
    mockJsonResponse([], 200, { 'x-total': '0' });
    await fetchGroupEpics(PAT_CONFIG, '42');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toMatch(/^\/gitlab-api\//);
  });

  it('returns { success: false, error } when config missing required fields', async () => {
    const result = await fetchGroupEpics(EMPTY_CONFIG, '');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns totalCount from x-total header', async () => {
    mockJsonResponse([{ id: 1, iid: 1, title: 'Epic 1' }], 200, { 'x-total': '25' });
    const result = await fetchGroupEpics(PAT_CONFIG, '42');

    expect(result.success).toBe(true);
    expect(result.totalCount).toBe(25);
  });
});

// ─── fetchEpicDetails ───────────────────────────────────────

describe('fetchEpicDetails', () => {
  it('constructs correct URL', async () => {
    mockJsonResponse({ id: 1, iid: 5, title: 'Test' });
    await fetchEpicDetails(PAT_CONFIG, '42', 5);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('/gitlab-api/groups/42/epics/5');
  });

  it('returns { success: false } on error', async () => {
    mockJsonResponse({ message: 'Not found' }, 404);
    const result = await fetchEpicDetails(PAT_CONFIG, '42', 999);
    expect(result.success).toBe(false);
  });
});

// ─── createGitLabEpic ───────────────────────────────────────

describe('createGitLabEpic', () => {
  it('uses params.group_id when provided, falls back to config.rootGroupId', async () => {
    mockJsonResponse({ id: 1, iid: 1, title: 'New' });
    await createGitLabEpic(PAT_CONFIG, { title: 'New', group_id: '99' });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/groups/99/epics');
  });

  it('falls back to config.rootGroupId', async () => {
    mockJsonResponse({ id: 1, iid: 1, title: 'New' });
    await createGitLabEpic(PAT_CONFIG, { title: 'New' });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/groups/42/epics');
  });

  it('sends correct JSON body', async () => {
    mockJsonResponse({ id: 1, iid: 1, title: 'Auth Epic' });
    await createGitLabEpic(PAT_CONFIG, {
      title: 'Auth Epic',
      description: 'Overhaul auth',
      labels: ['backend', 'security'],
    });

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.title).toBe('Auth Epic');
    expect(body.description).toBe('Overhaul auth');
    expect(body.labels).toBe('backend,security');
  });

  it('returns { success: false } when config is missing', async () => {
    const result = await createGitLabEpic(EMPTY_CONFIG, { title: 'Test' });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ─── updateGitLabEpic ───────────────────────────────────────

describe('updateGitLabEpic', () => {
  it('uses correct group ID and epic IID', async () => {
    mockJsonResponse({ id: 1, iid: 5, title: 'Updated' });
    await updateGitLabEpic(PAT_CONFIG, '42', 5, { title: 'Updated' });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('/gitlab-api/groups/42/epics/5');
    expect(options.method).toBe('PUT');
  });
});

// ─── fetchGroupLabels ───────────────────────────────────────

describe('fetchGroupLabels', () => {
  it('constructs correct URL', async () => {
    mockJsonResponse([{ id: 1, name: 'bug', color: '#ff0000' }]);
    await fetchGroupLabels(PAT_CONFIG, '42');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/gitlab-api/groups/42/labels');
  });
});

// ─── createGitLabIssue ──────────────────────────────────────

describe('createGitLabIssue', () => {
  it('constructs correct URL and sends body', async () => {
    mockJsonResponse({ id: 1, iid: 1, title: 'Bug fix' });
    await createGitLabIssue(PAT_CONFIG, '100', { title: 'Bug fix', description: 'Fix it' });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('/gitlab-api/projects/100/issues');
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body);
    expect(body.title).toBe('Bug fix');
  });
});

// ─── testGitLabConnection ───────────────────────────────────

describe('testGitLabConnection', () => {
  it('returns { success: true } format on valid response', async () => {
    mockJsonResponse({ id: 42, name: 'My Group' });
    const result = await testGitLabConnection(PAT_CONFIG);
    expect(result.success).toBe(true);
  });

  it('returns { success: false, error } on failure', async () => {
    mockJsonResponse({ message: 'Unauthorized' }, 401);
    const result = await testGitLabConnection(PAT_CONFIG);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns { success: false } when not configured', async () => {
    const result = await testGitLabConnection(EMPTY_CONFIG);
    expect(result.success).toBe(false);
  });
});

// ─── fetchEpicChildren ──────────────────────────────────────

describe('fetchEpicChildren', () => {
  it('fetches child epics and issues in parallel', async () => {
    // Two sequential mock responses: first for child epics, second for child issues
    mockJsonResponse([{ id: 10, iid: 1, title: 'Child Epic' }]);
    mockJsonResponse([{ id: 20, iid: 2, title: 'Child Issue' }]);

    const result = await fetchEpicChildren(PAT_CONFIG, '42', 5);
    expect(result.success).toBe(true);
    expect(result.data?.epics).toHaveLength(1);
    expect(result.data?.epics[0].type).toBe('epic');
    expect(result.data?.issues).toHaveLength(1);
    expect(result.data?.issues[0].type).toBe('issue');
  });
});

// ─── fetchGitLabFileContent ─────────────────────────────────

describe('fetchGitLabFileContent', () => {
  it('decodes base64 file content', async () => {
    const encoded = btoa('hello world');
    mockJsonResponse({ content: encoded });

    const result = await fetchGitLabFileContent(PAT_CONFIG, '100', 'README.md');
    expect(result.success).toBe(true);
    expect(result.data).toBe('hello world');
  });

  it('encodes file path in URL', async () => {
    mockJsonResponse({ content: btoa('test') });
    await fetchGitLabFileContent(PAT_CONFIG, '100', 'src/main.ts');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('src%2Fmain.ts');
  });
});

// ─── publishWithMergeRequest ────────────────────────────────

describe('publishWithMergeRequest', () => {
  it('orchestrates commit then MR and returns result', async () => {
    // First call: commit
    mockJsonResponse({ web_url: 'https://gitlab.com/commit/abc' });
    // Second call: MR
    mockJsonResponse({ web_url: 'https://gitlab.com/mr/1' });

    const result = await publishWithMergeRequest(PAT_CONFIG, '100', {
      branch: 'feature/epic-update',
      targetBranch: 'main',
      commitMessage: 'Update epic',
      mrTitle: 'Epic update MR',
      actions: [{ action: 'update', file_path: 'epic.md', content: '# Epic' }],
    });

    expect(result.success).toBe(true);
    expect(result.data?.merge_request_url).toBe('https://gitlab.com/mr/1');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('returns failure if commit fails', async () => {
    mockJsonResponse({ message: 'Branch exists' }, 400);

    const result = await publishWithMergeRequest(PAT_CONFIG, '100', {
      branch: 'feature/epic-update',
      targetBranch: 'main',
      commitMessage: 'Update epic',
      mrTitle: 'Epic update MR',
      actions: [{ action: 'update', file_path: 'epic.md', content: '# Epic' }],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('400');
  });
});

// ─── Auth headers on all fetch calls ────────────────────────

describe('auth headers on fetch calls', () => {
  it('PAT config sends PRIVATE-TOKEN header', async () => {
    mockJsonResponse([]);
    await fetchGroupLabels(PAT_CONFIG, '42');

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['PRIVATE-TOKEN']).toBe('glpat-abc123');
  });

  it('OAuth config sends Authorization: Bearer header', async () => {
    mockJsonResponse([]);
    await fetchGroupLabels(OAUTH_CONFIG, '42');

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['Authorization']).toBe('Bearer oauth-token-xyz');
  });
});
