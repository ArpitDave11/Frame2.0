import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./brpGitlabService', async () => {
  const actual = await vi.importActual<typeof import('./brpGitlabService')>('./brpGitlabService');
  return { ...actual, createEpicWithStories: vi.fn() };
});
vi.mock('@/services/gitlab/gitlabClient', () => ({ fetchGroupProjects: vi.fn() }));

import { publishGeneratedEpicAction } from './brpActions';
import { createEpicWithStories } from './brpGitlabService';
import { fetchGroupProjects } from '@/services/gitlab/gitlabClient';
import { useBrpStore } from '@/stores/brpStore';
import { useConfigStore } from '@/stores/configStore';
import type { Pod, SizedStory } from '@/domain/brp';

const mockCreate = vi.mocked(createEpicWithStories);
const mockProjects = vi.mocked(fetchGroupProjects);

function story(t: string, p: SizedStory['points']): SizedStory {
  return { title: t, points: p, acceptanceCriteria: ['ac'], splitPattern: 'Path', provenance: 'frame-generated' };
}

const pod: Pod = {
  id: 'pod-1', name: 'Checkout Pod', gitlabSubgroupId: 101,
  capacity: { previousVelocity: 96, resources: 6, spPerResource: 10, sprintCount: 6, holidayDays: 0, leaveDays: 0 },
  epics: [],
};

const stories = [story('CSV export', 5), story('PDF export', 3), story('Async', 8)];
const epicContent = '# Export reports to CSV / PDF\n\nbody';

beforeEach(() => {
  vi.clearAllMocks();
  // enable GitLab
  const cfg = useConfigStore.getState().config;
  useConfigStore.setState({ config: { ...cfg, gitlab: { ...cfg.gitlab, enabled: true, accessToken: 't', rootGroupId: '1' } } });
  // seed a crew/pod
  useBrpStore.setState({ crews: [{ id: 'crew-1', name: 'Payments Crew', gitlabGroupId: 1, pods: [{ ...pod, epics: [] }] }] });
  mockProjects.mockResolvedValue({ success: true, data: [{ id: 555, name: 'web', path_with_namespace: 'p/web', web_url: '#', issues_enabled: true }] });
  mockCreate.mockResolvedValue({ success: true, data: { epicId: 900, epicIid: 12, webUrl: 'https://gl/epics/12', issueIds: [1, 2, 3], storyFailures: [] } });
});

describe('publishGeneratedEpicAction (T14)', () => {
  it('publishes the stories to the resolved project and returns success', async () => {
    const res = await publishGeneratedEpicAction('pod-1', stories, epicContent);
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(mockProjects).toHaveBeenCalledWith(expect.anything(), '101', { includeSubgroups: true });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const arg = mockCreate.mock.calls[0]![1];
    expect(arg.groupId).toBe('101');
    expect(arg.projectId).toBe('555');
    expect(arg.title).toBe('Export reports to CSV / PDF'); // from H1
    expect(arg.stories).toHaveLength(3);
    expect(res.data.epicId).toBe(900);
  });

  it('auto-loads the new epic into the pod with load = Σ story points (INV2)', async () => {
    const { computeEpicLoad } = await import('@/domain/brp');
    await publishGeneratedEpicAction('pod-1', stories, epicContent);
    const loadedPod = useBrpStore.getState().crews[0]!.pods[0]!;
    expect(loadedPod.epics).toHaveLength(1);
    const epic = loadedPod.epics[0]!;
    expect(epic.iid).toBe(12);
    expect(epic.frameResult?.stories?.map((s) => s.points)).toEqual([5, 3, 8]);
    expect(computeEpicLoad(epic)).toBe(16); // 5+3+8
  });

  it('errors when no project is available to hold the stories', async () => {
    mockProjects.mockResolvedValue({ success: true, data: [] });
    const res = await publishGeneratedEpicAction('pod-1', stories, epicContent);
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.message).toMatch(/no gitlab project/i);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('propagates a GitLab create failure', async () => {
    mockCreate.mockResolvedValue({ success: false, error: { code: 'auth', message: '403 denied' } });
    const res = await publishGeneratedEpicAction('pod-1', stories, epicContent);
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.message).toMatch(/403/);
    expect(useBrpStore.getState().crews[0]!.pods[0]!.epics).toHaveLength(0);
  });

  it('errors when the pod is not loaded', async () => {
    const res = await publishGeneratedEpicAction('pod-missing', stories, epicContent);
    expect(res.success).toBe(false);
  });
});
