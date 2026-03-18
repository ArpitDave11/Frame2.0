/**
 * Config Store — Phase 2 (T-2.4).
 *
 * Zustand store managing application configuration with
 * localStorage persistence and connection test status tracking.
 */

import { create } from 'zustand';
import type { AppConfig } from '@/domain/configTypes';
import { DEFAULT_CONFIG } from '@/domain/configTypes';

// ─── Types ─────────────────────────────────────────────────

export interface TestStatus {
  success: boolean;
  message: string;
}

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ─── State & Actions ────────────────────────────────────────

interface ConfigState {
  config: AppConfig;
  gitlabTestStatus: TestStatus | null;
  azureTestStatus: TestStatus | null;
  openaiTestStatus: TestStatus | null;
}

interface ConfigActions {
  loadFromStorage: () => void;
  saveToStorage: () => void;
  updateConfig: (partial: DeepPartial<AppConfig>) => void;
  setGitlabTestStatus: (status: TestStatus | null) => void;
  setAzureTestStatus: (status: TestStatus | null) => void;
  setOpenaiTestStatus: (status: TestStatus | null) => void;
  isAIEnabled: () => boolean;
  getActiveProvider: () => string;
}

export type ConfigStore = ConfigState & ConfigActions;

// ─── Helpers ────────────────────────────────────────────────

const STORAGE_KEY = 'epic-generator-config';

/* eslint-disable @typescript-eslint/no-explicit-any */
function deepMerge(target: any, source: any): any {
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = target[key];
    if (
      srcVal !== null &&
      typeof srcVal === 'object' &&
      !Array.isArray(srcVal) &&
      tgtVal !== null &&
      typeof tgtVal === 'object' &&
      !Array.isArray(tgtVal)
    ) {
      deepMerge(tgtVal, srcVal);
    } else {
      target[key] = srcVal;
    }
  }
  return target;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── Initial State ──────────────────────────────────────────

const INITIAL_STATE: ConfigState = {
  config: structuredClone(DEFAULT_CONFIG),
  gitlabTestStatus: null,
  azureTestStatus: null,
  openaiTestStatus: null,
};

// ─── Store ──────────────────────────────────────────────────

export const useConfigStore = create<ConfigStore>()((set, get) => ({
  ...INITIAL_STATE,

  loadFromStorage: () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        set({ config: structuredClone(DEFAULT_CONFIG) });
        return;
      }
      const merged = structuredClone(DEFAULT_CONFIG);
      deepMerge(merged, parsed);
      set({ config: merged });
    } catch {
      set({ config: structuredClone(DEFAULT_CONFIG) });
    }
  },

  saveToStorage: () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(get().config));
  },

  updateConfig: (partial) => {
    const current = structuredClone(get().config);
    deepMerge(current, partial);
    set({ config: current });
  },

  setGitlabTestStatus: (status) => {
    set({ gitlabTestStatus: status });
  },

  setAzureTestStatus: (status) => {
    set({ azureTestStatus: status });
  },

  setOpenaiTestStatus: (status) => {
    set({ openaiTestStatus: status });
  },

  isAIEnabled: () => {
    return get().config.ai.provider !== 'none';
  },

  getActiveProvider: () => {
    return get().config.ai.provider;
  },
}));
