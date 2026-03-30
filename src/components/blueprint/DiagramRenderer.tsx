/**
 * DiagramRenderer — Core Mermaid rendering component (T-14.3).
 *
 * Converts mermaid source code from blueprintStore into rendered SVG.
 * Handles zoom scaling and render errors gracefully.
 */

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useBlueprintStore } from '@/stores/blueprintStore';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

// Single global mermaid config — V4 parity. No other file should call initialize().
// Theme: Paul Tol Light palette on #FAFAFA. Per-diagram %%{init} overrides cascade on top.
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  securityLevel: 'loose',
  fontFamily: 'Frutiger, Helvetica Neue, Helvetica, Arial, sans-serif',
  themeVariables: {
    darkMode: false,
    background: '#FAFAFA',
    primaryColor: '#E8F0FE',
    primaryTextColor: '#1A1A2E',
    primaryBorderColor: '#4A90D9',
    secondaryColor: '#F5F5F5',
    tertiaryColor: '#F0F4F8',
    tertiaryBorderColor: '#B0BEC5',
    tertiaryTextColor: '#37474F',
    lineColor: '#546E7A',
    textColor: '#37474F',
    mainBkg: '#E8F0FE',
    nodeBorder: '#4A90D9',
    nodeTextColor: '#1A1A2E',
    clusterBkg: '#F5F7FA',
    clusterBorder: '#B0BEC5',
    titleColor: '#37474F',
    edgeLabelBackground: '#FAFAFA',
    fontSize: '14px',
    noteBkgColor: '#FFF8E1',
    noteTextColor: '#333333',
    noteBorderColor: '#FFD54F',
  },
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis',
    nodeSpacing: 40,
    rankSpacing: 50,
    diagramPadding: 20,
    padding: 8,
  },
});

export function DiagramRenderer() {
  const code = useBlueprintStore((s) => s.code);
  const zoom = useBlueprintStore((s) => s.zoom);
  const setSvg = useBlueprintStore((s) => s.setSvg);
  const setError = useBlueprintStore((s) => s.setError);
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgHtml, setSvgHtml] = useState('');
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (!code.trim()) {
      setSvgHtml('');
      setRenderError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, code);
        if (!cancelled) {
          setSvgHtml(svg);
          setSvg(svg);
          setRenderError(null);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setRenderError(msg);
          setError(msg);
          setSvgHtml('');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, setSvg, setError]);

  if (renderError) {
    return (
      <div
        data-testid="diagram-error"
        style={{ padding: 24, color: '#991b1b', fontSize: 13, fontFamily: F }}
      >
        <strong>Diagram render error:</strong>
        <br />
        {renderError}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="diagram-svg"
      style={{
        transform: `scale(${zoom / 100})`,
        transformOrigin: 'top left',
        transition: 'transform 0.2s ease',
      }}
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
}
