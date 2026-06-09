import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnalysisProgress } from './AnalysisProgress';

describe('AnalysisProgress', () => {
  it('returns null when idle (no work and not running)', () => {
    const { container } = render(
      <AnalysisProgress completed={0} total={0} running={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when total>0 but no work and not running (pre-start)', () => {
    const { container } = render(
      <AnalysisProgress completed={0} total={10} running={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('running: renders status with completed/total + progressbar with aria-value*', () => {
    render(
      <AnalysisProgress completed={3} total={10} running currentEpicTitle="Checkout flow" />,
    );
    const status = screen.getByTestId('analysis-progress-running');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(screen.getByTestId('analysis-progress-completed').textContent).toBe('3');
    expect(screen.getByTestId('analysis-progress-total').textContent).toBe('10');
    expect(screen.getByTestId('analysis-progress-current').textContent).toBe('Checkout flow');

    const bar = screen.getByTestId('analysis-progress-bar');
    expect(bar.getAttribute('role')).toBe('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('3');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('10');
  });

  it('running: fill width tracks completed/total percentage', () => {
    render(<AnalysisProgress completed={2} total={8} running />);
    // 2/8 = 25%
    const fill = screen.getByTestId('analysis-progress-fill') as HTMLDivElement;
    expect(fill.style.width).toBe('25%');
  });

  it('running: omits current-epic line when no title given', () => {
    render(<AnalysisProgress completed={1} total={3} running />);
    expect(screen.queryByTestId('analysis-progress-current')).toBeNull();
  });

  it('running: Cancel button calls onCancel when provided', () => {
    const onCancel = vi.fn();
    render(<AnalysisProgress completed={0} total={1} running onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('analysis-progress-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('running: no Cancel button when onCancel omitted', () => {
    render(<AnalysisProgress completed={0} total={1} running />);
    expect(screen.queryByTestId('analysis-progress-cancel')).toBeNull();
  });

  it('finished + no failures: renders success summary (role=status)', () => {
    render(<AnalysisProgress completed={5} total={5} running={false} />);
    const banner = screen.getByTestId('analysis-progress-success');
    expect(banner.getAttribute('role')).toBe('status');
    expect(screen.getByTestId('analysis-progress-summary').textContent).toBe(
      'Analyzed all 5 epics successfully.',
    );
    expect(screen.queryByTestId('analysis-progress-failures')).toBeNull();
  });

  it('finished + failures: renders partial banner (role=alert) with each failure', () => {
    render(
      <AnalysisProgress
        completed={5}
        total={5}
        running={false}
        failures={[
          { epicId: 'epic-1', message: 'timeout' },
          { epicId: 'epic-2', message: 'invalid response' },
        ]}
      />,
    );
    const banner = screen.getByTestId('analysis-progress-partial');
    expect(banner.getAttribute('role')).toBe('alert');
    expect(screen.getByTestId('analysis-progress-summary').textContent).toBe(
      'Analyzed 3 of 5 epics — 2 failed.',
    );
    expect(screen.getByTestId('analysis-progress-failure-epic-1').textContent).toContain('timeout');
    expect(screen.getByTestId('analysis-progress-failure-epic-2').textContent).toContain('invalid response');
  });

  it('finished: Dismiss button calls onDismiss when provided', () => {
    const onDismiss = vi.fn();
    render(<AnalysisProgress completed={3} total={3} running={false} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTestId('analysis-progress-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('finished: no Dismiss button when onDismiss omitted', () => {
    render(<AnalysisProgress completed={3} total={3} running={false} />);
    expect(screen.queryByTestId('analysis-progress-dismiss')).toBeNull();
  });
});
