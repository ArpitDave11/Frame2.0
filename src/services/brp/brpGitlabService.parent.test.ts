/**
 * brpGitlabService — BRP root anchoring.
 *
 * BRP starts the portfolio one level ABOVE the configured Settings group:
 * `rootGroupId` is itself a crew, so its PARENT is the group that holds
 * every crew. `fetchCrews` resolves that parent via the group metadata's
 * `parent_id` and fetches crews from the parent — falling back to
 * `rootGroupId` when there is no parent (top-level) or the lookup fails.
 *
 * (The Requirement model keeps using `rootGroupId` as-is — only BRP climbs
 * to the parent.)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchGitLabSubgroups,
  fetchGroupMetadata,
} from '../gitlab/gitlabClient';
import { fetchCrews } from './brpGitlabService';
import type { GitLabConfig } from '../../domain/configTypes';

vi.mock('../gitlab/gitlabClient', () => ({
  fetchGitLabSubgroups: vi.fn(),
  fetchGroupEpics: vi.fn(),
  fetchGroupMetadata: vi.fn(),
}));

const mockedSubgroups = vi.mocked(fetchGitLabSubgroups);
const mockedMetadata = vi.mocked(fetchGroupMetadata);

function buildConfig(overrides: Partial<GitLabConfig> = {}): GitLabConfig {
  return {
    enabled: true,
    rootGroupId: '131024666',
    streamGroupId: '',
    accessToken: 'fake-token',
    authMode: 'pat' as GitLabConfig['authMode'],
    ...overrides,
  };
}

beforeEach(() => {
  mockedSubgroups.mockReset();
  mockedMetadata.mockReset();
});

describe('fetchCrews — anchors at the parent of the configured group', () => {
  it('resolves parent_id of rootGroupId and fetches crews from the parent', async () => {
    mockedMetadata.mockResolvedValueOnce({
      success: true,
      data: {
        id: 131024666,
        name: 'Crew-Alpha',
        full_path: 'wma/crew-alpha',
        web_url: 'https://gitlab/x',
        parent_id: 777,
      },
    });
    mockedSubgroups.mockResolvedValueOnce({
      success: true,
      data: [{ id: '131024666', name: 'Crew-Alpha', full_path: 'wma/crew-alpha' }],
    });

    const res = await fetchCrews(buildConfig());

    // Parent was looked up for the configured group…
    expect(mockedMetadata).toHaveBeenCalledWith(expect.anything(), '131024666');
    // …and crews were fetched from the PARENT (777), not the configured id.
    expect(mockedSubgroups).toHaveBeenCalledWith(expect.anything(), '777');
    expect(res.success).toBe(true);
  });

  it('falls back to rootGroupId when the group has no parent (top-level)', async () => {
    mockedMetadata.mockResolvedValueOnce({
      success: true,
      data: {
        id: 131024666,
        name: 'Root',
        full_path: 'root',
        web_url: 'https://gitlab/x',
        parent_id: null,
      },
    });
    mockedSubgroups.mockResolvedValueOnce({ success: true, data: [] });

    await fetchCrews(buildConfig());

    expect(mockedSubgroups).toHaveBeenCalledWith(expect.anything(), '131024666');
  });

  it('falls back to rootGroupId when the metadata lookup fails', async () => {
    mockedMetadata.mockResolvedValueOnce({ success: false, error: 'boom' });
    mockedSubgroups.mockResolvedValueOnce({ success: true, data: [] });

    await fetchCrews(buildConfig());

    expect(mockedSubgroups).toHaveBeenCalledWith(expect.anything(), '131024666');
  });
});
