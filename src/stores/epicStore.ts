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
  /** Snapshots taken before each refine — newest last. previousMarkdown mirrors the top. */
  undoStack: string[];
  /** Pre-refine markdown while the latest refine awaits Keep/Revert; null once decided. */
  reviewBaseline: string | null;
  complexity: ComplexityLevel;
  userEditedSections: string[];
  sla: number | null;
}

interface EpicActions {
  setMarkdown: (md: string) => void;
  setDocument: (doc: EpicDocument) => void;
  setComplexity: (level: ComplexityLevel) => void;
  updateSection: (title: string, content: string) => void;
  trackUserEdit: (sectionTitle: string) => void;
  applyRefinedEpic: (md: string) => void;
  setQualityScore: (score: number) => void;
  setCategory: (category: string) => void;
  setSla: (days: number | null) => void;
  replaceArchitectureSection: (mermaidCode: string) => void;
  undo: () => void;
  acceptRefine: () => void;
  revertRefine: () => void;
  reset: () => void;
}

export type EpicStore = EpicState & EpicActions;

// ─── Initial State ──────────────────────────────────────────

const INITIAL_STATE: EpicState = {
  document: null,
  markdown: '',
  isDirty: false,
  previousMarkdown: null,
  undoStack: [],
  reviewBaseline: null,
  complexity: 'moderate',
  userEditedSections: [],
  sla: null,
};

const MAX_UNDO_DEPTH = 20;

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
    const { markdown: current, undoStack } = get();
    const doc = markdownToEpic(md);
    const stack = [...undoStack, current].slice(-MAX_UNDO_DEPTH);
    set({
      previousMarkdown: current,
      undoStack: stack,
      reviewBaseline: current,
      markdown: md,
      document: doc,
      isDirty: true,
      userEditedSections: [],
    });
  },

  setQualityScore: (score) => {
    const { document } = get();
    if (document) {
      set({
        document: {
          ...document,
          metadata: { ...document.metadata, qualityScore: score },
        },
      });
    } else {
      // Create a minimal document to hold the score
      set({
        document: {
          title: 'Untitled Epic',
          sections: [],
          metadata: {
            createdAt: Date.now(),
            lastRefined: null,
            complexity: 'moderate',
            qualityScore: score,
          },
        },
      });
    }
  },

  setCategory: (category) => {
    const { document } = get();
    if (document) {
      set({ document: { ...document, category: category as EpicDocument['category'] } });
    }
  },

  setSla: (days) => {
    set({ sla: days });
  },

  replaceArchitectureSection: (mermaidCode) => {
    const { markdown } = get();
    const diagramBlock = '```mermaid\n' + mermaidCode + '\n```';

    // Try to find and replace existing architecture section
    const archRegex = /## .*(?:Architecture|Deployment Architecture|Blueprint).*\n[\s\S]*?(?=\n## |\n# |$)/i;
    let newMarkdown: string;

    if (archRegex.test(markdown)) {
      newMarkdown = markdown.replace(archRegex, `## Architecture Diagram\n\n${diagramBlock}\n`);
    } else {
      // Append as new section
      newMarkdown = markdown.trimEnd() + `\n\n## Architecture Diagram\n\n${diagramBlock}\n`;
    }

    const doc = newMarkdown.trim() ? markdownToEpic(newMarkdown) : null;
    set({ markdown: newMarkdown, document: doc, isDirty: true });
  },

  undo: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return;
    const restored = undoStack[undoStack.length - 1]!;
    const stack = undoStack.slice(0, -1);
    const doc = restored.trim() ? markdownToEpic(restored) : null;
    set({
      markdown: restored,
      document: doc,
      undoStack: stack,
      previousMarkdown: stack[stack.length - 1] ?? null,
      reviewBaseline: null,
      isDirty: true,
    });
  },

  acceptRefine: () => {
    set({ reviewBaseline: null });
  },

  revertRefine: () => {
    const { reviewBaseline, undoStack } = get();
    if (reviewBaseline === null) return;
    const doc = reviewBaseline.trim() ? markdownToEpic(reviewBaseline) : null;
    // The reverted refine's snapshot is the baseline itself — drop it from the stack
    const stack =
      undoStack[undoStack.length - 1] === reviewBaseline ? undoStack.slice(0, -1) : undoStack;
    set({
      markdown: reviewBaseline,
      document: doc,
      undoStack: stack,
      previousMarkdown: stack[stack.length - 1] ?? null,
      reviewBaseline: null,
      isDirty: true,
    });
  },

  reset: () => {
    set(INITIAL_STATE);
  },
}));
