/**
 * MermaidPreview — renders Mermaid code as an inline SVG diagram
 * with a toggle to switch between diagram preview and source code.
 *
 * Reuses the global mermaid config from DiagramRenderer.tsx (single initializer).
 */

import { useEffect, useState } from 'react';
import { Code, Eye } from '@phosphor-icons/react';
import mermaid from 'mermaid';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

let idCounter = 0;

interface Props {
  code: string;
  title?: string;
  caption?: string;
}

export function MermaidPreview({ code, title, caption }: Props) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    if (!code.trim()) return;
    let cancelled = false;
    const id = `docIntel-mermaid-${++idCounter}`;

    (async () => {
      try {
        const { svg: rendered } = await mermaid.render(id, code);
        if (!cancelled) { setSvg(rendered); setError(null); }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg.includes('Syntax error')
            ? 'Diagram syntax error — try regenerating this section.'
            : msg);
          setSvg('');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [code]);

  return (
    <div style={{
      border: '1px solid var(--col-border-illustrative)',
      borderRadius: 8, marginBottom: 16, overflow: 'hidden',
    }}>
      {/* Header with title + toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', background: '#f5f5f5',
        borderBottom: '1px solid var(--col-border-illustrative)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 500, fontFamily: F }}>
          {title ?? 'Diagram'}
        </span>
        <button
          onClick={() => setShowSource(!showSource)}
          title={showSource ? 'Show preview' : 'Show source'}
          style={{
            padding: '3px 8px', borderRadius: 4, border: '1px solid #d1d5db',
            background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: F, fontSize: 11,
          }}
        >
          {showSource ? <><Eye size={12} /> Preview</> : <><Code size={12} /> Source</>}
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: 12 }}>
        {showSource ? (
          <pre style={{
            background: '#1a1a1a', color: '#e0e0e0', padding: 16, borderRadius: 6,
            fontSize: 12, lineHeight: 1.5, overflow: 'auto', maxHeight: 400,
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          }}>
            {code}
          </pre>
        ) : error ? (
          <div style={{
            padding: 12, background: '#fef2f2', borderRadius: 6,
            color: '#991b1b', fontSize: 13, fontFamily: F,
          }}>
            {error}
            <button onClick={() => setShowSource(true)} style={{
              marginLeft: 8, color: 'var(--col-background-brand)', background: 'none',
              border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 12,
            }}>
              View source
            </button>
          </div>
        ) : svg ? (
          <div
            dangerouslySetInnerHTML={{ __html: svg }}
            style={{ textAlign: 'center', overflow: 'auto' }}
          />
        ) : (
          <div style={{ color: 'var(--col-text-subtle)', fontStyle: 'italic', fontSize: 13, fontFamily: F }}>
            Rendering diagram...
          </div>
        )}
      </div>

      {/* Caption */}
      {caption && (
        <div style={{
          padding: '6px 12px', borderTop: '1px solid var(--col-border-illustrative)',
          fontSize: 12, color: 'var(--col-text-subtle)', fontStyle: 'italic', fontFamily: F,
        }}>
          {caption}
        </div>
      )}
    </div>
  );
}
