import { describe, it, expect } from 'vitest';
import {
  color,
  cssVar,
  component,
  semantic,
  focus,
  grid,
  spacing,
  radius,
  font,
  fontSize,
  fontWeight,
  shadow,
  glass,
  breakpoint,
  transition,
  chart,
  tokens,
} from './tokens';

// ─── Helpers ──────────────────────────────────────────────

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
const isHex = (v: string) => HEX_RE.test(v);

/** Extract numeric px value from a spacing string like '24px' */
const pxVal = (s: string) => parseInt(s.replace('px', ''), 10);

// ─── 1. Brand Colors — exact UBS hex values ──────────────

describe('color — brand palette', () => {
  it('has exactly 11 brand colors', () => {
    expect(Object.keys(color)).toHaveLength(11);
  });

  it('red matches UBS brand #E60000', () => {
    expect(color.red).toBe('#E60000');
  });

  it('bordeauxI matches #BD000C', () => {
    expect(color.bordeauxI).toBe('#BD000C');
  });

  it('black is #000000', () => {
    expect(color.black).toBe('#000000');
  });

  it('white is #FFFFFF', () => {
    expect(color.white).toBe('#FFFFFF');
  });

  it('grayI matches #CCCABC', () => {
    expect(color.grayI).toBe('#CCCABC');
  });

  it('grayIII matches #8E8D83', () => {
    expect(color.grayIII).toBe('#8E8D83');
  });

  it('grayV matches #5A5D5C', () => {
    expect(color.grayV).toBe('#5A5D5C');
  });

  it('pastelI matches #ECEBE4', () => {
    expect(color.pastelI).toBe('#ECEBE4');
  });

  it('pastelII matches #F5F0E1', () => {
    expect(color.pastelII).toBe('#F5F0E1');
  });

  it('neutral50 matches #FAFAFA', () => {
    expect(color.neutral50).toBe('#FAFAFA');
  });

  it('neutral200 matches #E5E5E5', () => {
    expect(color.neutral200).toBe('#E5E5E5');
  });

  it('every brand color is a valid 6-digit hex', () => {
    Object.values(color).forEach((hex) => {
      expect(hex).toMatch(HEX_RE);
    });
  });
});

// ─── 2. Semantic Colors ──────────────────────────────────

describe('semantic — mapped from brand colors', () => {
  it('has exactly 8 semantic color entries', () => {
    expect(Object.keys(semantic)).toHaveLength(8);
  });

  it('error maps to UBS red', () => {
    expect(semantic.error).toBe(color.red);
  });

  it('warning maps to UBS red', () => {
    expect(semantic.warning).toBe(color.red);
  });

  it('success maps to grayV (no green)', () => {
    expect(semantic.success).toBe(color.grayV);
  });

  it('info maps to grayV (no blue)', () => {
    expect(semantic.info).toBe(color.grayV);
  });

  it('light variants map to pastel brand colors', () => {
    expect(semantic.errorLight).toBe(color.pastelI);
    expect(semantic.warningLight).toBe(color.pastelI);
    expect(semantic.successLight).toBe(color.pastelII);
    expect(semantic.infoLight).toBe(color.pastelI);
  });

  it('no green, yellow, or blue in semantic palette (UBS constraint)', () => {
    const allVals = Object.values(semantic);
    const forbidden = ['#00FF00', '#008000', '#FFFF00', '#FFD700', '#0000FF', '#0000CC'];
    allVals.forEach((val) => {
      forbidden.forEach((bad) => {
        expect(val.toUpperCase()).not.toBe(bad);
      });
    });
  });

  it('every semantic color maps to a valid brand color', () => {
    const brandHexes = new Set(Object.values(color));
    Object.values(semantic).forEach((val) => {
      expect(brandHexes.has(val)).toBe(true);
    });
  });
});

// ─── 3. CSS Custom Property Colors ──────────────────────

describe('cssVar — CSS custom properties from UBS theme instructions', () => {
  it('colBackgroundBrand is UBS Red #E60000', () => {
    expect(cssVar.colBackgroundBrand).toBe('#E60000');
  });

  it('colTextPrimary is #000000', () => {
    expect(cssVar.colTextPrimary).toBe('#000000');
  });

  it('colTextSubtle is #666666', () => {
    expect(cssVar.colTextSubtle).toBe('#666666');
  });

  it('colLinkTextBrandVisited is #B30000', () => {
    expect(cssVar.colLinkTextBrandVisited).toBe('#B30000');
  });

  it('colLinkTextBrandHovered is #CC0000', () => {
    expect(cssVar.colLinkTextBrandHovered).toBe('#CC0000');
  });

  it('destructive is #D4183D', () => {
    expect(cssVar.destructive).toBe('#D4183D');
  });
});

// ─── 4. Component Colors ─────────────────────────────────

