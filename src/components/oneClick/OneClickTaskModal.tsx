/**
 * One-Click Task — modal.
 *
 * Open an issue → Create Task → prompt → AI drafts a subtask → review → create
 * (as a GitLab child work-item of the issue). Reuses the One-Click stylesheet.
 */

import React from 'react';
import { useOneClickTaskStore } from '@/stores/oneClickTaskStore';
import { generateTaskDraft, publishTask } from '@/actions/oneClickTaskAction';
import './oneClick.css';

const WEIGHTS = [1, 2, 3, 5, 8, 13];

export const OneClickTaskModal: React.FC = () => {
  const open = useOneClickTaskStore((s) => s.open);
  const parent = useOneClickTaskStore((s) => s.parent);
  const phase = useOneClickTaskStore((s) => s.phase);
  const prompt = useOneClickTaskStore((s) => s.prompt);
  const draft = useOneClickTaskStore((s) => s.draft);
  const created = useOneClickTaskStore((s) => s.created);
  const store = useOneClickTaskStore;

  if (!open || !parent) return null;
  const close = () => store.getState().close();
  const busy = phase === 'generating' || phase === 'publishing';

  return (
    <div className="oc-overlay" role="dialog" aria-modal="true" aria-label="Create Task" data-testid="octask-modal"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) close(); }}>
      <div className="oc-modal" onMouseDown={(e) => e.stopPropagation()} style={{ width: 560 }}>

        {(phase === 'configure' || phase === 'generating') && (
          <>
            <div className="oc-head">
              <div>
                <h2 className="oc-title">Create task</h2>
                <p className="oc-sub">⛓ under #{parent.iid} · {parent.title}</p>
              </div>
              <button className="oc-x" onClick={close} aria-label="Close">✕</button>
            </div>

            {phase === 'configure' ? (
              <>
                <div className="oc-field">
                  <span className="oc-label">Describe the subtask</span>
                  <textarea className="oc-textarea" placeholder="e.g. Add Playwright e2e coverage for the cancel / timeout path."
                    value={prompt} onChange={(e) => store.getState().setPrompt(e.target.value)} data-testid="octask-prompt" autoFocus />
                </div>
                <div className="oc-field">
                  <span className="oc-label">✦ AI generates</span>
                  <div className="oc-genchips">{['Title', 'Description', 'Acceptance', 'Weight'].map((c) => <span key={c} className="oc-chip">{c}</span>)}</div>
                </div>
                <div className="oc-footer">
                  <button className="oc-btn oc-btn--primary" disabled={!prompt.trim()} onClick={() => void generateTaskDraft()} data-testid="octask-generate">✦ Generate task</button>
                </div>
              </>
            ) : (
              <div className="oc-gen" data-testid="octask-generating"><div className="oc-spinner" /><div className="oc-gen__steps"><span>✦ Drafting the subtask…</span></div></div>
            )}
          </>
        )}

        {phase !== 'configure' && phase !== 'generating' && phase !== 'published' && draft && (
          <>
            <div className="oc-head">
              <div>
                <h2 className="oc-title">Review task</h2>
                <p className="oc-sub">⛓ child of #{parent.iid} · {parent.title}</p>
              </div>
              <button className="oc-x" onClick={close} aria-label="Close">✕</button>
            </div>

            <input className="oc-title-input" style={{ fontSize: 17 }} value={draft.title} onChange={(e) => store.getState().patchDraft({ title: e.target.value })} aria-label="Task title" data-testid="octask-title" />

            <div className="oc-field">
              <span className="oc-label">Description</span>
              <textarea className="oc-textarea" style={{ minHeight: 70 }} value={draft.description} onChange={(e) => store.getState().patchDraft({ description: e.target.value })} aria-label="Task description" />
            </div>

            <div className="oc-field">
              <span className="oc-label">Acceptance criteria</span>
              {draft.acceptanceCriteria.map((a, i) => (
                <div className="oc-ac-row" key={i}>
                  <span aria-hidden>☐</span>
                  <input value={a} onChange={(e) => store.getState().patchDraft({ acceptanceCriteria: draft.acceptanceCriteria.map((x, idx) => idx === i ? e.target.value : x) })} aria-label={`Criterion ${i + 1}`} />
                  <button className="oc-ac-del" onClick={() => store.getState().patchDraft({ acceptanceCriteria: draft.acceptanceCriteria.filter((_, idx) => idx !== i) })} aria-label="Remove">✕</button>
                </div>
              ))}
              <button className="oc-add" onClick={() => store.getState().patchDraft({ acceptanceCriteria: [...draft.acceptanceCriteria, ''] })}>+ Add criterion</button>
            </div>

            <div className="oc-field">
              <span className="oc-label">Weight</span>
              <div className="oc-wpts">
                {WEIGHTS.map((n) => (
                  <button key={n} className={`oc-wpt${draft.weight === n ? ' oc-wpt--on' : ''}`} onClick={() => store.getState().patchDraft({ weight: n })} data-testid={`octask-w-${n}`}>{n}</button>
                ))}
              </div>
            </div>

            <div className="oc-footer oc-footer--split">
              <button className="oc-btn" style={{ padding: '8px 14px' }} onClick={() => store.getState().setPhase('configure')}>← Re-prompt</button>
              <button className="oc-btn oc-btn--primary" disabled={phase === 'publishing'} onClick={() => void publishTask()} data-testid="octask-create">
                {phase === 'publishing' ? 'Creating…' : '↑ Create task'}
              </button>
            </div>
          </>
        )}

        {phase === 'published' && created && (
          <div className="oc-published" data-testid="octask-published">
            <span className="oc-check" aria-hidden>✓</span>
            <div>
              <h2 className="oc-title">Task created</h2>
              <p className="oc-sub">Task #{created.iid} added under issue #{parent.iid}.</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <a className="oc-link" href={created.webUrl} target="_blank" rel="noreferrer noopener" data-testid="octask-open">Open task ↗</a>
              <button className="oc-btn" onClick={close}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
