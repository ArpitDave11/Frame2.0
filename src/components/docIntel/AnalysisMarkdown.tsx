/**
 * AnalysisMarkdown — constrained react-markdown renderer for DocIntel sections.
 *
 * Strips LLM headings (section card provides the title), routes blockquotes
 * through evidence-quote styling, constrains code/tables, strips HRs.
 * This is the ONLY place react-markdown is instantiated for DocIntel output.
 *
 * Pattern: Vercel AI Elements' Response component — no `prose`, scoped typography.
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

// ─── Evidence Quote (blockquote styling) ───────────────────

function EvidenceQuote({ children, ...props }: React.ComponentPropsWithoutRef<'blockquote'>) {
  return (
    <blockquote {...props} style={{
      margin: '12px 0', padding: '12px 16px',
      borderLeft: '3px solid #cbd5e1', background: '#fafbfc',
      borderRadius: '0 6px 6px 0', fontStyle: 'italic',
      fontSize: 15, lineHeight: 1.65, color: 'var(--col-text-primary)',
    }}>
      {children}
    </blockquote>
  );
}

// ─── Component Overrides ───────────────────────────────────

const components = {
  // Body text
  p: (props: React.ComponentPropsWithoutRef<'p'>) => (
    <p style={{ margin: '0 0 12px', fontSize: 15, lineHeight: 1.6, color: 'var(--col-text-primary)', fontFamily: F }} {...props} />
  ),

  // Lists
  ul: (props: React.ComponentPropsWithoutRef<'ul'>) => (
    <ul style={{ margin: '0 0 12px', paddingLeft: 20, fontSize: 15, lineHeight: 1.8, fontFamily: F }} {...props} />
  ),
  ol: (props: React.ComponentPropsWithoutRef<'ol'>) => (
    <ol style={{ margin: '0 0 12px', paddingLeft: 20, fontSize: 15, lineHeight: 1.8, fontFamily: F }} {...props} />
  ),
  li: (props: React.ComponentPropsWithoutRef<'li'>) => (
    <li style={{ marginBottom: 6 }} {...props} />
  ),

  // Inline code
  code: ({ children, className, ...rest }: React.ComponentPropsWithoutRef<'code'> & { className?: string }) => {
    const isBlock = className?.startsWith('language-');
    if (isBlock) {
      return (
        <pre style={{
          background: '#1a1a1a', color: '#e0e0e0', padding: 16, borderRadius: 6,
          fontSize: 13, lineHeight: 1.5, overflow: 'auto', margin: '12px 0',
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        }}>
          <code className={className} {...rest}>{children}</code>
        </pre>
      );
    }
    return (
      <code style={{
        background: '#f4f4f5', padding: '2px 6px', borderRadius: 4,
        fontSize: '0.9em', fontFamily: '"JetBrains Mono", monospace',
      }} {...rest}>{children}</code>
    );
  },

  // Tables — constrain width
  table: (props: React.ComponentPropsWithoutRef<'table'>) => (
    <div style={{ overflowX: 'auto', margin: '12px 0' }}>
      <table style={{
        borderCollapse: 'collapse', width: '100%', fontSize: 14, fontFamily: F,
      }} {...props} />
    </div>
  ),
  th: (props: React.ComponentPropsWithoutRef<'th'>) => (
    <th style={{
      border: '1px solid #e5e7eb', padding: '8px 12px', textAlign: 'left',
      background: '#fafafa', fontWeight: 500, fontSize: 13,
    }} {...props} />
  ),
  td: (props: React.ComponentPropsWithoutRef<'td'>) => (
    <td style={{
      border: '1px solid #e5e7eb', padding: '8px 12px', fontSize: 14,
    }} {...props} />
  ),

  // Blockquotes → evidence quote styling
  blockquote: EvidenceQuote,

  // Strong / em
  strong: (props: React.ComponentPropsWithoutRef<'strong'>) => (
    <strong style={{ fontWeight: 600, color: 'var(--col-text-primary)' }} {...props} />
  ),
  em: (props: React.ComponentPropsWithoutRef<'em'>) => (
    <em style={{ fontStyle: 'italic' }} {...props} />
  ),

  // Links — open externally
  a: (props: React.ComponentPropsWithoutRef<'a'>) => (
    <a style={{ color: 'var(--col-background-brand)', textDecoration: 'none' }}
      target="_blank" rel="noopener noreferrer" {...props} />
  ),

  // HR — disallow (LLMs love these, they trash visual rhythm)
  hr: () => null,
};

// ─── Main Component ────────────────────────────────────────

interface Props {
  children: string;
}

export function AnalysisMarkdown({ children }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={components}
      disallowedElements={['h1', 'h2', 'h3', 'h4', 'h5', 'h6']}
      unwrapDisallowed
      skipHtml
    >
      {children}
    </ReactMarkdown>
  );
}
