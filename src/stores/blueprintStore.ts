/**
 * Blueprint Store — Phase 2 (T-2.7).
 *
 * Zustand store managing the Mermaid diagram blueprint panel:
 * source code, rendered SVG, zoom, fullscreen, and generation state.
 */

import { create } from 'zustand';

// ─── State & Actions ────────────────────────────────────────

interface BlueprintState {
  code: string;
  diagramType: string;
  reasoning: string;
  svgContent: string;
  zoom: number;
  isFullscreen: boolean;
  isGenerating: boolean;
  error: string | null;
}

interface BlueprintActions {
  setCode: (code: string, type?: string, reasoning?: string) => void;
  setSvg: (svg: string) => void;
  setZoom: (zoom: number) => void;
  toggleFullscreen: () => void;
  setGenerating: (generating: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export type BlueprintStore = BlueprintState & BlueprintActions;

// ─── Initial State ──────────────────────────────────────────

const INITIAL_STATE: BlueprintState = {
  code: '',
  diagramType: '',
  reasoning: '',
  svgContent: '',
  zoom: 100,
  isFullscreen: false,
  isGenerating: false,
  error: null,
};

// ─── Store ──────────────────────────────────────────────────

export const useBlueprintStore = create<BlueprintStore>()((set, get) => ({
  ...INITIAL_STATE,

  setCode: (code, type, reasoning) => {
    set({ code, diagramType: type ?? '', reasoning: reasoning ?? '', svgContent: '', error: null });
  },

  setSvg: (svg) => {
    set({ svgContent: svg });
  },

  setZoom: (zoom) => {
    set({ zoom });
  },

  toggleFullscreen: () => {
    set({ isFullscreen: !get().isFullscreen });
  },

  setGenerating: (generating) => {
    set({ isGenerating: generating });
  },

  setError: (error) => {
    set({ error });
  },

  reset: () => {
    set(INITIAL_STATE);
  },
}));
