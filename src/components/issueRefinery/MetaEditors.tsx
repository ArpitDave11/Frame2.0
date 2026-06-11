/**
 * Issue Refinery — interactive meta chips (weight · assignee · iteration).
 *
 * Each chip is a pill button that opens a popover editor and writes the change
 * back to GitLab via issueMetaAction. The selected child issue is patched in
 * the store on success, so the chip reflects the new value reactively.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GitLabIssue, GitLabUser, GitLabMember, GitLabIteration } from '@/services/gitlab/types';
import {
  setIssueWeight,
  setIssueAssignee,
  setIssueIteration,
  fetchAssigneeOptions,
  fetchIterationOptions,
} from '@/actions/issueMetaAction';

/** "Priya Nair" → "PN"; "p.nair" → "PN"; falls back to first 2 chars. */
export function initials(user: Pick<GitLabUser, 'name' | 'username'> | null | undefined): string {
  const src = user?.name?.trim() || user?.username?.trim() || '';
  if (!src) return '–';
  const parts = src.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function primaryAssignee(issue: GitLabIssue): GitLabUser | null {
  return issue.assignees?.[0] ?? issue.assignee ?? null;
}

/** Popover open-state + outside-click / Escape close, returns anchor ref. */
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

// ─── Weight ───────────────────────────────────────────────────

const WEIGHT_POINTS = [1, 2, 3, 5, 8, 13, 21];

export const WeightChip: React.FC<{ issue: GitLabIssue }> = ({ issue }) => {
  const { open, setOpen, ref } = usePopover();
  const w = issue.weight;
  const choose = async (n: number | null) => { setOpen(false); await setIssueWeight(n); };

  return (
    <span className="ir-pop-anchor" ref={ref}>
      <button
        type="button"
        className="ir-pill ir-pill--weight"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid="ir-weight-chip"
      >
        <span className="ir-pill__star" aria-hidden="true">✦</span>
        <span className="ir-pill__sp-num">{w == null ? '—' : w}</span>
        <span className="ir-pill__sp">SP</span>
        <span className="ir-pill__caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="ir-popover" role="dialog" aria-label="Set story points" data-testid="ir-weight-pop">
          <div className="ir-popover__head">
            <span className="ir-popover__title">Story points</span>
          </div>
          <div className="ir-wpts">
            {WEIGHT_POINTS.map((n) => (
              <button
                key={n}
                type="button"
                className={`ir-wpt${w === n ? ' ir-wpt--active' : ''}`}
                onClick={() => void choose(n)}
                data-testid={`ir-wpt-${n}`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="ir-popover__hint">
            Maps to the GitLab issue weight.{' '}
            {w != null && (
              <button type="button" className="ir-refined-card__reset" onClick={() => void choose(null)}>
                Clear
              </button>
            )}
          </p>
        </div>
      )}
    </span>
  );
};

// ─── Assignee ─────────────────────────────────────────────────

export const AssigneeChip: React.FC<{ issue: GitLabIssue }> = ({ issue }) => {
  const { open, setOpen, ref } = usePopover();
  const [query, setQuery] = useState('');
  const [opts, setOpts] = useState<GitLabMember[]>([]);
  const [loading, setLoading] = useState(false);
  const a = primaryAssignee(issue);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetchAssigneeOptions(query).then((m) => { if (!cancelled) { setOpts(m); setLoading(false); } });
    return () => { cancelled = true; };
  }, [open, query]);

  const choose = useCallback(async (user: GitLabUser | null) => {
    setOpen(false);
    await setIssueAssignee(user);
  }, [setOpen]);

  return (
    <span className="ir-pop-anchor" ref={ref}>
      <button
        type="button"
        className="ir-pill ir-pill--assignee"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid="ir-assignee-chip"
      >
        <span className={`ir-avatar${a ? '' : ' ir-avatar--unassigned'}`} aria-hidden="true">
          {a ? initials(a) : '–'}
        </span>
        {a ? (a.name || a.username) : 'Unassigned'}
        <span className="ir-pill__caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="ir-popover" role="dialog" aria-label="Set assignee" data-testid="ir-assignee-pop">
          <input
            className="ir-refined-card__textarea"
            style={{ minHeight: 0, padding: '8px 10px', fontSize: 13 }}
            placeholder="Search people…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search assignees"
            data-testid="ir-assignee-search"
            autoFocus
          />
          <ul className="ir-optlist" style={{ marginTop: 10 }}>
            <li>
              <button type="button" className={`ir-opt${a ? '' : ' ir-opt--active'}`} onClick={() => void choose(null)}>
                <span className="ir-avatar ir-avatar--unassigned" aria-hidden="true">–</span>
                Unassigned
              </button>
            </li>
            {loading && <li><span className="ir-opt" aria-disabled>Searching…</span></li>}
            {!loading && opts.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className={`ir-opt${a?.id === m.id ? ' ir-opt--active' : ''}`}
                  onClick={() => void choose({ id: m.id, username: m.username, name: m.name, state: m.state, avatar_url: m.avatar_url })}
                  data-testid={`ir-assignee-opt-${m.id}`}
                >
                  <span className="ir-avatar" aria-hidden="true">{initials(m)}</span>
                  {m.name || m.username}
                </button>
              </li>
            ))}
            {!loading && opts.length === 0 && (
              <li><span className="ir-opt" aria-disabled>No members found.</span></li>
            )}
          </ul>
        </div>
      )}
    </span>
  );
};

// ─── Iteration ────────────────────────────────────────────────

export const IterationChip: React.FC<{ issue: GitLabIssue }> = ({ issue }) => {
  const { open, setOpen, ref } = usePopover();
  const [opts, setOpts] = useState<GitLabIteration[]>([]);
  const [loading, setLoading] = useState(false);
  const it = issue.iteration;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetchIterationOptions().then((i) => { if (!cancelled) { setOpts(i); setLoading(false); } });
    return () => { cancelled = true; };
  }, [open]);

  const choose = async (iter: GitLabIteration | null) => { setOpen(false); await setIssueIteration(iter); };

  return (
    <span className="ir-pop-anchor" ref={ref}>
      <button
        type="button"
        className="ir-pill ir-pill--iteration"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid="ir-iteration-chip"
      >
        <span aria-hidden="true">◷</span>
        {it?.title?.trim() ? it.title : 'No iteration'}
        <span className="ir-pill__caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="ir-popover" role="dialog" aria-label="Set iteration" data-testid="ir-iteration-pop">
          <div className="ir-popover__head">
            <span className="ir-popover__title">Iteration</span>
          </div>
          <ul className="ir-optlist">
            <li>
              <button type="button" className={`ir-opt${it ? '' : ' ir-opt--active'}`} onClick={() => void choose(null)}>
                No iteration
              </button>
            </li>
            {loading && <li><span className="ir-opt" aria-disabled>Loading…</span></li>}
            {!loading && opts.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  className={`ir-opt${it?.id === o.id ? ' ir-opt--active' : ''}`}
                  onClick={() => void choose(o)}
                  data-testid={`ir-iteration-opt-${o.id}`}
                >
                  <span aria-hidden="true">◷</span> {o.title || `Iteration ${o.iid}`}
                </button>
              </li>
            ))}
            {!loading && opts.length === 0 && (
              <li><span className="ir-opt" aria-disabled>No iterations in this group.</span></li>
            )}
          </ul>
        </div>
      )}
    </span>
  );
};
