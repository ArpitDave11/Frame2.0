import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VarianceBadge } from './VarianceBadge';
import type { VarianceBand } from '@/domain/brp';

describe('VarianceBadge', () => {
  it.each<[VarianceBand, string]>([
    ['agree', 'In tolerance'],
    ['caution', 'Discuss'],
    ['re-groom', 'Re-groom'],
    ['flagged', 'Needs detail'],
    ['pending', 'Pending'],
  ])('renders the %s band with display label "%s"', (variance, label) => {
    render(<VarianceBadge variance={variance} />);
    expect(screen.getByTestId('variance-badge').textContent).toContain(label);
  });

  it.each<VarianceBand>(['agree', 'caution', 're-groom', 'flagged', 'pending'])(
    'sets data-variance="%s" for selector/integration assertions',
    (variance) => {
      render(<VarianceBadge variance={variance} />);
      expect(screen.getByTestId('variance-badge').getAttribute('data-variance')).toBe(variance);
    },
  );

  it('exposes a default ARIA label including the display label', () => {
    render(<VarianceBadge variance="re-groom" />);
    const el = screen.getByTestId('variance-badge');
    expect(el.getAttribute('role')).toBe('status');
    expect(el.getAttribute('aria-label')).toBe('Variance: Re-groom');
  });

  it('honors a custom ariaLabel override', () => {
    render(<VarianceBadge variance="agree" ariaLabel="custom label" />);
    expect(screen.getByTestId('variance-badge').getAttribute('aria-label')).toBe('custom label');
  });

  it('renders an icon (color-independent signal — accessibility requirement)', () => {
    const { container } = render(<VarianceBadge variance="caution" />);
    // Phosphor renders an <svg>. Presence of any SVG inside the badge is
    // sufficient to verify the icon was attached.
    const svg = container.querySelector('[data-testid="variance-badge"] svg');
    expect(svg).not.toBeNull();
  });

  it('icons are aria-hidden so the label is the sole announced text', () => {
    const { container } = render(<VarianceBadge variance="flagged" />);
    const svg = container.querySelector('[data-testid="variance-badge"] svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });
});
