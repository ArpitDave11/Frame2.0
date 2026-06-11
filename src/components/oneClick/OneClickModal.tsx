/**
 * One-Click Issue — flow modal.
 *
 * Walks the user through: epic Yes/No → (searchable epic picker) → target
 * project (defaults to the team's commons/home) + one prompt → AI generation
 * → review (delegated to OneClickReview) → published success.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useConfigStore } from '@/stores/configStore';
import { useOneClickStore } from '@/stores/oneClickStore';
import { fetchGroupEpics } from '@/services/gitlab/gitlabClient';
import { resolveHomeProject } from '@/services/gitlab/resolveHomeProject';
import type { GitLabEpic, GitLabProject } from '@/services/gitlab/types';
import { generateOneClickIssue } from '@/actions/oneClickAction';
import { OneClickReview } from './OneClickReview';
import './oneClick.css';

const GEN_CHIPS = ['Title', 'Description', 'Acceptance criteria', 'Dependencies & risks', 'Weight', 'Assignee', 'Iteration', 'Labels', 'Priority'];

export const OneClickModal: React.FC = () => {
  const open = useOneClickStore((s) => s.open);
  const step = useOneClickStore((s) => s.step);
  const epic = useOneClickStore((s) => s.epic);
  const projectId = useOneClickStore((s) => s.projectId);
  const prompt = useOneClickStore((s) => s.prompt);
  const createdIssue = useOneClickStore((s) => s.createdIssue);
  const store = useOneClickStore;

  const gitlab = useConfigStore((s) => s.config.gitlab);

  const [picking, setPicking] = useState(false);
  const [epics, setEpics] = useState<GitLabEpic[]>([]);
  const [epicSearch, setEpicSearch] = useState('');
  const [loadingEpics, setLoadingEpics] = useState(false);
  const [projects, setProjects] = useState<GitLabProject[]>([]);
  const [homeId, setHomeId] = useState<string | null>(null);

  // reset local state whenever the modal (re)opens
  useEffect(() => { if (open) { setPicking(false); setEpics([]); setEpicSearch(''); setProjects([]); setHomeId(null); } }, [open]);

  const enterPicker = () => {
    setPicking(true);
    setLoadingEpics(true);
    fetchGroupEpics(gitlab, gitlab.rootGroupId, { state: 'opened', include_descendant_groups: true, per_page: 100 })
      .then((r) => { setEpics(r.success ? (r.data ?? []) : []); })
      .finally(() => setLoadingEpics(false));
  };

  const goConfigure = (groupId: string) => {
    store.getState().setStep('configure');
    resolveHomeProject(gitlab, groupId).then((r) => {
      if (!r.success) return;
      setProjects(r.projects);
      if (r.home) { setHomeId(String(r.home.id)); store.getState().setProject(String(r.home.id), r.home.path_with_namespace); }
      else if (r.projects.length === 1) { store.getState().setProject(String(r.projects[0]!.id), r.projects[0]!.path_with_namespace); }
    });
  };

  const pickEpic = (e: GitLabEpic) => {
    store.getState().setAssociateEpic(true);
    store.getState().setEpic({ groupId: String(e.group_id), epicIid: e.iid, title: e.title, body: e.description ?? '' });
    goConfigure(String(e.group_id));
  };

  const skipEpic = () => { store.getState().setAssociateEpic(false); goConfigure(gitlab.rootGroupId); };

  const filteredEpics = useMemo(() => {
    const q = epicSearch.trim().toLowerCase();
    return q ? epics.filter((e) => e.title.toLowerCase().includes(q)) : epics;
  }, [epics, epicSearch]);

  if (!open) return null;

  const close = () => store.getState().close();
  const wide = step === 'review';

  return (
    <div className="oc-overlay" role="dialog" aria-modal="true" aria-label="One-Click Issue" data-testid="oneclick-modal"
      onMouseDown={(e) => { if (e.target === e.currentTarget && step !== 'generating' && step !== 'publishing') close(); }}>
      <div className={`oc-modal${wide ? ' oc-modal--wide' : ''}`} onMouseDown={(e) => e.stopPropagation()}>

        {/* ── Step: epic choice ── */}
        {step === 'epic-choice' && !picking && (
          <>
            <div className="oc-head">
              <div>
                <h2 className="oc-title">One-Click Issue</h2>
                <p className="oc-sub">Create a GitLab issue from a single prompt — AI does the rest.</p>
              </div>
              <button className="oc-x" onClick={close} aria-label="Close">✕</button>
            </div>
            <p className="oc-q">Would you like to associate this issue with a Parent Epic?</p>
            <div className="oc-choice">
              <button className="oc-btn oc-btn--primary" onClick={enterPicker} data-testid="oc-epic-yes">✦ Yes — choose a parent epic</button>
              <button className="oc-btn" onClick={skipEpic} data-testid="oc-epic-no">No — create a standalone issue</button>
            </div>
          </>
        )}

        {/* ── Step: epic picker ── */}
        {step === 'epic-choice' && picking && (
          <>
            <div className="oc-head">
              <h2 className="oc-title">Select parent epic</h2>
              <button className="oc-x" onClick={close} aria-label="Close">✕</button>
            </div>
            <div className="oc-search">
              <span aria-hidden>⌕</span>
              <input placeholder="Search epics across the group…" value={epicSearch} onChange={(e) => setEpicSearch(e.target.value)} aria-label="Search epics" autoFocus />
            </div>
            {loadingEpics ? (
              <p className="oc-empty">Loading epics…</p>
            ) : filteredEpics.length === 0 ? (
              <p className="oc-empty">No epics found.</p>
            ) : (
              <ul className="oc-epics">
                {filteredEpics.map((e) => (
                  <li key={e.id}>
                    <button className="oc-epic" onClick={() => pickEpic(e)} data-testid={`oc-epic-${e.iid}`}>
                      <span className="oc-epic__t">{e.title}</span>
                      <span className="oc-epic__iid">&amp;{e.iid}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="oc-footer oc-footer--split">
              <button className="oc-btn" onClick={() => setPicking(false)} style={{ padding: '8px 14px' }}>← Back</button>
            </div>
          </>
        )}

        {/* ── Step: configure (project + prompt) ── */}
        {step === 'configure' && (
          <>
            <div className="oc-head">
              <div>
                <h2 className="oc-title">New issue</h2>
                {epic && <p className="oc-sub">✦ Parent epic: {epic.title} · &amp;{epic.epicIid}</p>}
              </div>
              <button className="oc-x" onClick={close} aria-label="Close">✕</button>
            </div>

            <div className="oc-field">
              <span className="oc-label">Target project</span>
              <select className="oc-select" value={projectId ?? ''} data-testid="oc-project"
                onChange={(e) => { const p = projects.find((x) => String(x.id) === e.target.value); if (p) store.getState().setProject(String(p.id), p.path_with_namespace); }}>
                {projects.length === 0 && <option value="">Resolving home project…</option>}
                {projects.map((p) => (
                  <option key={p.id} value={String(p.id)}>{p.path_with_namespace}{String(p.id) === homeId ? '  · home' : ''}</option>
                ))}
              </select>
              <span className="oc-hint">Defaults to the team’s home project. Change only if the group has multiple project homes.</span>
            </div>

            <div className="oc-field">
              <span className="oc-label">Your prompt</span>
              <textarea className="oc-textarea" placeholder="Describe the feature, bug, or task in plain language…" value={prompt}
                onChange={(e) => store.getState().setPrompt(e.target.value)} data-testid="oc-prompt" autoFocus />
            </div>

            <div className="oc-field">
              <span className="oc-label">✦ AI will generate</span>
              <div className="oc-genchips">{GEN_CHIPS.map((c) => <span key={c} className="oc-chip">{c}</span>)}</div>
            </div>

            <div className="oc-footer">
              <button className="oc-btn oc-btn--primary" disabled={!prompt.trim() || !projectId}
                onClick={() => void generateOneClickIssue()} data-testid="oc-generate">✦ Generate issue</button>
            </div>
          </>
        )}

        {/* ── Step: generating ── */}
        {step === 'generating' && (
          <div className="oc-gen" data-testid="oc-generating">
            <div className="oc-spinner" />
            <div className="oc-gen__steps">
              <span>✦ Understanding your prompt…</span>
              <span>Drafting the issue + acceptance criteria…</span>
              <span>Suggesting weight, assignee, labels & priority…</span>
            </div>
          </div>
        )}

        {/* ── Step: review ── */}
        {step === 'review' && <OneClickReview />}

        {/* ── Step: published ── */}
        {step === 'published' && createdIssue && (
          <div className="oc-published" data-testid="oc-published">
            <span className="oc-check" aria-hidden>✓</span>
            <div>
              <h2 className="oc-title">Issue created</h2>
              <p className="oc-sub">Issue #{createdIssue.iid} was published to GitLab.</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <a className="oc-link" href={createdIssue.webUrl} target="_blank" rel="noreferrer noopener" data-testid="oc-open">
                Open #{createdIssue.iid} in GitLab <span aria-hidden>↗</span>
              </a>
              <button className="oc-btn" onClick={() => store.getState().openModal()}>Create another</button>
              <button className="oc-btn" onClick={close}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
