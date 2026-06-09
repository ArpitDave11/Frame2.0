import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchGitLabSubgroups,
  fetchGroupEpics,
} from '../gitlab/gitlabClient';
import {
  DEFAULT_POD_CAPACITY,
  fetchCrews,
  fetchPodEpics,
  fetchPods,
  fetchReferenceEpics,
} from './brpGitlabService';
import { DEFAULT_SP_PER_RESOURCE } from '../../domain/brp.constants';
import type { GitLabConfig } from '../../domain/configTypes';
import type { GitLabEpic, GitLabSubgroup } from '../gitlab/types';

vi.mock('../gitlab/gitlabClient', () => ({
  fetchGitLabSubgroups: vi.fn(),
  fetchGroupEpics: vi.fn(),
}));

const mockedFetchGitLabSubgroups = vi.mocked(fetchGitLabSubgroups);
const mockedFetchGroupEpics = vi.mocked(fetchGroupEpics);

// ─── Fixtures ───────────────────────────────────────────────

function buildConfig(overrides: Partial<GitLabConfig> = {}): GitLabConfig {
  return {
    enabled: true,
    rootGroupId: '42',
    accessToken: 'fake-token',
    authMode: 'pat' as GitLabConfig['authMode'],
    ...overrides,
  };
}

function buildSubgroup(overrides: Partial<GitLabSubgroup> = {}): GitLabSubgroup {
  return {
    id: '100',
    name: 'Sample Subgroup',
    full_path: 'root/sample',
    ...overrides,
  };
}

function buildGitLabEpic(overrides: Partial<GitLabEpic> = {}): GitLabEpic {
  return {
    id: 9001,
    iid: 12,
    title: 'GitLab epic title',
    description: 'An epic body.',
    state: 'opened',
    web_url: 'https://gitlab.example/groups/x/-/epics/12',
    labels: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    group_id: 100,
    ...overrides,
  };
}

beforeEach(() => {
  mockedFetchGitLabSubgroups.mockReset();
  mockedFetchGroupEpics.mockReset();
});

// ─── fetchCrews ─────────────────────────────────────────────

describe('fetchCrews', () => {
  it('maps each top-level subgroup to a Crew with empty pods', async () => {
    mockedFetchGitLabSubgroups.mockResolvedValueOnce({
      success: true,
      data: [
        buildSubgroup({ id: '10', name: 'Alpha Crew' }),
        buildSubgroup({ id: '20', name: 'Bravo Crew' }),
      ],
    });
    const result = await fetchCrews(buildConfig({ rootGroupId: '42' }));
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({
      id: '10',
      name: 'Alpha Crew',
      gitlabGroupId: 10,
      pods: [],
    });
    expect(result.data[1]).toEqual({
      id: '20',
      name: 'Bravo Crew',
      gitlabGroupId: 20,
      pods: [],
    });
    expect(mockedFetchGitLabSubgroups).toHaveBeenCalledWith(
      expect.any(Object),
      '42',
    );
  });

  it("returns error.code='unknown' when rootGroupId is empty", async () => {
    const result = await fetchCrews(buildConfig({ rootGroupId: '' }));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe('unknown');
    expect(result.error.message).toContain('rootGroupId');
    expect(mockedFetchGitLabSubgroups).not.toHaveBeenCalled();
  });

  it('propagates GitLab errors as a structured error result (does not throw)', async () => {
    mockedFetchGitLabSubgroups.mockResolvedValueOnce({
      success: false,
      error: 'GitLab API error (401): unauthorized',
    });
    const result = await fetchCrews(buildConfig());
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe('auth');
    expect(result.error.message).toBe('GitLab API error (401): unauthorized');
  });

  it('handles empty GitLab response (no subgroups) gracefully', async () => {
    mockedFetchGitLabSubgroups.mockResolvedValueOnce({
      success: true,
      data: [],
    });
    const result = await fetchCrews(buildConfig());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toEqual([]);
  });

  it('[live-smoke regression] coerces NUMERIC subgroup id from GitLab to BRP string id', async () => {
    const subgroupWithNumericId = {
      id: 131025594,
      name: 'Crew-Alpha',
      full_path: 'wma-test-stream/crew-alpha',
    } as unknown as GitLabSubgroup;

    mockedFetchGitLabSubgroups.mockResolvedValueOnce({
      success: true,
      data: [subgroupWithNumericId],
    });
    const result = await fetchCrews(buildConfig());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data[0]).toEqual({
      id: '131025594',
      name: 'Crew-Alpha',
      gitlabGroupId: 131025594,
      pods: [],
    });
    expect(typeof result.data[0]!.id).toBe('string');
    expect(typeof result.data[0]!.gitlabGroupId).toBe('number');
  });
});

