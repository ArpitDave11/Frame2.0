import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createGitLabEpic,
  createGitLabIssue,
  linkIssueToEpic,
  updateGitLabEpic,
} from '../gitlab/gitlabClient';
import { createEpicWithStories, updateEpicWithStories } from './brpGitlabService';
import type { GitLabConfig } from '../../domain/configTypes';
import type { SizedStory } from '../../domain/brp';

vi.mock('../gitlab/gitlabClient', () => ({
  createGitLabEpic: vi.fn(),
  createGitLabIssue: vi.fn(),
  linkIssueToEpic: vi.fn(),
  updateGitLabEpic: vi.fn(),
}));

const mockCreateEpic = vi.mocked(createGitLabEpic);
const mockCreateIssue = vi.mocked(createGitLabIssue);
const mockLink = vi.mocked(linkIssueToEpic);
const mockUpdateEpic = vi.mocked(updateGitLabEpic);

const config: GitLabConfig = {
  enabled: true, rootGroupId: '42', streamGroupId: '', accessToken: 't',
  authMode: 'pat' as GitLabConfig['authMode'],
};

function story(overrides: Partial<SizedStory> = {}): SizedStory {
  return {
    title: 's', points: 5, acceptanceCriteria: ['ac1'],
    splitPattern: 'Path', provenance: 'frame-generated', ...overrides,
  };
}

const epicData = { id: 900, iid: 12, web_url: 'https://gl/epics/12', title: 'E', description: 'd', state: 'opened', labels: [], created_at: '', updated_at: '', group_id: 100 };
const issue = (id: number) => ({ id, iid: id, title: 's', state: 'opened', web_url: 'u', labels: [] });

const input = {
  groupId: '100', projectId: '200', title: 'Checkout', description: 'body',
  stories: [story({ title: 'a', points: 3 }), story({ title: 'b', points: 8 })],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateEpic.mockResolvedValue({ success: true, data: epicData });
  mockCreateIssue.mockResolvedValueOnce({ success: true, data: issue(501) })
    .mockResolvedValueOnce({ success: true, data: issue(502) });
  mockLink.mockResolvedValue({ success: true });
  mockUpdateEpic.mockResolvedValue({ success: true, data: epicData });
});

describe('createEpicWithStories (T12)', () => {
  it('creates the epic, then creates + links every story as a child issue', async () => {
    const res = await createEpicWithStories(config, input);
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(mockCreateEpic).toHaveBeenCalledTimes(1);
    expect(mockCreateIssue).toHaveBeenCalledTimes(2);
    expect(mockLink).toHaveBeenCalledTimes(2);
    expect(res.data.epicIid).toBe(12);
    expect(res.data.issueIds).toEqual([501, 502]);
    expect(res.data.storyFailures).toEqual([]);
  });

  it('maps story points to issue weight and SPIDR to a split:: label', async () => {
    await createEpicWithStories(config, input);
    const firstIssueArgs = mockCreateIssue.mock.calls[0]!;
    expect(firstIssueArgs[1]).toBe('200'); // projectId
    expect(firstIssueArgs[2].weight).toBe(3);
    expect(firstIssueArgs[2].labels).toContain('split::Path');
    expect(firstIssueArgs[2].description).toMatch(/Acceptance criteria/);
  });

  it('aborts with an error when epic creation fails (nothing orphaned)', async () => {
    mockCreateEpic.mockReset().mockResolvedValue({ success: false, error: 'GitLab API error (403): no' });
    const res = await createEpicWithStories(config, input);
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.code).toBe('auth');
    expect(mockCreateIssue).not.toHaveBeenCalled();
  });

  it('collects per-story failures but still returns the created epic', async () => {
    mockCreateIssue.mockReset()
      .mockResolvedValueOnce({ success: true, data: issue(501) })
      .mockResolvedValueOnce({ success: false, error: 'GitLab API error (500): boom' });
    const res = await createEpicWithStories(config, input);
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.issueIds).toEqual([501]);
    expect(res.data.storyFailures).toHaveLength(1);
    expect(res.data.storyFailures[0]!.title).toBe('b');
  });

  it('records a failure when linking fails', async () => {
    mockLink.mockReset()
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: 'GitLab API error (404): nope' });
    const res = await createEpicWithStories(config, input);
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.issueIds).toEqual([501]);
    expect(res.data.storyFailures).toHaveLength(1);
  });
});

describe('updateEpicWithStories (re-analyze publish, T12)', () => {
  it('updates the epic body then creates + links the new stories', async () => {
    const res = await updateEpicWithStories(config, 12, input);
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(mockUpdateEpic).toHaveBeenCalledTimes(1);
    expect(mockUpdateEpic.mock.calls[0]![2]).toBe(12); // epicIid
    expect(res.data.issueIds).toEqual([501, 502]);
  });
});
