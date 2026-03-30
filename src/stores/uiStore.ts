/**
 * UI Store — Phase 2 (T-2.3).
 *
 * Zustand store managing application UI state:
 * active tab, sidebar, modals, and toast notifications.
 */

import { create } from 'zustand';

// ─── Types ─────────────────────────────────────────────────

export type TabId = 'planner' | 'issues' | 'blueprint' | 'analytics';

export type IssueSubTab = 'sprint' | 'epic';

export type ModalId = 'publish' | 'loadEpic' | 'issueCreation' | 'critique' | 'pipeline' | 'settings';

export type ActiveView = 'welcome' | 'workspace';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
}

// ─── State & Actions ────────────────────────────────────────

interface UiState {
  activeTab: TabId;
  activeView: ActiveView;
  editorWidth: number;
  sidebarCollapsed: boolean;
  issueSubTab: IssueSubTab;
  activeModal: ModalId | null;
  toasts: Toast[];
}

interface UiActions {
  setActiveTab: (tab: TabId) => void;
  setActiveView: (view: ActiveView) => void;
  setEditorWidth: (width: number) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setIssueSubTab: (tab: IssueSubTab) => void;
  openModal: (modal: ModalId) => void;
  closeModal: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export type UiStore = UiState & UiActions;

// ─── Initial State ──────────────────────────────────────────

const INITIAL_STATE: UiState = {
  activeTab: 'planner',
  activeView: 'welcome',
  editorWidth: 50,
  sidebarCollapsed: false,
  issueSubTab: 'sprint',
  activeModal: null,
  toasts: [],
};

// ─── Store ──────────────────────────────────────────────────

export const useUiStore = create<UiStore>()((set, get) => ({
  ...INITIAL_STATE,

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  setActiveView: (view) => {
    set({ activeView: view });
  },

  setEditorWidth: (width) => {
    set({ editorWidth: Math.max(20, Math.min(80, width)) });
  },

  toggleSidebar: () => {
    set({ sidebarCollapsed: !get().sidebarCollapsed });
  },

  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed });
  },

  setIssueSubTab: (tab) => {
    set({ issueSubTab: tab });
  },

  openModal: (modal) => {
    set({ activeModal: modal });
  },

  closeModal: () => {
    set({ activeModal: null });
  },

  addToast: (toast) => {
    const id = crypto.randomUUID();
    set({ toasts: [...get().toasts, { ...toast, id }] });
  },

  removeToast: (id) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));
