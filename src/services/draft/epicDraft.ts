/**
 * Epic draft persistence — autosave to localStorage so a refresh, crash,
 * or dev-server reload never loses editor work.
 *
 * - Debounced autosave on every epicStore change (800ms).
 * - Restore on app init (silent store hydrate + info toast).
 * - `saveEpicDraftNow` backs the toolbar Save button (explicit flush).
 * - beforeunload warns only while the refine pipeline is running —
 *   autosave already makes a plain refresh safe.
 */

import { useEpicStore } from '@/stores/epicStore';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useUiStore } from '@/stores/uiStore';
import type { ComplexityLevel } from '@/domain/types';

const DRAFT_KEY = 'frame-epic-draft-v1';
const AUTOSAVE_DEBOUNCE_MS = 800;

export interface EpicDraft {
  markdown: string;
  complexity: ComplexityLevel;
  sla: number | null;
  savedAt: number;
}

export function loadEpicDraft(): EpicDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as EpicDraft;
    if (typeof draft.markdown !== 'string' || !draft.markdown.trim()) return null;
    return draft;
  } catch {
    return null;
  }
}

export function clearEpicDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

/** Synchronously persist the current editor state. Returns false when storage fails. */
export function saveEpicDraftNow(): boolean {
  const { markdown, complexity, sla } = useEpicStore.getState();
  if (!markdown.trim()) {
    clearEpicDraft();
    return true;
  }
  try {
    const draft: EpicDraft = { markdown, complexity, sla, savedAt: Date.now() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

function formatAge(savedAt: number): string {
  const mins = Math.max(0, Math.round((Date.now() - savedAt) / 60000));
  if (mins < 1) return 'moments ago';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

/**
 * Restore any saved draft, then keep the draft in sync with the store.
 * Call once at app startup (after config hydration).
 */
export function initEpicDraftPersistence(): void {
  const draft = loadEpicDraft();
  if (draft && !useEpicStore.getState().markdown.trim()) {
    const store = useEpicStore.getState();
    store.setMarkdown(draft.markdown);
    store.setComplexity(draft.complexity);
    store.setSla(draft.sla);
    useUiStore.getState().addToast({
      type: 'info',
      title: `Draft restored (saved ${formatAge(draft.savedAt)})`,
    });
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  useEpicStore.subscribe((state, prev) => {
    if (
      state.markdown === prev.markdown &&
      state.complexity === prev.complexity &&
      state.sla === prev.sla
    ) {
      return;
    }
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => saveEpicDraftNow(), AUTOSAVE_DEBOUNCE_MS);
  });

  window.addEventListener('beforeunload', (e) => {
    if (usePipelineStore.getState().isRunning) {
      e.preventDefault();
    }
  });
}
