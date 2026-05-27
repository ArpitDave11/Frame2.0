/**
 * CapacityDialog AI-assist tests (B-33). Separate file because the H3
 * test-protect hook blocks edits to CapacityDialog.test.tsx.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { CapacityDialog } from './CapacityDialog';
import type { CapacityInputs } from '@/domain/brp';

const baseInputs: CapacityInputs = {
  resources: 5,
  spPerResource: 10,
  sprintCount: 6,
  holidayDays: 2,
  leaveDays: 4,
};

describe('CapacityDialog AI suggest button (B-33)', () => {
  it('does NOT render the Suggest button when onRequestSuggestion is omitted', () => {
    render(
      <CapacityDialog
        open
        podName="P"
        initial={baseInputs}
        onClose={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.queryByTestId('capacity-dialog-suggest')).toBeNull();
  });

  it('renders the Suggest button when onRequestSuggestion is provided', () => {
    render(
      <CapacityDialog
        open
        podName="P"
        initial={baseInputs}
        onClose={() => {}}
        onSave={() => {}}
        onRequestSuggestion={vi.fn().mockResolvedValue(null)}
      />,
    );
    expect(screen.getByTestId('capacity-dialog-suggest')).toBeTruthy();
  });

  it('clicking Suggest applies the returned inputs and renders the banner', async () => {
    const suggestion = {
      inputs: { ...baseInputs, spPerResource: 13 },
      confidence: 0.7,
      rationale: 'Median of 3 past actuals.',
    };
    render(
      <CapacityDialog
        open
        podName="P"
        initial={baseInputs}
        onClose={() => {}}
        onSave={() => {}}
        onRequestSuggestion={vi.fn().mockResolvedValue(suggestion)}
      />,
    );

    fireEvent.click(screen.getByTestId('capacity-dialog-suggest'));

    await waitFor(() => {
      expect(screen.getByTestId('capacity-dialog-suggestion')).toBeTruthy();
    });
    // Input field reflects the suggested value.
    expect(
      (screen.getByTestId('capacity-input-sp-per-resource') as HTMLInputElement).value,
    ).toBe('13');
    expect(
      screen.getByTestId('capacity-dialog-suggestion-rationale').textContent,
    ).toBe('Median of 3 past actuals.');
    expect(
      screen.getByTestId('capacity-dialog-suggestion-confidence').textContent,
    ).toBe('70% conf');
  });

  it('Suggest returning null leaves form + banner untouched', async () => {
    const onRequest = vi.fn().mockResolvedValue(null);
    render(
      <CapacityDialog
        open
        podName="P"
        initial={baseInputs}
        onClose={() => {}}
        onSave={() => {}}
        onRequestSuggestion={onRequest}
      />,
    );
    fireEvent.click(screen.getByTestId('capacity-dialog-suggest'));
    // Wait for the async callback to settle without rendering a banner.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.queryByTestId('capacity-dialog-suggestion')).toBeNull();
    expect(
      (screen.getByTestId('capacity-input-sp-per-resource') as HTMLInputElement).value,
    ).toBe('10');
    expect(onRequest).toHaveBeenCalledTimes(1);
  });

  it('Suggest button is disabled while a suggestion is in flight', async () => {
    let release: ((v: { inputs: CapacityInputs; confidence: number; rationale: string } | null) => void) | undefined;
    const pending = new Promise<{ inputs: CapacityInputs; confidence: number; rationale: string } | null>(
      (resolve) => {
        release = resolve;
      },
    );
    render(
      <CapacityDialog
        open
        podName="P"
        initial={baseInputs}
        onClose={() => {}}
        onSave={() => {}}
        onRequestSuggestion={() => pending}
      />,
    );
    fireEvent.click(screen.getByTestId('capacity-dialog-suggest'));
    const btn = screen.getByTestId('capacity-dialog-suggest') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toMatch(/Suggesting/);

    release?.(null);
    await waitFor(() => {
      expect(
        (screen.getByTestId('capacity-dialog-suggest') as HTMLButtonElement).disabled,
      ).toBe(false);
    });
  });

  it('exposes the suggestion confidence as a data attribute for selector tests', async () => {
    const suggestion = {
      inputs: baseInputs,
      confidence: 0.42,
      rationale: 'r',
    };
    render(
      <CapacityDialog
        open
        podName="P"
        initial={baseInputs}
        onClose={() => {}}
        onSave={() => {}}
        onRequestSuggestion={vi.fn().mockResolvedValue(suggestion)}
      />,
    );
    fireEvent.click(screen.getByTestId('capacity-dialog-suggest'));
    await waitFor(() => {
      expect(
        screen.getByTestId('capacity-dialog-suggestion').getAttribute('data-confidence'),
      ).toBe('0.42');
    });
  });
});
