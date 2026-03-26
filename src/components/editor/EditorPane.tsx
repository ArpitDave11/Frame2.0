/**
 * EditorPane — Markdown textarea with empty state category picker.
 * Pixel-matched to UI_Prototype EditorPane.tsx.
 */

import { PencilSimple } from '@phosphor-icons/react';
import { useEpicStore } from '@/stores/epicStore';
import { EPIC_CATEGORIES } from '@/domain/categoryConstants';
import { ImpulseLine, Keyline } from '@/components/shared/ImpulseLine';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace";

export function EditorPane() {
  const markdown = useEpicStore((s) => s.markdown);
  const setMarkdown = useEpicStore((s) => s.setMarkdown);
  const lines = markdown ? markdown.split('\n').length : 0;
  const hasContent = !!markdown.trim();

  const handlePickCategory = (categoryId: string) => {
    const cat = EPIC_CATEGORIES.find((c) => c.id === categoryId);
    if (cat) {
      if (cat.secs.length > 0) {
        const md = cat.secs.map((s) => `## ${s}\n\n_Your content here..._\n`).join('\n');
        setMarkdown(md);
      } else {
        // General category: set minimal prompt so editor enters active mode
        setMarkdown('# \n\n_Start writing your epic here..._\n');
      }
    }
  };

  return (
    <div
      data-testid="editor-pane"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
    >
      {/* Header */}
      <div
        data-testid="editor-header"
        style={{
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--col-border-illustrative)',
          background: '#1a1a1a',
          color: '#888',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PencilSimple size={13} weight="regular" color="#666" />
          <span style={{ fontSize: 12, fontWeight: 300, color: '#aaa', fontFamily: F }}>
            Editor
          </span>
          <span
            data-testid="editor-badge"
            style={{
              padding: '2px 8px',
              background: '#2a2a2a',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 500,
              color: '#666',
              textTransform: 'uppercase' as const,
              letterSpacing: '.5px',
              fontFamily: F,
            }}
          >
            Markdown
          </span>
        </div>
        <span
          data-testid="line-count"
          style={{
            fontSize: 11,
            fontWeight: 300,
            color: '#555',
            fontVariantNumeric: 'tabular-nums',
            fontFamily: F,
          }}
        >
          {lines} lines
        </span>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          background: hasContent ? '#1a1a1a' : 'var(--col-background-ui-10)',
        }}
      >
        {!hasContent ? (
          /* Empty state */
          <div
            data-testid="editor-empty-state"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
              padding: 48,
              animation: 'ubsFade .4s ease',
              fontFamily: F,
            }}
          >
            <ImpulseLine>
              <div
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 300,
                  color: 'var(--col-text-primary)',
                  lineHeight: 1.3,
                  marginBottom: 8,
                }}
              >
                Create your epic
              </div>
              <p
                style={{
                  fontSize: 14,
                  color: 'var(--col-text-subtle)',
                  fontWeight: 300,
                  lineHeight: 1.6,
                  maxWidth: 340,
                  marginBottom: 24,
                }}
              >
                Select a category, write your rough content, then click{' '}
                <span style={{ color: 'var(--col-background-brand)', fontWeight: 500 }}>
                  Refine
                </span>{' '}
                for AI-powered structuring.
              </p>
            </ImpulseLine>
            <Keyline />
            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                justifyContent: 'center',
                marginTop: 28,
              }}
            >
              {EPIC_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handlePickCategory(c.id)}
                  data-testid={`cat-btn-${c.id}`}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 4,
                    border: c.id === 'general'
                      ? '1px solid var(--col-background-brand)'
                      : '1px solid var(--col-border-illustrative)',
                    background: c.id === 'general'
                      ? 'rgba(230, 0, 0, 0.04)'
                      : 'var(--col-background-ui-10)',
                    color: c.id === 'general'
                      ? 'var(--col-background-brand)'
                      : 'var(--col-text-subtle)',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: F,
                    fontWeight: c.id === 'general' ? 400 : 300,
                    transition: 'all .12s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 4,
                      background: 'var(--input-background)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 500,
                      color: 'var(--col-text-subtle)',
                    }}
                  >
                    {c.icon}
                  </span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Active state */
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            spellCheck={false}
            data-testid="editor-textarea"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              outline: 'none',
              resize: 'none',
              padding: '20px 24px',
              fontSize: 13,
              fontFamily: MONO,
              fontWeight: 300,
              lineHeight: 1.8,
              color: '#d4d4d4',
              background: '#1a1a1a',
              letterSpacing: '.01em',
            }}
          />
        )}
      </div>
    </div>
  );
}
