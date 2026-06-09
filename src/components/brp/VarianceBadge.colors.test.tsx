/**
 * BRP quality remediation Task 1-1 — verify each variance band paints
 * a visually distinct background, text, and border. The original
 * BAND_CONFIG painted all four bands in pastelI/pastelII/grayV which
 * made them indistinguishable at a glance.
 *
 * Kept separate from VarianceBadge.test.tsx because the H3 hook
 * protects existing test files; new file = allowed.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VarianceBadge } from './VarianceBadge';
import { color } from '@/theme/tokens';

function bgOf(testid: string): string {
  const el = screen.getByTestId(testid);
  return (el as HTMLElement).style.backgroundColor;
}

/** rgb() form of a hex value the way jsdom serializes inline styles. */
function rgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

describe('VarianceBadge — semantic palette (Task 1-1)', () => {
  it('agree band paints green background + green text + green border', () => {
    render(<VarianceBadge variance="agree" />);
    const el = screen.getByTestId('variance-badge') as HTMLElement;
    expect(el.style.backgroundColor).toBe(rgb(color.semanticGreenBg));
    expect(el.style.color).toBe(rgb(color.semanticGreenText));
    expect(el.style.border).toContain(rgb(color.semanticGreenBorder));
  });

  it('caution band paints amber background + amber text + amber border', () => {
    render(<VarianceBadge variance="caution" />);
    const el = screen.getByTestId('variance-badge') as HTMLElement;
    expect(el.style.backgroundColor).toBe(rgb(color.semanticAmberBg));
    expect(el.style.color).toBe(rgb(color.semanticAmberText));
    expect(el.style.border).toContain(rgb(color.semanticAmberBorder));
  });

  it('re-groom band paints red background + brand red text + red border', () => {
    render(<VarianceBadge variance="re-groom" />);
    const el = screen.getByTestId('variance-badge') as HTMLElement;
    expect(el.style.backgroundColor).toBe(rgb(color.semanticRedBg));
    expect(el.style.color).toBe(rgb(color.red));
    expect(el.style.border).toContain(rgb(color.semanticRedBorder));
  });

  it('flagged band paints purple background + purple text + purple border', () => {
    render(<VarianceBadge variance="flagged" />);
    const el = screen.getByTestId('variance-badge') as HTMLElement;
    expect(el.style.backgroundColor).toBe(rgb(color.semanticPurpleBg));
    expect(el.style.color).toBe(rgb(color.semanticPurpleText));
    expect(el.style.border).toContain(rgb(color.semanticPurpleBorder));
  });

  it('all 5 bands paint different backgrounds (no two collide)', () => {
    const bgs = (['agree', 'caution', 're-groom', 'flagged', 'pending'] as const).map(
      (band) => {
        const { unmount } = render(<VarianceBadge variance={band} />);
        const v = bgOf('variance-badge');
        unmount();
        return v;
      },
    );
    expect(new Set(bgs).size).toBe(5);
  });
});
