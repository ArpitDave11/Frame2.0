/**
 * UBS Design Tokens — Single Source of Truth
 *
 * Every color, spacing value, shadow, typography constant, and layout
 * token in the application imports from this file.
 * No other file may define brand colors or design values.
 *
 * Source: UBS Brand Theme Style Guide + UBS_Theme_Instructions.docx
 * Palette: Flat colors only — no gradients in brand tokens.
 */

// ─── Brand Colors ──────────────────────────────────────────────
// Official UBS hex values. Do not modify without brand approval.

export const color = {
  // Primary
  red: '#E60000',
  bordeauxI: '#BD000C',
  black: '#000000',
  white: '#FFFFFF',

  // Grays (official UBS gray ramp)
  grayI: '#CCCABC',
  grayIII: '#8E8D83',
  grayV: '#5A5D5C',

  // Pastels (official UBS pastel ramp)
  pastelI: '#ECEBE4',
  pastelII: '#F5F0E1',

  // Neutrals
  neutral50: '#FAFAFA',
  neutral200: '#E5E5E5',
} as const;

// ─── CSS Custom Property Colors ─────────────────────────────────
// Maps to the CSS variable system from UBS_Theme_Instructions.docx

export const cssVar = {
  // Brand
  colBackgroundBrand: '#E60000',
  colTextPrimary: '#000000',
  colTextSubtle: '#666666',
  colTextInverted: '#FFFFFF',
  colBackgroundPrimary: '#000000',
  colBackgroundUi10: '#FFFFFF',
  colBorderIllustrative: '#E0E0E0',
  colBorderInverted: '#FFFFFF',

  // Links
  colLinkTextBrand: '#E60000',
  colLinkTextBrandVisited: '#B30000',
  colLinkTextBrandHovered: '#CC0000',
  colLinkTextPrimary: '#000000',
  colLinkTextInverted: '#FFFFFF',
  colLinkTextInvertedHovered: '#CCCCCC',
  colLinkTextSubtle: '#666666',

  // UI Surface
  background: '#FFFFFF',
  primary: '#030213',
  muted: '#ECECF0',
  mutedForeground: '#717182',
  accent: '#E9EBEF',
  destructive: '#D4183D',
  inputBackground: '#F3F3F5',
  switchBackground: '#CBCED4',
  border: 'rgba(0,0,0,0.1)',
} as const;

// ─── Component-Specific Colors ──────────────────────────────────
// Hardcoded component colors from the theme instructions.

export const component = {
  header: {
    bg: '#FFFFFF',
    border: '#E5E7EB',         // gray-200
    navLink: '#374151',        // gray-700
    navLinkHover: '#111827',   // gray-900
    ctaBg: '#DC2626',          // red-600
    ctaBgHover: '#B91C1C',    // red-700
  },
  page: {
    bg: '#F9FAFB',             // gray-50
  },
  card: {
    bg: '#FFFFFF',
    text: '#4B5563',           // gray-600
  },
  hero: {
    bg: '#000000',
    textOverlay: 'rgba(255,255,255,0.85)',
  },
} as const;

// ─── Semantic Colors ───────────────────────────────────────────

export const semantic = {
  error: color.red,
  warning: color.red,
  success: color.grayV,
  info: color.grayV,

  errorLight: color.pastelI,
  warningLight: color.pastelI,
  successLight: color.pastelII,
  infoLight: color.pastelI,
} as const;

// ─── Focus & Accessibility ─────────────────────────────────────

export const focus = {
  ring: '0 0 0 3px rgba(230, 0, 0, 0.12)',
  borderColor: 'rgba(230, 0, 0, 0.35)',
  glow: 'rgba(230, 0, 0, 0.12)',
} as const;

// ─── Grid & Layout ──────────────────────────────────────────────
// 24-column grid system from UBS theme instructions.

export const grid = {
  gutter: '20px',
  colWidth: '60px',
  cols: 24,
  containerWidth: '1920px',
  containerPadding: '32px', // px-8
} as const;

// ─── Spacing (8px grid) ────────────────────────────────────────

export const spacing = {
  0: '0px',
  0.5: '4px',
  1: '8px',
  1.5: '12px',
  2: '16px',
  3: '24px',
  4: '32px',
  5: '40px',
  6: '48px',
  8: '64px',
} as const;

