import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchStreamTree, publishInitiativeEpics } from './initiativeService';
import * as client from './gitlabClient';

vi.mock('./gitlabClient');

const mockConfig = { enabled: true, rootGroupId: '1', streamGroupId: '280115', accessToken: 'tok', authMode: 'pat' as const } as any;

describe('fetchStreamTree', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns stream metadata + crew subgroups', async () => {
    vi.mocked(client.fetchGroupMetadata).mockResolvedValue({
      success: true,
      data: { id: 280115, name: 'Wealth', full_path: 'ubs/wealth', web_url: 'https://example.com', description: '', parent_id: null },
    });
    vi.mocked(client.fetchGitLabSubgroups).mockResolvedValue({
      success: true,
      data: [
        { id: '111', name: 'Crew Alpha', full_path: 'ubs/wealth/alpha' },
        { id: '222', name: 'Crew Beta', full_path: 'ubs/wealth/beta' },
      ],
    });

    const result = await fetchStreamTree(mockConfig, '280115');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.stream.name).toBe('Wealth');
      expect(result.data.crews).toHaveLength(2);
      expect(result.data.crews[0]!.id).toBe(111);
    }
  });

  it('returns error when metadata fails', async () => {
    vi.mocked(client.fetchGroupMetadata).mockResolvedValue({ success: false, error: '404' });
    const result = await fetchStreamTree(mockConfig, '999');
    expect(result.ok).toBe(false);
  });
});

describe('publishInitiativeEpics', () => {
  beforeEach(() => vi.resetAllMocks());

  it('creates stream epic then crew epics with parent_id linking', async () => {
    vi.mocked(client.createGitLabEpic)
      .mockResolvedValueOnce({ success: true, data: { id: 9001, iid: 1, title: 'Stream', group_id: 280115 } as any })
      .mockResolvedValueOnce({ success: true, data: { id: 9002, iid: 1, title: 'Alpha', group_id: 111 } as any });
    vi.mocked(client.updateGitLabEpic).mockResolvedValue({ success: true, data: {} as any });

    const result = await publishInitiativeEpics(mockConfig, {
      streamGroupId: 280115,
      streamTitle: 'Wealth Initiative',
      streamEpicMarkdown: '## Content',
      crews: [{ gitlabGroupId: 111, name: 'Alpha', refinedEpic: '## Alpha', localId: 'c1' }],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.streamEpicId).toBe(9001);
      expect(result.data.crewEpics[0]!.epicId).toBe(9002);
    }
    // Verify parent_id is GLOBAL streamEpic.id (9001), not iid
    expect(client.updateGitLabEpic).toHaveBeenCalledWith(
      mockConfig, '111', 1,
      expect.objectContaining({ parent_id: 9001 }),
    );
  });

  it('returns error on stream epic failure', async () => {
    vi.mocked(client.createGitLabEpic).mockResolvedValue({ success: false, error: '500' });
    const result = await publishInitiativeEpics(mockConfig, {
      streamGroupId: 280115, streamTitle: 'T', streamEpicMarkdown: 'm',
      crews: [{ gitlabGroupId: 111, name: 'A', refinedEpic: 'm', localId: 'c1' }],
    });
    expect(result.ok).toBe(false);
  });

  it('reports partial failure when crew epic creation fails', async () => {
    vi.mocked(client.createGitLabEpic)
      .mockResolvedValueOnce({ success: true, data: { id: 9001, iid: 1, title: 'Stream', group_id: 280115 } as any })
      .mockResolvedValueOnce({ success: false, error: 'quota exceeded' });

    const result = await publishInitiativeEpics(mockConfig, {
      streamGroupId: 280115, streamTitle: 'T', streamEpicMarkdown: 'm',
      crews: [{ gitlabGroupId: 111, name: 'FailCrew', refinedEpic: 'm', localId: 'c1' }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('FailCrew');
    }
  });

  it('reports partial failure when parent linking fails', async () => {
    vi.mocked(client.createGitLabEpic)
      .mockResolvedValueOnce({ success: true, data: { id: 9001, iid: 1, title: 'Stream', group_id: 280115 } as any })
      .mockResolvedValueOnce({ success: true, data: { id: 9002, iid: 1, title: 'Alpha', group_id: 111 } as any });
    vi.mocked(client.updateGitLabEpic).mockResolvedValue({ success: false, error: 'forbidden' });

    const result = await publishInitiativeEpics(mockConfig, {
      streamGroupId: 280115, streamTitle: 'T', streamEpicMarkdown: 'm',
      crews: [{ gitlabGroupId: 111, name: 'Alpha', refinedEpic: 'm', localId: 'c1' }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('parent linking failed');
    }
  });
});