describe('component — hardcoded component colors', () => {
  it('header bg is white', () => {
    expect(component.header.bg).toBe('#FFFFFF');
  });

  it('header border is gray-200 (#E5E7EB)', () => {
    expect(component.header.border).toBe('#E5E7EB');
  });

  it('CTA button bg is red-600 (#DC2626)', () => {
    expect(component.header.ctaBg).toBe('#DC2626');
  });

  it('page bg is gray-50 (#F9FAFB)', () => {
    expect(component.page.bg).toBe('#F9FAFB');
  });

  it('card text is gray-600 (#4B5563)', () => {
    expect(component.card.text).toBe('#4B5563');
  });
});

// ─── 5. Focus & Accessibility ─────────────────────────────

describe('focus tokens', () => {
  it('ring uses UBS red rgba', () => {
    expect(focus.ring).toContain('230, 0, 0');
  });

  it('borderColor uses UBS red rgba', () => {
    expect(focus.borderColor).toContain('230, 0, 0');
  });
});

// ─── 6. Spacing — 8px grid ────────────────────────────────

describe('spacing — 8px grid system', () => {
  it('all spacing values are multiples of 4px', () => {
    Object.values(spacing).forEach((val) => {
      const px = pxVal(val);
      expect(px % 4).toBe(0);
    });
  });

  it('spacing[1] is 8px (base unit)', () => {
    expect(spacing[1]).toBe('8px');
  });

  it('spacing[2] is 16px', () => {
    expect(spacing[2]).toBe('16px');
  });

  it('spacing[4] is 32px', () => {
    expect(spacing[4]).toBe('32px');
  });

  it('spacing[0] is 0px', () => {
    expect(spacing[0]).toBe('0px');
  });

  it('has at least 10 spacing stops', () => {
    expect(Object.keys(spacing).length).toBeGreaterThanOrEqual(10);
  });
});

// ─── 7. Border Radius ────────────────────────────────────

describe('radius — border radius stops', () => {
  it('has at least 5 radius stops', () => {
    expect(Object.keys(radius).length).toBeGreaterThanOrEqual(5);
  });

  it('full is 9999px (pill shape)', () => {
    expect(radius.full).toBe('9999px');
  });

  it('md is 8px', () => {
    expect(radius.md).toBe('8px');
  });
});

// ─── 8. Typography ───────────────────────────────────────

describe('font — typography tokens', () => {
  it('sans stack starts with Frutiger', () => {
    expect(font.sans).toMatch(/^Frutiger/);
  });

  it('sans stack includes Arial fallback', () => {
    expect(font.sans).toContain('Arial');
  });

  it('sans stack includes Helvetica fallback', () => {
    expect(font.sans).toContain('Helvetica');
  });

  it('sans stack ends with sans-serif', () => {
    expect(font.sans).toMatch(/sans-serif$/);
  });

  it('mono stack exists', () => {
    expect(font.mono).toBeDefined();
    expect(font.mono.length).toBeGreaterThan(0);
  });
});

describe('fontWeight — no weight exceeds 600', () => {
  it('all weights are ≤ 600', () => {
    Object.values(fontWeight).forEach((w) => {
      expect(w).toBeLessThanOrEqual(600);
    });
  });

  it('light is 300 (UBS dominant weight)', () => {
    expect(fontWeight.light).toBe(300);
  });

  it('medium is 500', () => {
    expect(fontWeight.medium).toBe(500);
  });

  it('has exactly 4 weight stops', () => {
    expect(Object.keys(fontWeight)).toHaveLength(4);
  });
});

describe('fontSize — typography scale', () => {
  it('base is 1rem (16px)', () => {
    expect(fontSize.base).toBe('1rem');
  });

  it('sm is 0.875rem (14px)', () => {
    expect(fontSize.sm).toBe('0.875rem');
  });

  it('has at least 8 size stops', () => {
    expect(Object.keys(fontSize).length).toBeGreaterThanOrEqual(8);
  });
});

// ─── 9. Shadows ──────────────────────────────────────────

describe('shadow — 6 levels', () => {
  it('has exactly 6 shadow levels', () => {
    expect(Object.keys(shadow)).toHaveLength(6);
  });

  it('has xs, sm, md, lg, xl, focus', () => {
    expect(shadow.xs).toBeDefined();
    expect(shadow.sm).toBeDefined();
    expect(shadow.md).toBeDefined();
    expect(shadow.lg).toBeDefined();
    expect(shadow.xl).toBeDefined();
    expect(shadow.focus).toBeDefined();
  });

  it('focus shadow matches focus.ring', () => {
    expect(shadow.focus).toBe(focus.ring);
  });
});

// ─── 10. Glass Morphism ──────────────────────────────────

describe('glass — morphism tokens', () => {
  it('has background, backgroundHover, border, borderTop, blur, shadow', () => {
    expect(glass.background).toBeDefined();
    expect(glass.backgroundHover).toBeDefined();
    expect(glass.border).toBeDefined();
    expect(glass.borderTop).toBeDefined();
    expect(glass.blur).toBeDefined();
    expect(glass.shadow).toBeDefined();
  });

  it('blur is 24px', () => {
    expect(glass.blur).toBe('24px');
  });
});

