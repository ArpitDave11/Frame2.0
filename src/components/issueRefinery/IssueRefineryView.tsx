/**
 * Issue Refinery — top-level tab view (R-14, restyled to Figma 1:2).
 *
 * Layout: topbar → (epic/child rail | workspace). The workspace stacks the
 * child header (selected issue + meta chips + actions) above the
 * Comprehension / Refined / Validation cards. The gitlab → store bridge is
 * delegated to `bridgeLoadedEpicAction()` (Phase B review B-I4) so the view
 * stays presentational.
 *
 * `bridgedIidRef` is only updated AFTER a successful bridge — addresses B-C1.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useGitlabStore } from '@/stores/gitlabStore';
import { useUiStore } from '@/stores/uiStore';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';
import { bridgeLoadedEpicAction } from '@/actions/refineIssueAction';
import { ChildIssueList } from './ChildIssueList';
import { ChildHeader } from './ChildHeader';
import { OriginalIssueCard } from './OriginalIssueCard';
import { ComprehensionCard } from './ComprehensionCard';
import { RefinedIssueCard } from './RefinedIssueCard';
import { ValidationCard } from './ValidationCard';
import { PublishedCard } from './PublishedCard';
import { OneClickModal } from '../oneClick/OneClickModal';
import { OneClickTaskModal } from '../oneClick/OneClickTaskModal';
import { useOneClickStore } from '@/stores/oneClickStore';
import './issueRefinery.css';

export const IssueRefineryView: React.FC = () => {
  const loadedEpicIid = useGitlabStore((s) => s.loadedEpicIid);
  const loadedGroupId = useGitlabStore((s) => s.loadedGroupId);
  const gitlabSelectedEpic = useGitlabStore((s) => s.selectedEpic);

  const irSelectedEpic = useIssueRefineryStore((s) => s.selectedEpic);
  const children = useIssueRefineryStore((s) => s.children);
  const phase = useIssueRefineryStore((s) => s.phase);
  const selectedChildIid = useIssueRefineryStore((s) => s.selectedChildIid);
  const error = useIssueRefineryStore((s) => s.error);
  const published = useIssueRefineryStore((s) => s.published);

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
        if (ok) bridgedIidRef.current = loadedEpicIid;
      })
      .catch(() => {
        if (cancelled) return;
        setChildrenLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadedEpicIid, loadedGroupId, gitlabSelectedEpic]);

  const handleLoadEpic = () => openModal('loadEpic');
  const selectedChild =
    selectedChildIid === null ? undefined : children.find((c) => c.iid === selectedChildIid);

  return (
    <div className="ir-view" data-testid="issue-refinery-view">
      <header className="ir-topbar">
        <div>
          <p className="ir-topbar__title">Issue Refinery</p>
          <p className="ir-topbar__subtitle">Refine GitLab issues with FRAME</p>
        </div>
        <button
          type="button"
          className="oc-entry"
          onClick={() => useOneClickStore.getState().openModal()}
          data-testid="oneclick-open"
        >
          <span aria-hidden="true">✦</span> One-Click Issue
        </button>
      </header>

      <OneClickModal />
      <OneClickTaskModal />

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
          {irSelectedEpic === null || selectedChild === undefined ? (
            <p className="ir-view__hint" data-testid="ir-empty-hint">
              Select a child issue from the left pane to begin.
            </p>
          ) : (
            <>
              <ChildHeader issue={selectedChild} phase={phase} />

              {error && (
                <p className="ir-view__error" data-testid="ir-error" role="alert">
                  {error}
                </p>
              )}

              {published ? (
                <PublishedCard issue={selectedChild} />
              ) : (
                <>
                  <OriginalIssueCard />
                  <ComprehensionCard />
                  <RefinedIssueCard />
                  <ValidationCard />
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
