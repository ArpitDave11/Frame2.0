/**
 * Integration tests for PlannerView wiring (T-6.5).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewRouter } from './ViewRouter';
import { useUiStore } from '@/stores/uiStore';
import { useEpicStore } from '@/stores/epicStore';

beforeEach(() => {
  useUiStore.setState(useUiStore.getInitialState());
  useEpicStore.setState(useEpicStore.getInitialState());
});

describe('PlannerView integration', () => {
  it('renders WorkspaceHeader + SplitPane', () => {
    useUiStore.setState({ activeTab: 'planner', activeView: 'workspace' });
    render(<ViewRouter />);
    expect(screen.getByTestId('workspace-header')).toBeDefined();
    expect(screen.getByTestId('split-pane')).toBeDefined();
  });

  it('SplitPane contains EditorPane and PreviewPane', () => {
    useUiStore.setState({ activeTab: 'planner' });
    render(<ViewRouter />);
    expect(screen.getByTestId('editor-pane')).toBeDefined();
    expect(screen.getByTestId('preview-pane')).toBeDefined();
  });

  it('picking category populates editor and preview', () => {
    useUiStore.setState({ activeTab: 'planner' });
    render(<ViewRouter />);

    // Editor starts in empty state
    expect(screen.getByTestId('editor-empty-state')).toBeDefined();

    // Click Technical Design category
    fireEvent.click(screen.getByTestId('cat-btn-technical_design'));

    // Editor should now show textarea with content
    expect(screen.getByTestId('editor-textarea')).toBeDefined();

    // Preview should show rendered headings
    const preview = screen.getByTestId('preview-content');
    expect(preview.querySelector('h2')).toBeDefined();
  });

  it('typing in editor updates preview', () => {
    useUiStore.setState({ activeTab: 'planner' });
    useEpicStore.setState({ markdown: '## Hello' });

    const { rerender } = render(<ViewRouter />);

    // Change editor content
    fireEvent.change(screen.getByTestId('editor-textarea'), {
      target: { value: '## Updated Section' },
    });

    rerender(<ViewRouter />);

    // Preview should reflect new content
    const h2 = screen.getByTestId('preview-content').querySelector('h2');
    expect(h2?.textContent).toBe('Updated Section');
  });

  it('split divider is present and draggable', () => {
    useUiStore.setState({ activeTab: 'planner' });
    render(<ViewRouter />);
    expect(screen.getByTestId('split-divider')).toBeDefined();
    expect(screen.getByTestId('split-divider').style.cursor).toBe('col-resize');
  });
});
