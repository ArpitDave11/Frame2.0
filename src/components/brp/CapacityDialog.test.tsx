import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CapacityDialog } from './CapacityDialog';
import type { CapacityInputs } from '@/domain/brp';

// Velocity-based capacity (T9). previousVelocity is the gross baseline;
// resources only feeds the holiday deduction. 300 − (2×5) − 4 = 286.
const baseInputs: CapacityInputs = {
  previousVelocity: 300,
  resources: 5,
  spPerResource: 10, // legacy/deprecated, retained on the type; not shown in the form
  sprintCount: 6, //    legacy/deprecated
  holidayDays: 2,
  leaveDays: 4,
};

function renderDialog(overrides: Partial<React.ComponentProps<typeof CapacityDialog>> = {}) {
  const props = {
    open: true,
    podName: 'Pod Alpha',
    initial: baseInputs,
    onClose: vi.fn(),
    onSave: vi.fn(),
    ...overrides,
  };
  const utils = render(<CapacityDialog {...props} />);
  return { ...utils, props };
}

describe('CapacityDialog', () => {
  it('returns null when open=false (renders nothing in the DOM)', () => {
    const { container } = renderDialog({ open: false });
    expect(container.querySelector('[data-testid="capacity-dialog"]')).toBeNull();
  });

  it('renders the pod name in the title', () => {
    renderDialog({ podName: 'Pod Bravo' });
    expect(screen.getByTestId('capacity-dialog-title').textContent).toContain('Pod Bravo');
  });

  it('seeds inputs from `initial` (velocity-led field set)', () => {
    renderDialog();
    expect(
      (screen.getByTestId('capacity-input-previous-velocity') as HTMLInputElement).value,
    ).toBe('300');
    expect(
      (screen.getByTestId('capacity-input-resources') as HTMLInputElement).value,
    ).toBe('5');
    expect(
      (screen.getByTestId('capacity-input-holiday-days') as HTMLInputElement).value,
    ).toBe('2');
    expect(
      (screen.getByTestId('capacity-input-leave-days') as HTMLInputElement).value,
    ).toBe('4');
  });

  it('does NOT render the removed legacy fields (spPerResource / sprintCount)', () => {
    renderDialog();
    expect(screen.queryByTestId('capacity-input-sp-per-resource')).toBeNull();
    expect(screen.queryByTestId('capacity-input-sprint-count')).toBeNull();
  });

  it('backfills previousVelocity from legacy inputs when absent', () => {
    // Legacy pod with no previousVelocity → migrate derives 5×10×6 = 300.
    const { previousVelocity: _omit, ...legacy } = baseInputs;
    renderDialog({ initial: legacy as CapacityInputs });
    expect(
      (screen.getByTestId('capacity-input-previous-velocity') as HTMLInputElement).value,
    ).toBe('300');
  });

  it('renders the live breakdown via computeCapacity (no drift)', () => {
    // gross = previousVelocity 300; 2×5 = 10 holiday; 4 leave; total = 286.
    renderDialog();
    expect(screen.getByTestId('capacity-breakdown-gross').textContent).toBe('300 SP');
    expect(screen.getByTestId('capacity-breakdown-holidays').textContent).toBe('−10 SP');
    expect(screen.getByTestId('capacity-breakdown-leave').textContent).toBe('−4 SP');
    expect(screen.getByTestId('capacity-breakdown-total').textContent).toBe('286 SP');
  });

  it('updates the breakdown live as velocity changes', () => {
    renderDialog();
    fireEvent.change(screen.getByTestId('capacity-input-previous-velocity'), {
      target: { value: '600' },
    });
    // gross = 600; 2×5 = 10 holiday; 4 leave; total = 586.
    expect(screen.getByTestId('capacity-breakdown-gross').textContent).toBe('600 SP');
    expect(screen.getByTestId('capacity-breakdown-holidays').textContent).toBe('−10 SP');
    expect(screen.getByTestId('capacity-breakdown-total').textContent).toBe('586 SP');
  });

  it('clamps non-numeric input to 0 instead of NaN', () => {
    renderDialog();
    fireEvent.change(screen.getByTestId('capacity-input-previous-velocity'), {
      target: { value: '' },
    });
    expect(
      (screen.getByTestId('capacity-input-previous-velocity') as HTMLInputElement).value,
    ).toBe('0');
    expect(screen.getByTestId('capacity-breakdown-gross').textContent).toBe('0 SP');
  });

  it('Save calls onSave with current inputs and then onClose', () => {
    const { props } = renderDialog();
    fireEvent.change(screen.getByTestId('capacity-input-previous-velocity'), {
      target: { value: '150' },
    });
    fireEvent.click(screen.getByTestId('capacity-dialog-save'));
    expect(props.onSave).toHaveBeenCalledTimes(1);
    expect(props.onSave).toHaveBeenCalledWith({ ...baseInputs, previousVelocity: 150 });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('Cancel calls onClose and does NOT call onSave', () => {
    const { props } = renderDialog();
    fireEvent.change(screen.getByTestId('capacity-input-previous-velocity'), {
      target: { value: '99' },
    });
    fireEvent.click(screen.getByTestId('capacity-dialog-cancel'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it('Close (X) button calls onClose', () => {
    const { props } = renderDialog();
    fireEvent.click(screen.getByTestId('capacity-dialog-close'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking the backdrop calls onClose', () => {
    const { props } = renderDialog();
    fireEvent.click(screen.getByTestId('capacity-dialog-backdrop'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape key calls onClose', () => {
    const { props } = renderDialog();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape does not call onClose when dialog is closed (listener removed)', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <CapacityDialog open podName="x" initial={baseInputs} onClose={onClose} onSave={() => {}} />,
    );
    rerender(
      <CapacityDialog open={false} podName="x" initial={baseInputs} onClose={onClose} onSave={() => {}} />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('resets local state when `initial` prop changes', () => {
    const { rerender } = render(
      <CapacityDialog open podName="x" initial={baseInputs} onClose={() => {}} onSave={() => {}} />,
    );
    expect(
      (screen.getByTestId('capacity-input-previous-velocity') as HTMLInputElement).value,
    ).toBe('300');
    rerender(
      <CapacityDialog open podName="x" initial={{ ...baseInputs, previousVelocity: 120 }} onClose={() => {}} onSave={() => {}} />,
    );
    expect(
      (screen.getByTestId('capacity-input-previous-velocity') as HTMLInputElement).value,
    ).toBe('120');
  });

  it('exposes role=dialog and aria-modal for screen readers', () => {
    renderDialog();
    const dlg = screen.getByTestId('capacity-dialog');
    expect(dlg.getAttribute('role')).toBe('dialog');
    expect(dlg.getAttribute('aria-modal')).toBe('true');
    const labelledBy = dlg.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy!)).not.toBeNull();
  });
});
