/**
 * Tests for SplitPane — Draggable editor/preview divider.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SplitPane } from './SplitPane';
import { useUiStore } from '@/stores/uiStore';

beforeEach(() => {
  useUiStore.setState(useUiStore.getInitialState());
});

afterEach(() => {
  // Ensure body styles are cleaned up
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
});

describe('SplitPane', () => {
  it('renders left and right children', () => {
    render(
      <SplitPane
        left={<div data-testid="editor">Editor</div>}
        right={<div data-testid="preview">Preview</div>}
      />,
    );
    expect(screen.getByTestId('editor')).toBeDefined();
    expect(screen.getByTestId('preview')).toBeDefined();
  });

  it('left pane width matches editorWidth percentage', () => {
    useUiStore.setState({ editorWidth: 60 });
    render(
      <SplitPane left={<div>L</div>} right={<div>R</div>} />,
    );
    expect(screen.getByTestId('split-left').style.width).toBe('60%');
  });

  it('right pane fills remaining space (flex: 1)', () => {
    render(
      <SplitPane left={<div>L</div>} right={<div>R</div>} />,
    );
    const right = screen.getByTestId('split-right');
    expect(right.style.flex).toContain('1');
  });

  it('divider is 4px wide', () => {
    render(
      <SplitPane left={<div>L</div>} right={<div>R</div>} />,
    );
    expect(screen.getByTestId('split-divider').style.width).toBe('4px');
  });

  it('divider default background is border color', () => {
    render(
      <SplitPane left={<div>L</div>} right={<div>R</div>} />,
    );
    expect(screen.getByTestId('split-divider').style.background).toContain('var(--col-border-illustrative)');
  });

  it('mouse hover on divider changes background to brand color', () => {
    render(
      <SplitPane left={<div>L</div>} right={<div>R</div>} />,
    );
    const divider = screen.getByTestId('split-divider');
    fireEvent.mouseEnter(divider);
    expect(divider.style.background).toContain('var(--col-background-brand)');
  });

  it('mouse leave on divider reverts background', () => {
    render(
      <SplitPane left={<div>L</div>} right={<div>R</div>} />,
    );
    const divider = screen.getByTestId('split-divider');
    fireEvent.mouseEnter(divider);
    fireEvent.mouseLeave(divider);
    expect(divider.style.background).toContain('var(--col-border-illustrative)');
  });

  it('mousedown on divider starts resize, mousemove updates width, mouseup stops', () => {
    // Set up window dimensions
    Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true });
    useUiStore.setState({ sidebarCollapsed: false }); // sidebar = 220px

    render(
      <SplitPane left={<div>L</div>} right={<div>R</div>} />,
    );

    const divider = screen.getByTestId('split-divider');

    // Start resize
    fireEvent.mouseDown(divider);

    // Simulate mousemove — (220 + 530) = 750 clientX
    // availableWidth = 1280 - 220 = 1060
    // newWidth = (750 - 220) / 1060 * 100 = 50%
    fireEvent(document, new MouseEvent('mousemove', { clientX: 750 }));

    expect(useUiStore.getState().editorWidth).toBe(50);

    // Stop resize
    fireEvent(document, new MouseEvent('mouseup'));
  });

  it('width stays clamped at 20 when dragged too far left', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true });
    useUiStore.setState({ sidebarCollapsed: false });

    render(
      <SplitPane left={<div>L</div>} right={<div>R</div>} />,
    );

    fireEvent.mouseDown(screen.getByTestId('split-divider'));
    // clientX = 230 → (230 - 220) / 1060 * 100 ≈ 0.94% → clamped to 20
    fireEvent(document, new MouseEvent('mousemove', { clientX: 230 }));

    expect(useUiStore.getState().editorWidth).toBe(20);

    fireEvent(document, new MouseEvent('mouseup'));
  });

  it('width stays clamped at 80 when dragged too far right', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true });
    useUiStore.setState({ sidebarCollapsed: false });

    render(
      <SplitPane left={<div>L</div>} right={<div>R</div>} />,
    );

    fireEvent.mouseDown(screen.getByTestId('split-divider'));
    // clientX = 1200 → (1200 - 220) / 1060 * 100 ≈ 92.5% → clamped to 80
    fireEvent(document, new MouseEvent('mousemove', { clientX: 1200 }));

    expect(useUiStore.getState().editorWidth).toBe(80);

    fireEvent(document, new MouseEvent('mouseup'));
  });

  it('body cursor is col-resize during drag, restored after', () => {
    render(
      <SplitPane left={<div>L</div>} right={<div>R</div>} />,
    );

    fireEvent.mouseDown(screen.getByTestId('split-divider'));
    expect(document.body.style.cursor).toBe('col-resize');
    expect(document.body.style.userSelect).toBe('none');

    fireEvent(document, new MouseEvent('mouseup'));
    // After rerender from state change, cleanup runs
    // Use a small delay or check after next tick
    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });

  it('cleans up event listeners on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = render(
      <SplitPane left={<div>L</div>} right={<div>R</div>} />,
    );

    // Start resize to attach listeners
    fireEvent.mouseDown(screen.getByTestId('split-divider'));

    // Unmount while resizing
    unmount();

    // Should have cleaned up both mousemove and mouseup listeners
    const removeCalls = removeSpy.mock.calls.map((c) => c[0]);
    expect(removeCalls).toContain('mousemove');
    expect(removeCalls).toContain('mouseup');

    removeSpy.mockRestore();
  });

  it('default editorWidth is 50', () => {
    render(
      <SplitPane left={<div>L</div>} right={<div>R</div>} />,
    );
    expect(screen.getByTestId('split-left').style.width).toBe('50%');
  });

  it('divider has cursor col-resize', () => {
    render(
      <SplitPane left={<div>L</div>} right={<div>R</div>} />,
    );
    expect(screen.getByTestId('split-divider').style.cursor).toBe('col-resize');
  });
});
