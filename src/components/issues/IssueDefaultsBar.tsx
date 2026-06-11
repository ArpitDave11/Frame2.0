/**
 * IssueDefaultsBar — weight · assignee · iteration chips for issue creation.
 *
 * Same pill pattern as the One-Click review surface (oc-pill), but draft-local:
 * values live in the parent's state and are applied to every issue at creation
 * time. Nothing touches GitLab until the user clicks Create.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useConfigStore } from '@/stores/configStore';
import { searchGroupMembers, fetchRecentIterations } from '@/services/gitlab/gitlabClient';
import type { GitLabMember, GitLabIteration, GitLabUser } from '@/services/gitlab/types';
import { initials } from '../issueRefinery/MetaEditors';
import type { IssueCreationDefaults } from '@/actions/createIssuesAction';
import '../oneClick/oneClick.css';

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
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

const WEIGHTS = [1, 2, 3, 5, 8, 13, 21];

interface Props {
  groupId: string;
  value: IssueCreationDefaults;
  onChange: (next: IssueCreationDefaults) => void;
}

export const IssueDefaultsBar: React.FC<Props> = ({ groupId, value, onChange }) => {
  return (
    <div
      data-testid="issue-defaults-bar"
      style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
    >
      <WeightChip value={value.weight} onChange={(weight) => onChange({ ...value, weight })} />
      <AssigneeChip
        groupId={groupId}
        value={value.assignee}
        onChange={(assignee) => onChange({ ...value, assignee })}
      />
      <IterationChip
        groupId={groupId}
        value={value.iteration}
        onChange={(iteration) => onChange({ ...value, iteration })}
      />
    </div>
  );
};

const WeightChip: React.FC<{ value: number | null; onChange: (w: number | null) => void }> = ({ value, onChange }) => {
  const { open, setOpen, ref } = usePopover();
  return (
    <span className="oc-pop-anchor" ref={ref}>
      <button
        type="button"
        className="oc-pill"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid="defaults-weight-chip"
      >
        <span className="oc-pill__star" aria-hidden>✦</span>
        <b>{value == null ? '—' : value}</b>
        <span className="oc-pill__sp">SP</span>
        <span className="oc-pill__caret" aria-hidden>▾</span>
      </button>
      {open && (
        <div className="oc-popover" role="dialog" aria-label="Default story points">
          <div className="oc-pop-title">Story points (default)</div>
          <div className="oc-wpts">
            {WEIGHTS.map((n) => (
              <button
                key={n}
                type="button"
                className={`oc-wpt${value === n ? ' oc-wpt--on' : ''}`}
                onClick={() => { onChange(n); setOpen(false); }}
                data-testid={`defaults-wpt-${n}`}
              >
                {n}
              </button>
            ))}
          </div>
          {value != null && (
            <button type="button" className="oc-opt" onClick={() => { onChange(null); setOpen(false); }}>
              Clear default
            </button>
          )}
        </div>
      )}
    </span>
  );
};

const AssigneeChip: React.FC<{ groupId: string; value: GitLabUser | null; onChange: (u: GitLabUser | null) => void }> = ({ groupId, value, onChange }) => {
  const { open, setOpen, ref } = usePopover();
  const gitlab = useConfigStore((s) => s.config.gitlab);
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState<GitLabMember[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !groupId) return;
    let cancelled = false;
    setLoading(true);
    searchGroupMembers(gitlab, groupId, q).then((r) => {
      if (!cancelled) { setOpts(r.success ? (r.data ?? []) : []); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [open, q, groupId, gitlab]);

  const choose = useCallback((u: GitLabUser | null) => { onChange(u); setOpen(false); }, [onChange, setOpen]);

  return (
    <span className="oc-pop-anchor" ref={ref}>
      <button
        type="button"
        className="oc-pill"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid="defaults-assignee-chip"
      >
        <span className={`oc-avatar${value ? '' : ' oc-avatar--none'}`} aria-hidden>
          {value ? initials(value) : '–'}
        </span>
        {value ? (value.name || value.username) : 'Unassigned'}
        <span className="oc-pill__caret" aria-hidden>▾</span>
      </button>
      {open && (
        <div className="oc-popover" role="dialog" aria-label="Default assignee">
          <input
            className="oc-search-in"
            placeholder="Search people…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
            aria-label="Search assignees"
          />
          <ul className="oc-optlist">
            <li>
              <button type="button" className={`oc-opt${value ? '' : ' oc-opt--on'}`} onClick={() => choose(null)}>
                <span className="oc-avatar oc-avatar--none" aria-hidden>–</span>Unassigned
              </button>
            </li>
            {loading && <li><span className="oc-opt" aria-disabled>Searching…</span></li>}
            {!loading && opts.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className={`oc-opt${value?.id === m.id ? ' oc-opt--on' : ''}`}
                  onClick={() => choose({ id: m.id, username: m.username, name: m.name, state: m.state, avatar_url: m.avatar_url })}
                  data-testid={`defaults-assignee-${m.id}`}
                >
                  <span className="oc-avatar" aria-hidden>{initials(m)}</span>
                  {m.name || m.username}
                </button>
              </li>
            ))}
            {!loading && opts.length === 0 && <li><span className="oc-opt" aria-disabled>No members found.</span></li>}
          </ul>
        </div>
      )}
    </span>
  );
};

const IterationChip: React.FC<{ groupId: string; value: GitLabIteration | null; onChange: (it: GitLabIteration | null) => void }> = ({ groupId, value, onChange }) => {
  const { open, setOpen, ref } = usePopover();
  const gitlab = useConfigStore((s) => s.config.gitlab);
  const [opts, setOpts] = useState<GitLabIteration[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !groupId) return;
    let cancelled = false;
    setLoading(true);
    fetchRecentIterations(gitlab, groupId).then((r) => {
      if (!cancelled) { setOpts(r.success ? (r.data ?? []) : []); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [open, groupId, gitlab]);

  return (
    <span className="oc-pop-anchor" ref={ref}>
      <button
        type="button"
        className="oc-pill"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid="defaults-iteration-chip"
      >
        <span aria-hidden>◷</span>
        {value?.title?.trim() ? value.title : 'No iteration'}
        <span className="oc-pill__caret" aria-hidden>▾</span>
      </button>
      {open && (
        <div className="oc-popover" role="dialog" aria-label="Default iteration">
          <div className="oc-pop-title">Iteration (default)</div>
          <ul className="oc-optlist">
            <li>
              <button type="button" className={`oc-opt${value ? '' : ' oc-opt--on'}`} onClick={() => { onChange(null); setOpen(false); }}>
                No iteration
              </button>
            </li>
            {loading && <li><span className="oc-opt" aria-disabled>Loading…</span></li>}
            {!loading && opts.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  className={`oc-opt${value?.id === o.id ? ' oc-opt--on' : ''}`}
                  onClick={() => { onChange(o); setOpen(false); }}
                  data-testid={`defaults-iteration-${o.id}`}
                >
                  ◷ {o.title || `Iteration ${o.iid}`}
                </button>
              </li>
            ))}
            {!loading && opts.length === 0 && <li><span className="oc-opt" aria-disabled>No iterations in this group.</span></li>}
          </ul>
        </div>
      )}
    </span>
  );
};