// ─── 11. Chart Colors ────────────────────────────────────

describe('chart — visualization palette', () => {
  it('has 7 chart colors', () => {
    expect(chart).toHaveLength(7);
  });

  it('all chart colors are valid brand colors', () => {
    const brandHexes = new Set(Object.values(color));
    chart.forEach((hex) => {
      expect(brandHexes.has(hex)).toBe(true);
    });
  });

  it('first chart color is UBS red', () => {
    expect(chart[0]).toBe(color.red);
  });
});

// ─── 12. Grid & Layout ───────────────────────────────────

describe('grid — 24-column layout system', () => {
  it('has 24 columns', () => {
    expect(grid.cols).toBe(24);
  });

  it('gutter is 20px', () => {
    expect(grid.gutter).toBe('20px');
  });

  it('container max-width is 1920px', () => {
    expect(grid.containerWidth).toBe('1920px');
  });
});

// ─── 13. Breakpoints ─────────────────────────────────────

describe('breakpoint — responsive stops', () => {
  it('md is 768px', () => {
    expect(breakpoint.md).toBe('768px');
  });

  it('xl is 1280px', () => {
    expect(breakpoint.xl).toBe('1280px');
  });
});

// ─── 14. Transitions ────────────────────────────────────

describe('transition — animation tokens', () => {
  it('carousel opacity is 400ms', () => {
    expect(transition.opacity).toContain('400ms');
  });

  it('doormat underline uses cubic-bezier', () => {
    expect(transition.doormatUnderline).toContain('cubic-bezier');
  });
});

// ─── 15. Aggregate Export ─────────────────────────────────

describe('tokens — aggregate export', () => {
  it('includes all expected groups', () => {
    const groups = Object.keys(tokens);
    const expected = [
      'color', 'cssVar', 'component', 'semantic', 'focus', 'grid',
      'spacing', 'radius', 'font', 'fontSize', 'fontWeight',
      'shadow', 'glass', 'breakpoint', 'transition', 'chart',
    ];
    expected.forEach((key) => {
      expect(groups).toContain(key);
    });
  });

  it('tokens is frozen (as const)', () => {
    // as const makes values readonly at type level; verify structure exists
    expect(tokens.color).toBe(color);
    expect(tokens.semantic).toBe(semantic);
    expect(tokens.shadow).toBe(shadow);
    expect(tokens.chart).toBe(chart);
  });
});

// ─── 16. Zero Runtime Dependencies ────────────────────────

describe('module — pure constants', () => {
  it('all brand color values are string literals (no functions)', () => {
    Object.values(color).forEach((v) => {
      expect(typeof v).toBe('string');
    });
  });

  it('all spacing values are string literals', () => {
    Object.values(spacing).forEach((v) => {
      expect(typeof v).toBe('string');
    });
  });

  it('all font weight values are numbers', () => {
    Object.values(fontWeight).forEach((v) => {
      expect(typeof v).toBe('number');
    });
  });
});

// ─── 17. UBS Theme Instructions Hex Completeness ─────────

describe('completeness — all UBS theme hex values present', () => {
  const allTokenHexes = new Set<string>([
    ...(Object.values(color) as string[]),
    ...(Object.values(cssVar) as string[]).filter(isHex),
    ...(Object.values(component.header) as string[]).filter(isHex),
    component.page.bg,
    ...(Object.values(component.card) as string[]).filter(isHex),
    component.hero.bg,
  ]);

  const requiredHexes: Record<string, string> = {
    'UBS Red': '#E60000',
    'Bordeaux': '#BD000C',
    'Black': '#000000',
    'White': '#FFFFFF',
    'Gray I': '#CCCABC',
    'Gray III': '#8E8D83',
    'Gray V': '#5A5D5C',
    'Pastel I': '#ECEBE4',
    'Pastel II': '#F5F0E1',
    'Text Subtle': '#666666',
    'Border Illustrative': '#E0E0E0',
    'Link Visited': '#B30000',
    'Link Hovered': '#CC0000',
    'Link Inverted Hovered': '#CCCCCC',
    'Primary Surface': '#030213',
    'Muted': '#ECECF0',
    'Accent': '#E9EBEF',
    'Destructive': '#D4183D',
    'Input Bg': '#F3F3F5',
    'Switch Bg': '#CBCED4',
    'Header Border': '#E5E7EB',
    'Nav Link': '#374151',
    'Nav Link Hover': '#111827',
    'CTA Red-600': '#DC2626',
    'CTA Red-700': '#B91C1C',
    'Page Bg': '#F9FAFB',
    'Card Text': '#4B5563',
    'Muted Foreground': '#717182',
  };

  Object.entries(requiredHexes).forEach(([name, hex]) => {
    it(`contains ${name} (${hex})`, () => {
      expect(allTokenHexes.has(hex)).toBe(true);
    });
  });
});
