/**
 * Tests for SectionHints — template guidance display.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SectionHints } from './SectionHints';

describe('SectionHints', () => {
  it('returns null when category is undefined', () => {
    const { container } = render(
      <SectionHints sectionTitle="Objective" category={undefined} complexity="moderate" />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('returns null for unknown section', () => {
    const { container } = render(
      <SectionHints
        sectionTitle="Totally Unknown Section XYZ"
        category="technical_design"
        complexity="moderate"
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows format badge for known section', () => {
    render(
      <SectionHints
        sectionTitle="Architecture Overview"
        category="technical_design"
        complexity="moderate"
      />,
    );
    const badge = screen.getByTestId('format-badge');
    expect(badge).toBeDefined();
    expect(badge.textContent).toBe('prose');
  });

  it('displays word target', () => {
    render(
      <SectionHints
        sectionTitle="Objective"
        category="technical_design"
        complexity="moderate"
      />,
    );
    const target = screen.getByTestId('word-target');
    expect(target).toBeDefined();
    expect(target.textContent).toMatch(/~\d+ words/);
  });

  it('shows required indicator for required section', () => {
    render(
      <SectionHints
        sectionTitle="Objective"
        category="technical_design"
        complexity="moderate"
      />,
    );
    const indicator = screen.getByTestId('required-indicator');
    expect(indicator.textContent).toContain('required');
  });

  it('shows optional indicator for optional section', () => {
    render(
      <SectionHints
        sectionTitle="Non-Functional Requirements"
        category="technical_design"
        complexity="complex"
      />,
    );
    const indicator = screen.getByTestId('required-indicator');
    expect(indicator.textContent).toContain('optional');
  });

  it('scales word target based on complexity', () => {
    const { unmount } = render(
      <SectionHints
        sectionTitle="Objective"
        category="technical_design"
        complexity="simple"
      />,
    );
    // simple multiplier is 0.5, so target of 150 → ~75
    const simpleTarget = screen.getByTestId('word-target').textContent;
    unmount();

    render(
      <SectionHints
        sectionTitle="Objective"
        category="technical_design"
        complexity="complex"
      />,
    );
    // complex multiplier is 1.5, so target of 150 → ~225
    const complexTarget = screen.getByTestId('word-target').textContent;

    expect(simpleTarget).not.toBe(complexTarget);
  });
});
