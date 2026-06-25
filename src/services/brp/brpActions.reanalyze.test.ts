import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./brpGitlabService', async () => {
  const actual = await vi.importActual<typeof import('./brpGitlabService')>('./brpGitlabService');
  return { ...actual, updateEpicWithStories: vi.fn() };
});
vi.mock('@/services/gitlab/gitlabClient', () => ({ fetchGroupProjects: vi.fn() }));

import { publishReanalyzedEpicAction } from './brpActions';
import { updateEpicWithStories } from './brpGitlabService';
import { fetchGroupProjects } from '@/services/gitlab/gitlabClient';
import { computeEpicLoad } from '@/domain/brp';
import { useBrpStore } from '@/stores/brpStore';
import { useConfigStore } from '@/stores/configStore';
import type { Epic, Pod, SizedStory } from '@/domain/brp';

const mockUpdate = vi.mocked(updateEpicWithStories);
const mockProjects = vi.mocked(fetchGroupProjects);

function story(t: string, p: SizedStory['points']): SizedStory {
  return { title: t, points: p, acceptanceCriteria: ['ac'], splitPattern: 'Path', provenance: 'frame-generated' };
}

const storylessEpic: Epic = {
  id: 'e8', iid: 212, title: 'Fraud rule engine', description: 'thin', gitlabWebUrl: '#',
  podId: 'pod-1', source: 'gitlab', humanEstimate: null, analysisStatus: 'raw', frameResult: null,
};

const pod: Pod = {
  id: 'pod-1', name: 'Wallet Pod', gitlabSubgroupId: 102,
  capacity: { previousVelocity: 60, resources: 6, spPerResource: 10, sprintCount: 6, holidayDays: 0, leaveDays: 0 },
  epics: [storylessEpic],
};

const stories = [story('Detect velocity spikes', 8), story('Rule config UI', 5)];

beforeEach(() => {
  vi.clearAllMocks();
  const cfg = useConfigStore.getState().config;
  useConfigStore.setState({ config: { ...cfg, gitlab: { ...cfg.gitlab, enabled: true, accessToken: 't', rootGroupId: '1' } } });
  useBrpStore.setState({ crews: [{ id: 'crew-1', name: 'Payments Crew', gitlabGroupId: 1, pods: [{ ...pod, epics: [{ ...storylessEpic }] }] }] });
  mockProjects.mockResolvedValue({ success: true, data: [{ id: 555, name: 'web', path_with_namespace: 'p/web', web_url: '#', issues_enabled: true }] });
  mockUpdate.mockResolvedValue({ success: true, data: { epicId: 800, epicIid: 212, webUrl: '#', issueIds: [1, 2], storyFailures: [] } });
});

describe('publishReanalyzedEpicAction (T15)', () => {
  it('updates the existing epic and refreshes its decomposition in place', async () => {
    const res = await publishReanalyzedEpicAction('pod-1', 'e8', stories, '# Fraud rule engine\n\nrefined');
    expect(res.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mock.calls[0]![1]).toBe(212); // epic iid

    const epic = useBrpStore.getState().crews[0]!.pods[0]!.epics[0]!;
    expect(epic.analysisStatus).toBe('done');
    expect(epic.frameResult?.stories?.map((s) => s.points)).toEqual([8, 5]);
    expect(computeEpicLoad(epic)).toBe(13); // 8+5, INV2
    // epic count unchanged (update, not add)
    expect(useBrpStore.getState().crews[0]!.pods[0]!.epics).toHaveLength(1);
  });

  it('propagates an update failure without mutating the epic', async () => {
    mockUpdate.mockResolvedValue({ success: false, error: { code: 'network', message: '500 server' } });
    const res = await publishReanalyzedEpicAction('pod-1', 'e8', stories, '# x');
    expect(res.success).toBe(false);
    expect(useBrpStore.getState().crews[0]!.pods[0]!.epics[0]!.frameResult).toBeNull();
  });
});
