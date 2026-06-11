/**
 * One-Click Issue — Zustand store (draft state for the prompt → AI → publish flow).
 *
 * Holds the wizard step, the chosen parent epic + target project, the user's
 * prompt, and the AI-generated DRAFT (content + suggested metadata). Every
 * draft field is editable in the review surface; nothing is written to GitLab
 * until publish. In-memory only.
 *
 * Flow: epic-choice → configure → generating → review → publishing → published.
 */

import { create } from 'zustand';
import type { GitLabUser, GitLabIteration } from '@/services/gitlab/types';
import type { GeneratedIssue } from '@/pipeline/issue/generation/generateIssue';

export type OneClickStep =
  | 'epic-choice'
  | 'configure'
  | 'generating'
  | 'review'
  | 'publishing'
  | 'published';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface OneClickEpic {
  groupId: string;
  epicIid: number;
  title: string;
  body: string;
}

/** Editable draft shown in the review surface. */
export interface IssueDraft {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  dependencies: string[];
  risks: string[];
  weight: number | null;
  priority: Priority;
  labels: string[];
  assignee: GitLabUser | null;
  iteration: GitLabIteration | null;
  rationale: { weight: string; priority: string; assignee: string; labels: string };
}

export interface OneClickState {
  open: boolean;
  step: OneClickStep;
  error: string | null;

  associateEpic: boolean | null;
  epic: OneClickEpic | null;

  projectId: string | null;
  projectPath: string | null;

  prompt: string;
  draft: IssueDraft | null;

  /** Result after a successful publish. */
  createdIssue: { iid: number; webUrl: string } | null;

  // actions
  openModal: () => void;
  close: () => void;
  setAssociateEpic: (v: boolean) => void;
  setEpic: (epic: OneClickEpic | null) => void;
  setProject: (id: string, path: string) => void;
  setPrompt: (s: string) => void;
  setStep: (s: OneClickStep) => void;
  setError: (e: string | null) => void;
  setDraftFromGenerated: (g: GeneratedIssue) => void;
  patchDraft: (patch: Partial<IssueDraft>) => void;
  setCreated: (created: { iid: number; webUrl: string }) => void;
  reset: () => void;
}

const INITIAL = {
  open: false,
  step: 'epic-choice' as OneClickStep,
  error: null as string | null,
  associateEpic: null as boolean | null,
  epic: null as OneClickEpic | null,
  projectId: null as string | null,
  projectPath: null as string | null,
  prompt: '',
  draft: null as IssueDraft | null,
  createdIssue: null as { iid: number; webUrl: string } | null,
};

function normalizePriority(p: string): Priority {
  const v = (p || '').toLowerCase().trim();
  return v === 'low' || v === 'high' || v === 'critical' ? v : 'medium';
}

export const useOneClickStore = create<OneClickState>((set) => ({
  ...INITIAL,

  openModal: () => set({ ...INITIAL, open: true, step: 'epic-choice' }),
  close: () => set({ open: false }),

  setAssociateEpic: (v) => set({ associateEpic: v, ...(v ? {} : { epic: null }) }),
  setEpic: (epic) => set({ epic }),
  setProject: (id, path) => set({ projectId: id, projectPath: path }),
  setPrompt: (s) => set({ prompt: s }),
  setStep: (s) => set({ step: s }),
  setError: (e) => set({ error: e }),

  setDraftFromGenerated: (g) =>
    set({
      draft: {
        title: g.title,
        description: g.description,
        acceptanceCriteria: g.acceptanceCriteria,
        dependencies: g.dependencies,
        risks: g.risks,
        weight: g.suggestedWeight ?? null,
        priority: normalizePriority(g.suggestedPriority),
        labels: g.suggestedLabels ?? [],
        // Assignee/iteration are resolved to real objects by the action layer
        // (the model only returns a username); start unset.
        assignee: null,
        iteration: null,
        rationale: g.rationale,
      },
    }),

  patchDraft: (patch) =>
    set((s) => (s.draft ? { draft: { ...s.draft, ...patch } } : {})),

  setCreated: (created) => set({ createdIssue: created, step: 'published' }),
  reset: () => set({ ...INITIAL }),
}));
