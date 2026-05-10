import { create } from 'zustand';
import type { SectionData } from '@/services/docIntel/dataTypes';

// ─── Types ─────────────────────────────────────────────────

export type LensType = 'executive' | 'technical' | 'legal' | 'financial' | 'operational' | 'risk' | 'summary';

export type SectionKind = 'summary' | 'insights' | 'explanations' | 'visuals';

export interface Section {
  id: string;
  kind: SectionKind;
  label: string;
  markdown: string;
  data?: SectionData;            // structured AI output for dedicated renderers
  status: 'idle' | 'generating' | 'done' | 'error';
  history: string[];
  error?: string;
}

export interface OutlineItem {
  level: number;
  text: string;
  page: number;
}

export interface TableItem {
  index: number;
  html: string;
  csv: string;
}

export interface DocMetadata {
  filename: string;
  pageCount: number;
  fileSha256: string;
}

export interface AnalyzeResult {
  fileName: string;
  markdown: string;
  outline: OutlineItem[];
  tables: TableItem[];
  metadata: DocMetadata;
}

const SECTION_DEFS: { id: SectionKind; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'insights', label: 'Key Insights' },
  { id: 'explanations', label: 'Simplified Explanations' },
  { id: 'visuals', label: 'Visuals' },
];

// ─── State ─────────────────────────────────────────────────

interface DocIntelState {
  fileName: string | null;
  documentMarkdown: string | null;
  outline: OutlineItem[];
  tables: TableItem[];
  metadata: DocMetadata | null;
  lens: LensType | null;
  focusContext: string;
  sections: Section[];
  phase: 'empty' | 'uploaded' | 'analyzing' | 'ready' | 'error';

  setDocument: (data: AnalyzeResult) => void;
  setLens: (lens: LensType) => void;
  setFocusContext: (text: string) => void;
  startAnalysis: () => void;
  updateSection: (id: string, markdown: string, data?: SectionData) => void;
  failSection: (id: string, error: string) => void;
  revertSection: (id: string) => void;
  reset: () => void;
}

// ─── Store ─────────────────────────────────────────────────

export const useDocIntelStore = create<DocIntelState>((set, get) => ({
  fileName: null,
  documentMarkdown: null,
  outline: [],
  tables: [],
  metadata: null,
  lens: null,
  focusContext: '',
  sections: [],
  phase: 'empty',

  setDocument: (data) => set({
    fileName: data.fileName,
    documentMarkdown: data.markdown,
    outline: data.outline,
    tables: data.tables,
    metadata: data.metadata,
    phase: 'uploaded',
  }),

  setLens: (lens) => set({ lens }),
  setFocusContext: (text) => set({ focusContext: text }),

  startAnalysis: () => set({
    phase: 'analyzing',
    sections: SECTION_DEFS.map(({ id, label }) => ({
      id,
      kind: id,
      label,
      markdown: '',
      status: 'generating' as const,
      history: [],
    })),
  }),

  updateSection: (id, markdown, data) => {
    const sections = get().sections.map((sec) => {
      if (sec.id !== id) return sec;
      const history = sec.markdown ? [...sec.history, sec.markdown] : sec.history;
      return { ...sec, markdown, data, status: 'done' as const, history, error: undefined };
    });
    const allDone = sections.every((s) => s.status === 'done' || s.status === 'error');
    set({ sections, phase: allDone ? 'ready' : get().phase });
  },

  failSection: (id, error) => {
    const sections = get().sections.map((sec) =>
      sec.id === id ? { ...sec, status: 'error' as const, error } : sec,
    );
    const allDone = sections.every((s) => s.status === 'done' || s.status === 'error');
    set({ sections, phase: allDone ? 'ready' : get().phase });
  },

  revertSection: (id) => {
    const sections = get().sections.map((sec) => {
      if (sec.id !== id || sec.history.length === 0) return sec;
      const history = [...sec.history];
      const previous = history.pop()!;
      return { ...sec, markdown: previous, history };
    });
    set({ sections });
  },

  reset: () => set({
    fileName: null, documentMarkdown: null, outline: [], tables: [],
    metadata: null, lens: null, focusContext: '', sections: [], phase: 'empty',
  }),
}));
