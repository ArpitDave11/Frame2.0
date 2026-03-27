/**
 * Blueprint Store — Phase 2 (T-2.7).
 *
 * Zustand store managing the Mermaid diagram blueprint panel:
 * source code, rendered SVG, zoom, fullscreen, and generation state.
 */

import { create } from 'zustand';

// ─── State & Actions ────────────────────────────────────────

export interface DiagramVersion {
  code: string;
  type: string;
  timestamp: number;
  label?: string; // e.g. "Simplified", "Added Detail"
}

interface BlueprintState {
  code: string;
  diagramType: string;
  reasoning: string;
  svgContent: string;
  zoom: number;
  isFullscreen: boolean;
  isGenerating: boolean;
  error: string | null;
  versions: DiagramVersion[];
  activeVersionIndex: number;
}

interface BlueprintActions {
  setCode: (code: string, type?: string, reasoning?: string, label?: string) => void;
  revertToVersion: (index: number) => void;
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
  versions: [],
  activeVersionIndex: -1,
};

// ─── Store ──────────────────────────────────────────────────

export const useBlueprintStore = create<BlueprintStore>()((set, get) => ({
  ...INITIAL_STATE,

  setCode: (code, type, reasoning, label) => {
    const { versions } = get();
    const newVersion: DiagramVersion = {
      code,
      type: type ?? '',
      timestamp: Date.now(),
      label,
    };
    const newVersions = [...versions, newVersion];
    set({
      code,
      diagramType: type ?? '',
      reasoning: reasoning ?? '',
      svgContent: '',
      error: null,
      versions: newVersions,
      activeVersionIndex: newVersions.length - 1,
    });
  },

  revertToVersion: (index) => {
    const { versions } = get();
    if (index < 0 || index >= versions.length) return;
    const v = versions[index]!;
    set({
      code: v.code,
      diagramType: v.type,
      svgContent: '',
      error: null,
      activeVersionIndex: index,
    });
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
