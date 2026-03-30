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
  // D2: 2-stage refinement state
  diagramFeedback: string;
  diagramInterpretation: { interpretation: string; changeItems: string[]; confidence: string } | null;
  diagramRefineState: 'idle' | 'interpreting' | 'confirming' | 'refining';
  // D6: Draft labeling
  isDraft: boolean;
}

interface BlueprintActions {
  setCode: (code: string, type?: string, reasoning?: string, label?: string) => void;
  revertToVersion: (index: number) => void;
  setDiagramFeedback: (feedback: string) => void;
  setDiagramInterpretation: (interp: BlueprintState['diagramInterpretation']) => void;
  setDiagramRefineState: (state: BlueprintState['diagramRefineState']) => void;
  clearRefinement: () => void;
  finalize: () => void;
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
  diagramFeedback: '',
  diagramInterpretation: null,
  diagramRefineState: 'idle',
  isDraft: true,
};

// ─── Store ──────────────────────────────────────────────────

export const useBlueprintStore = create<BlueprintStore>()((set, get) => ({
  ...INITIAL_STATE,

  setCode: (code, type, reasoning, label) => {
    const { versions } = get();
    const versionNumber = versions.length + 1;
    const autoLabel = label
      ? `v${versionNumber}-${label.toLowerCase().replace(/\s+/g, '-')}`
      : `v${versionNumber}`;
    const newVersion: DiagramVersion = {
      code,
      type: type ?? '',
      timestamp: Date.now(),
      label: autoLabel,
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
      isDraft: true,
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

  setDiagramFeedback: (feedback) => set({ diagramFeedback: feedback }),
  setDiagramInterpretation: (interp) => set({ diagramInterpretation: interp }),
  setDiagramRefineState: (state) => set({ diagramRefineState: state }),
  clearRefinement: () => set({ diagramFeedback: '', diagramInterpretation: null, diagramRefineState: 'idle' }),
  finalize: () => set({ isDraft: false }),

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
