/**
 * BlueprintView — Full-width blueprint diagram viewer (T-14.1).
 *
 * Shows empty state when no mermaid code is available,
 * otherwise renders DiagramRenderer with floating DiagramControls.
 */

import { SquaresFour } from '@phosphor-icons/react';
import { useBlueprintStore } from '@/stores/blueprintStore';
import { DiagramRenderer } from './DiagramRenderer';
import { DiagramControls } from './DiagramControls';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function BlueprintView() {
  const code = useBlueprintStore((s) => s.code);
  const isFullscreen = useBlueprintStore((s) => s.isFullscreen);
  const diagramType = useBlueprintStore((s) => s.diagramType);

  if (!code.trim()) {
    return (
      <div
        data-testid="blueprint-empty"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: 48,
          fontFamily: F,
          color: 'var(--col-text-subtle, #888)',
        }}
      >
        <SquaresFour size={32} weight="regular" color="var(--col-text-subtle, #888)" />
        <div style={{ fontSize: 14, fontWeight: 500 }}>
          Run Refine to generate an architecture diagram
        </div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          The AI pipeline creates Mermaid diagrams automatically
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="blueprint-viewer"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: isFullscreen ? '#fff' : 'var(--col-background-ui-10, #fafafa)',
        ...(isFullscreen ? { position: 'fixed', inset: 0, zIndex: 200 } : {}),
      }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 24px',
        borderBottom: '1px solid var(--col-border-illustrative, #e5e5e5)',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 600, fontSize: 16, fontFamily: F, color: 'var(--col-text-primary)' }}>
          Blueprint Diagram
        </span>
        {diagramType && (
          <span style={{
            padding: '4px 12px',
            backgroundColor: 'rgba(230, 0, 0, 0.08)',
            color: '#E60000',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            border: '1px solid rgba(230, 0, 0, 0.15)',
            fontFamily: F,
          }}>
            {diagramType}
          </span>
        )}
      </div>
      {/* Diagram */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <div style={{ padding: 24 }}>
          <DiagramRenderer />
        </div>
        <DiagramControls />
      </div>
    </div>
  );
}
