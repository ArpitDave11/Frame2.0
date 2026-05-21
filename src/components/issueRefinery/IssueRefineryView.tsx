/**
 * Issue Refinery — top-level tab view (R-14).
 *
 * Composes the five Issue Refinery components into a two-pane layout. Reads
 * from `gitlabStore` to detect epic-loaded events (the existing LoadEpicModal
 * writes to `gitlabStore.selectedEpic` + `loadedEpicIid`); a useEffect bridges
 * that state into `issueRefineryStore.setSelectedEpic` and fetches the
 * direct child issues.
 *
 * The bridge keeps the existing LoadEpicModal pattern untouched — Issue
 * Refinery does not duplicate epic-search UI.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useGitlabStore } from '@/stores/gitlabStore';
import { useUiStore } from '@/stores/uiStore';
import { useConfigStore } from '@/stores/configStore';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';
import { fetchEpicIssues } from '@/services/gitlab/gitlabClient';
import { refineSelectedIssue } from '@/actions/refineIssueAction';
import { ChildIssueList } from './ChildIssueList';
import { ComprehensionCard } from './ComprehensionCard';
import { RefinedIssueCard } from './RefinedIssueCard';
import { ValidationCard } from './ValidationCard';
import { PublishButton } from './PublishButton';
import { PromptCacheHUD } from './PromptCacheHUD';

export const IssueRefineryView: React.FC = () => {
  const loadedEpicIid = useGitlabStore((s) => s.loadedEpicIid);
  const loadedGroupId = useGitlabStore((s) => s.loadedGroupId);
  const gitlabSelectedEpic = useGitlabStore((s) => s.selectedEpic);
  const gitlabConfig = useConfigStore((s) => s.config.gitlab);

  const irSelectedEpic = useIssueRefineryStore((s) => s.selectedEpic);
  const phase = useIssueRefineryStore((s) => s.phase);
  const selectedChildIid = useIssueRefineryStore((s) => s.selectedChildIid);
  const error = useIssueRefineryStore((s) => s.error);

  const openModal = useUiStore((s) => s.openModal);
  const addToast = useUiStore((s) => s.addToast);

  const [childrenLoading, setChildrenLoading] = useState(false);

  // Bridge: gitlabStore.loadedEpic → issueRefineryStore.setSelectedEpic.
  // Fetches the child issue list (per_page=100 ceiling — see R-1 docstring)
  // and pushes everything into our store.
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
    if (bridgedIidRef.current === loadedEpicIid) return; // already bridged this epic
    bridgedIidRef.current = loadedEpicIid;

    let cancelled = false;
    setChildrenLoading(true);
    fetchEpicIssues(gitlabConfig, loadedGroupId, loadedEpicIid)
      .then((res) => {
        if (cancelled) return;
        setChildrenLoading(false);
        if (!res.success) {
          addToast({ type: 'error', title: `Failed to load child issues: ${res.error ?? 'unknown'}` });
          return;
        }
        useIssueRefineryStore.getState().setSelectedEpic(
          {
            groupId: loadedGroupId,
            epicIid: loadedEpicIid,
            title: gitlabSelectedEpic.title,
            body: gitlabSelectedEpic.description ?? '',
          },
          res.data ?? [],
        );
      })
      .catch((e) => {
        if (cancelled) return;
        setChildrenLoading(false);
        addToast({ type: 'error', title: `Failed to load child issues: ${(e as Error).message}` });
      });

    return () => {
      cancelled = true;
    };
  }, [loadedEpicIid, loadedGroupId, gitlabSelectedEpic, gitlabConfig, addToast]);

  const handleLoadEpic = () => openModal('loadEpic');
  const refineDisabled =
    selectedChildIid === null || phase === 'comprehending' || phase === 'refining' ||
    phase === 'validating' || phase === 'publishing';

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

      <PromptCacheHUD />
    </div>
  );
};