// ─── Error code discrimination (B-16, deep-review I8) ────

describe('brpGitlabService — error code discrimination', () => {
  it("HTTP 401 → error.code = 'auth'", async () => {
    mockedFetchGitLabSubgroups.mockResolvedValueOnce({
      success: false,
      error: 'GitLab API error (401): {"message":"401 Unauthorized"}',
    });
    const result = await fetchCrews(buildConfig());
    if (result.success) throw new Error('expected failure');
    expect(result.error.code).toBe('auth');
  });

  it("HTTP 403 → error.code = 'auth'", async () => {
    mockedFetchGitLabSubgroups.mockResolvedValueOnce({
      success: false,
      error: 'GitLab API error (403): forbidden',
    });
    const result = await fetchCrews(buildConfig());
    if (result.success) throw new Error('expected failure');
    expect(result.error.code).toBe('auth');
  });

  it("HTTP 429 → error.code = 'ratelimit'", async () => {
    mockedFetchGitLabSubgroups.mockResolvedValueOnce({
      success: false,
      error: 'GitLab API error (429): rate limit exceeded',
    });
    const result = await fetchPods(buildConfig(), 10);
    if (result.success) throw new Error('expected failure');
    expect(result.error.code).toBe('ratelimit');
  });

  it("HTTP 500/502/503 → error.code = 'network' (server failures are retryable)", async () => {
    for (const status of [500, 502, 503]) {
      mockedFetchGitLabSubgroups.mockResolvedValueOnce({
        success: false,
        error: `GitLab API error (${status}): server error`,
      });
      const result = await fetchPods(buildConfig(), 10);
      if (result.success) throw new Error('expected failure');
      expect(result.error.code).toBe('network');
    }
  });

  it("HTTP 404 (or other 4xx) → error.code = 'unknown'", async () => {
    mockedFetchGitLabSubgroups.mockResolvedValueOnce({
      success: false,
      error: 'GitLab API error (404): not found',
    });
    const result = await fetchPods(buildConfig(), 10);
    if (result.success) throw new Error('expected failure');
    expect(result.error.code).toBe('unknown');
  });

  it("network-marker strings → error.code = 'network'", async () => {
    for (const msg of [
      'fetch failed',
      'ENOTFOUND gitlab.example',
      'ECONNREFUSED 1.2.3.4:443',
      'request timeout',
    ]) {
      mockedFetchGitLabSubgroups.mockResolvedValueOnce({ success: false, error: msg });
      const result = await fetchPods(buildConfig(), 10);
      if (result.success) throw new Error(`expected failure for "${msg}"`);
      expect(result.error.code).toBe('network');
    }
  });

  it("non-HTTP, non-network strings → error.code = 'unknown'", async () => {
    mockedFetchGitLabSubgroups.mockResolvedValueOnce({
      success: false,
      error: 'something weird happened',
    });
    const result = await fetchPods(buildConfig(), 10);
    if (result.success) throw new Error('expected failure');
    expect(result.error.code).toBe('unknown');
  });

  it('undefined error string from gitlabClient → falls back to fallback message + unknown', async () => {
    mockedFetchGitLabSubgroups.mockResolvedValueOnce({
      success: false,
      error: undefined as unknown as string,
    });
    const result = await fetchPods(buildConfig(), 10);
    if (result.success) throw new Error('expected failure');
    expect(result.error.code).toBe('unknown');
    expect(result.error.message).toBe('Failed to fetch pods');
  });
});

// ─── fetchPods ──────────────────────────────────────────────

