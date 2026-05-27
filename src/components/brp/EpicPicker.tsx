/**
 * EpicPicker — modal listing candidate epics fetched from a Pod's GitLab
 * subgroup; planner checks the ones they want to bring into the Pod (B-23).
 *
 * Pure presentational. Caller fetches the candidate list via
 * `brpGitlabService.fetchPodEpics` BEFORE opening the picker and plumbs
 * `candidates` in. On Confirm, the planner-selected subset is returned
 * via `onConfirm`. The caller then dispatches `loadEpicsIntoPod`.
 *
 * Pre-existing epics (already part of the pod) are pre-checked and
 * disabled. Search filters by title/iid match. Empty candidate list
 * shows an explanatory empty state instead of the table.
 *
 * Accessibility: role=dialog, aria-labelledby, Escape close. Each row
 * has an associated <label> via a generated id so screen readers can
 * announce which epic the checkbox toggles.
 */

import { useEffect, useId, useMemo, useState } from 'react';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import type { Epic } from '@/domain/brp';
import { color, font, fontSize, fontWeight, radius, shadow } from '@/theme/tokens';

export interface EpicPickerProps {
  open: boolean;
  podName: string;
  /** Candidate epics from GitLab (already mapped to domain Epic shape). */
  candidates: Epic[];
  /** IDs of epics already present in the pod. Pre-checked + disabled. */
  alreadyLoadedIds: ReadonlySet<string>;
  onClose: () => void;
  onConfirm: (chosen: Epic[]) => void;
  /**
   * Optional state surface for the wrapper around the picker (B-39).
   * 'loading' shows a spinner; 'error' shows the message + Retry.
   * Default 'ready' renders the candidate list.
   */
  state?: 'ready' | 'loading' | 'error';
  errorMessage?: string;
  /** Retry handler when state === 'error'. */
  onRetry?: () => void;
}

