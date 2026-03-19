/**
 * Epic Store — Phase 2 (T-2.1).
 *
 * Zustand store managing the epic document state: markdown content,
 * parsed document, complexity level, undo, and dirty tracking.
 */

import { create } from 'zustand';
import type { EpicDocument, ComplexityLevel } from '../domain/types';
import { epicToMarkdown, markdownToEpic, replaceSectionContent } from '../domain/epicSerializer';

// ─── State & Actions ────────────────────────────────────────

interface EpicState {
  document: EpicDocument | null;
  markdown: string;
  isDirty: boolean;
  previousMarkdown: string | null;
  complexity: ComplexityLevel;
  userEditedSections: string[];
}

interface EpicActions {
  setMarkdown: (md: string) => void;
  setDocument: (doc: EpicDocument) => void;
  setComplexity: (level: ComplexityLevel) => void;
  updateSection: (title: string, content: string) => void;
  trackUserEdit: (sectionTitle: string) => void;
  applyRefinedEpic: (md: string) => void;
  undo: () => void;
  reset: () => void;
}

export type EpicStore = EpicState & EpicActions;

// ─── Initial State ──────────────────────────────────────────

const INITIAL_STATE: EpicState = {
  document: null,
  markdown: '',
  isDirty: false,
  previousMarkdown: null,
  complexity: 'moderate',
  userEditedSections: [],
};

// ─── Store ──────────────────────────────────────────────────

export const useEpicStore = create<EpicStore>()((set, get) => ({
  ...INITIAL_STATE,

  setMarkdown: (md) => {
    const doc = md.trim() ? markdownToEpic(md) : null;
    set({ markdown: md, document: doc, isDirty: true });
  },

  setDocument: (doc) => {
    set({ document: doc, markdown: epicToMarkdown(doc), isDirty: true });
  },

  setComplexity: (level) => {
    const { document } = get();
    if (document) {
      set({
        complexity: level,
        document: { ...document, metadata: { ...document.metadata, complexity: level } },
      });
    } else {
      set({ complexity: level });
    }
  },

  updateSection: (title, content) => {
    const { markdown } = get();
    const updated = replaceSectionContent(markdown, title, content);
    const doc = markdownToEpic(updated);
    set({ markdown: updated, document: doc, isDirty: true });
  },

  trackUserEdit: (sectionTitle) => {
    const { userEditedSections } = get();
    if (!userEditedSections.includes(sectionTitle)) {
      set({ userEditedSections: [...userEditedSections, sectionTitle] });
    }
  },

  applyRefinedEpic: (md) => {
    const { markdown: current } = get();
    const doc = markdownToEpic(md);
    set({
      previousMarkdown: current,
      markdown: md,
      document: doc,
      isDirty: true,
      userEditedSections: [],
    });
  },

  undo: () => {
    const { previousMarkdown } = get();
    if (previousMarkdown === null) return;
    const doc = previousMarkdown.trim() ? markdownToEpic(previousMarkdown) : null;
    set({
      markdown: previousMarkdown,
      document: doc,
      previousMarkdown: null,
      isDirty: true,
    });
  },

  reset: () => {
    set(INITIAL_STATE);
  },
}));
