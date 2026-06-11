/**
 * One-Click Issue — review surface.
 *
 * Renders the AI-generated draft (editable title / description / acceptance
 * criteria) plus draft-local metadata editors (weight, priority, assignee,
 * iteration, labels) and the AI rationale. Edits mutate the draft in
 * oneClickStore only — nothing touches GitLab until Publish.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useConfigStore } from '@/stores/configStore';
import { useOneClickStore, type Priority } from '@/stores/oneClickStore';
import { searchGroupMembers, fetchRecentIterations } from '@/services/gitlab/gitlabClient';
import type { GitLabMember, GitLabIteration, GitLabUser } from '@/services/gitlab/types';
import { initials } from '../issueRefinery/MetaEditors';
import { publishOneClickIssue } from '@/actions/oneClickAction';

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return { open, setOpen, ref };
}

const WEIGHTS = [1, 2, 3, 5, 8, 13, 21];
const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'critical'];

export const OneClickReview: React.FC = () => {
  const draft = useOneClickStore((s) => s.draft);
  const epic = useOneClickStore((s) => s.epic);
  const projectPath = useOneClickStore((s) => s.projectPath);
  const patch = useOneClickStore((s) => s.patchDraft);
  const setStep = useOneClickStore((s) => s.setStep);
  const gitlab = useConfigStore((s) => s.config.gitlab);
  const groupId = epic?.groupId ?? gitlab.rootGroupId;

  if (!draft) return null;

  const setAC = (i: number, v: string) => patch({ acceptanceCriteria: draft.acceptanceCriteria.map((a, idx) => (idx === i ? v : a)) });
  const delAC = (i: number) => patch({ acceptanceCriteria: draft.acceptanceCriteria.filter((_, idx) => idx !== i) });
  const addAC = () => patch({ acceptanceCriteria: [...draft.acceptanceCriteria, ''] });

  return (
    <div className="oc-review" data-testid="oc-review">
      <div className="oc-head" style={{ alignItems: 'center' }}>
        <h2 className="oc-title">Review AI draft</h2>
        <button className="oc-x" onClick={() => useOneClickStore.getState().close()} aria-label="Close">✕</button>
      </div>

      <div className="oc-rhead">
        <div className="oc-rtop">
          <span className="oc-rtop__badge">AI DRAFT</span>
          <span className="oc-rtop__dest">→ {projectPath ?? 'home'}</span>
          <span className="oc-rtop__sp" />
          <button className="oc-btn" style={{ padding: '8px 14px' }} onClick={() => setStep('configure')} data-testid="oc-regenerate">↻ Regenerate</button>
          <button className="oc-btn oc-btn--primary" style={{ padding: '10px 18px' }} onClick={() => void publishOneClickIssue()} data-testid="oc-publish">↑ Publish to {epic ? 'epic' : 'home'}</button>
        </div>
        <div className="oc-meta">
          <WeightPop value={draft.weight} onChange={(w) => patch({ weight: w })} />
          <PriorityPop value={draft.priority} onChange={(p) => patch({ priority: p })} />
          <AssigneePop groupId={groupId} value={draft.assignee} onChange={(a) => patch({ assignee: a })} />
          <IterationPop groupId={groupId} value={draft.iteration} onChange={(it) => patch({ iteration: it })} />
        </div>
      </div>

      <div className="oc-rbody">
        <div className="oc-card oc-content">
          <input className="oc-title-input" value={draft.title} onChange={(e) => patch({ title: e.target.value })} aria-label="Issue title" data-testid="oc-title-input" />

          <div className="oc-sec">
            <span className="oc-label">Description</span>
            <textarea className="oc-textarea" style={{ minHeight: 120 }} value={draft.description} onChange={(e) => patch({ description: e.target.value })} aria-label="Description" />
          </div>

          <div className="oc-sec">
            <span className="oc-label">Acceptance criteria</span>
            {draft.acceptanceCriteria.map((a, i) => (
              <div className="oc-ac-row" key={i}>
                <span aria-hidden>☐</span>
                <input value={a} onChange={(e) => setAC(i, e.target.value)} aria-label={`Acceptance criterion ${i + 1}`} />
                <button className="oc-ac-del" onClick={() => delAC(i)} aria-label="Remove criterion">✕</button>
              </div>
            ))}
            <button className="oc-add" onClick={addAC} data-testid="oc-add-ac">+ Add criterion</button>
          </div>

          {draft.dependencies.length > 0 && (
            <div className="oc-sec">
              <span className="oc-label">Dependencies</span>
              <div className="oc-tagrow">{draft.dependencies.map((d, i) => (
                <span className="oc-tag" key={i} style={{ background: 'var(--oc-purple-bg)' }}>⚑ {d}
                  <button onClick={() => patch({ dependencies: draft.dependencies.filter((_, x) => x !== i) })} aria-label="Remove">✕</button></span>))}
              </div>
            </div>
          )}
          {draft.risks.length > 0 && (
            <div className="oc-sec">
              <span className="oc-label">Risks</span>
              <div className="oc-tagrow">{draft.risks.map((r, i) => (
                <span className="oc-tag" key={i} style={{ background: 'var(--oc-amber-bg)' }}>⚠ {r}
                  <button onClick={() => patch({ risks: draft.risks.filter((_, x) => x !== i) })} aria-label="Remove">✕</button></span>))}
              </div>
            </div>
          )}

          <div className="oc-sec">
            <span className="oc-label">Labels</span>
            <LabelsEditor value={draft.labels} onChange={(l) => patch({ labels: l })} />
          </div>
        </div>

        <div className="oc-card oc-rationale">
          <div className="oc-rationale__h">✦ Why these suggestions</div>
          {[['Weight', draft.rationale.weight], ['Priority', draft.rationale.priority], ['Assignee', draft.rationale.assignee], ['Labels', draft.rationale.labels]].map(([k, v]) => (
            <div className="oc-rat-row" key={k}><span className="oc-rat-k">{k}</span><span className="oc-rat-v">{v || '—'}</span></div>
          ))}
          <span className="oc-hint">↺ Every value is editable before publish.</span>
        </div>
      </div>
    </div>
  );
};

// ── editors ──

const WeightPop: React.FC<{ value: number | null; onChange: (w: number | null) => void }> = ({ value, onChange }) => {
  const { open, setOpen, ref } = usePopover();
  return (
    <span className="oc-pop-anchor" ref={ref}>
      <button className="oc-pill" onClick={() => setOpen((o) => !o)} data-testid="oc-weight">
        <span className="oc-pill__star">✦</span><b>{value == null ? '—' : value}</b><span className="oc-pill__sp">SP</span><span className="oc-pill__caret">▾</span>
      </button>
      {open && (
        <div className="oc-popover"><div className="oc-pop-title">Story points</div>
          <div className="oc-wpts">{WEIGHTS.map((n) => (
            <button key={n} className={`oc-wpt${value === n ? ' oc-wpt--on' : ''}`} onClick={() => { onChange(n); setOpen(false); }} data-testid={`oc-wpt-${n}`}>{n}</button>))}</div>
        </div>
      )}
    </span>
  );
};

const PriorityPop: React.FC<{ value: Priority; onChange: (p: Priority) => void }> = ({ value, onChange }) => {
  const { open, setOpen, ref } = usePopover();
  const hi = value === 'high' || value === 'critical';
  return (
    <span className="oc-pop-anchor" ref={ref}>
      <button className={`oc-pill${hi ? ` oc-pill--prio-${value}` : ''}`} onClick={() => setOpen((o) => !o)} data-testid="oc-priority">
        <span aria-hidden>▲</span>Priority: {value[0]!.toUpperCase() + value.slice(1)}<span className="oc-pill__caret">▾</span>
      </button>
      {open && (
        <div className="oc-popover"><div className="oc-pop-title">Priority</div>
          <ul className="oc-optlist">{PRIORITIES.map((p) => (
            <li key={p}><button className={`oc-opt${value === p ? ' oc-opt--on' : ''}`} onClick={() => { onChange(p); setOpen(false); }}>{p[0]!.toUpperCase() + p.slice(1)}</button></li>))}</ul>
        </div>
      )}
    </span>
  );
};

const AssigneePop: React.FC<{ groupId: string; value: GitLabUser | null; onChange: (u: GitLabUser | null) => void }> = ({ groupId, value, onChange }) => {
  const { open, setOpen, ref } = usePopover();
  const gitlab = useConfigStore((s) => s.config.gitlab);
  const [q, setQ] = useState(''); const [opts, setOpts] = useState<GitLabMember[]>([]); const [loading, setLoading] = useState(false);
  useEffect(() => { if (!open) return; let c = false; setLoading(true); searchGroupMembers(gitlab, groupId, q).then((r) => { if (!c) { setOpts(r.success ? (r.data ?? []) : []); setLoading(false); } }); return () => { c = true; }; }, [open, q, groupId, gitlab]);
  const choose = useCallback((u: GitLabUser | null) => { onChange(u); setOpen(false); }, [onChange, setOpen]);
  return (
    <span className="oc-pop-anchor" ref={ref}>
      <button className="oc-pill" onClick={() => setOpen((o) => !o)} data-testid="oc-assignee">
        <span className={`oc-avatar${value ? '' : ' oc-avatar--none'}`} aria-hidden>{value ? initials(value) : '–'}</span>
        {value ? (value.name || value.username) : 'Unassigned'}<span className="oc-pill__caret">▾</span>
      </button>
      {open && (
        <div className="oc-popover">
          <input className="oc-search-in" placeholder="Search people…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus aria-label="Search assignees" />
          <ul className="oc-optlist">
            <li><button className={`oc-opt${value ? '' : ' oc-opt--on'}`} onClick={() => choose(null)}><span className="oc-avatar oc-avatar--none" aria-hidden>–</span>Unassigned</button></li>
            {loading && <li><span className="oc-opt">Searching…</span></li>}
            {!loading && opts.map((m) => (
              <li key={m.id}><button className={`oc-opt${value?.id === m.id ? ' oc-opt--on' : ''}`} data-testid={`oc-assignee-${m.id}`}
                onClick={() => choose({ id: m.id, username: m.username, name: m.name, state: m.state, avatar_url: m.avatar_url })}>
                <span className="oc-avatar" aria-hidden>{initials(m)}</span>{m.name || m.username}</button></li>))}
            {!loading && opts.length === 0 && <li><span className="oc-opt">No members found.</span></li>}
          </ul>
        </div>
      )}
    </span>
  );
};

const IterationPop: React.FC<{ groupId: string; value: GitLabIteration | null; onChange: (it: GitLabIteration | null) => void }> = ({ groupId, value, onChange }) => {
  const { open, setOpen, ref } = usePopover();
  const gitlab = useConfigStore((s) => s.config.gitlab);
  const [opts, setOpts] = useState<GitLabIteration[]>([]); const [loading, setLoading] = useState(false);
  useEffect(() => { if (!open) return; let c = false; setLoading(true); fetchRecentIterations(gitlab, groupId).then((r) => { if (!c) { setOpts(r.success ? (r.data ?? []) : []); setLoading(false); } }); return () => { c = true; }; }, [open, groupId, gitlab]);
  return (
    <span className="oc-pop-anchor" ref={ref}>
      <button className="oc-pill" onClick={() => setOpen((o) => !o)} data-testid="oc-iteration">
        <span aria-hidden>◷</span>{value?.title?.trim() ? value.title : 'No iteration'}<span className="oc-pill__caret">▾</span>
      </button>
      {open && (
        <div className="oc-popover"><div className="oc-pop-title">Iteration</div>
          <ul className="oc-optlist">
            <li><button className={`oc-opt${value ? '' : ' oc-opt--on'}`} onClick={() => { onChange(null); setOpen(false); }}>No iteration</button></li>
            {loading && <li><span className="oc-opt">Loading…</span></li>}
            {!loading && opts.map((o) => (
              <li key={o.id}><button className={`oc-opt${value?.id === o.id ? ' oc-opt--on' : ''}`} onClick={() => { onChange(o); setOpen(false); }}>◷ {o.title || `Iteration ${o.iid}`}</button></li>))}
            {!loading && opts.length === 0 && <li><span className="oc-opt">No iterations in this group.</span></li>}
          </ul>
        </div>
      )}
    </span>
  );
};

const LabelsEditor: React.FC<{ value: string[]; onChange: (l: string[]) => void }> = ({ value, onChange }) => {
  const [input, setInput] = useState('');
  const add = () => { const v = input.trim(); if (v && !value.includes(v)) onChange([...value, v]); setInput(''); };
  return (
    <div className="oc-tagrow">
      {value.map((l, i) => (<span className="oc-tag" key={l}>⊞ {l}<button onClick={() => onChange(value.filter((_, x) => x !== i))} aria-label={`Remove ${l}`}>✕</button></span>))}
      <input className="oc-search-in" style={{ width: 160, marginBottom: 0 }} placeholder="add label + Enter" value={input}
        onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} aria-label="Add label" />
    </div>
  );
};
