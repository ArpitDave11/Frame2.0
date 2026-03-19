/**
 * PreviewPane — Live markdown rendering (Preview only, no Blueprint tab).
 * Pixel-matched to UI_Prototype PreviewPane.tsx preview rendering.
 */

import { Eye } from '@phosphor-icons/react';
import { useEpicStore } from '@/stores/epicStore';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function PreviewPane() {
  const markdown = useEpicStore((s) => s.markdown);

  const renderPreview = () => {
    if (!markdown.trim()) {
      return (
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
      );
    }

    return markdown.split('\n').map((l, i) => {
      if (l.startsWith('## '))
        return (
          <h2
            key={i}
            style={{
              fontSize: '1.125rem',
              fontWeight: 300,
              color: 'var(--col-text-primary)',
              margin: '24px 0 6px',
              fontFamily: F,
            }}
          >
            {l.slice(3)}
          </h2>
        );
      if (l.startsWith('_') && l.endsWith('_'))
        return (
          <p
            key={i}
            style={{
              color: 'var(--col-text-subtle)',
              fontStyle: 'italic',
              fontSize: 13,
              margin: '4px 0',
              fontWeight: 300,
              fontFamily: F,
            }}
          >
            {l.slice(1, -1)}
          </p>
        );
      if (l.trim())
        return (
          <p
            key={i}
            style={{
              fontSize: 13,
              color: 'var(--col-text-subtle)',
              margin: '3px 0',
              lineHeight: 1.6,
              fontWeight: 300,
              fontFamily: F,
            }}
          >
            {l}
          </p>
        );
      return <br key={i} />;
    });
  };

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
      {/* Header — Preview tab only (Blueprint is now a separate sidebar view) */}
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
        {renderPreview()}
      </div>
    </div>
  );
}
