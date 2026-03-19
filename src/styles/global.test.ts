import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  color,
  cssVar,
  component,
  semantic,
  focus,
  spacing,
  radius,
  shadow,
  font,
} from '../theme/tokens';

// Read the CSS file as text for assertion
let css: string;

beforeAll(() => {
  css = readFileSync(
    resolve(__dirname, 'global.css'),
    'utf-8',
  );
});

// ─── 1. Naming Convention ──────────────────────────────────

describe('CSS variable naming convention', () => {
  it('all custom properties follow --ubs-* or --col-* or --input-* pattern', () => {
    const varDeclarations = css.match(/--[\w-]+(?=\s*:)/g) ?? [];
    expect(varDeclarations.length).toBeGreaterThan(0);
    for (const v of varDeclarations) {
      expect(v).toMatch(/^--(ubs-|col-|input-)/);
    }
  });

  it('color variables use --ubs-color-* prefix', () => {
    const colorVars = css.match(/--ubs-color-[\w-]+/g) ?? [];
    expect(colorVars.length).toBeGreaterThanOrEqual(11); // at least brand colors
  });

  it('spacing variables use --ubs-spacing-* prefix', () => {
    const spacingVars = css.match(/--ubs-spacing-[\w-]+/g) ?? [];
    expect(spacingVars.length).toBeGreaterThanOrEqual(10);
  });

  it('radius variables use --ubs-radius-* prefix', () => {
    const radiusVars = css.match(/--ubs-radius-[\w-]+/g) ?? [];
    expect(radiusVars.length).toBeGreaterThanOrEqual(5);
  });

  it('shadow variables use --ubs-shadow-* prefix', () => {
    const shadowVars = css.match(/--ubs-shadow-[\w-]+/g) ?? [];
    expect(shadowVars.length).toBeGreaterThanOrEqual(6);
  });
});

// ─── 2. Variable Values Match Tokens ───────────────────────

describe('CSS variable values match tokens.ts', () => {
  // Brand colors
  it('--ubs-color-red matches color.red', () => {
    expect(css).toContain(`--ubs-color-red: ${color.red}`);
  });

  it('--ubs-color-bordeaux-i matches color.bordeauxI', () => {
    expect(css).toContain(`--ubs-color-bordeaux-i: ${color.bordeauxI}`);
  });

  it('--ubs-color-black matches color.black', () => {
    expect(css).toContain(`--ubs-color-black: ${color.black}`);
  });

  it('--ubs-color-white matches color.white', () => {
    expect(css).toContain(`--ubs-color-white: ${color.white}`);
  });

  it('--ubs-color-gray-i matches color.grayI', () => {
    expect(css).toContain(`--ubs-color-gray-i: ${color.grayI}`);
  });

  it('--ubs-color-gray-iii matches color.grayIII', () => {
    expect(css).toContain(`--ubs-color-gray-iii: ${color.grayIII}`);
  });

  it('--ubs-color-gray-v matches color.grayV', () => {
    expect(css).toContain(`--ubs-color-gray-v: ${color.grayV}`);
  });

  it('--ubs-color-pastel-i matches color.pastelI', () => {
    expect(css).toContain(`--ubs-color-pastel-i: ${color.pastelI}`);
  });

  it('--ubs-color-pastel-ii matches color.pastelII', () => {
    expect(css).toContain(`--ubs-color-pastel-ii: ${color.pastelII}`);
  });

  it('--ubs-color-neutral-50 matches color.neutral50', () => {
    expect(css).toContain(`--ubs-color-neutral-50: ${color.neutral50}`);
  });

  it('--ubs-color-neutral-200 matches color.neutral200', () => {
    expect(css).toContain(`--ubs-color-neutral-200: ${color.neutral200}`);
  });

  // CSS var colors
  it('--ubs-color-background-brand matches cssVar.colBackgroundBrand', () => {
    expect(css).toContain(`--ubs-color-background-brand: ${cssVar.colBackgroundBrand}`);
  });

  it('--ubs-color-destructive matches cssVar.destructive', () => {
    expect(css).toContain(`--ubs-color-destructive: ${cssVar.destructive}`);
  });

  it('--ubs-color-muted-foreground matches cssVar.mutedForeground', () => {
    expect(css).toContain(`--ubs-color-muted-foreground: ${cssVar.mutedForeground}`);
  });

  // Semantic colors
  it('--ubs-color-error matches semantic.error (= color.red)', () => {
    expect(css).toContain(`--ubs-color-error: ${semantic.error}`);
  });

  it('--ubs-color-success matches semantic.success (= color.grayV)', () => {
    expect(css).toContain(`--ubs-color-success: ${semantic.success}`);
  });

  // Component colors
  it('--ubs-color-header-border matches component.header.border', () => {
    expect(css).toContain(`--ubs-color-header-border: ${component.header.border}`);
  });

  it('--ubs-color-page-bg matches component.page.bg', () => {
    expect(css).toContain(`--ubs-color-page-bg: ${component.page.bg}`);
  });

  // Focus
  it('--ubs-focus-ring matches focus.ring', () => {
    expect(css).toContain(`--ubs-focus-ring: ${focus.ring}`);
  });

  it('--ubs-focus-border-color matches focus.borderColor', () => {
    expect(css).toContain(`--ubs-focus-border-color: ${focus.borderColor}`);
  });

  // Spacing
  it('--ubs-spacing-1 is 8px', () => {
    expect(css).toContain(`--ubs-spacing-1: ${spacing[1]}`);
  });

  it('--ubs-spacing-4 is 32px', () => {
    expect(css).toContain(`--ubs-spacing-4: ${spacing[4]}`);
  });

  it('--ubs-spacing-8 is 64px', () => {
    expect(css).toContain(`--ubs-spacing-8: ${spacing[8]}`);
  });

  // Radius
  it('--ubs-radius-sm is 6px', () => {
    expect(css).toContain(`--ubs-radius-sm: ${radius.sm}`);
  });

  it('--ubs-radius-full is 9999px', () => {
    expect(css).toContain(`--ubs-radius-full: ${radius.full}`);
  });

  // Shadow
  it('--ubs-shadow-xs matches shadow.xs', () => {
    expect(css).toContain(`--ubs-shadow-xs: ${shadow.xs}`);
  });

  it('--ubs-shadow-sm matches shadow.sm', () => {
    expect(css).toContain(`--ubs-shadow-sm: ${shadow.sm}`);
  });

  // Font
  it('--ubs-font-sans matches font.sans', () => {
    expect(css).toContain(`--ubs-font-sans: ${font.sans}`);
  });
});

