/**
 * Tests for Toast + ToastContainer.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Toast } from './Toast';
import { ToastContainer } from './ToastContainer';
import { useUiStore } from '@/stores/uiStore';

beforeEach(() => {
  useUiStore.setState(useUiStore.getInitialState());
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── ToastContainer ─────────────────────────────────────────

describe('ToastContainer', () => {
  it('renders nothing when no toasts in store', () => {
    const { container } = render(<ToastContainer />);
    expect(container.innerHTML).toBe('');
  });

  it('renders toast when added to store', () => {
    useUiStore.getState().addToast({ type: 'success', title: 'Epic published' });
    render(<ToastContainer />);
    expect(screen.getByText('Epic published')).toBeDefined();
  });

  it('renders multiple toasts in stack', () => {
    useUiStore.getState().addToast({ type: 'success', title: 'First' });
    useUiStore.getState().addToast({ type: 'error', title: 'Second' });
    render(<ToastContainer />);
    expect(screen.getByText('First')).toBeDefined();
    expect(screen.getByText('Second')).toBeDefined();
  });

  it('container is fixed bottom-left with zIndex 300', () => {
    useUiStore.getState().addToast({ type: 'info', title: 'Test' });
    render(<ToastContainer />);
    const container = screen.getByTestId('toast-container');
    expect(container.style.position).toBe('fixed');
    expect(container.style.bottom).toBe('24px');
    expect(container.style.left).toBe('24px');
    expect(container.style.zIndex).toBe('300');
  });

  it('container has column layout with gap', () => {
    useUiStore.getState().addToast({ type: 'info', title: 'Test' });
    render(<ToastContainer />);
    const container = screen.getByTestId('toast-container');
    expect(container.style.flexDirection).toBe('column');
    expect(container.style.gap).toBe('8px');
  });
});

// ─── Toast ──────────────────────────────────────────────────

describe('Toast', () => {
  const makeToast = (type: 'success' | 'error' | 'info' | 'warning' = 'success') => ({
    id: 'test-1',
    type,
    title: 'Test message',
  });

  it('renders toast with correct message', () => {
    render(<Toast toast={makeToast()} onDismiss={() => {}} />);
    expect(screen.getByText('Test message')).toBeDefined();
  });

  it('success variant has green left bar', () => {
    render(<Toast toast={makeToast('success')} onDismiss={() => {}} />);
    const bar = screen.getByTestId('toast-bar-test-1');
    // jsdom normalizes hex to rgb
    expect(bar.style.background).toContain('34, 197, 94');
  });

  it('error variant has red left bar', () => {
    render(<Toast toast={makeToast('error')} onDismiss={() => {}} />);
    const bar = screen.getByTestId('toast-bar-test-1');
    expect(bar.style.background).toContain('230, 0, 0');
  });

  it('info variant has blue left bar', () => {
    render(<Toast toast={makeToast('info')} onDismiss={() => {}} />);
    const bar = screen.getByTestId('toast-bar-test-1');
    expect(bar.style.background).toContain('59, 130, 246');
  });

  it('warning variant has yellow left bar', () => {
    render(<Toast toast={makeToast('warning')} onDismiss={() => {}} />);
    const bar = screen.getByTestId('toast-bar-test-1');
    expect(bar.style.background).toContain('245, 158, 11');
  });

  it('auto-dismisses after default 4000ms', () => {
    const onDismiss = vi.fn();
    render(<Toast toast={makeToast()} onDismiss={onDismiss} />);

    expect(onDismiss).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(4000); });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('auto-dismisses after custom duration', () => {
    const onDismiss = vi.fn();
    render(<Toast toast={makeToast()} onDismiss={onDismiss} duration={2000} />);

    act(() => { vi.advanceTimersByTime(1999); });
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(1); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('click X button dismisses immediately', () => {
    const onDismiss = vi.fn();
    render(<Toast toast={makeToast()} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTestId('toast-dismiss-test-1'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('has ubsFade animation', () => {
    render(<Toast toast={makeToast()} onDismiss={() => {}} />);
    const toast = screen.getByTestId('toast-test-1');
    expect(toast.style.animation).toContain('ubsFade');
  });

  it('has max-width 360px', () => {
    render(<Toast toast={makeToast()} onDismiss={() => {}} />);
    const toast = screen.getByTestId('toast-test-1');
    expect(toast.style.maxWidth).toBe('360px');
  });

  it('color bar is 4px wide', () => {
    render(<Toast toast={makeToast()} onDismiss={() => {}} />);
    const bar = screen.getByTestId('toast-bar-test-1');
    expect(bar.style.width).toBe('4px');
  });
});
