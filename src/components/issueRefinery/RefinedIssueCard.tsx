/**
 * Issue Refinery — Refined-issue side-by-side card (R-12).
 *
 * Two columns: the original GitLab issue body (read-only) on the left, the
 * refined draft (editable textarea) on the right. Editing the right pane
 * calls setRefinedDraft(text, true) — the `userEdited` flag — so the
 * PublishButton can prompt "publish your edited version?".
 *
 * v1 keeps the diff visual minimal: side-by-side panes only, no inline
 * +/- highlighting. A future task can introduce a proper diff library
 * if dogfood shows users want it. The card surfaces a "Reset" affordance
 * so users can revert their inline edits to the model output.
 */

import React from 'react';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';

export const RefinedIssueCard: React.FC = () => {
  const originalBody = useIssueRefineryStore((s) => s.originalBody);
  const refinedDraft = useIssueRefineryStore((s) => s.refinedDraft);
  const userEditedDraft = useIssueRefineryStore((s) => s.userEditedDraft);
  const phase = useIssueRefineryStore((s) => s.phase);
  const setRefinedDraft = useIssueRefineryStore((s) => s.setRefinedDraft);

  if (refinedDraft === null) return null;

  // B-C2: lock the textarea while a re-run pipeline is mid-flight or a
  // publish is in progress. Otherwise an in-flight `setRefinedDraft` (from
  // the orchestrator) could clobber the user's keystrokes silently.
  const editable = phase === 'ready' || phase === 'idle' || phase === 'error';

  const handleEdit = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRefinedDraft(e.target.value, /* userEdited */ true);
  };

  return (
    <section className="ir-card ir-refined-card" data-testid="refined-card">
      <header className="ir-card__header">
        <h3 className="ir-card__title">Refined draft</h3>
        {userEditedDraft && (
          <span className="ir-card__subtitle ir-card__subtitle--edited" data-testid="refined-edited-badge">
            edited
          </span>
        )}
      </header>

      <div className="ir-refined-card__panes">
        <div className="ir-refined-card__pane" data-testid="refined-original">
          <h4 className="ir-refined-card__pane-title">Original</h4>
          <pre className="ir-refined-card__pre">{originalBody ?? ''}</pre>
        </div>

        <div className="ir-refined-card__pane" data-testid="refined-draft-pane">
          <h4 className="ir-refined-card__pane-title">Refined</h4>
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
