/**
 * BrpView — Tab root for Breakdown & Re-groom Planning (B-27/B-28).
 *
 * Switches between PortfolioView (no pod selected) and PodView (pod
 * selected). Owns the three modal-open flags (CapacityDialog,
 * MetricsModal, EpicPicker) as local state so the modals can drive
 * themselves without leaking modal toggles into the brpStore.
 *
 * Reads from brpStore:
 *   - crews, selectedPodId, selectedEpicId
 *   - analysisStatus, analysisProgress
 *
 * Writes to brpStore via the existing actions:
 *   - selectPod, selectEpic, updatePodCapacity, setHumanEstimate,
 *     loadEpicsIntoPod
 *
 * Async work (loading crews/pods/epics from GitLab, running analysis)
 * is delegated to the brpActions module in B-29/B-30. Until those
 * land, the BrpView's "Load pods" / "Add epics" / "Run analysis"
 * handlers in the action layer wire to the real flows.
 */

import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useBrpStore } from '@/stores/brpStore';
import type { CapacityInputs, Crew, Epic, Pod } from '@/domain/brp';
import { PortfolioView } from './PortfolioView';
import { PodView } from './PodView';
import { CapacityDialog } from './CapacityDialog';
import { MetricsModal } from './MetricsModal';
import { EpicPicker } from './EpicPicker';
import {
  confirmAddEpicsAction,
  findDuplicatesInPodAction,
  generateEpicFromRequirement,
  interpretVarianceAction,
  listCandidateEpicsAction,
  loadCrewsAction,
  loadPodsAction,
  publishGeneratedEpicAction,
  publishReanalyzedEpicAction,
  runAnalysisForPodAction,
  setHumanEstimateAction,
  suggestCapacityAction,
  updateCapacityAction,
} from '@/services/brp/brpActions';
import type { AnalysisFailure } from '@/services/brp/brpActions';
import { EpicWizard } from './EpicWizard';
import type { SizedStory } from '@/domain/brp';
import { font } from '@/theme/tokens';

interface ModalState {
  capacityOpen: boolean;
  metricsOpen: boolean;
  pickerOpen: boolean;
  createEpicOpen: boolean;
}

const INITIAL_MODAL_STATE: ModalState = {
  capacityOpen: false,
  metricsOpen: false,
  pickerOpen: false,
  createEpicOpen: false,
};

/**
 * Locate a pod (and its parent crew) by pod id. Returns null entries
 * if the id no longer matches anything in the loaded data.
 */
function findPod(crews: Crew[], podId: string | null): { pod: Pod | null; crew: Crew | null } {
  if (!podId) return { pod: null, crew: null };
  for (const c of crews) {
    const p = c.pods.find((x) => x.id === podId);
    if (p) return { pod: p, crew: c };
  }
  return { pod: null, crew: null };
}

