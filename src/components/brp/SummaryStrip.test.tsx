import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SummaryStrip } from './SummaryStrip';
import { color } from '@/theme/tokens';

const base = {
  totalCapacity: 286,
  humanLoad: 200,
  frameLoad: 210,
  balance: 76,
  podsOver: 0,
  totalPods: 4,
  epicsToReGroom: 0,
};

function rgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

describe('SummaryStrip (Task 2-1)', () => {
  it('renders all 6 metric labels', () => {
    render(<SummaryStrip {...base} />);
    expect(screen.getByTestId('summary-total-capacity').textContent).toContain('Total capacity');
    expect(screen.getByTestId('summary-human-load').textContent).toContain('Human load');
    expect(screen.getByTestId('summary-frame-load').textContent).toContain('FRAME load');
    expect(screen.getByTestId('summary-balance').textContent).toContain('Balance');
    expect(screen.getByTestId('summary-pods-over').textContent).toContain('Pods over');
    expect(screen.getByTestId('summary-regroom').textContent).toContain('Re-groom needed');
  });

  it('renders the numeric values', () => {
    render(<SummaryStrip {...base} />);
    expect(screen.getByTestId('summary-total-capacity').textContent).toContain('286');
    expect(screen.getByTestId('summary-human-load').textContent).toContain('200');
    expect(screen.getByTestId('summary-frame-load').textContent).toContain('210');
  });

  it('shows "+" prefix when balance is positive', () => {
    render(<SummaryStrip {...base} balance={45} />);
    expect(screen.getByTestId('summary-balance-value').textContent).toBe('+45');
  });

  it('omits the prefix when balance is exactly zero', () => {
    render(<SummaryStrip {...base} balance={0} />);
    expect(screen.getByTestId('summary-balance-value').textContent).toBe('0');
  });

  it('shows no prefix when balance is negative — already has its own sign', () => {
    render(<SummaryStrip {...base} balance={-12} />);
    expect(screen.getByTestId('summary-balance-value').textContent).toBe('-12');
  });

  it('paints the balance value red when negative, green when positive', () => {
    const { unmount } = render(<SummaryStrip {...base} balance={-1} />);
    expect(
      (screen.getByTestId('summary-balance-value') as HTMLElement).style.color,
    ).toBe(rgb(color.red));
    unmount();

    render(<SummaryStrip {...base} balance={10} />);
    expect(
      (screen.getByTestId('summary-balance-value') as HTMLElement).style.color,
    ).toBe(rgb(color.semanticGreenText));
  });

  it('Pods over shows "X / Y" format', () => {
    render(<SummaryStrip {...base} podsOver={2} totalPods={5} />);
    expect(screen.getByTestId('summary-pods-over').textContent).toContain('2');
    expect(screen.getByTestId('summary-pods-over').textContent).toContain('/ 5');
  });

  it('paints Pods over red when > 0', () => {
    render(<SummaryStrip {...base} podsOver={1} />);
    expect(
      (screen.getByTestId('summary-pods-over-value') as HTMLElement).style.color,
    ).toBe(rgb(color.red));
  });

  it('keeps Pods over neutral when 0', () => {
    render(<SummaryStrip {...base} podsOver={0} />);
    expect(
      (screen.getByTestId('summary-pods-over-value') as HTMLElement).style.color,
    ).toBe(rgb(color.black));
  });

  it('Re-groom count is red when > 0, neutral when 0', () => {
    const { unmount } = render(<SummaryStrip {...base} epicsToReGroom={3} />);
    expect(
      (screen.getByTestId('summary-regroom-value') as HTMLElement).style.color,
    ).toBe(rgb(color.red));
    unmount();
    render(<SummaryStrip {...base} epicsToReGroom={0} />);
    expect(
      (screen.getByTestId('summary-regroom-value') as HTMLElement).style.color,
    ).toBe(rgb(color.black));
  });

  it('pluralises the epic suffix', () => {
    const { unmount } = render(<SummaryStrip {...base} epicsToReGroom={1} />);
    expect(screen.getByTestId('summary-regroom').textContent).toContain('epic');
    expect(screen.getByTestId('summary-regroom').textContent).not.toContain('epics');
    unmount();
    render(<SummaryStrip {...base} epicsToReGroom={3} />);
    expect(screen.getByTestId('summary-regroom').textContent).toContain('epics');
  });
});
