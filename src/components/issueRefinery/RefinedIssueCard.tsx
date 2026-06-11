/**
 * Issue Refinery — Refined-issue side-by-side card (R-12, restyled to Figma 3:2).
 *
 * Left pane: the original GitLab issue body (read-only). Right pane: the
 * refined draft (editable textarea). Editing calls setRefinedDraft(text, true)
 * — the `userEdited` flag — so the PublishButton can prompt before shipping
 * tweaks. A "Reset" affordance reverts inline edits to the model's pristine
 * output (B-C2: textarea is locked while a re-run is mid-flight).
 */

import React from 'react';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';

export const RefinedIssueCard: React.FC = () => {
  const originalBody = useIssueRefineryStore((s) => s.originalBody);
  const refinedDraft = useIssueRefineryStore((s) => s.refinedDraft);
  const userEditedDraft = useIssueRefineryStore((s) => s.userEditedDraft);
  const phase = useIssueRefineryStore((s) => s.phase);
  const setRefinedDraft = useIssueRefineryStore((s) => s.setRefinedDraft);
  const resetRefinedDraft = useIssueRefineryStore((s) => s.resetRefinedDraft);

  if (refinedDraft === null) return null;

  // B-C2: lock the textarea while a re-run pipeline is mid-flight or a publish
  // is in progress, else an in-flight setRefinedDraft could clobber keystrokes.
  const editable = phase === 'ready' || phase === 'idle' || phase === 'error';

  const handleEdit = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRefinedDraft(e.target.value, /* userEdited */ true);
  };

  return (
    <section className="ir-card ir-refined-card" data-testid="refined-card">
      <header className="ir-card__header">
        <div className="ir-card__title-row" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 className="ir-card__title">Refined draft</h3>
          {userEditedDraft && (
            <span className="ir-card__subtitle--edited" data-testid="refined-edited-badge">edited</span>
          )}
        </div>
        <button
          type="button"
          className="ir-refined-card__reset"
          onClick={() => resetRefinedDraft()}
          disabled={!userEditedDraft || !editable}
          data-testid="refined-reset"
        >
          Reset
        </button>
      </header>

      <div className="ir-refined-card__panes">
        <div className="ir-refined-card__pane" data-testid="refined-original">
          <h4 className="ir-refined-card__pane-title">Original</h4>
          <pre className="ir-refined-card__pre">{originalBody ?? ''}</pre>
        </div>

        <div className="ir-refined-card__pane ir-refined-card__pane--refined" data-testid="refined-draft-pane">
          <h4 className="ir-refined-card__pane-title">
            Refined <small>editable</small>
          </h4>
          <textarea
            className="ir-refined-card__textarea"
            value={refinedDraft}
            onChange={handleEdit}
            readOnly={!editable}
            spellCheck={false}
            data-testid="refined-textarea"
            aria-label={
              editable
                ? 'Refined issue body (editable)'
                : 'Refined issue body (read-only while pipeline is running)'
            }
          />
        </div>
      </div>
    </section>
  );
};
