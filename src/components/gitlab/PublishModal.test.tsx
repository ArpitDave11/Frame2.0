/**
 * Tests for PublishModal — Publish to GitLab modal.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PublishModal } from './PublishModal';
import { useConfigStore } from '@/stores/configStore';
import { useEpicStore } from '@/stores/epicStore';
import { useUiStore } from '@/stores/uiStore';

// ─── Mock GitLab client ──────────────────────────────────────

vi.mock('@/services/gitlab/gitlabClient', () => ({
  createGitLabEpic: vi.fn(),
}));

import { createGitLabEpic } from '@/services/gitlab/gitlabClient';

const mockCreateGitLabEpic = vi.mocked(createGitLabEpic);

// ─── Setup ────────────────────────────────────────────────────

beforeEach(() => {
  useConfigStore.setState(useConfigStore.getInitialState());
  useEpicStore.setState(useEpicStore.getInitialState());
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

  it('shows green quality score indicator when score >= 7', () => {
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
    // JSDOM converts hex to rgb
    expect(indicator.style.borderLeft).toContain('rgb(34, 197, 94)');
  });

  it('shows red quality score indicator when score < 7', () => {
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

  it('renders target group select with options', () => {
    render(<PublishModal />);
    const select = screen.getByTestId('publish-target-group') as HTMLSelectElement;
    expect(select).toBeDefined();
    expect(select.options).toHaveLength(2);
    expect(select.options[0]!.text).toBe('pod-alpha');
    expect(select.options[1]!.text).toBe('crew-platform');
  });
});