// ─── Border Radius ─────────────────────────────────────────────
// From UBS theme instructions: base --radius is 10px (0.625rem).

export const radius = {
  sm: '6px',   // calc(0.625rem - 4px)
  md: '8px',   // calc(0.625rem - 2px)
  lg: '10px',  // 0.625rem base
  xl: '14px',  // calc(0.625rem + 4px)
  full: '9999px',
  button: '4px', // CTA button in header
} as const;

// ─── Typography ────────────────────────────────────────────────
// UBS brand: Frutiger family. Fallback chain per theme instructions.

export const font = {
  sans: "Frutiger, Arial, Helvetica, sans-serif",
  mono: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
} as const;

export const fontSize = {
  xs: '0.75rem',     // 12px — cookie banner buttons
  sm: '0.875rem',    // 14px — nav links, captions, footer
  base: '1rem',      // 16px — body, root
  lg: '1.25rem',     // 20px — info text, service card heading, lead text
  xl: '1.5rem',      // 24px — section header large
  '2xl': '1.75rem',  // 28px — section header default, page headline small
  '3xl': '2rem',     // 32px — page headline medium
  '4xl': '2.5rem',   // 40px — page headline small @md
  '5xl': '3rem',     // 48px — page headline medium @xl
  '6xl': '3.125rem', // 50px — page headline large @lg
  '7xl': '3.75rem',  // 60px — page headline large @xl
} as const;

export const fontWeight = {
  light: 300,     // Body text, headlines — UBS brand dominant weight
  normal: 400,    // Form inputs
  medium: 500,    // Buttons, labels, nav links, footer titles
  semibold: 600,  // Page titles
} as const;

// ─── Shadows ───────────────────────────────────────────────────

export const shadow = {
  xs: '0 1px 2px rgba(0, 0, 0, 0.02), 0 0 1px rgba(0, 0, 0, 0.03)',
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 12px 32px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04)',
  xl: '0 24px 48px rgba(0, 0, 0, 0.10), 0 12px 24px rgba(0, 0, 0, 0.06)',
  focus: focus.ring,
} as const;

// ─── Glass Effect ──────────────────────────────────────────────

export const glass = {
  background: 'rgba(255, 255, 255, 0.72)',
  backgroundHover: 'rgba(255, 255, 255, 0.78)',
  border: 'rgba(255, 255, 255, 0.6)',
  borderTop: 'rgba(255, 255, 255, 0.8)',
  blur: '24px',
  shadow: `
    0 0 0 1px rgba(255, 255, 255, 0.5),
    0 1px 2px rgba(0, 0, 0, 0.02),
    0 2px 4px rgba(0, 0, 0, 0.02),
    0 4px 8px rgba(0, 0, 0, 0.03),
    0 8px 16px rgba(0, 0, 0, 0.03),
    0 16px 32px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    inset 0 0 0 1px rgba(255, 255, 255, 0.2)
  `.trim(),
} as const;

// ─── Breakpoints ────────────────────────────────────────────────

export const breakpoint = {
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1440px',
} as const;

// ─── Transitions ────────────────────────────────────────────────

export const transition = {
  colors: 'color 150ms ease, background-color 150ms ease, border-color 150ms ease',
  opacity: 'opacity 400ms ease-in-out',
  arrowButton: 'all 200ms ease',
  indicatorDot: 'all 300ms ease',
  doormatUnderline: 'background-size 0.2s cubic-bezier(1, 0, 0.3, 1)',
} as const;

// ─── Chart Colors ──────────────────────────────────────────────

export const chart = [
  color.red,
  color.bordeauxI,
  color.black,
  color.grayV,
  color.grayIII,
  color.grayI,
  color.pastelI,
] as const;

// ─── Aggregate Export ──────────────────────────────────────────

export const tokens = {
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
} as const;

// ─── Type Exports ──────────────────────────────────────────────

export type UBSColor = typeof color;
export type CSSVarColor = typeof cssVar;
export type ComponentColor = typeof component;
export type SemanticColor = typeof semantic;
export type Spacing = typeof spacing;
export type Radius = typeof radius;
export type Shadow = typeof shadow;
export type Breakpoint = typeof breakpoint;
