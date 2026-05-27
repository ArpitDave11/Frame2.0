import { describe, it, expect, vi } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EpicPicker } from './EpicPicker';
import type { Epic } from '@/domain/brp';

const epic = (id: string, iid: number, title: string): Epic => ({
  id,
  iid,
  title,
  description: 'd',
  gitlabWebUrl: `https://gitlab/${id}`,
  podId: 'pod-1',
  source: 'gitlab',
  humanEstimate: null,
  analysisStatus: 'raw',
  frameResult: null,
});

function renderPicker(overrides: Partial<React.ComponentProps<typeof EpicPicker>> = {}) {
  const onClose: Mock = vi.fn();
  const onConfirm: Mock = vi.fn();
  const props = {
    open: true,
    podName: 'Pod Alpha',
    candidates: [
      epic('1', 101, 'Checkout flow'),
      epic('2', 102, 'Billing report'),
      epic('3', 103, 'Search rewrite'),
    ],
    alreadyLoadedIds: new Set<string>(),
    onClose,
    onConfirm,
    ...overrides,
  };
  const utils = render(<EpicPicker {...props} />);
  return { ...utils, props, onClose, onConfirm };
}

describe('EpicPicker', () => {
  it('returns null when open=false', () => {
    const { container } = renderPicker({ open: false });
    expect(container.querySelector('[data-testid="epic-picker"]')).toBeNull();
  });

  it('renders all candidate epics by default', () => {
    renderPicker();
    expect(screen.getByTestId('epic-picker-row-1')).toBeTruthy();
    expect(screen.getByTestId('epic-picker-row-2')).toBeTruthy();
    expect(screen.getByTestId('epic-picker-row-3')).toBeTruthy();
  });

  it('renders the pod name in the title', () => {
    renderPicker({ podName: 'Pod Bravo' });
    expect(screen.getByTestId('epic-picker-title').textContent).toContain('Pod Bravo');
  });

  it('shows the empty state when there are no candidates', () => {
    renderPicker({ candidates: [] });
    expect(screen.getByTestId('epic-picker-empty').textContent).toContain('No epics');
    expect(screen.queryByTestId('epic-picker-list')).toBeNull();
  });

  it('pre-checks AND disables already-loaded epics', () => {
    renderPicker({ alreadyLoadedIds: new Set(['2']) });
    const row = screen.getByTestId('epic-picker-row-2');
    expect(row.getAttribute('data-preloaded')).toBe('true');
    const checkbox = screen.getByTestId('epic-picker-checkbox-2') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(checkbox.disabled).toBe(true);
  });

  it('toggling a checkbox updates the new-count and enables Confirm', () => {
    renderPicker();
    const confirm = screen.getByTestId('epic-picker-confirm') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    expect(screen.getByTestId('epic-picker-count').textContent).toContain('0 new');
    fireEvent.click(screen.getByTestId('epic-picker-checkbox-1'));
    expect(screen.getByTestId('epic-picker-count').textContent).toContain('1 new');
    expect(confirm.disabled).toBe(false);
  });

  it('Confirm calls onConfirm with only the newly-checked epics (not preloaded ones)', () => {
    const { onClose, onConfirm } = renderPicker({ alreadyLoadedIds: new Set(['2']) });
    fireEvent.click(screen.getByTestId('epic-picker-checkbox-1'));
    fireEvent.click(screen.getByTestId('epic-picker-checkbox-3'));
    fireEvent.click(screen.getByTestId('epic-picker-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    const passed = (onConfirm.mock.calls[0]?.[0] ?? []) as Epic[];
    expect(passed.map((e) => e.id).sort()).toEqual(['1', '3']);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('search filters by title (case-insensitive)', () => {
    renderPicker();
    fireEvent.change(screen.getByTestId('epic-picker-search'), {
      target: { value: 'billing' },
    });
    expect(screen.queryByTestId('epic-picker-row-1')).toBeNull();
    expect(screen.getByTestId('epic-picker-row-2')).toBeTruthy();
    expect(screen.queryByTestId('epic-picker-row-3')).toBeNull();
  });

  it('search filters by iid', () => {
    renderPicker();
    fireEvent.change(screen.getByTestId('epic-picker-search'), {
      target: { value: '103' },
    });
    expect(screen.queryByTestId('epic-picker-row-1')).toBeNull();
    expect(screen.queryByTestId('epic-picker-row-2')).toBeNull();
    expect(screen.getByTestId('epic-picker-row-3')).toBeTruthy();
  });

  it('shows a "no match" empty state when search excludes everyone', () => {
    renderPicker();
    fireEvent.change(screen.getByTestId('epic-picker-search'), {
      target: { value: 'zzz-no-match' },
    });
    expect(screen.getByTestId('epic-picker-empty').textContent).toContain('match');
  });

  it('Cancel closes without calling onConfirm', () => {
    const { onClose, onConfirm } = renderPicker();
    fireEvent.click(screen.getByTestId('epic-picker-checkbox-1'));
    fireEvent.click(screen.getByTestId('epic-picker-cancel'));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking the backdrop calls onClose', () => {
    const { onClose } = renderPicker();
    fireEvent.click(screen.getByTestId('epic-picker-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape closes the picker', () => {
    const { onClose } = renderPicker();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('exposes role=dialog + aria-modal for assistive tech', () => {
    renderPicker();
    const dlg = screen.getByTestId('epic-picker');
    expect(dlg.getAttribute('role')).toBe('dialog');
    expect(dlg.getAttribute('aria-modal')).toBe('true');
  });

  it('reopening the dialog re-seeds the checked set + resets the query', () => {
    const { rerender } = render(
      <EpicPicker
        open
        podName="x"
        candidates={[epic('1', 1, 'A'), epic('2', 2, 'B')]}
        alreadyLoadedIds={new Set()}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId('epic-picker-checkbox-1'));
    fireEvent.change(screen.getByTestId('epic-picker-search'), {
      target: { value: 'A' },
    });
    rerender(
      <EpicPicker
        open={false}
        podName="x"
        candidates={[epic('1', 1, 'A'), epic('2', 2, 'B')]}
        alreadyLoadedIds={new Set()}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    );
    rerender(
      <EpicPicker
        open
        podName="x"
        candidates={[epic('1', 1, 'A'), epic('2', 2, 'B')]}
        alreadyLoadedIds={new Set()}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect((screen.getByTestId('epic-picker-checkbox-1') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByTestId('epic-picker-search') as HTMLInputElement).value).toBe('');
  });
});
