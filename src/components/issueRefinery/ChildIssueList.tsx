/**
 * Issue Refinery — left-pane child issue list (R-10).
 *
 * Displays the currently loaded epic, its direct child issues, and lets the
 * user select one for refinement. Reads from `issueRefineryStore`; does NOT
 * fetch anything itself — the parent view drives epic loading via the
 * existing GitLab patterns and calls `setSelectedEpic` to populate state.
 *
 * Empty states:
 *   - No epic loaded → "Load an epic to begin"
 *   - Epic loaded but no children → "This epic has no child issues"
 */

import React from 'react';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';

export interface ChildIssueListProps {
  /** Optional callback fired when the user clicks "Load epic". */
  onRequestLoadEpic?: () => void;
}

export const ChildIssueList: React.FC<ChildIssueListProps> = ({ onRequestLoadEpic }) => {
  const selectedEpic = useIssueRefineryStore((s) => s.selectedEpic);
  const children = useIssueRefineryStore((s) => s.children);
  const selectedChildIid = useIssueRefineryStore((s) => s.selectedChildIid);
  const setSelectedChild = useIssueRefineryStore((s) => s.setSelectedChild);

  if (selectedEpic === null) {
    return (
      <div className="ir-childlist ir-childlist--empty" data-testid="childlist-empty">
        <p className="ir-childlist__title">Issue Refinery</p>
        <p className="ir-childlist__hint">Load an epic to refine its child issues.</p>
        {onRequestLoadEpic && (
          <button type="button" onClick={onRequestLoadEpic} className="ir-childlist__loadbtn">
            Load epic
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="ir-childlist" data-testid="childlist">
      <header className="ir-childlist__header">
        <h3 className="ir-childlist__epic-title" title={selectedEpic.title}>
          {selectedEpic.title}
        </h3>
        <span className="ir-childlist__epic-iid">&amp;{selectedEpic.epicIid}</span>
        {onRequestLoadEpic && (
          <button type="button" onClick={onRequestLoadEpic} className="ir-childlist__loadbtn">
            Change
          </button>
        )}
      </header>

      {children.length === 0 ? (
        <p className="ir-childlist__hint" data-testid="childlist-no-children">
          This epic has no child issues.
        </p>
      ) : (
        <ul className="ir-childlist__items" role="radiogroup" aria-label="Child issues">
          {children.map((c) => {
            const selected = c.iid === selectedChildIid;
            return (
              <li key={c.id} className="ir-childlist__item">
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setSelectedChild(c.iid)}
                  className={`ir-childlist__item-btn${selected ? ' ir-childlist__item-btn--selected' : ''}`}
                  data-testid={`childlist-item-${c.iid}`}
                >
                  <span className="ir-childlist__item-iid">#{c.iid}</span>
                  <span className="ir-childlist__item-title">{c.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
