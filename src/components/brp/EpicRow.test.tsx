import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EpicRow } from './EpicRow';
import type { Epic, FrameResult } from '@/domain/brp';

const frameResult = (estimate: number, confidence = 0.8): FrameResult => ({
  frameEstimate: estimate as FrameResult['frameEstimate'],
  breakdown: [],
  rationale: 'r',
  confidence,
  references: [],
  generatedStories: null,
  modelVersion: 'sim-1',
  analyzedAt: '2026-05-23T00:00:00Z',
});

const baseEpic = (overrides: Partial<Epic> = {}): Epic => ({
  id: 'gid://gitlab/Epic/100',
  iid: 42,
  title: 'Improve checkout flow',
  description: 'a'.repeat(200),
  gitlabWebUrl: 'https://gitlab/100',
  podId: 'pod-1',
  source: 'gitlab',
  humanEstimate: 5,
  analysisStatus: 'done',
  frameResult: frameResult(8, 0.75),
  ...overrides,
});

function renderRow(overrides: Partial<React.ComponentProps<typeof EpicRow>> = {}) {
  const props = {
    epic: baseEpic(),
    isSelected: false,
    onSelect: vi.fn(),
    onHumanEstimateChange: vi.fn(),
    ...overrides,
  };
  const utils = render(
    <table>
      <tbody>
        <EpicRow {...props} />
      </tbody>
    </table>,
  );
  return { ...utils, props };
}