export function BrpView() {
  // ─── Store state (select shallowly so the component re-renders only
  // when one of these values changes). ────────────────────────────────
  const {
    crews,
    selectedCrewId,
    selectedPodId,
    selectedEpicId,
    analysisStatus,
    analysisProgress,
    reGroomOnlyFilter,
    currentPI,
  } = useBrpStore(
    useShallow((s) => ({
      crews: s.crews,
      selectedCrewId: s.selectedCrewId,
      selectedPodId: s.selectedPodId,
      selectedEpicId: s.selectedEpicId,
      analysisStatus: s.analysisStatus,
      analysisProgress: s.analysisProgress,
      reGroomOnlyFilter: s.reGroomOnlyFilter,
      currentPI: s.currentPI,
    })),
  );

  // Mutating actions — grabbed individually so referential identity is
  // stable across renders (zustand returns the same fn every time).
  const selectCrew = useBrpStore((s) => s.selectCrew);
  const selectPod = useBrpStore((s) => s.selectPod);
  const selectEpic = useBrpStore((s) => s.selectEpic);
  const setReGroomOnlyFilter = useBrpStore((s) => s.setReGroomOnlyFilter);
  // updatePodCapacity + setHumanEstimate now route through the action
  // layer so audit entries (B-35) are recorded automatically — see
  // updateCapacityAction / setHumanEstimateAction.

  // ─── Local UI state (modal flags + analysis last-run snapshot). ───
  const [modals, setModals] = useState<ModalState>(INITIAL_MODAL_STATE);
  // The wizard serves both Create New (blank) and Re-analyze (scoped to an epic).
  const [wizard, setWizard] = useState<{ mode: 'create' | 'reanalyze'; epic: Epic | null }>({ mode: 'create', epic: null });
  const closeAllModals = () => setModals(INITIAL_MODAL_STATE);
  // Snapshot of the most recent COMPLETED run. The store clears
  // analysisProgress when the run finishes, so we keep total+failures
  // here so the AnalysisProgress banner can render success/partial.
  // null = no run completed since the last dismiss/page-load.
  const [lastRun, setLastRun] = useState<{
    total: number;
    failures: AnalysisFailure[];
  } | null>(null);
  // AbortController for the in-flight analysis run, so Cancel works.
  const [analysisController, setAnalysisController] = useState<AbortController | null>(null);
  // Cleanup the in-flight run when BrpView unmounts (B-32 C3): without
  // this, the planner navigating away leaves a zombie run that keeps
  // writing to the store + calling setState on this unmounted component.
  useEffect(() => {
    return () => {
      analysisController?.abort();
    };
  }, [analysisController]);

  // ─── Load-state (post-B-42 UI gap fix) ────────────────────
  // Tracks the live state of the data-loading actions so PortfolioView
  // can swap the empty/loading/error variants. The actions themselves
  // mutate brpStore on success — these locals only carry "in-flight" +
  // "last error" so the UI can render the right CTA.
  const [loadCrewsState, setLoadCrewsState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [loadCrewsError, setLoadCrewsError] = useState<string | undefined>();
  const [loadPodsState, setLoadPodsState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [loadPodsError, setLoadPodsError] = useState<string | undefined>();

  const handleLoadCrews = async () => {
    setLoadCrewsState('loading');
    setLoadCrewsError(undefined);
    try {
      const res = await loadCrewsAction();
      if (res.success) {
        setLoadCrewsState('idle');
      } else {
        setLoadCrewsState('error');
        setLoadCrewsError(res.error.message);
      }
    } catch (e: unknown) {
      setLoadCrewsState('error');
      setLoadCrewsError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleLoadPods = async () => {
    if (!selectedCrewId) return;
    setLoadPodsState('loading');
    setLoadPodsError(undefined);
    try {
      const res = await loadPodsAction(selectedCrewId);
      if (res.success) {
        setLoadPodsState('idle');
      } else {
        setLoadPodsState('error');
        setLoadPodsError(res.error.message);
      }
    } catch (e: unknown) {
      setLoadPodsState('error');
      setLoadPodsError(e instanceof Error ? e.message : String(e));
    }
  };

  // ─── Portfolio-level analysis (reference UI parity) ─────────
  // Runs analysis sequentially across every pod in the selected crew.
  const [portfolioAnalysisRunning, setPortfolioAnalysisRunning] = useState(false);

  const handlePortfolioAnalysis = async () => {
    const targetCrews = selectedCrewId
      ? crews.filter((c) => c.id === selectedCrewId)
      : crews;
    const allPods = targetCrews.flatMap((c) => c.pods);
    if (allPods.length === 0) return;
    setPortfolioAnalysisRunning(true);
    try {
      for (const p of allPods) {
        await runAnalysisForPodAction(p.id);
      }
    } finally {
      setPortfolioAnalysisRunning(false);
    }
  };

  // ─── AI-assist (B-34) ──────────────────────────────────────
  // Duplicate detection runs per-pod whenever the pod's epics list
  // changes. The result is a Set<string> the EpicRow can use to flag
  // its title with "Likely duplicate".
  const [duplicateEpicIds, setDuplicateEpicIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  // Variance interpretation runs whenever the selected epic changes.
  const [selectedVarianceMessage, setSelectedVarianceMessage] = useState<string | null>(
    null,
  );

  const { pod, crew } = useMemo(
    () => findPod(crews, selectedPodId),
    [crews, selectedPodId],
  );

  // Recompute duplicate groups whenever the pod's epics list changes.
  // Run cancelled if the pod is swapped out or the view unmounts.
  useEffect(() => {
    if (!pod) {
      setDuplicateEpicIds(new Set());
      return;
    }
    let cancelled = false;
    findDuplicatesInPodAction(pod.id)
      .then((groups) => {
        if (cancelled) return;
        const flagged = new Set<string>();
        for (const g of groups) for (const id of g.epicIds) flagged.add(id);
        setDuplicateEpicIds(flagged);
      })
      .catch(() => {
        if (!cancelled) setDuplicateEpicIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [pod]);

  // Re-explain variance whenever the selected epic changes.
  useEffect(() => {
    if (!selectedEpicId) {
      setSelectedVarianceMessage(null);
      return;
    }
    let cancelled = false;
    interpretVarianceAction(selectedEpicId)
      .then((interp) => {
        if (cancelled) return;
        setSelectedVarianceMessage(interp?.message ?? null);
      })
      .catch(() => {
        if (!cancelled) setSelectedVarianceMessage(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedEpicId, pod]);

  // ─── Routing. ───────────────────────────────────────────────────────
  // No pod selected → Portfolio. Selected pod that no longer exists →
  // fall back to Portfolio (defensive: a refresh that drops the pod
  // shouldn't crash the view).
  if (!pod || !crew) {
    return (
      <div
        data-testid="brp-view"
        data-mode="portfolio"
        style={{ display: 'flex', flex: 1, overflow: 'hidden', fontFamily: font.sans }}
      >
        <PortfolioView
          crews={crews}
          crewFilterId={selectedCrewId}
          onSelectCrew={selectCrew}
          onSelectPod={(podId) => {
            selectPod(podId);
            selectEpic(null);
          }}
          onSelectEpicInPod={(podId, epicId) => {
            selectPod(podId);
            selectEpic(epicId);
          }}
          reGroomOnlyFilter={reGroomOnlyFilter}
          onToggleReGroomFilter={() => setReGroomOnlyFilter(!reGroomOnlyFilter)}
          piName={currentPI?.name ?? null}
          onRunAnalysis={handlePortfolioAnalysis}
          analysisRunning={portfolioAnalysisRunning}
          onLoadCrews={handleLoadCrews}
          onLoadPods={handleLoadPods}
          loadCrewsState={loadCrewsState}
          loadPodsState={loadPodsState}
          loadCrewsError={loadCrewsError}
          loadPodsError={loadPodsError}
        />
      </div>
    );
  }

  // ─── PodView mode. ──────────────────────────────────────────────────
  const analysisRunning = analysisStatus === 'running';

  return (
    <div
      data-testid="brp-view"
      data-mode="pod"
      style={{ display: 'flex', flex: 1, overflow: 'hidden', fontFamily: font.sans }}
    >
      <PodView
        pod={pod}
        crew={crew}
        selectedEpicId={selectedEpicId}
        analysisRunning={analysisRunning}
        analysisCompleted={
          analysisRunning
            ? analysisProgress?.completed ?? 0
            : // After completion the store clears analysisProgress —
              // surface the snapshot's "completed" count (total − failures)
              // so AnalysisProgress can render the success/partial banner.
              lastRun
              ? lastRun.total - lastRun.failures.length
              : 0
        }
        analysisTotal={
          analysisRunning ? analysisProgress?.total ?? 0 : lastRun?.total ?? 0
        }
        analysisCurrentEpicTitle={
          analysisProgress?.currentEpicId
            ? pod.epics.find((e) => e.id === analysisProgress.currentEpicId)?.title ?? null
            : null
        }
        analysisFailures={lastRun?.failures ?? []}
        duplicateEpicIds={duplicateEpicIds}
        selectedVarianceMessage={selectedVarianceMessage}
        piName={currentPI?.name ?? null}
        onBackToPortfolio={() => {
          selectPod(null);
          selectEpic(null);
          closeAllModals();
        }}
        onSelectEpic={selectEpic}
        onHumanEstimateChange={setHumanEstimateAction}
        onOpenCapacityDialog={() => setModals((m) => ({ ...m, capacityOpen: true }))}
        onOpenMetricsModal={() => setModals((m) => ({ ...m, metricsOpen: true }))}
        onOpenEpicPicker={() => setModals((m) => ({ ...m, pickerOpen: true }))}
        onOpenCreateEpic={() => {
          setWizard({ mode: 'create', epic: null });
          setModals((m) => ({ ...m, createEpicOpen: true }));
        }}
        onReanalyzeEpic={(epic) => {
          setWizard({ mode: 'reanalyze', epic });
          setModals((m) => ({ ...m, createEpicOpen: true }));
        }}
        onRunAnalysis={() => {
          const controller = new AbortController();
          const totalAtStart = pod.epics.length;
          setAnalysisController(controller);
          setLastRun(null);
          runAnalysisForPodAction(pod.id, { signal: controller.signal })
            .then((result) => {
              if (result.aborted) {
                // Planner cancelled — suppress the post-run banner.
                setLastRun(null);
              } else {
                setLastRun({ total: totalAtStart, failures: result.failures });
              }
            })
            .catch((e: unknown) => {
              setLastRun({
                total: totalAtStart,
                failures: [
                  {
                    epicId: '<run>',
                    message: e instanceof Error ? e.message : String(e),
                  },
                ],
              });
            })
            .finally(() => {
              setAnalysisController(null);
            });
        }}
        onCancelAnalysis={
          analysisController
            ? () => {
                analysisController.abort();
              }
            : undefined
        }
        onDismissAnalysisResult={
          lastRun !== null ? () => setLastRun(null) : undefined
        }
      />

      {/* Modals */}
      <CapacityDialog
        open={modals.capacityOpen}
        podName={pod.name}
        initial={pod.capacity}
        onClose={() => setModals((m) => ({ ...m, capacityOpen: false }))}
        onSave={(inputs: CapacityInputs) => updateCapacityAction(pod.id, inputs)}
        onRequestSuggestion={() => suggestCapacityAction(pod.id)}
      />

      <MetricsModal
        open={modals.metricsOpen}
        pod={pod}
        onClose={() => setModals((m) => ({ ...m, metricsOpen: false }))}
      />

      <EpicPickerWrapper
        open={modals.pickerOpen}
        pod={pod}
        onClose={() => setModals((m) => ({ ...m, pickerOpen: false }))}
      />

      <EpicWizard
        open={modals.createEpicOpen}
        mode={wizard.mode}
        podName={pod.name}
        epicTitle={wizard.epic?.title}
        onClose={() => setModals((m) => ({ ...m, createEpicOpen: false }))}
        onGenerate={(requirement) => {
          // Re-analyze seeds the pipeline with the epic's existing body plus the
          // planner's added direction; Create New uses the requirement as-is.
          const seed =
            wizard.mode === 'reanalyze' && wizard.epic
              ? `${wizard.epic.description}\n\nAdditional direction:\n${requirement}`
              : requirement;
          return generateEpicFromRequirement(seed, { title: wizard.epic?.title });
        }}
        onPublish={async (stories: SizedStory[], epicContent: string) => {
          const res =
            wizard.mode === 'reanalyze' && wizard.epic
              ? await publishReanalyzedEpicAction(pod.id, wizard.epic.id, stories, epicContent)
              : await publishGeneratedEpicAction(pod.id, stories, epicContent);
          return res.success ? { success: true } : { success: false, error: { message: res.error.message } };
        }}
      />
    </div>
  );
}

/**
 * EpicPickerWrapper — drives the EpicPicker by fetching candidate
 * epics from GitLab on open, then routing the planner's confirmation
 * through brpActions.confirmAddEpicsAction (B-29).
 *
 * Fetch happens once per open (not on every re-render). Errors are
 * captured into local state and surfaced as the picker's "empty"
 * variant with a hint — Phase B-39 adds a richer error surface.
 */
function EpicPickerWrapper({
  open,
  pod,
  onClose,
}: {
  open: boolean;
  pod: Pod;
  onClose: () => void;
}) {
  const [candidates, setCandidates] = useState<Epic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumping this counter re-triggers the fetch effect for Retry.
  const [retryNonce, setRetryNonce] = useState(0);

  const alreadyLoadedIds = useMemo(
    () => new Set(pod.epics.map((e) => e.id)),
    [pod.epics],
  );

  useEffect(() => {
    if (!open) {
      setCandidates([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listCandidateEpicsAction(pod.id)
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setCandidates(res.data);
        } else {
          setError(res.error.message);
          setCandidates([]);
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, pod.id, retryNonce]);

  if (!open) return null;

  const pickerState: 'ready' | 'loading' | 'error' = loading
    ? 'loading'
    : error
      ? 'error'
      : 'ready';

  return (
    <EpicPicker
      open={open}
      podName={pod.name}
      candidates={candidates}
      alreadyLoadedIds={alreadyLoadedIds}
      onClose={onClose}
      onConfirm={(chosen) => confirmAddEpicsAction(pod.id, chosen)}
      state={pickerState}
      errorMessage={error ?? undefined}
      onRetry={() => setRetryNonce((n) => n + 1)}
    />
  );
}
