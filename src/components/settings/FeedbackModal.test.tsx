import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthContext, type AuthContextValue } from '@/components/auth/AuthContext';
import React from 'react';

vi.mock('@/services/gitlab/feedbackService', () => ({
  submitFeedback: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('@/stores/configStore', () => ({
  useConfigStore: vi.fn((sel) => sel({
    config: { gitlab: { enabled: true, accessToken: 'tok', authMode: 'pat', rootGroupId: '', streamGroupId: '' } }
  })),
}));

vi.mock('@/stores/uiStore', () => ({
  useUiStore: Object.assign(vi.fn((sel) => sel({ closeModal: vi.fn(), addToast: vi.fn() })), {
    getState: vi.fn(() => ({ closeModal: vi.fn(), addToast: vi.fn() })),
  }),
}));

const authValue: AuthContextValue = {
  isAuthenticated: true,
  user: { name: 'Arpit Dave', email: 'arpit@ubs.com', initials: 'AD' },
  login: vi.fn(),
  logout: vi.fn(),
  isLoading: false,
};

function renderWithAuth(ui: React.ReactElement) {
  return render(
    <AuthContext.Provider value={authValue}>{ui}</AuthContext.Provider>
  );
}

describe('FeedbackModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders user name and email (read-only)', async () => {
    const { FeedbackModal } = await import('./FeedbackModal');
    renderWithAuth(<FeedbackModal />);
    expect(screen.getByText(/Arpit Dave/)).toBeTruthy();
    expect(screen.getByText(/arpit@ubs.com/)).toBeTruthy();
  });

  it('submit button is disabled when message is empty', async () => {
    const { FeedbackModal } = await import('./FeedbackModal');
    renderWithAuth(<FeedbackModal />);
    const btn = screen.getByTestId('feedback-submit');
    expect(btn.hasAttribute('disabled') || btn.getAttribute('aria-disabled') === 'true').toBe(true);
  });

  it('calls submitFeedback on submit with correct params', async () => {
    const { submitFeedback } = await import('@/services/gitlab/feedbackService');
    const { FeedbackModal } = await import('./FeedbackModal');
    renderWithAuth(<FeedbackModal />);

    const textarea = screen.getByTestId('feedback-message');
    fireEvent.change(textarea, { target: { value: 'Great tool!' } });

    const btn = screen.getByTestId('feedback-submit');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(submitFeedback).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          name: 'Arpit Dave',
          email: 'arpit@ubs.com',
          category: 'general',
          message: 'Great tool!',
        }),
      );
    });
  });
});
