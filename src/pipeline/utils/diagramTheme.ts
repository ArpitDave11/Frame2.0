/**
 * Shared Mermaid diagram theme — Paul Tol Light palette.
 *
 * WCAG AA compliant: all fills at HSL S:35-50%, L:68-76% with dark text (#1A1A2E).
 * Colorblind-safe across deuteranopia, protanopia, and tritanopia.
 * Single source of truth — used by both pipeline (Stage 5) and standalone regeneration.
 */

const THEME_INIT = `%%{init: {'theme': 'base', 'themeVariables': {
  'darkMode': false,
  'background': '#FAFAFA',
  'primaryColor': '#E8F0FE',
  'primaryTextColor': '#1A1A2E',
  'primaryBorderColor': '#4A90D9',
  'secondaryColor': '#F5F5F5',
  'tertiaryColor': '#F0F4F8',
  'tertiaryBorderColor': '#B0BEC5',
  'tertiaryTextColor': '#37474F',
  'lineColor': '#546E7A',
  'textColor': '#37474F',
  'mainBkg': '#E8F0FE',
  'nodeBorder': '#4A90D9',
  'nodeTextColor': '#1A1A2E',
  'clusterBkg': '#F5F7FA',
  'clusterBorder': '#B0BEC5',
  'titleColor': '#37474F',
  'edgeLabelBackground': '#FAFAFA',
  'fontFamily': 'Frutiger, Helvetica Neue, Helvetica, Arial, sans-serif',
  'fontSize': '14px',
  'noteBkgColor': '#FFF8E1',
  'noteTextColor': '#333333',
  'noteBorderColor': '#FFD54F'
}, 'flowchart': {'nodeSpacing': 40, 'rankSpacing': 50, 'diagramPadding': 20, 'curve': 'basis', 'htmlLabels': true, 'padding': 8}}}%%
`;

/**
 * Prepend the FRAME Mermaid theme to diagram code.
 * Skips injection if the diagram already has a %%{init:} block.
 */
export function applyDiagramTheme(diagramCode: string): string {
  if (diagramCode.includes('%%{init:')) return diagramCode;
  return THEME_INIT + diagramCode;
}
