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
  listCandidateEpicsAction,
  runAnalysisForPodAction,
} from '@/services/brp/brpActions';
import type { AnalysisFailure } from '@/services/brp/brpActions';
import { font } from '@/theme/tokens';

interface ModalState {
  capacityOpen: boolean;
  metricsOpen: boolean;
  pickerOpen: boolean;
}

const INITIAL_MODAL_STATE: ModalState = {
  capacityOpen: false,
  metricsOpen: false,
  pickerOpen: false,
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
  } = useBrpStore(
    useShallow((s) => ({
      crews: s.crews,
      selectedCrewId: s.selectedCrewId,
      selectedPodId: s.selectedPodId,
      selectedEpicId: s.selectedEpicId,
      analysisStatus: s.analysisStatus,
      analysisProgress: s.analysisProgress,
    })),
  );

  // Mutating actions — grabbed individually so referential identity is
  // stable across renders (zustand returns the same fn every time).
  const selectCrew = useBrpStore((s) => s.selectCrew);
  const selectPod = useBrpStore((s) => s.selectPod);
  const selectEpic = useBrpStore((s) => s.selectEpic);
  const updatePodCapacity = useBrpStore((s) => s.updatePodCapacity);
  const setHumanEstimate = useBrpStore((s) => s.setHumanEstimate);

  // ─── Local UI state (modal flags + analysis failures). ─────────────
  const [modals, setModals] = useState<ModalState>(INITIAL_MODAL_STATE);
  const closeAllModals = () => setModals(INITIAL_MODAL_STATE);
  // failures from the most recent runAnalysisAction. Cleared on each
  // new run; kept after completion so the AnalysisProgress banner can
  // render the partial-failure summary until the planner dismisses it.
  const [analysisFailures, setAnalysisFailures] = useState<AnalysisFailure[]>([]);
  // AbortController for the in-flight analysis run, so Cancel works.
  const [analysisController, setAnalysisController] = useState<AbortController | null>(null);

  const { pod, crew } = useMemo(
    () => findPod(crews, selectedPodId),
    [crews, selectedPodId],
  );

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
        analysisCompleted={analysisProgress?.completed ?? 0}
        analysisTotal={analysisProgress?.total ?? 0}
        analysisCurrentEpicTitle={
          analysisProgress?.currentEpicId
            ? pod.epics.find((e) => e.id === analysisProgress.currentEpicId)?.title ?? null
            : null
        }
        analysisFailures={analysisFailures}
        onBackToPortfolio={() => {
          selectPod(null);
          selectEpic(null);
          closeAllModals();
        }}
        onSelectEpic={selectEpic}
        onHumanEstimateChange={setHumanEstimate}
        onOpenCapacityDialog={() => setModals((m) => ({ ...m, capacityOpen: true }))}
        onOpenMetricsModal={() => setModals((m) => ({ ...m, metricsOpen: true }))}
        onOpenEpicPicker={() => setModals((m) => ({ ...m, pickerOpen: true }))}
        onRunAnalysis={() => {
          const controller = new AbortController();
          setAnalysisController(controller);
          setAnalysisFailures([]);
          runAnalysisForPodAction(pod.id, { signal: controller.signal })
            .then((result) => {
              setAnalysisFailures(result.failures);
            })
            .catch((e: unknown) => {
              setAnalysisFailures([
                {
                  epicId: '<run>',
                  message: e instanceof Error ? e.message : String(e),
                },
              ]);
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
          analysisFailures.length > 0
            ? () => setAnalysisFailures([])
            : undefined
        }
      />

      {/* Modals */}
      <CapacityDialog
        open={modals.capacityOpen}
        podName={pod.name}
        initial={pod.capacity}
        onClose={() => setModals((m) => ({ ...m, capacityOpen: false }))}
        onSave={(inputs: CapacityInputs) => updatePodCapacity(pod.id, inputs)}
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

  const alreadyLoadedIds = useMemo(
    () => new Set(pod.epics.map((e) => e.id)),
    [pod.epics],
  );

  // Fetch candidates each time the picker opens for this pod. Reset
  // when it closes so a stale list doesn't appear on the next open.
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
  }, [open, pod.id]);

  if (!open) return null;

  // While loading or after an error, render the picker with an empty
  // candidate list. The picker's empty-state copy explains there's
  // nothing to add; a future task (B-39) injects loading/error variants.
  if (loading || error) {
    return (
      <EpicPicker
        open={open}
        podName={pod.name}
        candidates={[]}
        alreadyLoadedIds={alreadyLoadedIds}
        onClose={onClose}
        onConfirm={() => onClose()}
      />
    );
  }

  return (
    <EpicPicker
      open={open}
      podName={pod.name}
      candidates={candidates}
      alreadyLoadedIds={alreadyLoadedIds}
      onClose={onClose}
      onConfirm={(chosen) => confirmAddEpicsAction(pod.id, chosen)}
    />
  );
}
