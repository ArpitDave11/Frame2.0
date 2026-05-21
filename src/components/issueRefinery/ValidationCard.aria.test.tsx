/**
 * Issue Refinery — ValidationCard accessibility tests (B-I2).
 *
 * Verifies the tier label (text) accompanies the color so screen-reader
 * users get the same signal sighted users do.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ValidationCard } from './ValidationCard';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';

beforeEach(() => {
  useIssueRefineryStore.getState().reset();
});

describe('ValidationCard — tier label (B-I2)', () => {
  it('aria-label includes tier word "Good" for score >= 80', () => {
    useIssueRefineryStore.getState().setValidation({ score: 90, findings: [] });
    render(<ValidationCard />);
    const score = screen.getByTestId('validation-score');
    expect(score.getAttribute('aria-label')).toMatch(/^Good /);
    expect(score.textContent).toContain('Good');
  });

  it('aria-label includes tier word "Fair" for 60..79', () => {
    useIssueRefineryStore.getState().setValidation({ score: 70, findings: [] });
    render(<ValidationCard />);
    const score = screen.getByTestId('validation-score');
    expect(score.getAttribute('aria-label')).toMatch(/^Fair /);
    expect(score.textContent).toContain('Fair');
  });

  it('aria-label includes tier word "Poor" for score < 60', () => {
    useIssueRefineryStore.getState().setValidation({ score: 30, findings: [] });
    render(<ValidationCard />);
    const score = screen.getByTestId('validation-score');
    expect(score.getAttribute('aria-label')).toMatch(/^Poor /);
    expect(score.textContent).toContain('Poor');
  });

  it('aria-label includes the numeric score', () => {
    useIssueRefineryStore.getState().setValidation({ score: 82, findings: [] });
    render(<ValidationCard />);
    expect(screen.getByTestId('validation-score').getAttribute('aria-label')).toContain('82');
  });
});
