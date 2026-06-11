/**
 * One-Click Task — store for the "create a subtask from a prompt" flow.
 * In-memory; drives OneClickTaskModal.
 */

import { create } from 'zustand';
import type { GeneratedTask } from '@/pipeline/issue/generation/generateTask';

export type TaskPhase = 'configure' | 'generating' | 'review' | 'publishing' | 'published';

export interface TaskParent {
  iid: number;
  projectId: number;
  webUrl: string;
  title: string;
  body: string;
}

export interface TaskDraft {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  weight: number | null;
}

export interface OneClickTaskState {
  open: boolean;
  parent: TaskParent | null;
  prompt: string;
  phase: TaskPhase;
  draft: TaskDraft | null;
  error: string | null;
  created: { iid: number; webUrl: string } | null;

  openModal: (parent: TaskParent) => void;
  close: () => void;
  setPrompt: (s: string) => void;
  setPhase: (p: TaskPhase) => void;
  setError: (e: string | null) => void;
  setDraftFromGenerated: (g: GeneratedTask) => void;
  patchDraft: (patch: Partial<TaskDraft>) => void;
  setCreated: (c: { iid: number; webUrl: string }) => void;
  reset: () => void;
}

const INITIAL = {
  open: false,
  parent: null as TaskParent | null,
  prompt: '',
  phase: 'configure' as TaskPhase,
  draft: null as TaskDraft | null,
  error: null as string | null,
  created: null as { iid: number; webUrl: string } | null,
};

export const useOneClickTaskStore = create<OneClickTaskState>((set) => ({
  ...INITIAL,
  openModal: (parent) => set({ ...INITIAL, open: true, parent }),
  close: () => set({ open: false }),
  setPrompt: (s) => set({ prompt: s }),
  setPhase: (p) => set({ phase: p }),
  setError: (e) => set({ error: e }),
  setDraftFromGenerated: (g) =>
    set({ draft: { title: g.title, description: g.description, acceptanceCriteria: g.acceptanceCriteria, weight: g.suggestedWeight ?? null } }),
  patchDraft: (patch) => set((s) => (s.draft ? { draft: { ...s.draft, ...patch } } : {})),
  setCreated: (c) => set({ created: c, phase: 'published' }),
  reset: () => set({ ...INITIAL }),
}));