describe('fetchPods', () => {
  it('maps each subgroup under the crew to a Pod with default capacity', async () => {
    mockedFetchGitLabSubgroups.mockResolvedValueOnce({
      success: true,
      data: [
        buildSubgroup({ id: '101', name: 'Checkout Pod' }),
        buildSubgroup({ id: '102', name: 'Billing Pod' }),
      ],
    });
    const result = await fetchPods(buildConfig(), 10);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({
      id: '101',
      name: 'Checkout Pod',
      gitlabSubgroupId: 101,
      capacity: { ...DEFAULT_POD_CAPACITY },
      epics: [],
    });
    expect(result.data[0]!.capacity.spPerResource).toBe(DEFAULT_SP_PER_RESOURCE);
  });

  it('returned Pod has a CapacityInputs object with all 5 numeric fields', async () => {
    mockedFetchGitLabSubgroups.mockResolvedValueOnce({
      success: true,
      data: [buildSubgroup({ id: '101' })],
    });
    const result = await fetchPods(buildConfig(), 10);
    if (!result.success) throw new Error('expected success');
    const cap = result.data[0]!.capacity;
    expect(Object.keys(cap).sort()).toEqual(
      ['holidayDays', 'leaveDays', 'resources', 'spPerResource', 'sprintCount'].sort(),
    );
    for (const key of Object.keys(cap)) {
      expect(typeof cap[key as keyof typeof cap]).toBe('number');
    }
  });

  it('passes the crewGroupId as a string to gitlabClient (matching its API)', async () => {
    mockedFetchGitLabSubgroups.mockResolvedValueOnce({
      success: true,
      data: [],
    });
    await fetchPods(buildConfig(), 999);
    expect(mockedFetchGitLabSubgroups).toHaveBeenCalledWith(
      expect.any(Object),
      '999',
    );
  });

  it('propagates GitLab errors as a structured error result', async () => {
    mockedFetchGitLabSubgroups.mockResolvedValueOnce({
      success: false,
      error: 'network timeout',
    });
    const result = await fetchPods(buildConfig(), 10);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe('network');
    expect(result.error.message).toBe('network timeout');
  });

  it('[live-smoke regression] coerces NUMERIC subgroup id from GitLab to BRP string id', async () => {
    const podSubgroup = {
      id: 131025595,
      name: 'Pod-A1',
      full_path: 'wma-test-stream/crew-alpha/pod-a1',
    } as unknown as GitLabSubgroup;
    mockedFetchGitLabSubgroups.mockResolvedValueOnce({
      success: true,
      data: [podSubgroup],
    });
    const result = await fetchPods(buildConfig(), 131025594);
    if (!result.success) throw new Error('expected success');
    expect(result.data[0]).toEqual({
      id: '131025595',
      name: 'Pod-A1',
      gitlabSubgroupId: 131025595,
      capacity: { ...DEFAULT_POD_CAPACITY },
      epics: [],
    });
    expect(typeof result.data[0]!.id).toBe('string');
    expect(typeof result.data[0]!.gitlabSubgroupId).toBe('number');
  });
});

// ─── fetchPodEpics ──────────────────────────────────────────

describe('fetchPodEpics', () => {
  it("maps each GitLab epic to a BRP Epic with analysisStatus: 'raw' and frameResult: null", async () => {
    mockedFetchGroupEpics.mockResolvedValueOnce({
      success: true,
      data: [
        buildGitLabEpic({ id: 9001, iid: 1, title: 'E1' }),
        buildGitLabEpic({ id: 9002, iid: 2, title: 'E2' }),
      ],
      totalCount: 2,
    });
    const result = await fetchPodEpics(buildConfig(), 101);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toHaveLength(2);
    for (const epic of result.data) {
      expect(epic.analysisStatus).toBe('raw');
      expect(epic.frameResult).toBeNull();
      expect(epic.humanEstimate).toBeNull();
      expect(epic.source).toBe('gitlab');
      expect(epic.podId).toBe('101');
    }
  });

  it('coerces GitLab numeric id to a BRP string id', async () => {
    mockedFetchGroupEpics.mockResolvedValueOnce({
      success: true,
      data: [buildGitLabEpic({ id: 9001 })],
      totalCount: 1,
    });
    const result = await fetchPodEpics(buildConfig(), 101);
    if (!result.success) throw new Error('expected success');
    expect(result.data[0]!.id).toBe('9001');
    expect(typeof result.data[0]!.id).toBe('string');
  });

  it('normalizes a missing description to empty string (so variance heuristic does not null-check)', async () => {
    mockedFetchGroupEpics.mockResolvedValueOnce({
      success: true,
      data: [buildGitLabEpic({ description: null as unknown as string })],
      totalCount: 1,
    });
    const result = await fetchPodEpics(buildConfig(), 101);
    if (!result.success) throw new Error('expected success');
    expect(result.data[0]!.description).toBe('');
    expect(typeof result.data[0]!.description).toBe('string');
  });

  it('filters to opened epics with per_page=100', async () => {
    mockedFetchGroupEpics.mockResolvedValueOnce({
      success: true,
      data: [],
      totalCount: 0,
    });
    await fetchPodEpics(buildConfig(), 101);
    expect(mockedFetchGroupEpics).toHaveBeenCalledWith(
      expect.any(Object),
      '101',
      { state: 'opened', per_page: 100 },
    );
  });

  it('propagates GitLab errors as a structured error result', async () => {
    mockedFetchGroupEpics.mockResolvedValueOnce({
      success: false,
      error: 'GitLab API error (403): forbidden',
    });
    const result = await fetchPodEpics(buildConfig(), 101);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe('auth');
    expect(result.error.message).toBe('GitLab API error (403): forbidden');
  });

  it('never pre-fills frameResult, even if GitLab response includes spurious fields', async () => {
    const spurious = {
      ...buildGitLabEpic({ id: 9001 }),
      frameResult: { frameEstimate: 13, leakage: true },
      variance: 'agree',
    } as unknown as GitLabEpic;
    mockedFetchGroupEpics.mockResolvedValueOnce({
      success: true,
      data: [spurious],
      totalCount: 1,
    });
    const result = await fetchPodEpics(buildConfig(), 101);
    if (!result.success) throw new Error('expected success');
    const epic = result.data[0]!;
    expect(epic.frameResult).toBeNull();
    expect(epic).not.toHaveProperty('variance');
  });
});