describe('EpicRow', () => {
  it('renders title, iid, FRAME estimate, delta, and confidence %', () => {
    renderRow();
    expect(screen.getByTestId('epic-row-title-gid://gitlab/Epic/100').textContent).toBe(
      'Improve checkout flow',
    );
    expect(screen.getByTestId('epic-row-iid-gid://gitlab/Epic/100').textContent).toBe('!42');
    expect(screen.getByTestId('epic-row-frame-gid://gitlab/Epic/100').textContent).toBe('8');
    expect(screen.getByTestId('epic-row-delta-gid://gitlab/Epic/100').textContent).toBe('+3');
    expect(screen.getByTestId('epic-row-confidence-gid://gitlab/Epic/100').textContent).toBe('75%');
  });

  it('shows em-dash when FRAME estimate, delta, or confidence are absent', () => {
    renderRow({
      epic: baseEpic({ frameResult: null, analysisStatus: 'raw', humanEstimate: null }),
    });
    expect(screen.getByTestId('epic-row-frame-gid://gitlab/Epic/100').textContent).toBe('—');
    expect(screen.getByTestId('epic-row-delta-gid://gitlab/Epic/100').textContent).toBe('—');
    expect(screen.getByTestId('epic-row-confidence-gid://gitlab/Epic/100').textContent).toBe('—');
  });

  it('renders the VarianceBadge with the band from computeVariance', () => {
    // human=5 vs frame=8 → |3|/8 = 0.375 → caution
    renderRow();
    const badge = screen.getByTestId('variance-badge');
    expect(badge.getAttribute('data-variance')).toBe('caution');
  });

  it('reflects isSelected via aria-selected + data-selected', () => {
    const { rerender } = render(
      <table>
        <tbody>
          <EpicRow
            epic={baseEpic()}
            isSelected={false}
            onSelect={() => {}}
            onHumanEstimateChange={() => {}}
          />
        </tbody>
      </table>,
    );
    const row = screen.getByTestId('epic-row-gid://gitlab/Epic/100');
    expect(row.getAttribute('aria-selected')).toBe('false');
    expect(row.getAttribute('data-selected')).toBe('false');

    rerender(
      <table>
        <tbody>
          <EpicRow
            epic={baseEpic()}
            isSelected
            onSelect={() => {}}
            onHumanEstimateChange={() => {}}
          />
        </tbody>
      </table>,
    );
    expect(row.getAttribute('aria-selected')).toBe('true');
    expect(row.getAttribute('data-selected')).toBe('true');
  });

  it('clicking the row calls onSelect', () => {
    const { props } = renderRow();
    fireEvent.click(screen.getByTestId('epic-row-gid://gitlab/Epic/100'));
    expect(props.onSelect).toHaveBeenCalledTimes(1);
  });

  it('clicking the human-estimate input does NOT call onSelect', () => {
    const { props } = renderRow();
    fireEvent.click(screen.getByTestId('epic-row-human-gid://gitlab/Epic/100'));
    expect(props.onSelect).not.toHaveBeenCalled();
  });

  it('Enter on the row calls onSelect (keyboard parity)', () => {
    const { props } = renderRow();
    const row = screen.getByTestId('epic-row-gid://gitlab/Epic/100');
    row.focus();
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(props.onSelect).toHaveBeenCalledTimes(1);
  });

  it('typing in the input updates draft but does NOT call onHumanEstimateChange yet', () => {
    const { props } = renderRow();
    const input = screen.getByTestId('epic-row-human-gid://gitlab/Epic/100') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '13' } });
    expect(input.value).toBe('13');
    expect(props.onHumanEstimateChange).not.toHaveBeenCalled();
  });

  it('blur commits the new value', () => {
    const { props } = renderRow();
    const input = screen.getByTestId('epic-row-human-gid://gitlab/Epic/100') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '13' } });
    fireEvent.blur(input);
    expect(props.onHumanEstimateChange).toHaveBeenCalledTimes(1);
    expect(props.onHumanEstimateChange).toHaveBeenCalledWith(13);
  });

  it('Enter commits the new value (via programmatic blur after focus)', () => {
    const { props } = renderRow();
    const input = screen.getByTestId('epic-row-human-gid://gitlab/Epic/100') as HTMLInputElement;
    input.focus(); // Real users tab/click to focus before typing.
    fireEvent.change(input, { target: { value: '21' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(props.onHumanEstimateChange).toHaveBeenCalledTimes(1);
    expect(props.onHumanEstimateChange).toHaveBeenCalledWith(21);
  });

  it('clearing the input commits null', () => {
    const { props } = renderRow();
    const input = screen.getByTestId('epic-row-human-gid://gitlab/Epic/100') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(props.onHumanEstimateChange).toHaveBeenCalledWith(null);
  });

  it('invalid input (negative or non-numeric) reverts and does NOT commit', () => {
    const { props } = renderRow();
    const input = screen.getByTestId('epic-row-human-gid://gitlab/Epic/100') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '-3' } });
    fireEvent.blur(input);
    expect(props.onHumanEstimateChange).not.toHaveBeenCalled();
    expect(input.value).toBe('5'); // reverted to the upstream value
  });

  it('no commit fires when value is unchanged', () => {
    const { props } = renderRow();
    const input = screen.getByTestId('epic-row-human-gid://gitlab/Epic/100') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.blur(input);
    expect(props.onHumanEstimateChange).not.toHaveBeenCalled();
  });

  it('Escape on the input reverts the draft without committing', () => {
    const { props } = renderRow();
    const input = screen.getByTestId('epic-row-human-gid://gitlab/Epic/100') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '99' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.blur(input);
    // Escape reverts to '5', then blur sees same value and no-ops.
    expect(props.onHumanEstimateChange).not.toHaveBeenCalled();
    expect(input.value).toBe('5');
  });

  it('updates the draft when the epic.humanEstimate changes externally', () => {
    const { rerender } = render(
      <table>
        <tbody>
          <EpicRow
            epic={baseEpic({ humanEstimate: 5 })}
            isSelected={false}
            onSelect={() => {}}
            onHumanEstimateChange={() => {}}
          />
        </tbody>
      </table>,
    );
    const input = screen.getByTestId('epic-row-human-gid://gitlab/Epic/100') as HTMLInputElement;
    expect(input.value).toBe('5');
    rerender(
      <table>
        <tbody>
          <EpicRow
            epic={baseEpic({ humanEstimate: 21 })}
            isSelected={false}
            onSelect={() => {}}
            onHumanEstimateChange={() => {}}
          />
        </tbody>
      </table>,
    );
    expect(input.value).toBe('21');
  });
});
