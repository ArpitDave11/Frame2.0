/**
 * Tests for PublishModal — Publish to GitLab modal.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PublishModal } from './PublishModal';
import { useConfigStore } from '@/stores/configStore';
import { useEpicStore } from '@/stores/epicStore';
import { useGitlabStore } from '@/stores/gitlabStore';
import { useUiStore } from '@/stores/uiStore';

// ─── Mock GitLab client ──────────────────────────────────────

vi.mock('@/services/gitlab/gitlabClient', () => ({
  createGitLabEpic: vi.fn(),
  updateGitLabEpic: vi.fn(),
  fetchGitLabSubgroups: vi.fn().mockResolvedValue({ success: true, data: [] }),
  fetchGroupEpics: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));

import { createGitLabEpic } from '@/services/gitlab/gitlabClient';

const mockCreateGitLabEpic = vi.mocked(createGitLabEpic);

// ─── Setup ────────────────────────────────────────────────────

beforeEach(() => {
  useConfigStore.setState(useConfigStore.getInitialState());
  useEpicStore.setState(useEpicStore.getInitialState());
  useGitlabStore.setState(useGitlabStore.getInitialState());
  useUiStore.setState(useUiStore.getInitialState());
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────

describe('PublishModal', () => {
  it('renders title input pre-filled with document title', () => {
    useEpicStore.setState({
      document: {
        title: 'My Epic Title',
        sections: [],
        metadata: { createdAt: 0, lastRefined: null, complexity: 'moderate' },
      },
    });

    render(<PublishModal />);
    const input = screen.getByTestId('publish-title-input') as HTMLInputElement;
    expect(input.value).toBe('My Epic Title');
  });

  it('renders "Epic" as default title when no document', () => {
    render(<PublishModal />);
    const input = screen.getByTestId('publish-title-input') as HTMLInputElement;
    expect(input.value).toBe('Epic');
  });

  it('shows quality score indicator when score >= 7', () => {
    useEpicStore.setState({
      document: {
        title: 'Test',
        sections: [],
        metadata: { createdAt: 0, lastRefined: null, complexity: 'moderate', qualityScore: 8.5 },
      },
    });

    render(<PublishModal />);
    const indicator = screen.getByTestId('quality-score-indicator');
    expect(indicator).toBeDefined();
    expect(indicator.textContent).toContain('8.5/10');
    expect(indicator.textContent).toContain('Ready to publish');
  });

  it('shows quality score indicator when score < 7', () => {
    useEpicStore.setState({
      document: {
        title: 'Test',
        sections: [],
        metadata: { createdAt: 0, lastRefined: null, complexity: 'moderate', qualityScore: 4.2 },
      },
    });

    render(<PublishModal />);
    const indicator = screen.getByTestId('quality-score-indicator');
    expect(indicator.textContent).toContain('4.2/10');
    expect(indicator.textContent).toContain('Consider refining');
  });

  it('does not show quality score indicator when no score', () => {
    render(<PublishModal />);
    expect(screen.queryByTestId('quality-score-indicator')).toBeNull();
  });

  it('cancel button closes modal', () => {
    useUiStore.setState({ activeModal: 'publish' });
    render(<PublishModal />);

    fireEvent.click(screen.getByTestId('publish-cancel-btn'));
    expect(useUiStore.getState().activeModal).toBeNull();
  });

  it('publish button is present and clickable', () => {
    render(<PublishModal />);
    const btn = screen.getByTestId('publish-btn');
    expect(btn).toBeDefined();
    expect(btn.textContent).toBe('Publish');
  });

  it('publish button calls createGitLabEpic on click', async () => {
    useEpicStore.setState({ markdown: '## Test markdown' });
    useConfigStore.setState({
      config: {
        ...useConfigStore.getState().config,
        gitlab: { enabled: true, rootGroupId: '10', accessToken: 'tok', authMode: 'pat' },
      },
    });
    mockCreateGitLabEpic.mockResolvedValue({ success: true, data: { id: 1, iid: 100, title: 'Epic', description: '', state: 'opened', web_url: '', labels: [], created_at: '', updated_at: '', group_id: 10 } });

    render(<PublishModal />);
    fireEvent.click(screen.getByTestId('publish-btn'));

    // Wait for async call
    await vi.waitFor(() => {
      expect(mockCreateGitLabEpic).toHaveBeenCalledTimes(1);
    });
  });

  it('renders target group select with root option (pod level)', () => {
    useConfigStore.setState({
      config: {
        ...useConfigStore.getState().config,
        gitlab: { enabled: true, rootGroupId: '42', accessToken: 'tok', authMode: 'pat' },
      },
    });
    // F02: Target group only visible in pod level
    useGitlabStore.setState({ publishLevel: 'pod' });

    render(<PublishModal />);
    const select = screen.getByTestId('publish-target-group') as HTMLSelectElement;
    expect(select).toBeDefined();
    expect(select.options.length).toBeGreaterThanOrEqual(1);
    expect(select.options[0]!.text).toContain('42');
  });

  it('shows update UI when epic is loaded from GitLab', () => {
    useGitlabStore.setState({ loadedEpicIid: 55, loadedGroupId: '10' });

    render(<PublishModal />);
    const btn = screen.getByTestId('publish-btn');
    expect(btn.textContent).toBe('Update Epic');
    expect(screen.queryByTestId('publish-target-group')).toBeNull();
  });
});
