import { describe, it, expect, beforeEach } from 'vitest';
import { useBlueprintStore } from './blueprintStore';

beforeEach(() => {
  useBlueprintStore.setState(useBlueprintStore.getInitialState());
});

// ─── Initial State ──────────────────────────────────────────

describe('initial state', () => {
  it('code is empty', () => {
    expect(useBlueprintStore.getState().code).toBe('');
  });

  it('diagramType is empty', () => {
    expect(useBlueprintStore.getState().diagramType).toBe('');
  });

  it('reasoning is empty', () => {
    expect(useBlueprintStore.getState().reasoning).toBe('');
  });

  it('svgContent is empty', () => {
    expect(useBlueprintStore.getState().svgContent).toBe('');
  });

  it('zoom is 100', () => {
    expect(useBlueprintStore.getState().zoom).toBe(100);
  });

  it('isFullscreen is false', () => {
    expect(useBlueprintStore.getState().isFullscreen).toBe(false);
  });

  it('isGenerating is false', () => {
    expect(useBlueprintStore.getState().isGenerating).toBe(false);
  });

  it('error is null', () => {
    expect(useBlueprintStore.getState().error).toBeNull();
  });
});

// ─── setCode ────────────────────────────────────────────────

describe('setCode', () => {
  it('sets code and diagramType', () => {
    useBlueprintStore.getState().setCode('graph LR; A-->B', 'flowchart');
    const state = useBlueprintStore.getState();
    expect(state.code).toBe('graph LR; A-->B');
    expect(state.diagramType).toBe('flowchart');
  });

  it('sets code with reasoning', () => {
    useBlueprintStore.getState().setCode('sequenceDiagram', 'sequence', 'Shows auth flow');
    const state = useBlueprintStore.getState();
    expect(state.code).toBe('sequenceDiagram');
    expect(state.diagramType).toBe('sequence');
    expect(state.reasoning).toBe('Shows auth flow');
  });

  it('sets code without optional params', () => {
    useBlueprintStore.getState().setCode('graph TD; X-->Y');
    const state = useBlueprintStore.getState();
    expect(state.code).toBe('graph TD; X-->Y');
    expect(state.diagramType).toBe('');
    expect(state.reasoning).toBe('');
  });
});

// ─── setSvg ─────────────────────────────────────────────────

describe('setSvg', () => {
  it('sets svgContent', () => {
    useBlueprintStore.getState().setSvg('<svg>test</svg>');
    expect(useBlueprintStore.getState().svgContent).toBe('<svg>test</svg>');
  });
});

// ─── setZoom ────────────────────────────────────────────────

describe('setZoom', () => {
  it('updates zoom level', () => {
    useBlueprintStore.getState().setZoom(150);
    expect(useBlueprintStore.getState().zoom).toBe(150);
  });
});

// ─── toggleFullscreen ───────────────────────────────────────

describe('toggleFullscreen', () => {
  it('flips isFullscreen', () => {
    useBlueprintStore.getState().toggleFullscreen();
    expect(useBlueprintStore.getState().isFullscreen).toBe(true);
    useBlueprintStore.getState().toggleFullscreen();
    expect(useBlueprintStore.getState().isFullscreen).toBe(false);
  });
});

// ─── setGenerating ──────────────────────────────────────────

describe('setGenerating', () => {
  it('sets isGenerating', () => {
    useBlueprintStore.getState().setGenerating(true);
    expect(useBlueprintStore.getState().isGenerating).toBe(true);
    useBlueprintStore.getState().setGenerating(false);
    expect(useBlueprintStore.getState().isGenerating).toBe(false);
  });
});

// ─── setError ───────────────────────────────────────────────

describe('setError', () => {
  it('sets error message', () => {
    useBlueprintStore.getState().setError('Render failed');
    expect(useBlueprintStore.getState().error).toBe('Render failed');
  });

  it('clears error with null', () => {
    useBlueprintStore.getState().setError('Render failed');
    useBlueprintStore.getState().setError(null);
    expect(useBlueprintStore.getState().error).toBeNull();
  });
});

// ─── reset ──────────────────────────────────────────────────

describe('reset', () => {
  it('restores all defaults', () => {
    useBlueprintStore.getState().setCode('graph LR; A-->B', 'flowchart', 'reason');
    useBlueprintStore.getState().setSvg('<svg/>');
    useBlueprintStore.getState().setZoom(200);
    useBlueprintStore.getState().toggleFullscreen();
    useBlueprintStore.getState().setGenerating(true);
    useBlueprintStore.getState().setError('oops');

    useBlueprintStore.getState().reset();
    const state = useBlueprintStore.getState();
    expect(state.code).toBe('');
    expect(state.diagramType).toBe('');
    expect(state.reasoning).toBe('');
    expect(state.svgContent).toBe('');
    expect(state.zoom).toBe(100);
    expect(state.isFullscreen).toBe(false);
    expect(state.isGenerating).toBe(false);
    expect(state.error).toBeNull();
  });
});