// ─── 3. No Hardcoded Hex Outside :root ─────────────────────

describe('no hardcoded hex outside :root', () => {
  it('hex values only appear in :root declaration', () => {
    // Find :root block, then its closing brace
    const rootStart = css.indexOf(':root');
    expect(rootStart).toBeGreaterThan(-1);
    let braceDepth = 0;
    let rootEnd = rootStart;
    for (let i = rootStart; i < css.length; i++) {
      if (css[i] === '{') braceDepth++;
      if (css[i] === '}') { braceDepth--; if (braceDepth === 0) { rootEnd = i; break; } }
    }
    const afterRoot = css.slice(rootEnd + 1);

    // Find any raw hex values (not inside var() or comment)
    const lines = afterRoot.split('\n');
    const hexOutsideRoot: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip comments and empty lines
      if (trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed === '') continue;
      // Skip lines that use var()
      if (trimmed.includes('var(')) continue;
      // Check for raw hex
      if (/#[0-9A-Fa-f]{3,8}\b/.test(trimmed)) {
        hexOutsideRoot.push(trimmed);
      }
    }

    expect(hexOutsideRoot).toEqual([]);
  });
});

// ─── 4. Animation Keyframes ────────────────────────────────

describe('animation keyframes', () => {
  it('contains @keyframes spin', () => {
    expect(css).toContain('@keyframes spin');
  });

  it('contains @keyframes fadeIn', () => {
    expect(css).toContain('@keyframes fadeIn');
  });

  it('contains @keyframes slideIn', () => {
    expect(css).toContain('@keyframes slideIn');
  });

  it('contains @keyframes progressShrink', () => {
    expect(css).toContain('@keyframes progressShrink');
  });

  it('contains @keyframes skeleton', () => {
    expect(css).toContain('@keyframes skeleton');
  });

  it('has exactly 5 keyframe definitions', () => {
    const keyframes = css.match(/@keyframes\s+\w+/g) ?? [];
    expect(keyframes).toHaveLength(5);
  });
});

// ─── 5. No Component-Specific Selectors ────────────────────

describe('no component-specific selectors', () => {
  const componentSelectors = [
    '.button', '.card', '.modal', '.sidebar', '.nav',
    '.header', '.footer', '.form', '.input', '.dropdown',
    '.tooltip', '.badge', '.alert', '.toast', '.tab',
  ];

  for (const sel of componentSelectors) {
    it(`does not contain ${sel} selector`, () => {
      // Match selector at start of line or after space (not inside comments or var names)
      const regex = new RegExp(`^\\s*\\${sel}[\\s{,:]`, 'm');
      expect(regex.test(css)).toBe(false);
    });
  }
});

// ─── 6. Base Styles Present ────────────────────────────────

describe('base styles', () => {
  it('sets box-sizing: border-box on universal selector', () => {
    expect(css).toContain('box-sizing: border-box');
  });

  it('body uses var(--ubs-font-sans) for font-family', () => {
    expect(css).toContain('font-family: var(--ubs-font-sans)');
  });

  it('body has background gradient', () => {
    expect(css).toContain('linear-gradient');
  });

  it('html sets font-size: 16px', () => {
    expect(css).toContain('font-size: 16px');
  });

  it('body has margin: 0', () => {
    expect(css).toContain('margin: 0');
  });
});

// ─── 7. Scrollbar Customization ────────────────────────────

describe('scrollbar customization', () => {
  it('contains webkit scrollbar styles', () => {
    expect(css).toContain('::-webkit-scrollbar');
  });

  it('contains Firefox scrollbar-width', () => {
    expect(css).toContain('scrollbar-width: thin');
  });
});

// ─── 8. File Header Comment ────────────────────────────────

describe('file header', () => {
  it('starts with generated-from comment', () => {
    expect(css.trimStart()).toMatch(/^\/\*[\s\S]*Generated from src\/theme\/tokens\.ts/);
  });

  it('warns not to add colors directly', () => {
    expect(css).toContain('do not add colors directly');
  });
});
