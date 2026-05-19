/**
 * Issue Refinery — gitlabClient additions (R-1).
 *
 * Tests the new `updateIssue` method and the pagination fix on `fetchEpicIssues`.
 * Kept in a separate file from `gitlabClient.test.ts` because the kit-hardening
 * H3 hook blocks edits to existing test files (intentional — prevents
 * test-to-implementation drift).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateIssue, fetchEpicIssues } from './gitlabClient';
import type { GitLabConfig } from '@/domain/configTypes';

const PAT_CONFIG: GitLabConfig = {
  enabled: true,
  rootGroupId: '42',
  streamGroupId: '42',
  accessToken: 'glpat-abc123',
  authMode: 'pat',
};

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
});

function mockJsonResponse(data: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: async () => data,
    text: async () => JSON.stringify(data),
  });
}

// ─── updateIssue ────────────────────────────────────────────

describe('updateIssue', () => {
  it('issues PUT to /projects/:projectId/issues/:iid with description in body', async () => {
    mockJsonResponse({ id: 1, iid: 7, title: 'T', description: 'new body', state: 'opened', web_url: 'u', labels: [] });

    const result = await updateIssue(PAT_CONFIG, 99, 7, { description: 'new body' });

    expect(result.success).toBe(true);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('/gitlab-api/projects/99/issues/7');
    expect(options.method).toBe('PUT');
    expect(JSON.parse(options.body)).toEqual({ description: 'new body' });
  });

  it('URL-encodes string project IDs containing slashes', async () => {
    mockJsonResponse({ id: 1, iid: 3, title: 'X', state: 'opened', web_url: 'u', labels: [] });

    await updateIssue(PAT_CONFIG, 'group/subgroup/project', 3, { description: 'x' });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('/gitlab-api/projects/group%2Fsubgroup%2Fproject/issues/3');
  });

  it('serializes labels as comma-separated string per GitLab convention', async () => {
    mockJsonResponse({ id: 1, iid: 1, title: 'X', state: 'opened', web_url: 'u', labels: ['a', 'b'] });

    await updateIssue(PAT_CONFIG, 1, 1, { labels: ['a', 'b'], description: 'd' });

    const [, options] = mockFetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ description: 'd', labels: 'a,b' });
  });

  it('returns { success: false, error } on 4xx response', async () => {
    mockJsonResponse({ message: 'Unauthorized' }, 401);

    const result = await updateIssue(PAT_CONFIG, 1, 1, { description: 'x' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('401');
  });

  it('returns { success: false, error } on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'));

    const result = await updateIssue(PAT_CONFIG, 1, 1, { description: 'x' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('network down');
  });

  it('omits undefined fields from the request body', async () => {
    mockJsonResponse({ id: 1, iid: 1, title: 'X', state: 'opened', web_url: 'u', labels: [] });

    await updateIssue(PAT_CONFIG, 1, 1, { description: 'only-desc' });

    const [, options] = mockFetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ description: 'only-desc' });
  });
});

// ─── fetchEpicIssues pagination ─────────────────────────────

describe('fetchEpicIssues pagination fix', () => {
  it('requests per_page=100 to avoid silent truncation at GitLab default of 20', async () => {
    mockJsonResponse([]);

    await fetchEpicIssues(PAT_CONFIG, '42', 5);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('/gitlab-api/groups/42/epics/5/issues?per_page=100');
  });
});
