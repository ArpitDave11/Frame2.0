/**
 * Initiative Store — Extreme Initiative module.
 *
 * Zustand store managing the initiative wizard state: stream groups, crews,
 * headers (parsed from epic markdown), many-to-many assignment, and
 * per-crew refinement status.
 */

import { create } from 'zustand';

// ─── Types ─────────────────────────────────────────────────

export type WizardStep = 'init' | 'streamEpic' | 'splitCrews' | 'refineCrews';

export interface Header {
  id: string;
  text: string;
  level: 2 | 3;
  assignedCrewIds: string[];
  aiAssigned: boolean;
}

export interface Crew {
  id: string;
  gitlabGroupId?: number;
  name: string;
  refinedEpic?: string;
  refineStatus: 'pending' | 'refining' | 'done' | 'error';
}

export interface StreamGroup {
  id: number;
  name: string;
  fullPath: string;
}

export interface GroupNode {
  id: number;
  name: string;
  fullPath: string;
  children: GroupNode[];
}

export interface PublishState {
  status: 'idle' | 'publishing' | 'done' | 'error';
  streamEpicId?: number;
  streamEpicIid?: number;
  crewEpicIds: Record<string, { id: number; iid: number }>;
  error?: string;
}

interface InitiativeState {
  currentStep: WizardStep;
  title: string;
  description: string;
  streamEpicMarkdown: string;
  headers: Header[];
  crews: Crew[];
  streamGroup: StreamGroup | null;
  groupTree: GroupNode | null;
  crewSubgroups: StreamGroup[];
  publish: PublishState;
}

interface InitiativeActions {
  setStep: (step: WizardStep) => void;
  setTitle: (title: string) => void;
  setDescription: (desc: string) => void;
  setStreamEpic: (markdown: string) => void;
  parseHeadersFromEpic: () => void;
  addCrew: (name: string) => Crew;
  removeCrew: (id: string) => void;
  renameCrew: (id: string, name: string) => void;
  assignHeaderToCrew: (headerId: string, crewId: string) => void;
  unassignHeaderFromCrew: (headerId: string, crewId: string) => void;
  applyAiProposal: (assignments: Record<string, string[]>) => void;
  setCrewRefineStatus: (crewId: string, status: Crew['refineStatus']) => void;
  setCrewRefinedEpic: (crewId: string, markdown: string) => void;
  setStreamGroup: (group: StreamGroup) => void;
  setGroupTree: (tree: GroupNode) => void;
  setCrewsFromSubgroups: (subgroups: StreamGroup[]) => void;
  setPublishStatus: (status: PublishState['status'], error?: string) => void;
  setPublishStreamEpic: (id: number, iid: number) => void;
  setPublishCrewEpic: (localCrewId: string, id: number, iid: number) => void;
  reset: () => void;
}

export type InitiativeStore = InitiativeState & InitiativeActions;

// ─── Helpers ───────────────────────────────────────────────

let _counter = 0;
const uid = () => `ini_${Date.now()}_${++_counter}`;

function extractHeaders(markdown: string): Header[] {
  const lines = markdown.split('\n');
  const headers: Header[] = [];
  for (const line of lines) {
    const m2 = line.match(/^## (.+)/);
    if (m2) { headers.push({ id: uid(), text: m2[1]!.trim(), level: 2, assignedCrewIds: [], aiAssigned: false }); continue; }
    const m3 = line.match(/^### (.+)/);
    if (m3) { headers.push({ id: uid(), text: m3[1]!.trim(), level: 3, assignedCrewIds: [], aiAssigned: false }); }
  }
  return headers;
}

// ─── Initial State ─────────────────────────────────────────

const INITIAL: InitiativeState = {
  currentStep: 'init',
  title: '',
  description: '',
  streamEpicMarkdown: '',
  headers: [],
  crews: [],
  streamGroup: null,
  groupTree: null,
  crewSubgroups: [],
  publish: { status: 'idle' as const, crewEpicIds: {} },
};

// ─── Store ─────────────────────────────────────────────────

export const useInitiativeStore = create<InitiativeStore>()((set, get) => ({
  ...INITIAL,

  setStep: (step) => set({ currentStep: step }),

  setTitle: (title) => set({ title }),
  setDescription: (desc) => set({ description: desc }),

  setStreamEpic: (markdown) => set({ streamEpicMarkdown: markdown }),
  parseHeadersFromEpic: () => {
    const headers = extractHeaders(get().streamEpicMarkdown);
    set({ headers });
  },

  addCrew: (name) => {
    const crew: Crew = { id: uid(), name, refineStatus: 'pending' };
    set((s) => ({ crews: [...s.crews, crew] }));
    return crew;
  },
  removeCrew: (id) => set((s) => ({
    crews: s.crews.filter((c) => c.id !== id),
    headers: s.headers.map((h) => ({
      ...h,
      assignedCrewIds: h.assignedCrewIds.filter((cid) => cid !== id),
    })),
  })),
  renameCrew: (id, name) => set((s) => ({
    crews: s.crews.map((c) => c.id === id ? { ...c, name } : c),
  })),

  assignHeaderToCrew: (headerId, crewId) => set((s) => ({
    headers: s.headers.map((h) =>
      h.id === headerId && !h.assignedCrewIds.includes(crewId)
        ? { ...h, assignedCrewIds: [...h.assignedCrewIds, crewId] }
        : h
    ),
  })),
  unassignHeaderFromCrew: (headerId, crewId) => set((s) => ({
    headers: s.headers.map((h) =>
      h.id === headerId
        ? { ...h, assignedCrewIds: h.assignedCrewIds.filter((id) => id !== crewId) }
        : h
    ),
  })),
  applyAiProposal: (assignments) => set((s) => ({
    headers: s.headers.map((h) => ({
      ...h,
      assignedCrewIds: assignments[h.id] ?? h.assignedCrewIds,
      aiAssigned: h.id in assignments,
    })),
  })),

  setCrewRefineStatus: (crewId, status) => set((s) => ({
    crews: s.crews.map((c) => c.id === crewId ? { ...c, refineStatus: status } : c),
  })),
  setCrewRefinedEpic: (crewId, markdown) => set((s) => ({
    crews: s.crews.map((c) => c.id === crewId ? { ...c, refinedEpic: markdown } : c),
  })),

  setStreamGroup: (group) => set({ streamGroup: group }),
  setGroupTree: (tree) => set({ groupTree: tree }),
  setCrewsFromSubgroups: (subgroups) => set({
    crewSubgroups: subgroups,
    crews: subgroups.map((sg) => ({
      id: uid(),
      gitlabGroupId: sg.id,
      name: sg.name,
      refineStatus: 'pending' as const,
    })),
  }),
  setPublishStatus: (status, error) => set((s) => ({
    publish: { ...s.publish, status, error },
  })),
  setPublishStreamEpic: (id, iid) => set((s) => ({
    publish: { ...s.publish, streamEpicId: id, streamEpicIid: iid },
  })),
  setPublishCrewEpic: (localCrewId, id, iid) => set((s) => ({
    publish: { ...s.publish, crewEpicIds: { ...s.publish.crewEpicIds, [localCrewId]: { id, iid } } },
  })),

  reset: () => { _counter = 0; set(INITIAL); },
}));
