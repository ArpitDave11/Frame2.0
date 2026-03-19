/**
 * DiagramControls — Floating control bar for blueprint diagrams (T-14.2).
 *
 * Provides zoom, fit-to-screen, fullscreen toggle, and SVG/PNG export.
 */

import {
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  ArrowsIn,
  CornersOut,
  CornersIn,
  DownloadSimple,
} from '@phosphor-icons/react';
import { useBlueprintStore } from '@/stores/blueprintStore';

const BTN: React.CSSProperties = {
  width: 28,
  height: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  background: 'transparent',
  color: 'var(--col-text-subtle, #888)',
  cursor: 'pointer',
  borderRadius: 4,
};

const BTN_HOVER_BG = 'var(--col-background-input, #f0f0f0)';

function CtrlButton({
  label,
  onClick,
  testId,
  children,
}: {
  label: string;
  onClick: () => void;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      data-testid={testId}
      onClick={onClick}
      style={BTN}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = BTN_HOVER_BG;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

export function DiagramControls() {
  const zoom = useBlueprintStore((s) => s.zoom);
  const setZoom = useBlueprintStore((s) => s.setZoom);
  const isFullscreen = useBlueprintStore((s) => s.isFullscreen);
  const toggleFullscreen = useBlueprintStore((s) => s.toggleFullscreen);
  const svgContent = useBlueprintStore((s) => s.svgContent);

  function handleExportSvg() {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blueprint.svg';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportPng() {
    if (!svgContent) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 600;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = 'blueprint.png';
      a.click();
    };

    img.src = url;
  }

  return (
    <div
      data-testid="diagram-controls"
      style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: '#fff',
        border: '1px solid var(--col-border-subtle, #e0e0e0)',
        borderRadius: 8,
        padding: '4px 8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        zIndex: 20,
      }}
    >
      <CtrlButton
        label="Zoom out"
        testId="zoom-out"
        onClick={() => setZoom(Math.max(25, zoom - 25))}
      >
        <MagnifyingGlassMinus size={16} />
      </CtrlButton>

      <span
        data-testid="zoom-display"
        style={{
          fontSize: 12,
          minWidth: 36,
          textAlign: 'center',
          color: 'var(--col-text-subtle, #888)',
          userSelect: 'none',
        }}
      >
        {zoom}%
      </span>

      <CtrlButton
        label="Zoom in"
        testId="zoom-in"
        onClick={() => setZoom(Math.min(200, zoom + 25))}
      >
        <MagnifyingGlassPlus size={16} />
      </CtrlButton>

      <CtrlButton
        label="Fit to screen"
        testId="zoom-fit"
        onClick={() => setZoom(100)}
      >
        <ArrowsIn size={16} />
      </CtrlButton>

      <CtrlButton
        label="Toggle fullscreen"
        testId="fullscreen-toggle"
        onClick={toggleFullscreen}
      >
        {isFullscreen ? <CornersIn size={16} /> : <CornersOut size={16} />}
      </CtrlButton>

      <CtrlButton
        label="Export SVG"
        testId="export-svg"
        onClick={handleExportSvg}
      >
        <DownloadSimple size={16} />
      </CtrlButton>

      <CtrlButton
        label="Export PNG"
        testId="export-png"
        onClick={handleExportPng}
      >
        <span style={{ fontSize: 10, fontWeight: 600 }}>PNG</span>
      </CtrlButton>
    </div>
  );
}
