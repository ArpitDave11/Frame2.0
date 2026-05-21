/**
 * Issue Refinery — ValidationCard tests (R-11).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ValidationCard } from './ValidationCard';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';

beforeEach(() => {
  useIssueRefineryStore.getState().reset();
});

describe('ValidationCard', () => {
  it('renders nothing when validation is null', () => {
    const { container } = render(<ValidationCard />);
    expect(container.firstChild).toBeNull();
  });

  it('shows score and color tier "good" for score >= 80', () => {
    useIssueRefineryStore.getState().setValidation({ score: 90, findings: [] });
    render(<ValidationCard />);
    const score = screen.getByTestId('validation-score');
    expect(score.getAttribute('data-tier')).toBe('good');
    expect(score.textContent).toContain('90');
  });

  it('shows tier "warn" for 60..79', () => {
    useIssueRefineryStore.getState().setValidation({ score: 70, findings: [] });
    render(<ValidationCard />);
    expect(screen.getByTestId('validation-score').getAttribute('data-tier')).toBe('warn');
  });

  it('shows tier "poor" for score < 60', () => {
    useIssueRefineryStore.getState().setValidation({ score: 55, findings: [] });
    render(<ValidationCard />);
    expect(screen.getByTestId('validation-score').getAttribute('data-tier')).toBe('poor');
  });

  it('renders findings color-coded by [critical]/[important]/[nit] prefix', () => {
    useIssueRefineryStore.getState().setValidation({
      score: 65,
      findings: [
        '[critical] missing rollback condition',
        '[important] tighten the summary',
        '[nit] one extra blank line',
        'no-prefix finding',
      ],
    });
    render(<ValidationCard />);

    expect(screen.getByTestId('validation-finding-0').getAttribute('data-severity')).toBe('critical');
    expect(screen.getByTestId('validation-finding-1').getAttribute('data-severity')).toBe('important');
    expect(screen.getByTestId('validation-finding-2').getAttribute('data-severity')).toBe('nit');
    expect(screen.getByTestId('validation-finding-3').getAttribute('data-severity')).toBe('unknown');
  });

  it('shows the "no findings" empty state when findings is []', () => {
    useIssueRefineryStore.getState().setValidation({ score: 100, findings: [] });
    render(<ValidationCard />);
    expect(screen.queryByText(/No findings/i)).not.toBeNull();
  });
});
