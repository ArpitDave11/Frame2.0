import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the service module BEFORE importing the action layer so the
// dynamic resolution picks the mocks up. Each test resets the mocks.
vi.mock('./brpGitlabService', async () => {
  const actual = await vi.importActual<typeof import('./brpGitlabService')>(
    './brpGitlabService',
  );
  return {
    ...actual,
    fetchCrews: vi.fn(),
    fetchPods: vi.fn(),
    fetchPodEpics: vi.fn(),
  };
});

import {
  loadCrewsAction,
  loadPodsAction,
  listCandidateEpicsAction,
  confirmAddEpicsAction,
  updateCapacityAction,
} from './brpActions';
import { fetchCrews, fetchPods, fetchPodEpics } from './brpGitlabService';
import { useBrpStore } from '@/stores/brpStore';
import { useConfigStore } from '@/stores/configStore';
import type { Crew, Epic, Pod, FrameResult } from '@/domain/brp';

// ─── Fixtures ───────────────────────────────────────────────

const crew = (id: string, name: string, pods: Pod[] = [], gitlabGroupId = Number(id)): Crew => ({
  id,
  name,
  gitlabGroupId,
  pods,
});

const pod = (id: string, name: string, gitlabSubgroupId = Number(id.replace(/\D/g, '')) || 0): Pod => ({
  id,
  name,
  gitlabSubgroupId,
  capacity: {
    resources: 5,
    spPerResource: 10,
    sprintCount: 6,
    holidayDays: 2,
    leaveDays: 4,
  },
  epics: [],
});

const epic = (id: string, podId: string): Epic => ({
  id,
  iid: Number(id) || 0,
  title: `Epic ${id}`,
  description: 'a'.repeat(200),
  gitlabWebUrl: `https://gitlab/${id}`,
  podId,
  source: 'gitlab',
  humanEstimate: null,
  analysisStatus: 'raw',
  frameResult: null,
});

const frameResult = (estimate: number): FrameResult => ({
  frameEstimate: estimate as FrameResult['frameEstimate'],
  breakdown: [],
  rationale: 'r',
  confidence: 0.7,
  references: [],
  generatedStories: null,
  modelVersion: 'sim',
  analyzedAt: '2026-05-23T00:00:00Z',
});

// ─── Setup helpers ──────────────────────────────────────────

function resetAll() {
  useBrpStore.getState().reset();
  // Force gitlab.enabled=true with minimal config — the service mocks
  // bypass the real URL, so we just need the guard to pass.
  useConfigStore.setState((s) => ({
    config: {
      ...s.config,
      gitlab: {
        ...s.config.gitlab,
        enabled: true,
        baseUrl: 'https://gitlab.example/api/v4',
        accessToken: 'glpat-fake',
        rootGroupId: '999',
        defaultGroupId: '999',
      },
    },
  }));
  vi.mocked(fetchCrews).mockReset();
  vi.mocked(fetchPods).mockReset();
  vi.mocked(fetchPodEpics).mockReset();
}

// ─── Tests ──────────────────────────────────────────────────

describe('loadCrewsAction', () => {
  beforeEach(resetAll);

  it('stores the fetched crews on success', async () => {
    const fetched = [crew('1', 'Alpha'), crew('2', 'Bravo')];
    vi.mocked(fetchCrews).mockResolvedValue({ success: true, data: fetched });

    const result = await loadCrewsAction();
    expect(result.success).toBe(true);
    expect(useBrpStore.getState().crews.map((c) => c.id)).toEqual(['1', '2']);
  });

  it('replaces any previously-loaded crews (fresh GitLab slice)', async () => {
    useBrpStore.getState().loadCrew(crew('old', 'Old'));
    vi.mocked(fetchCrews).mockResolvedValue({
      success: true,
      data: [crew('1', 'Alpha')],
    });

    await loadCrewsAction();
    expect(useBrpStore.getState().crews.map((c) => c.id)).toEqual(['1']);
  });

  it('does NOT touch the store when the fetch fails', async () => {
    useBrpStore.getState().loadCrew(crew('old', 'Old'));
    vi.mocked(fetchCrews).mockResolvedValue({
      success: false,
      error: { code: 'network', message: 'boom' },
    });

    const result = await loadCrewsAction();
    expect(result.success).toBe(false);
    expect(useBrpStore.getState().crews.map((c) => c.id)).toEqual(['old']);
  });

  it('throws when GitLab is disabled', async () => {
    useConfigStore.setState((s) => ({
      config: { ...s.config, gitlab: { ...s.config.gitlab, enabled: false } },
    }));
    await expect(loadCrewsAction()).rejects.toThrow(/disabled/);
  });
});

