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

// Initialize mermaid once
mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });

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
