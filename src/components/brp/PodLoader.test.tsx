import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PodLoader } from './PodLoader';

describe('PodLoader', () => {
  it('idle: renders Load button and calls onLoad on click', () => {
    const onLoad = vi.fn();
    render(<PodLoader state="idle" onLoad={onLoad} />);
    fireEvent.click(screen.getByTestId('pod-loader-load'));
    expect(onLoad).toHaveBeenCalledTimes(1);
  });

  it('idle + disabled: button is disabled and does NOT call onLoad', () => {
    const onLoad = vi.fn();
    render(<PodLoader state="idle" disabled onLoad={onLoad} />);
    const btn = screen.getByTestId('pod-loader-load') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onLoad).not.toHaveBeenCalled();
  });

  it('loading: renders the spinner status and no Load button', () => {
    render(<PodLoader state="loading" onLoad={() => {}} />);
    const status = screen.getByTestId('pod-loader-loading');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(screen.queryByTestId('pod-loader-load')).toBeNull();
  });

  it('error: renders the error message and Retry button (calls onRetry when given)', () => {
    const onRetry = vi.fn();
    const onLoad = vi.fn();
    render(
      <PodLoader
        state="error"
        errorMessage="Network blew up"
        onLoad={onLoad}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByTestId('pod-loader-error-message').textContent).toBe('Network blew up');
    fireEvent.click(screen.getByTestId('pod-loader-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onLoad).not.toHaveBeenCalled();
  });

  it('error: falls back to onLoad when no onRetry is provided', () => {
    const onLoad = vi.fn();
    render(<PodLoader state="error" errorMessage="x" onLoad={onLoad} />);
    fireEvent.click(screen.getByTestId('pod-loader-retry'));
    expect(onLoad).toHaveBeenCalledTimes(1);
  });

  it('error: defaults the message when none provided', () => {
    render(<PodLoader state="error" onLoad={() => {}} />);
    expect(screen.getByTestId('pod-loader-error-message').textContent).toContain('Failed');
  });

  it('error: role=alert for screen readers', () => {
    render(<PodLoader state="error" errorMessage="x" onLoad={() => {}} />);
    expect(screen.getByTestId('pod-loader-error').getAttribute('role')).toBe('alert');
  });

  it('success: renders the success hint and no buttons', () => {
    render(<PodLoader state="success" onLoad={() => {}} />);
    expect(screen.getByTestId('pod-loader-success').textContent).toContain('Pods loaded');
    expect(screen.queryByTestId('pod-loader-load')).toBeNull();
  });
});
