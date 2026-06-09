import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CapacityDialog } from './CapacityDialog';
import type { CapacityInputs } from '@/domain/brp';

const baseInputs: CapacityInputs = {
  resources: 5,
  spPerResource: 10,
  sprintCount: 6,
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

  it('seeds inputs from `initial`', () => {
    renderDialog();
    expect(
      (screen.getByTestId('capacity-input-resources') as HTMLInputElement).value,
    ).toBe('5');
    expect(
      (screen.getByTestId('capacity-input-sp-per-resource') as HTMLInputElement).value,
    ).toBe('10');
    expect(
      (screen.getByTestId('capacity-input-sprint-count') as HTMLInputElement).value,
    ).toBe('6');
    expect(
      (screen.getByTestId('capacity-input-holiday-days') as HTMLInputElement).value,
    ).toBe('2');
    expect(
      (screen.getByTestId('capacity-input-leave-days') as HTMLInputElement).value,
    ).toBe('4');
  });

  it('renders the live breakdown via computeCapacity (no drift)', () => {
    // 5×10×6 = 300 gross; 2×5 = 10 holiday; 4 leave; total = 286.
    renderDialog();
    expect(screen.getByTestId('capacity-breakdown-gross').textContent).toBe('300 SP');
    expect(screen.getByTestId('capacity-breakdown-holidays').textContent).toBe('−10 SP');
    expect(screen.getByTestId('capacity-breakdown-leave').textContent).toBe('−4 SP');
    expect(screen.getByTestId('capacity-breakdown-total').textContent).toBe('286 SP');
  });

  it('updates the breakdown live as inputs change', () => {
    renderDialog();
    fireEvent.change(screen.getByTestId('capacity-input-resources'), {
      target: { value: '10' },
    });
    // 10×10×6 = 600; 2×10 = 20 holiday; 4 leave; total = 576.
    expect(screen.getByTestId('capacity-breakdown-gross').textContent).toBe('600 SP');
    expect(screen.getByTestId('capacity-breakdown-holidays').textContent).toBe('−20 SP');
    expect(screen.getByTestId('capacity-breakdown-total').textContent).toBe('576 SP');
  });

  it('clamps non-numeric input to 0 instead of NaN', () => {
    renderDialog();
    fireEvent.change(screen.getByTestId('capacity-input-resources'), {
      target: { value: '' },
    });
    expect(
      (screen.getByTestId('capacity-input-resources') as HTMLInputElement).value,
    ).toBe('0');
    expect(screen.getByTestId('capacity-breakdown-gross').textContent).toBe('0 SP');
  });

  it('Save calls onSave with current inputs and then onClose', () => {
    const { props } = renderDialog();
    fireEvent.change(screen.getByTestId('capacity-input-resources'), {
      target: { value: '7' },
    });
    fireEvent.click(screen.getByTestId('capacity-dialog-save'));
    expect(props.onSave).toHaveBeenCalledTimes(1);
    expect(props.onSave).toHaveBeenCalledWith({ ...baseInputs, resources: 7 });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('Cancel calls onClose and does NOT call onSave', () => {
    const { props } = renderDialog();
    fireEvent.change(screen.getByTestId('capacity-input-resources'), {
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
      <CapacityDialog
        open
        podName="x"
        initial={baseInputs}
        onClose={onClose}
        onSave={() => {}}
      />,
    );
    rerender(
      <CapacityDialog
        open={false}
        podName="x"
        initial={baseInputs}
        onClose={onClose}
        onSave={() => {}}
      />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('resets local state when `initial` prop changes', () => {
    const { rerender } = render(
      <CapacityDialog
        open
        podName="x"
        initial={baseInputs}
        onClose={() => {}}
        onSave={() => {}}
      />,
    );
    expect(
      (screen.getByTestId('capacity-input-resources') as HTMLInputElement).value,
    ).toBe('5');

    rerender(
      <CapacityDialog
        open
        podName="x"
        initial={{ ...baseInputs, resources: 12 }}
        onClose={() => {}}
        onSave={() => {}}
      />,
    );
    expect(
      (screen.getByTestId('capacity-input-resources') as HTMLInputElement).value,
    ).toBe('12');
  });

  it('exposes role=dialog and aria-modal for screen readers', () => {
    renderDialog();
    const dlg = screen.getByTestId('capacity-dialog');
    expect(dlg.getAttribute('role')).toBe('dialog');
    expect(dlg.getAttribute('aria-modal')).toBe('true');
    // aria-labelledby points at the title element.
    const labelledBy = dlg.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy!)).not.toBeNull();
  });
});
