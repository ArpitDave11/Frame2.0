/**
 * Tests for IssueDetail — context-aware AI update generation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IssueDetail } from './IssueDetail';
import { useConfigStore } from '@/stores/configStore';
import type { MockIssue } from './types';

// Mock the gitlabClient module
vi.mock('@/services/gitlab/gitlabClient', () => ({
  fetchIssueNotes: vi.fn().mockResolvedValue({ success: true, data: [] }),
  addIssueNote: vi.fn().mockResolvedValue({
    success: true,
    data: { id: 1, body: 'test', author: { name: 'Test', username: 'test' }, created_at: new Date().toISOString(), system: false },
  }),
  fetchIssueLinks: vi.fn().mockResolvedValue({ success: true, data: [] }),
  fetchIssueEpic: vi.fn().mockResolvedValue({
    success: true,
    data: {
      id: 42, iid: 3, title: 'Auth Epic',
      description: '## Objective\nRedesign auth', state: 'opened',
      web_url: '', labels: [], created_at: '', updated_at: '', group_id: 99,
    },
  }),
}));

// Mock the AI client
vi.mock('@/services/ai/aiClient', () => ({
  callAI: vi.fn().mockResolvedValue({ content: 'AI generated update based on epic context.' }),
  isAIEnabled: vi.fn().mockReturnValue(true),
}));

const realIssue: MockIssue = {
  id: '#101',
  title: 'Implement OAuth2 flow',
  status: 'in-progress',
  priority: 'high',
  updated: '2h ago',
  assignee: 'Sarah Kim',
  description: 'Implement OAuth2 with PKCE',
  web_url: 'https://gitlab.example.com/project/issues/101',
  project_id: 10,
  iid: 101,
  weight: 5,
};

const mockIssue: MockIssue = {
  id: 'AUTH-101',
  title: 'Mock issue',
  status: 'in-progress',
  priority: 'high',
  updated: '2h ago',
  assignee: 'Test',
};

beforeEach(() => {
  vi.clearAllMocks();
  useConfigStore.setState({
    config: {
      ...useConfigStore.getState().config,
      gitlab: { ...useConfigStore.getState().config.gitlab, enabled: true, accessToken: 'test-token' },
      ai: { ...useConfigStore.getState().config.ai, provider: 'azure' },
    },
  });
});

describe('IssueDetail — context-aware updates', () => {
  it('fetches parent epic on mount for real issues', async () => {
    const { fetchIssueEpic } = await import('@/services/gitlab/gitlabClient');
    render(<IssueDetail issue={realIssue} />);

    await waitFor(() => {
      expect(fetchIssueEpic).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true }),
        10,
        101,
      );
    });
  });

  it('shows epic title in context indicator', async () => {
    render(<IssueDetail issue={realIssue} />);

    await waitFor(() => {
      expect(screen.getByText(/Auth Epic/)).toBeDefined();
    });
  });

  it('shows fallback text when no epic linked', async () => {
    const { fetchIssueEpic } = await import('@/services/gitlab/gitlabClient');
    (fetchIssueEpic as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ success: true });

    render(<IssueDetail issue={realIssue} />);

    await waitFor(() => {
      expect(screen.getByText(/No linked epic/)).toBeDefined();
    });
  });

  it('passes epic context to AI prompt', async () => {
    const { callAI } = await import('@/services/ai/aiClient');
    render(<IssueDetail issue={realIssue} />);

    // Wait for epic to load
    await waitFor(() => {
      expect(screen.getByText(/Auth Epic/)).toBeDefined();
    });

    // Type input and generate
    const input = screen.getByTestId('ai-input');
    fireEvent.change(input, { target: { value: 'Finished PKCE implementation' } });
    fireEvent.click(screen.getByTestId('ai-generate-btn'));

    await waitFor(() => {
      expect(callAI).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          userPrompt: expect.stringContaining('EPIC CONTEXT'),
        }),
      );
    });
  });

  it('generates without epic context when no epic linked', async () => {
    const { fetchIssueEpic } = await import('@/services/gitlab/gitlabClient');
    const { callAI } = await import('@/services/ai/aiClient');
    (fetchIssueEpic as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ success: true });

    render(<IssueDetail issue={realIssue} />);

    await waitFor(() => {
      expect(screen.getByText(/No linked epic/)).toBeDefined();
    });

    const input = screen.getByTestId('ai-input');
    fireEvent.change(input, { target: { value: 'Finished PKCE implementation' } });
    fireEvent.click(screen.getByTestId('ai-generate-btn'));

    await waitFor(() => {
      expect(callAI).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          userPrompt: expect.not.stringContaining('EPIC CONTEXT'),
        }),
      );
    });
  });

  it('does not fetch epic for mock issues', async () => {
    const { fetchIssueEpic } = await import('@/services/gitlab/gitlabClient');
    render(<IssueDetail issue={mockIssue} />);

    // Give time for any effects to fire
    await new Promise((r) => setTimeout(r, 50));

    expect(fetchIssueEpic).not.toHaveBeenCalled();
  });

  it('renders empty state when no issue selected', () => {
    render(<IssueDetail issue={null} />);
    expect(screen.getByTestId('issue-detail-empty')).toBeDefined();
  });
});
