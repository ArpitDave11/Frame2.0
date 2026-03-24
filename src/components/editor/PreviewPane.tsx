/**
 * PreviewPane — Live markdown preview using react-markdown.
 * Renders all standard markdown plus GFM (tables, strikethrough, etc).
 * Mermaid code blocks render as styled <pre> with "View in Blueprint" hint.
 */

import { Eye } from '@phosphor-icons/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useEpicStore } from '@/stores/epicStore';
import type { Components } from 'react-markdown';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace";

// ─── Custom components for react-markdown ─────────────────────

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 style={{ fontSize: '1.5rem', fontWeight: 400, color: 'var(--col-text-primary)', margin: '0 0 16px', fontFamily: F }}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 style={{ fontSize: '1.125rem', fontWeight: 300, color: 'var(--col-text-primary)', margin: '24px 0 6px', fontFamily: F }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ fontSize: '0.95rem', fontWeight: 400, color: 'var(--col-text-primary)', margin: '20px 0 4px', fontFamily: F }}>
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p style={{ fontSize: 13, color: 'var(--col-text-subtle)', margin: '3px 0', lineHeight: 1.6, fontWeight: 300, fontFamily: F }}>
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong style={{ fontWeight: 500, color: 'var(--col-text-primary)' }}>{children}</strong>
  ),
  em: ({ children }) => (
    <em style={{ color: 'var(--col-text-subtle)', fontWeight: 300 }}>{children}</em>
  ),
  ul: ({ children }) => (
    <ul style={{ margin: '4px 0', paddingLeft: 20, fontSize: 13, color: 'var(--col-text-subtle)', fontWeight: 300, fontFamily: F, lineHeight: 1.6 }}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol style={{ margin: '4px 0', paddingLeft: 20, fontSize: 13, color: 'var(--col-text-subtle)', fontWeight: 300, fontFamily: F, lineHeight: 1.6 }}>
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li style={{ margin: '2px 0' }}>{children}</li>
  ),
  code: ({ className, children }) => {
    const lang = className?.replace('language-', '') || '';
    const codeText = String(children).replace(/\n$/, '');

    if (!className) {
      return (
        <code style={{
          padding: '2px 6px',
          background: 'var(--input-background)',
          borderRadius: 4,
          fontSize: 12,
          fontFamily: MONO,
          color: 'var(--col-text-primary)',
        }}>
          {children}
        </code>
      );
    }

    return (
      <div style={{
        margin: '16px 0',
        borderRadius: 8,
        border: '1px solid var(--col-border-illustrative)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '6px 12px',
          background: '#2a2a2a',
          fontSize: 10,
          fontWeight: 500,
          color: '#888',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontFamily: F,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{lang || 'code'}</span>
          {lang === 'mermaid' && (
            <span style={{ fontSize: 9, fontWeight: 300, textTransform: 'none', letterSpacing: 'normal' }}>
              View in Blueprint tab
            </span>
          )}
        </div>
        <pre style={{
          margin: 0,
          padding: '12px 16px',
          background: '#1a1a1a',
          color: '#d4d4d4',
          fontSize: 11,
          fontFamily: MONO,
          fontWeight: 300,
          lineHeight: 1.6,
          overflow: 'auto',
          whiteSpace: 'pre',
        }}>
          {codeText}
        </pre>
      </div>
    );
  },
  blockquote: ({ children }) => (
    <blockquote style={{
      margin: '8px 0',
      paddingLeft: 16,
      borderLeft: '3px solid var(--col-background-brand)',
      color: 'var(--col-text-subtle)',
      fontStyle: 'italic',
    }}>
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr style={{ border: 'none', borderTop: '1px solid var(--col-border-illustrative)', margin: '20px 0' }} />
  ),
  table: ({ children }) => (
    <table style={{
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 12,
      fontFamily: F,
      margin: '12px 0',
    }}>
      {children}
    </table>
  ),
  th: ({ children }) => (
    <th style={{
      padding: '6px 10px',
      borderBottom: '2px solid var(--col-border-illustrative)',
      textAlign: 'left',
      fontWeight: 500,
      fontSize: 11,
      color: 'var(--col-text-primary)',
    }}>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td style={{
      padding: '6px 10px',
      borderBottom: '1px solid var(--col-border-illustrative)',
      fontSize: 12,
      fontWeight: 300,
      color: 'var(--col-text-subtle)',
    }}>
      {children}
    </td>
  ),
};

// ─── Component ─────────────────────────────────────────────

export function PreviewPane() {
  const markdown = useEpicStore((s) => s.markdown);

  return (
    <div
      data-testid="preview-pane"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--col-background-ui-10)',
        borderLeft: '1px solid var(--col-border-illustrative)',
        minWidth: 0,
        height: '100%',
        minHeight: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--col-border-illustrative)',
          flexShrink: 0,
        }}
      >
        <button
          style={{
            padding: '6px 16px',
            border: 'none',
            borderBottom: '2px solid var(--col-background-brand)',
            background: 'transparent',
            color: 'var(--col-text-primary)',
            fontSize: 12,
            fontWeight: 400,
            cursor: 'default',
            fontFamily: F,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Eye size={13} weight="regular" />
          Preview
        </button>
      </div>

      {/* Content */}
      <div data-testid="preview-content" style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {!markdown.trim() ? (
          <div
            data-testid="preview-empty"
            style={{
              color: 'var(--col-text-subtle)',
              fontSize: 13,
              textAlign: 'center',
              paddingTop: 80,
              fontFamily: F,
            }}
          >
            Preview renders here
          </div>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {markdown}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
