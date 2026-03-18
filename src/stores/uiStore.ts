/**
 * UI Store — Phase 2 (T-2.3).
 *
 * Zustand store managing application UI state:
 * active tab, sidebar, modals, and toast notifications.
 */

import { create } from 'zustand';

// ─── Types ─────────────────────────────────────────────────

export type TabId = 'editor' | 'blueprint' | 'settings';

export type ModalId = 'publish' | 'loadEpic' | 'issueCreation' | 'critique';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
}

// ─── State & Actions ────────────────────────────────────────

interface UiState {
  activeTab: TabId;
  sidebarCollapsed: boolean;
  activeModal: ModalId | null;
  toasts: Toast[];
}

interface UiActions {
  setActiveTab: (tab: TabId) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openModal: (modal: ModalId) => void;
  closeModal: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export type UiStore = UiState & UiActions;

// ─── Initial State ──────────────────────────────────────────

const INITIAL_STATE: UiState = {
  activeTab: 'editor',
  sidebarCollapsed: false,
  activeModal: null,
  toasts: [],
};

// ─── Store ──────────────────────────────────────────────────

export const useUiStore = create<UiStore>()((set, get) => ({
  ...INITIAL_STATE,

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  toggleSidebar: () => {
    set({ sidebarCollapsed: !get().sidebarCollapsed });
  },

  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed });
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
