/**
 * Tests for BlueprintView — Phase 14 Blueprint rendering.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useBlueprintStore } from '@/stores/blueprintStore';

// Mock mermaid — jsdom cannot render real SVG
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg data-testid="mock-svg">mock</svg>' }),
  },
}));

// Must import after mock
import { BlueprintView } from './BlueprintView';
import { DiagramRenderer } from './DiagramRenderer';
import { DiagramControls } from './DiagramControls';

beforeEach(() => {
  useBlueprintStore.setState(useBlueprintStore.getInitialState());
});

describe('BlueprintView', () => {
  it('shows empty state when no code', () => {
    render(<BlueprintView />);
    expect(screen.getByTestId('blueprint-empty')).toBeDefined();
  });

  it('empty state has correct message text', () => {
    render(<BlueprintView />);
    expect(screen.getByText('Run Refine to generate an architecture diagram')).toBeDefined();
    expect(screen.getByText('The AI pipeline creates Mermaid diagrams automatically')).toBeDefined();
  });

  it('renders diagram viewer when code is present', async () => {
    useBlueprintStore.setState({ code: 'graph TD; A-->B;' });
    render(<BlueprintView />);
    expect(screen.getByTestId('blueprint-viewer')).toBeDefined();
    await waitFor(() => {
      expect(screen.getByTestId('diagram-svg')).toBeDefined();
    });
  });

  it('controls are visible when diagram is present', () => {
    useBlueprintStore.setState({ code: 'graph TD; A-->B;' });
    render(<BlueprintView />);
    expect(screen.getByTestId('diagram-controls')).toBeDefined();
  });

  it('fullscreen mode applies fixed positioning', () => {
    useBlueprintStore.setState({ code: 'graph TD; A-->B;', isFullscreen: true });
    render(<BlueprintView />);
    const viewer = screen.getByTestId('blueprint-viewer');
    expect(viewer.style.position).toBe('fixed');
    expect(viewer.style.zIndex).toBe('200');
  });
});

describe('DiagramRenderer', () => {
  it('renders SVG content from mermaid', async () => {
    useBlueprintStore.setState({ code: 'graph TD; A-->B;' });
    render(<DiagramRenderer />);
    await waitFor(() => {
      const el = screen.getByTestId('diagram-svg');
      expect(el.innerHTML).toContain('mock');
    });
  });

  it('applies zoom transform', () => {
    useBlueprintStore.setState({ code: 'graph TD; A-->B;', zoom: 150 });
    render(<DiagramRenderer />);
    const el = screen.getByTestId('diagram-svg');
    expect(el.style.transform).toBe('scale(1.5)');
  });

  it('shows error state on render failure', async () => {
    const mermaid = await import('mermaid');
    (mermaid.default.render as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Parse error')
    );
    useBlueprintStore.setState({ code: 'invalid%%diagram' });
    render(<DiagramRenderer />);
    await waitFor(() => {
      expect(screen.getByTestId('diagram-error')).toBeDefined();
      expect(screen.getByText('Parse error')).toBeDefined();
    });
  });
});

describe('DiagramControls', () => {
  it('displays current zoom level', () => {
    useBlueprintStore.setState({ code: 'graph TD;', zoom: 75 });
    render(<DiagramControls />);
    expect(screen.getByTestId('zoom-display').textContent).toBe('75%');
  });

  it('zoom in increases zoom by 25', () => {
    useBlueprintStore.setState({ code: 'graph TD;', zoom: 100 });
    render(<DiagramControls />);
    fireEvent.click(screen.getByTestId('zoom-in'));
    expect(useBlueprintStore.getState().zoom).toBe(125);
  });

  it('zoom out decreases zoom by 25', () => {
    useBlueprintStore.setState({ code: 'graph TD;', zoom: 100 });
    render(<DiagramControls />);
    fireEvent.click(screen.getByTestId('zoom-out'));
    expect(useBlueprintStore.getState().zoom).toBe(75);
  });

  it('zoom does not go below 25', () => {
    useBlueprintStore.setState({ code: 'graph TD;', zoom: 25 });
    render(<DiagramControls />);
    fireEvent.click(screen.getByTestId('zoom-out'));
    expect(useBlueprintStore.getState().zoom).toBe(25);
  });

  it('zoom does not go above 200', () => {
    useBlueprintStore.setState({ code: 'graph TD;', zoom: 200 });
    render(<DiagramControls />);
    fireEvent.click(screen.getByTestId('zoom-in'));
    expect(useBlueprintStore.getState().zoom).toBe(200);
  });

  it('fit to screen resets zoom to 100', () => {
    useBlueprintStore.setState({ code: 'graph TD;', zoom: 150 });
    render(<DiagramControls />);
    fireEvent.click(screen.getByTestId('zoom-fit'));
    expect(useBlueprintStore.getState().zoom).toBe(100);
  });

  it('fullscreen toggle toggles isFullscreen', () => {
    useBlueprintStore.setState({ code: 'graph TD;', isFullscreen: false });
    render(<DiagramControls />);
    fireEvent.click(screen.getByTestId('fullscreen-toggle'));
    expect(useBlueprintStore.getState().isFullscreen).toBe(true);
  });
});
