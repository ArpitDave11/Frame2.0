/**
 * PreviewPane — Live markdown preview using react-markdown.
 * Renders all standard markdown plus GFM (tables, strikethrough, etc).
 * Mermaid code blocks render as inline SVG diagrams with error fallback.
 *
 * IMPORTANT: This file does NOT call mermaid.initialize().
 * DiagramRenderer.tsx is the single mermaid initializer for the app.
 * This file only calls mermaid.render() which uses the global config.
 */

import { useEffect, useState } from 'react';
import { Eye } from '@phosphor-icons/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import { useEpicStore } from '@/stores/epicStore';
import type { Components } from 'react-markdown';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace";

// NO mermaid.initialize() here — DiagramRenderer.tsx handles the single global init.

// ─── Mermaid Inline Renderer ────────────────────────────────

let mermaidIdCounter = 0;

function MermaidBlock({ code }: { code: string }) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code.trim()) return;
    let cancelled = false;
    const id = `preview-mermaid-${++mermaidIdCounter}`;

    (async () => {
      try {
        const { svg: rendered } = await mermaid.render(id, code);
        if (!cancelled) { setSvg(rendered); setError(null); }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg.length > 120 ? msg.substring(0, 120) + '...' : msg);
          setSvg('');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [code]);

  if (error) {
    return (
      <div style={{
        padding: 12, background: '#FAFAFA', borderRadius: 6,
        border: '1px dashed #E5E5E5', color: '#5A5D5C', fontSize: 13,
        textAlign: 'center', fontWeight: 300, fontFamily: F,
      }}>
        <span style={{ opacity: 0.6 }}>Diagram rendering error: {error}</span>
      </div>
    );
  }

  if (svg) {
    return (
      <div style={{ margin: '16px 0', overflow: 'auto' }}
           dangerouslySetInnerHTML={{ __html: svg }} />
    );
  }

  return (
    <div style={{ margin: '16px 0', padding: 24, textAlign: 'center', color: '#888', fontSize: 12, fontFamily: F }}>
      Rendering diagram...
    </div>
  );
}

// ─── Custom Markdown Components ─────────────────────────────

const components: Components = {
  h1: ({ children }) => (
    <h1 style={{ fontSize: '1.5rem', fontWeight: 400, color: 'var(--col-text-primary)', margin: '0 0 16px', fontFamily: F }}>{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 style={{ fontSize: '1.125rem', fontWeight: 300, color: 'var(--col-text-primary)', margin: '24px 0 6px', fontFamily: F }}>{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ fontSize: '0.95rem', fontWeight: 400, color: 'var(--col-text-primary)', margin: '20px 0 4px', fontFamily: F }}>{children}</h3>
  ),
  p: ({ children }) => (
    <p style={{ fontSize: 13, color: 'var(--col-text-subtle)', margin: '3px 0', lineHeight: 1.6, fontWeight: 300, fontFamily: F }}>{children}</p>
  ),
  strong: ({ children }) => (
    <strong style={{ fontWeight: 500, color: 'var(--col-text-primary)' }}>{children}</strong>
  ),
  em: ({ children }) => (
    <em style={{ color: 'var(--col-text-subtle)', fontWeight: 300 }}>{children}</em>
  ),
  ul: ({ children }) => (
    <ul style={{ margin: '4px 0', paddingLeft: 20, fontSize: 13, color: 'var(--col-text-subtle)', fontWeight: 300, fontFamily: F, lineHeight: 1.6 }}>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol style={{ margin: '4px 0', paddingLeft: 20, fontSize: 13, color: 'var(--col-text-subtle)', fontWeight: 300, fontFamily: F, lineHeight: 1.6 }}>{children}</ol>
  ),
  li: ({ children }) => <li style={{ margin: '2px 0' }}>{children}</li>,
  code: ({ className, children }) => {
    const lang = className?.replace('language-', '') || '';
    const codeText = String(children).replace(/\n$/, '');

    // Mermaid — render inline diagram (uses global mermaid config from DiagramRenderer)
    if (lang === 'mermaid') {
      return <MermaidBlock code={codeText} />;
    }

    // Inline code (no language class)
    if (!className) {
      return (
        <code style={{ padding: '0.2em 0.4em', background: '#ECEBE4', borderRadius: 6, fontSize: '85%', fontFamily: MONO }}>
          {children}
        </code>
      );
    }

    // Block code — styled pre
    return (
      <pre style={{ background: '#ECEBE4', padding: 16, borderRadius: 6, overflow: 'auto', marginBottom: 16 }}>
        <code style={{ backgroundColor: 'transparent', padding: 0, fontFamily: MONO, fontSize: 12 }}>
          {codeText}
        </code>
      </pre>
    );
  },
  // Prevent react-markdown from wrapping code blocks in an extra <pre>
  pre: ({ children }) => <>{children}</>,
  blockquote: ({ children }) => (
    <blockquote style={{ borderLeft: '4px solid var(--col-background-brand)', padding: '0 16px', color: '#8E8D83', marginBottom: 16, fontWeight: 300 }}>{children}</blockquote>
  ),
  hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--col-border-illustrative)', margin: '20px 0' }} />,
  table: ({ children }) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: F, margin: '12px 0' }}>{children}</table>
  ),
  th: ({ children }) => (
    <th style={{ padding: '6px 10px', borderBottom: '2px solid var(--col-border-illustrative)', textAlign: 'left', fontWeight: 500, fontSize: 11 }}>{children}</th>
  ),
  td: ({ children }) => (
    <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--col-border-illustrative)', fontSize: 12, fontWeight: 300 }}>{children}</td>
  ),
  a: ({ href, children }) => (
    <a href={href} style={{ color: 'var(--col-background-brand)', textDecoration: 'none', fontWeight: 300 }} target="_blank" rel="noopener noreferrer">{children}</a>
  ),
};

// ─── Component ──────────────────────────────────────────────

export function PreviewPane() {
  const markdown = useEpicStore((s) => s.markdown);

  return (
    <div
      data-testid="preview-pane"
      style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        background: 'var(--col-background-ui-10)',
        borderLeft: '1px solid var(--col-border-illustrative)',
        minWidth: 0, height: '100%', minHeight: 0,
      }}
    >
      {/* Header */}
      <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--col-border-illustrative)', flexShrink: 0 }}>
        <button style={{
          padding: '6px 16px', border: 'none', borderBottom: '2px solid var(--col-background-brand)',
          background: 'transparent', color: 'var(--col-text-primary)', fontSize: 12, fontWeight: 400,
          cursor: 'default', fontFamily: F, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Eye size={13} weight="regular" />
          Preview
        </button>
      </div>

      {/* Content */}
      <div data-testid="preview-content" style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {!markdown.trim() ? (
          <div data-testid="preview-empty" style={{ color: 'var(--col-text-subtle)', fontSize: 13, textAlign: 'center', paddingTop: 80, fontFamily: F }}>
            Preview renders here
          </div>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {markdown}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
