/**
 * SplitPane — Draggable editor/preview divider.
 *
 * Left pane (editor) width from uiStore.editorWidth (20-80%).
 * Right pane fills remaining space. 4px divider turns red on hover/drag.
 * Pixel-matched to UI_Prototype resize logic.
 */

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useUiStore } from '@/stores/uiStore';

interface SplitPaneProps {
  left: ReactNode;
  right: ReactNode;
}

export function SplitPane({ left, right }: SplitPaneProps) {
  const editorWidth = useUiStore((s) => s.editorWidth);
  const setEditorWidth = useUiStore((s) => s.setEditorWidth);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const [isResizing, setIsResizing] = useState(false);

  const sidebarWidth = sidebarCollapsed ? 56 : 220;

  const handleMouseDown = useCallback(() => {
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const availableWidth = window.innerWidth - sidebarWidth;
      if (availableWidth <= 0) return;
      const newWidth = ((e.clientX - sidebarWidth) / availableWidth) * 100;
      setEditorWidth(newWidth); // setEditorWidth clamps to 20-80 internally
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, sidebarWidth, setEditorWidth]);

  return (
    <div data-testid="split-pane" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Left pane (Editor) */}
      <div
        data-testid="split-left"
        style={{
          width: `${editorWidth}%`,
          overflow: 'hidden',
          display: 'flex',
          height: '100%',
        }}
      >
        {left}
      </div>

      {/* Divider */}
      <div
        data-testid="split-divider"
        onMouseDown={handleMouseDown}
        style={{
          width: 4,
          cursor: 'col-resize',
          background: isResizing
            ? 'var(--col-background-brand)'
            : 'var(--col-border-illustrative)',
          transition: isResizing ? 'none' : 'background 0.2s',
          flexShrink: 0,
          position: 'relative',
          zIndex: 10,
        }}
        onMouseEnter={(e) => {
          if (!isResizing) {
            e.currentTarget.style.background = 'var(--col-background-brand)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isResizing) {
            e.currentTarget.style.background = 'var(--col-border-illustrative)';
          }
        }}
      />

      {/* Right pane (Preview) */}
      <div
        data-testid="split-right"
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          height: '100%',
        }}
      >
        {right}
      </div>
    </div>
  );
}
