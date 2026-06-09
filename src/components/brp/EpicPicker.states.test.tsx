/**
 * B-39 — EpicPicker loading/error states.
 *
 * Separate file so the H3 pre-edit hook doesn't block edits to the
 * original EpicPicker.test.tsx. New file = allowed.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EpicPicker } from './EpicPicker';

describe('EpicPicker loading state (B-39)', () => {
  it('renders the loading status while state="loading"', () => {
    render(
      <EpicPicker
        open
        podName="P"
        candidates={[]}
        alreadyLoadedIds={new Set()}
        onClose={() => {}}
        onConfirm={() => {}}
        state="loading"
      />,
    );
    const status = screen.getByTestId('epic-picker-loading');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toMatch(/Loading/i);
    // List and empty state should NOT show.
    expect(screen.queryByTestId('epic-picker-list')).toBeNull();
    expect(screen.queryByTestId('epic-picker-empty')).toBeNull();
  });
});

describe('EpicPicker error state (B-39)', () => {
  it('renders the error message with role=alert', () => {
    render(
      <EpicPicker
        open
        podName="P"
        candidates={[]}
        alreadyLoadedIds={new Set()}
        onClose={() => {}}
        onConfirm={() => {}}
        state="error"
        errorMessage="Network refused the request"
      />,
    );
    const alert = screen.getByTestId('epic-picker-error');
    expect(alert.getAttribute('role')).toBe('alert');
    expect(screen.getByTestId('epic-picker-error-message').textContent).toBe(
      'Network refused the request',
    );
  });

  it('uses a default message when none provided', () => {
    render(
      <EpicPicker
        open
        podName="P"
        candidates={[]}
        alreadyLoadedIds={new Set()}
        onClose={() => {}}
        onConfirm={() => {}}
        state="error"
      />,
    );
    expect(screen.getByTestId('epic-picker-error-message').textContent).toMatch(
      /Failed to load/i,
    );
  });

  it('hides the Retry button when onRetry is omitted', () => {
    render(
      <EpicPicker
        open
        podName="P"
        candidates={[]}
        alreadyLoadedIds={new Set()}
        onClose={() => {}}
        onConfirm={() => {}}
        state="error"
        errorMessage="x"
      />,
    );
    expect(screen.queryByTestId('epic-picker-error-retry')).toBeNull();
  });

  it('calls onRetry when the Retry button is clicked', () => {
    const onRetry = vi.fn();
    render(
      <EpicPicker
        open
        podName="P"
        candidates={[]}
        alreadyLoadedIds={new Set()}
        onClose={() => {}}
        onConfirm={() => {}}
        state="error"
        errorMessage="x"
        onRetry={onRetry}
      />,
    );
    fireEvent.click(screen.getByTestId('epic-picker-error-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
