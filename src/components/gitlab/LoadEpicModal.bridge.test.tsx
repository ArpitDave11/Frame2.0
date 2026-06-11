/**
 * Regression test for the Issue Refinery bridge contract.
 *
 * Bug: LoadEpicModal.handleEpicClick set only loadedEpicContext (iid + groupId)
 * but NOT gitlabStore.selectedEpic. IssueRefineryView's bridge effect bails out
 * unless `selectedEpic` is non-null and `selectedEpic.iid === loadedEpicIid`, so
 * it never fetched child issues — Issue Refinery appeared broken (epic "loaded"
 * toast, but empty child-issue pane).
 *
 * Separate file from LoadEpicModal.test.tsx because the kit hardening hook
 * forbids editing existing test files (add a new one instead).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoadEpicModal } from './LoadEpicModal';
import { useConfigStore } from '@/stores/configStore';
import { useEpicStore } from '@/stores/epicStore';
import { useGitlabStore } from '@/stores/gitlabStore';
import { useUiStore } from '@/stores/uiStore';

vi.mock('@/services/gitlab/gitlabClient', () => ({
  fetchGroupEpics: vi.fn(),
  fetchEpicDetails: vi.fn(),
  fetchGroupMetadata: vi.fn(),
  fetchGitLabSubgroups: vi.fn(),
}));

import { fetchGroupEpics, fetchEpicDetails, fetchGroupMetadata, fetchGitLabSubgroups } from '@/services/gitlab/gitlabClient';

const mockFetchGroupEpics = vi.mocked(fetchGroupEpics);
const mockFetchEpicDetails = vi.mocked(fetchEpicDetails);
const mockFetchGroupMetadata = vi.mocked(fetchGroupMetadata);
const mockFetchGitLabSubgroups = vi.mocked(fetchGitLabSubgroups);

// Epic lives in a SUBGROUP (group_id 20), mirroring the real pod-a* shape where
// epic iids are per-group and the child-issue fetch must use the epic's own group.
const SUBGROUP_EPIC = {
  id: 1, iid: 7, title: 'Pod-A1 Feature (Child Epic)', description: '## Spec',
  state: 'opened', web_url: '', labels: [], created_at: '', updated_at: '', group_id: 20,
};

function setupConfigured() {
  useConfigStore.setState({
    config: {
      ...useConfigStore.getState().config,
      gitlab: { enabled: true, rootGroupId: '10', streamGroupId: '', accessToken: 'tok', authMode: 'pat' },
    },
  });
  mockFetchGroupMetadata.mockResolvedValue({ success: true, data: { id: 10, name: 'Root', full_path: 'root', web_url: '', parent_id: null, description: '' } });
  mockFetchGitLabSubgroups.mockResolvedValue({ success: true, data: [] });
  mockFetchGroupEpics.mockResolvedValue({ success: true, data: [SUBGROUP_EPIC] });
  // Epic details echo the same iid + group_id, as the real API does.
  mockFetchEpicDetails.mockResolvedValue({ success: true, data: SUBGROUP_EPIC });
}

beforeEach(() => {
  useConfigStore.setState(useConfigStore.getInitialState());
  useEpicStore.setState(useEpicStore.getInitialState());
  useGitlabStore.setState(useGitlabStore.getInitialState());
  useUiStore.setState(useUiStore.getInitialState());
  vi.clearAllMocks();
});

describe('LoadEpicModal → Issue Refinery bridge contract', () => {
  it('clicking an epic populates gitlabStore.selectedEpic with the matching iid/group', async () => {
    setupConfigured();
    useUiStore.setState({ activeModal: 'loadEpic' });
    render(<LoadEpicModal />);

    await waitFor(() => {
      expect(screen.getAllByTestId('epic-card')).toHaveLength(1);
    });

    fireEvent.click(screen.getAllByTestId('epic-card')[0]!);

    await waitFor(() => {
      expect(useGitlabStore.getState().selectedEpic).not.toBeNull();
    });

    const gl = useGitlabStore.getState();
    // The invariant IssueRefineryView's bridge effect requires:
    expect(gl.selectedEpic?.iid).toBe(7);
    expect(gl.loadedEpicIid).toBe(7);
    expect(gl.selectedEpic?.iid).toBe(gl.loadedEpicIid);
    // Child-issue fetch must target the epic's OWN subgroup, not the root group.
    expect(gl.loadedGroupId).toBe('20');
  });
});
