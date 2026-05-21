/**
 * Issue Refinery — top-level tab view (R-14, with deep-review #2 fixes).
 *
 * Composes the Issue Refinery components into a two-pane layout. The
 * gitlab → store bridge is delegated to `bridgeLoadedEpicAction()` in the
 * action layer (Phase B review B-I4) so the view stays presentational.
 *
 * The `bridgedIidRef` is only updated AFTER a successful bridge — addresses
 * B-C1 (retry not blocked on fetch failure).
 */

import React, { useEffect, useRef, useState } from 'react';
import { useGitlabStore } from '@/stores/gitlabStore';
import { useUiStore } from '@/stores/uiStore';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';
import { refineSelectedIssue, bridgeLoadedEpicAction } from '@/actions/refineIssueAction';
import { ChildIssueList } from './ChildIssueList';
import { ComprehensionCard } from './ComprehensionCard';
import { RefinedIssueCard } from './RefinedIssueCard';
import { ValidationCard } from './ValidationCard';
import { PublishButton } from './PublishButton';

export const IssueRefineryView: React.FC = () => {
  const loadedEpicIid = useGitlabStore((s) => s.loadedEpicIid);
  const loadedGroupId = useGitlabStore((s) => s.loadedGroupId);
  const gitlabSelectedEpic = useGitlabStore((s) => s.selectedEpic);

  const irSelectedEpic = useIssueRefineryStore((s) => s.selectedEpic);
  const phase = useIssueRefineryStore((s) => s.phase);
  const selectedChildIid = useIssueRefineryStore((s) => s.selectedChildIid);
  const error = useIssueRefineryStore((s) => s.error);

  const openModal = useUiStore((s) => s.openModal);

  const [childrenLoading, setChildrenLoading] = useState(false);

  // Only-bridge-once-per-epic guard. Reset on failure so the user can retry
  // the same epic without first loading a different one (B-C1).
  const bridgedIidRef = useRef<number | null>(null);
  useEffect(() => {
    if (
      loadedEpicIid === null ||
      loadedGroupId === null ||
      gitlabSelectedEpic === null ||
      gitlabSelectedEpic.iid !== loadedEpicIid
    ) {
      return;
    }
    if (bridgedIidRef.current === loadedEpicIid) return;

    let cancelled = false;
    setChildrenLoading(true);
    bridgeLoadedEpicAction(loadedGroupId, loadedEpicIid, gitlabSelectedEpic)
      .then((ok) => {
        if (cancelled) return;
        setChildrenLoading(false);
        // B-C1: only mark this epic as "bridged" if the fetch actually succeeded.
        if (ok) bridgedIidRef.current = loadedEpicIid;
      })
      .catch(() => {
        if (cancelled) return;
        setChildrenLoading(false);
        // Leave bridgedIidRef untouched so the user can retry.
      });

    return () => {
      cancelled = true;
    };
  }, [loadedEpicIid, loadedGroupId, gitlabSelectedEpic]);

  const handleLoadEpic = () => openModal('loadEpic');
  const refineDisabled =
    selectedChildIid === null ||
    phase === 'comprehending' ||
    phase === 'refining' ||
    phase === 'validating' ||
    phase === 'publishing';

  return (
    <div className="ir-view" data-testid="issue-refinery-view">
      <div className="ir-view__panes">
        <aside className="ir-view__left">
          {childrenLoading ? (
            <p className="ir-view__loading" data-testid="ir-children-loading">
              Loading child issues…
            </p>
          ) : (
            <ChildIssueList onRequestLoadEpic={handleLoadEpic} />
          )}
        </aside>

        <main className="ir-view__right">
          {irSelectedEpic === null || selectedChildIid === null ? (
            <p className="ir-view__hint" data-testid="ir-empty-hint">
              Select a child issue from the left pane to begin.
            </p>
          ) : (
            <>
              <ComprehensionCard />
              <RefinedIssueCard />
              <ValidationCard />

              {error && (
                <p className="ir-view__error" data-testid="ir-error" role="alert">
                  {error}
                </p>
              )}

              <div className="ir-view__controls">
                <button
                  type="button"
                  onClick={() => void refineSelectedIssue()}
                  disabled={refineDisabled}
                  className="ir-refine-btn"
                  data-testid="refine-btn"
                  data-phase={phase}
                >
                  {phase === 'comprehending' || phase === 'refining' || phase === 'validating'
                    ? 'Refining…'
                    : phase === 'ready'
                      ? 'Refine again'
                      : 'Refine'}
                </button>
                <PublishButton />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};