export function EpicPicker({
  open,
  podName,
  candidates,
  alreadyLoadedIds,
  onClose,
  onConfirm,
  state = 'ready',
  errorMessage,
  onRetry,
}: EpicPickerProps) {
  const titleId = useId();
  const searchId = useId();
  const [query, setQuery] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());

  // Re-seed local "checked" whenever the dialog opens, so the pre-loaded
  // epics show as checked. (Stay in sync if the prop changes between opens.)
  useEffect(() => {
    if (open) {
      setChecked(new Set(alreadyLoadedIds));
      setQuery('');
    }
  }, [open, alreadyLoadedIds]);

  // Escape closes when open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === '') return candidates;
    return candidates.filter(
      (e) =>
        e.title.toLowerCase().includes(q) || String(e.iid).includes(q),
    );
  }, [candidates, query]);

  if (!open) return null;

  // Newly checked (not previously loaded) — what the confirm action will add.
  const newlyChecked = candidates.filter(
    (e) => checked.has(e.id) && !alreadyLoadedIds.has(e.id),
  );

  const toggle = (id: string) => {
    if (alreadyLoadedIds.has(id)) return; // pre-loaded ones are locked
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <div
        data-testid="epic-picker-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999,
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="epic-picker"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 640,
          maxHeight: '90vh',
          background: color.white,
          borderRadius: radius.xl,
          boxShadow: shadow.xl,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: font.sans,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 28px',
            borderBottom: `1px solid ${color.neutral200}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: color.neutral50,
          }}
        >
          <h2
            id={titleId}
            data-testid="epic-picker-title"
            style={{
              margin: 0,
              fontSize: fontSize.lg,
              fontWeight: fontWeight.medium,
              color: color.black,
              letterSpacing: '-0.2px',
            }}
          >
            Add epics — {podName}
          </h2>
          <button
            type="button"
            data-testid="epic-picker-close"
            aria-label="Close epic picker"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: color.grayIII,
            }}
          >
            <X size={20} weight="bold" aria-hidden="true" />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '16px 28px', borderBottom: `1px solid ${color.neutral200}` }}>
          <label
            htmlFor={searchId}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              width: '100%',
              border: `1px solid ${color.neutral200}`,
              borderRadius: radius.sm,
              padding: '6px 10px',
            }}
          >
            <MagnifyingGlass size={14} color={color.grayIII} aria-hidden="true" />
            <input
              id={searchId}
              data-testid="epic-picker-search"
              type="text"
              value={query}
              placeholder="Filter by title or !iid"
              onChange={(e) => setQuery(e.target.value)}
              style={{
                flex: 1,
                marginLeft: 8,
                border: 'none',
                outline: 'none',
                fontFamily: font.sans,
                fontSize: fontSize.sm,
                color: color.black,
                background: color.white,
              }}
            />
          </label>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 0' }}>
          {state === 'loading' ? (
            <div
              data-testid="epic-picker-loading"
              role="status"
              aria-live="polite"
              style={{
                padding: '40px 28px',
                textAlign: 'center',
                color: color.grayV,
                fontSize: fontSize.sm,
              }}
            >
              Loading epics from GitLab…
            </div>
          ) : state === 'error' ? (
            <div
              data-testid="epic-picker-error"
              role="alert"
              style={{
                margin: '20px 28px',
                padding: '14px 16px',
                background: color.pastelI,
                border: `1px solid ${color.bordeauxI}`,
                borderRadius: radius.sm,
                color: color.red,
                fontSize: fontSize.sm,
              }}
            >
              <div data-testid="epic-picker-error-message" style={{ marginBottom: 10 }}>
                {errorMessage ?? 'Failed to load epics from GitLab.'}
              </div>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  data-testid="epic-picker-error-retry"
                  style={{
                    background: color.red,
                    color: color.white,
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: radius.sm,
                    fontSize: fontSize.xs,
                    fontWeight: fontWeight.medium,
                    cursor: 'pointer',
                  }}
                >
                  Retry
                </button>
              )}
            </div>
          ) : filtered.length === 0 ? (
            <div
              data-testid="epic-picker-empty"
              style={{
                padding: '40px 28px',
                textAlign: 'center',
                color: color.grayV,
              }}
            >
              {candidates.length === 0
                ? 'No epics found in this pod’s GitLab subgroup.'
                : 'No epics match your filter.'}
            </div>
          ) : (
            <ul
              data-testid="epic-picker-list"
              role="list"
              style={{ listStyle: 'none', margin: 0, padding: 0 }}
            >
              {filtered.map((epic) => {
                const isPreLoaded = alreadyLoadedIds.has(epic.id);
                const isChecked = checked.has(epic.id);
                const rowId = `epic-picker-row-${epic.id}`;
                return (
                  <li
                    key={epic.id}
                    data-testid={`epic-picker-row-${epic.id}`}
                    data-preloaded={isPreLoaded ? 'true' : 'false'}
                    style={{ padding: '0 28px' }}
                  >
                    <label
                      htmlFor={rowId}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: '10px 0',
                        borderBottom: `1px solid ${color.neutral200}`,
                        cursor: isPreLoaded ? 'not-allowed' : 'pointer',
                        opacity: isPreLoaded ? 0.6 : 1,
                      }}
                    >
                      <input
                        id={rowId}
                        type="checkbox"
                        data-testid={`epic-picker-checkbox-${epic.id}`}
                        checked={isChecked}
                        disabled={isPreLoaded}
                        onChange={() => toggle(epic.id)}
                      />
                      <span style={{ flex: 1 }}>
                        <span
                          style={{
                            display: 'block',
                            fontSize: fontSize.sm,
                            color: color.black,
                          }}
                        >
                          {epic.title}
                        </span>
                        <span
                          style={{
                            display: 'block',
                            fontSize: fontSize.xs,
                            color: color.grayIII,
                            fontFamily: font.mono,
                          }}
                        >
                          !{epic.iid}
                          {isPreLoaded ? ' · already in pod' : ''}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 28px',
            borderTop: `1px solid ${color.neutral200}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span
            data-testid="epic-picker-count"
            style={{ fontSize: fontSize.xs, color: color.grayV }}
          >
            {newlyChecked.length} new epic{newlyChecked.length === 1 ? '' : 's'} to add
          </span>
          <span style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              data-testid="epic-picker-cancel"
              style={{
                background: color.white,
                color: color.grayV,
                border: `1px solid ${color.neutral200}`,
                padding: '8px 16px',
                borderRadius: radius.sm,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm(newlyChecked);
                onClose();
              }}
              disabled={newlyChecked.length === 0}
              data-testid="epic-picker-confirm"
              style={{
                background: newlyChecked.length === 0 ? color.neutral200 : color.red,
                color: newlyChecked.length === 0 ? color.grayIII : color.white,
                border: 'none',
                padding: '8px 16px',
                borderRadius: radius.sm,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                cursor: newlyChecked.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Add to pod
            </button>
          </span>
        </div>
      </div>
    </>
  );
}
