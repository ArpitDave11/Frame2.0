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
        position: 'relative',
        overflow: 'auto',
        background: isFullscreen ? '#fff' : 'var(--col-background-ui-10, #fafafa)',
        ...(isFullscreen ? { position: 'fixed', inset: 0, zIndex: 200 } : {}),
      }}
    >
      <div style={{ padding: 24, minHeight: '100%' }}>
        <DiagramRenderer />
      </div>
      <DiagramControls />
    </div>
  );
}