describe('loadPodsAction', () => {
  beforeEach(resetAll);

  it('returns an error when the crewId is not loaded', async () => {
    const r = await loadPodsAction('unknown-crew');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.message).toMatch(/not loaded/);
    expect(vi.mocked(fetchPods)).not.toHaveBeenCalled();
  });

  it('dispatches loadPods on success', async () => {
    useBrpStore.getState().loadCrew(crew('1', 'Alpha'));
    vi.mocked(fetchPods).mockResolvedValue({
      success: true,
      data: [pod('p1', 'Pod A'), pod('p2', 'Pod B')],
    });

    const r = await loadPodsAction('1');
    expect(r.success).toBe(true);
    expect(useBrpStore.getState().crews[0]?.pods.map((p) => p.id)).toEqual(['p1', 'p2']);
  });

  it('calls fetchPods with the crew gitlabGroupId from the store', async () => {
    useBrpStore.getState().loadCrew(crew('1', 'Alpha', [], 5050));
    vi.mocked(fetchPods).mockResolvedValue({ success: true, data: [] });

    await loadPodsAction('1');
    expect(vi.mocked(fetchPods)).toHaveBeenCalledWith(expect.anything(), 5050);
  });

  it('does NOT touch the store on error', async () => {
    useBrpStore.getState().loadCrew(crew('1', 'Alpha', [pod('preexisting', 'Pre')]));
    vi.mocked(fetchPods).mockResolvedValue({
      success: false,
      error: { code: 'auth', message: 'unauthorized' },
    });

    await loadPodsAction('1');
    expect(useBrpStore.getState().crews[0]?.pods.map((p) => p.id)).toEqual(['preexisting']);
  });
});

describe('listCandidateEpicsAction', () => {
  beforeEach(resetAll);

  it('returns an error when the pod is not loaded', async () => {
    const r = await listCandidateEpicsAction('unknown-pod');
    expect(r.success).toBe(false);
    expect(vi.mocked(fetchPodEpics)).not.toHaveBeenCalled();
  });

  it('returns the fetched epics WITHOUT storing them', async () => {
    useBrpStore.getState().loadCrew(crew('1', 'Alpha', [pod('p1', 'Pod A', 100)]));
    const candidates = [epic('e1', 'p1'), epic('e2', 'p1')];
    vi.mocked(fetchPodEpics).mockResolvedValue({ success: true, data: candidates });

    const r = await listCandidateEpicsAction('p1');
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveLength(2);
    // Store unaffected — the picker decides what to commit.
    expect(useBrpStore.getState().crews[0]?.pods[0]?.epics).toEqual([]);
  });

  it('calls fetchPodEpics with the pod gitlabSubgroupId', async () => {
    useBrpStore.getState().loadCrew(crew('1', 'Alpha', [pod('p1', 'Pod A', 12345)]));
    vi.mocked(fetchPodEpics).mockResolvedValue({ success: true, data: [] });

    await listCandidateEpicsAction('p1');
    expect(vi.mocked(fetchPodEpics)).toHaveBeenCalledWith(expect.anything(), 12345);
  });
});

describe('confirmAddEpicsAction', () => {
  beforeEach(resetAll);

  it('dispatches loadEpicsIntoPod with the chosen list', () => {
    useBrpStore.getState().loadCrew(crew('1', 'Alpha', [pod('p1', 'Pod A')]));
    confirmAddEpicsAction('p1', [epic('e1', 'p1'), epic('e2', 'p1')]);
    expect(useBrpStore.getState().crews[0]?.pods[0]?.epics.map((e) => e.id)).toEqual([
      'e1',
      'e2',
    ]);
  });

  it('merges with existing epics (does not replace)', () => {
    useBrpStore.getState().loadCrew(crew('1', 'Alpha', [pod('p1', 'Pod A')]));
    useBrpStore.getState().loadEpicsIntoPod('p1', [epic('e0', 'p1')]);
    confirmAddEpicsAction('p1', [epic('e1', 'p1')]);
    const ids = useBrpStore.getState().crews[0]?.pods[0]?.epics.map((e) => e.id);
    expect(ids).toEqual(expect.arrayContaining(['e0', 'e1']));
  });
});

describe('updateCapacityAction', () => {
  beforeEach(resetAll);

  it('forwards inputs into the store', () => {
    useBrpStore.getState().loadCrew(crew('1', 'Alpha', [pod('p1', 'Pod A')]));
    updateCapacityAction('p1', {
      resources: 12,
      spPerResource: 10,
      sprintCount: 6,
      holidayDays: 0,
      leaveDays: 0,
    });
    expect(useBrpStore.getState().crews[0]?.pods[0]?.capacity.resources).toBe(12);
  });
});

describe('flow integration sanity', () => {
  beforeEach(resetAll);

  it('happy path: load crews → load pods → list candidates → confirm', async () => {
    vi.mocked(fetchCrews).mockResolvedValue({
      success: true,
      data: [crew('c1', 'C')],
    });
    vi.mocked(fetchPods).mockResolvedValue({
      success: true,
      data: [pod('p1', 'P', 200)],
    });
    const candidates = [
      { ...epic('e1', 'p1'), frameResult: frameResult(5) },
      epic('e2', 'p1'),
    ];
    vi.mocked(fetchPodEpics).mockResolvedValue({
      success: true,
      data: candidates,
    });

    await loadCrewsAction();
    await loadPodsAction('c1');
    const cands = await listCandidateEpicsAction('p1');
    expect(cands.success).toBe(true);
    if (cands.success) confirmAddEpicsAction('p1', cands.data);

    expect(useBrpStore.getState().crews[0]?.pods[0]?.epics).toHaveLength(2);
  });
});
