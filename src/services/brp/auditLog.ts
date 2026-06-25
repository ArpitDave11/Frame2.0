/**
 * BRP audit log (B-35).
 *
 * Ring buffer of significant planner actions — capacity edits, epic
 * additions, analysis runs, human-estimate changes. Stays in-memory
 * with localStorage persistence so entries survive a page refresh
 * but never accumulate without bound.
 *
 * The module is intentionally tiny and zustand-free: appending an
 * entry is a synchronous side-effect (no React re-render concerns),
 * and the UI subscribes via the `subscribe()` callback when it wants
 * a live view (Phase B-40 may add a SettingsModal panel).
 *
 * Why not the brpStore? The audit log isn't scoped to BRP state —
 * it's an orthogonal observability concern. Keeping it standalone:
 *  - lets it persist independently of crew/pod resets
 *  - keeps brpStore's surface lean (no audit-specific actions)
 *  - matches FRAME's existing pattern for cross-cutting telemetry
 *
 * SSR-safety: the persistence helpers check `typeof window !==
 * "undefined"` so that bundling for the SSR shell doesn't crash on
 * `localStorage`.
 */

export type AuditKind =
  | 'capacity-updated'
  | 'epics-added'
  | 'epic-published'
  | 'human-estimate-set'
  | 'analysis-run-started'
  | 'analysis-run-completed'
  | 'analysis-run-cancelled'
  | 'analysis-epic-failed'
  | 'crews-loaded'
  | 'pods-loaded';

export interface AuditEntry {
  /** Sortable id — monotonic per-process counter rendered as a string. */
  id: string;
  /** ISO-8601 timestamp captured when the entry was appended. */
  timestamp: string;
  kind: AuditKind;
  /** Short one-line description the UI can render directly. */
  summary: string;
  /** Optional free-form details (e.g., podId, epicId, error message). */
  details?: Record<string, string | number | boolean>;
}

const MAX_ENTRIES = 200;
const STORAGE_KEY = 'brp-audit-log-v1';

let entries: AuditEntry[] = loadFromStorage();
let counter = entries.length;
type Listener = (snapshot: readonly AuditEntry[]) => void;
const listeners = new Set<Listener>();

function loadFromStorage(): AuditEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // Don't trust the storage shape blindly — filter for entries that
    // at least have id + timestamp + kind + summary. Anything missing
    // those gets dropped silently.
    return parsed.filter(isAuditEntry).slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

function isAuditEntry(value: unknown): value is AuditEntry {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.timestamp === 'string' &&
    typeof v.kind === 'string' &&
    typeof v.summary === 'string'
  );
}

function saveToStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Quota / private-mode failure — drop silently. The in-memory copy
    // remains authoritative for the current session.
  }
}

function notify(): void {
  const snapshot = Object.freeze(entries.slice());
  for (const fn of listeners) {
    try {
      fn(snapshot);
    } catch {
      // Ignore listener errors so a buggy subscriber can't kill audit
      // delivery for the rest.
    }
  }
}

/**
 * Append an audit entry. Returns the created entry so the caller can
 * cross-reference it (e.g., from a test). Persists + notifies
 * subscribers synchronously.
 */
export function recordAudit(
  kind: AuditKind,
  summary: string,
  details?: AuditEntry['details'],
): AuditEntry {
  const entry: AuditEntry = {
    id: String(++counter),
    timestamp: new Date().toISOString(),
    kind,
    summary,
    ...(details ? { details } : {}),
  };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }
  saveToStorage();
  notify();
  return entry;
}

/** Current snapshot of entries — immutable shallow copy. */
export function getAuditEntries(): readonly AuditEntry[] {
  return Object.freeze(entries.slice());
}

/**
 * Subscribe to audit-entry changes. Calls `listener` once immediately
 * with the current snapshot. Returns an unsubscribe function.
 *
 * The immediate-snapshot call is wrapped in a try so a buggy listener
 * can't tear down the subscriber chain (matches the per-event safety
 * in `notify`).
 */
export function subscribeAuditLog(listener: Listener): () => void {
  listeners.add(listener);
  try {
    listener(getAuditEntries());
  } catch {
    // Match notify(): never let a single listener kill the call site.
  }
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Clear all entries and storage. Primarily for tests; the UI doesn't
 * expose this in v1.
 */
export function clearAuditLog(): void {
  entries = [];
  counter = 0;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // see saveToStorage — best effort.
    }
  }
  notify();
}
