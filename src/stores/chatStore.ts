/**
 * Chat Store — Phase 2 (T-2.6).
 *
 * Zustand store managing the AI chat panel state:
 * messages, open/closed, processing indicator, and pending section feedback.
 */

import { create } from 'zustand';

// ─── Types ─────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

// ─── State & Actions ────────────────────────────────────────

interface ChatState {
  messages: ChatMessage[];
  isOpen: boolean;
  isProcessing: boolean;
  pendingSection?: number;
  pendingFeedback?: string;
  input: string;
}

interface ChatActions {
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  setInput: (input: string) => void;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setProcessing: (processing: boolean) => void;
  setPending: (section?: number, feedback?: string) => void;
  clearPending: () => void;
  clearMessages: () => void;
}

export type ChatStore = ChatState & ChatActions;

// ─── Initial State ──────────────────────────────────────────

const INITIAL_STATE: ChatState = {
  messages: [],
  isOpen: false,
  isProcessing: false,
  pendingSection: undefined,
  pendingFeedback: undefined,
  input: '',
};

// ─── Store ──────────────────────────────────────────────────

export const useChatStore = create<ChatStore>()((set, get) => ({
  ...INITIAL_STATE,

  toggleOpen: () => {
    set({ isOpen: !get().isOpen });
  },

  setOpen: (open) => {
    set({ isOpen: open });
  },

  setInput: (input) => {
    set({ input });
  },

  addMessage: (message) => {
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    set({ messages: [...get().messages, { ...message, id, timestamp }] });
  },

  setProcessing: (processing) => {
    set({ isProcessing: processing });
  },

  setPending: (section, feedback) => {
    set({ pendingSection: section, pendingFeedback: feedback });
  },

  clearPending: () => {
    set({ pendingSection: undefined, pendingFeedback: undefined });
  },

  clearMessages: () => {
    set({ messages: [] });
  },
}));