// ─── fetchReferenceEpics ────────────────────────────────────

describe('fetchReferenceEpics', () => {
  it('filters to state=closed and maps to ReferenceEpic with placeholder similarity', async () => {
    mockedFetchGroupEpics.mockResolvedValueOnce({
      success: true,
      data: [
        buildGitLabEpic({ id: 7001, title: 'Past epic', labels: ['SP-13'] }),
      ],
      totalCount: 1,
    });
    const result = await fetchReferenceEpics(buildConfig(), 101);
    if (!result.success) throw new Error('expected success');
    expect(result.data[0]).toEqual({
      epicId: '7001',
      title: 'Past epic',
      similarity: 0.5,
      actualSp: 13,
    });
    expect(mockedFetchGroupEpics).toHaveBeenCalledWith(
      expect.any(Object),
      '101',
      { state: 'closed', per_page: 100 },
    );
  });

  it('parses actualSp from various SP label formats', async () => {
    mockedFetchGroupEpics.mockResolvedValueOnce({
      success: true,
      data: [
        buildGitLabEpic({ id: 1, labels: ['SP-13'] }),
        buildGitLabEpic({ id: 2, labels: ['sp:8'] }),
        buildGitLabEpic({ id: 3, labels: ['SP 21'] }),
        buildGitLabEpic({ id: 4, labels: ['sp_5'] }),
        buildGitLabEpic({ id: 5, labels: ['SP100'] }),
      ],
      totalCount: 5,
    });
    const result = await fetchReferenceEpics(buildConfig(), 101);
    if (!result.success) throw new Error('expected success');
    expect(result.data.map((r) => r.actualSp)).toEqual([13, 8, 21, 5, 100]);
  });

  it('returns actualSp=0 when no SP label is present', async () => {
    mockedFetchGroupEpics.mockResolvedValueOnce({
      success: true,
      data: [
        buildGitLabEpic({ id: 1, labels: ['enhancement', 'backend'] }),
      ],
      totalCount: 1,
    });
    const result = await fetchReferenceEpics(buildConfig(), 101);
    if (!result.success) throw new Error('expected success');
    expect(result.data[0]!.actualSp).toBe(0);
  });

  it('returns actualSp=0 when the SP label is malformed', async () => {
    mockedFetchGroupEpics.mockResolvedValueOnce({
      success: true,
      data: [
        buildGitLabEpic({ id: 1, labels: ['SP-abc'] }),
        buildGitLabEpic({ id: 2, labels: ['Story Points 13'] }),
      ],
      totalCount: 2,
    });
    const result = await fetchReferenceEpics(buildConfig(), 101);
    if (!result.success) throw new Error('expected success');
    expect(result.data.map((r) => r.actualSp)).toEqual([0, 0]);
  });

  it('similarity is always the placeholder 0.5 (P7 will compute real values)', async () => {
    mockedFetchGroupEpics.mockResolvedValueOnce({
      success: true,
      data: [
        buildGitLabEpic({ id: 1 }),
        buildGitLabEpic({ id: 2 }),
        buildGitLabEpic({ id: 3 }),
      ],
      totalCount: 3,
    });
    const result = await fetchReferenceEpics(buildConfig(), 101);
    if (!result.success) throw new Error('expected success');
    for (const ref of result.data) {
      expect(ref.similarity).toBe(0.5);
    }
  });

  it('propagates GitLab errors as a structured error result', async () => {
    mockedFetchGroupEpics.mockResolvedValueOnce({
      success: false,
      error: 'service unavailable',
    });
    const result = await fetchReferenceEpics(buildConfig(), 101);
    expect(result.success).toBe(false);
    if (result.success) return;
    // No HTTP status in the string; no network markers; → 'unknown'
    expect(result.error.code).toBe('unknown');
    expect(result.error.message).toBe('service unavailable');
  });
});
