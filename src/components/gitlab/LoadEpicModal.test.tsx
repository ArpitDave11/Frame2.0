/**
 * Tests for LoadEpicModal — GitLab epic loading modal.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoadEpicModal } from './LoadEpicModal';
import { useConfigStore } from '@/stores/configStore';
import { useEpicStore } from '@/stores/epicStore';
import { useUiStore } from '@/stores/uiStore';

// ─── Mock GitLab client ──────────────────────────────────────

vi.mock('@/services/gitlab/gitlabClient', () => ({
  fetchGroupEpics: vi.fn(),
  fetchEpicDetails: vi.fn(),
}));

import { fetchGroupEpics, fetchEpicDetails } from '@/services/gitlab/gitlabClient';

const mockFetchGroupEpics = vi.mocked(fetchGroupEpics);
const mockFetchEpicDetails = vi.mocked(fetchEpicDetails);

// ─── Fixtures ─────────────────────────────────────────────────

const MOCK_EPICS = [
  { id: 1, iid: 142, title: 'API Gateway Migration', description: '## Architecture', state: 'opened', web_url: '', labels: [], created_at: '', updated_at: '', group_id: 10 },
  { id: 2, iid: 98, title: 'Auth Service Redesign', description: '## Auth', state: 'opened', web_url: '', labels: [], created_at: '', updated_at: '', group_id: 10 },
  { id: 3, iid: 201, title: 'Data Pipeline v3', description: '## Data', state: 'closed', web_url: '', labels: [], created_at: '', updated_at: '', group_id: 10 },
];

// ─── Setup ────────────────────────────────────────────────────

beforeEach(() => {
  useConfigStore.setState(useConfigStore.getInitialState());
  useEpicStore.setState(useEpicStore.getInitialState());
  useUiStore.setState(useUiStore.getInitialState());
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────

describe('LoadEpicModal', () => {
  it('shows "Configure GitLab" message when not configured', () => {
    render(<LoadEpicModal />);
    expect(screen.getByTestId('gitlab-not-configured')).toBeDefined();
    expect(screen.getByText('Configure GitLab in Settings to load epics')).toBeDefined();
  });

  it('renders search input when configured', async () => {
    useConfigStore.setState({
      config: {
        ...useConfigStore.getState().config,
        gitlab: { enabled: true, rootGroupId: '10', accessToken: 'tok', authMode: 'pat' },
      },
    });
    mockFetchGroupEpics.mockResolvedValue({ success: true, data: [] });

    render(<LoadEpicModal />);
    expect(screen.getByTestId('epic-search-input')).toBeDefined();
  });

  it('renders epic cards when data is available', async () => {
    useConfigStore.setState({
      config: {
        ...useConfigStore.getState().config,
        gitlab: { enabled: true, rootGroupId: '10', accessToken: 'tok', authMode: 'pat' },
      },
    });
    mockFetchGroupEpics.mockResolvedValue({ success: true, data: MOCK_EPICS });

    render(<LoadEpicModal />);

    await waitFor(() => {
      const cards = screen.getAllByTestId('epic-card');
      expect(cards).toHaveLength(3);
    });

    expect(screen.getByText(/API Gateway Migration/)).toBeDefined();
    expect(screen.getByText(/Auth Service Redesign/)).toBeDefined();
  });

  it('search filters epic list client-side', async () => {
    useConfigStore.setState({
      config: {
        ...useConfigStore.getState().config,
        gitlab: { enabled: true, rootGroupId: '10', accessToken: 'tok', authMode: 'pat' },
      },
    });
    mockFetchGroupEpics.mockResolvedValue({ success: true, data: MOCK_EPICS });

    render(<LoadEpicModal />);

    await waitFor(() => {
      expect(screen.getAllByTestId('epic-card')).toHaveLength(3);
    });

    const searchInput = screen.getByTestId('epic-search-input');
    fireEvent.change(searchInput, { target: { value: 'Auth' } });

    const cards = screen.getAllByTestId('epic-card');
    expect(cards).toHaveLength(1);
    expect(screen.getByText(/Auth Service Redesign/)).toBeDefined();
  });

  it('clicking an epic loads its description and closes modal', async () => {
    useConfigStore.setState({
      config: {
        ...useConfigStore.getState().config,
        gitlab: { enabled: true, rootGroupId: '10', accessToken: 'tok', authMode: 'pat' },
      },
    });
    mockFetchGroupEpics.mockResolvedValue({ success: true, data: MOCK_EPICS });
    mockFetchEpicDetails.mockResolvedValue({
      success: true,
      data: { id: 1, iid: 142, title: 'API Gateway Migration', description: '## Loaded content', state: 'opened', web_url: '', labels: [], created_at: '', updated_at: '', group_id: 10 },
    });

    useUiStore.setState({ activeModal: 'loadEpic' });

    render(<LoadEpicModal />);

    await waitFor(() => {
      expect(screen.getAllByTestId('epic-card')).toHaveLength(3);
    });

    const cards = screen.getAllByTestId('epic-card');
    fireEvent.click(cards[0]!);

    await waitFor(() => {
      expect(useEpicStore.getState().markdown).toBe('## Loaded content');
    });

    expect(useUiStore.getState().activeView).toBe('workspace');
  });

  it('shows error toast when fetch fails', async () => {
    useConfigStore.setState({
      config: {
        ...useConfigStore.getState().config,
        gitlab: { enabled: true, rootGroupId: '10', accessToken: 'tok', authMode: 'pat' },
      },
    });
    mockFetchGroupEpics.mockResolvedValue({ success: false, error: 'Network error' });

    render(<LoadEpicModal />);

    await waitFor(() => {
      const toasts = useUiStore.getState().toasts;
      expect(toasts.length).toBeGreaterThan(0);
      expect(toasts[0]!.type).toBe('error');
    });
  });
});
