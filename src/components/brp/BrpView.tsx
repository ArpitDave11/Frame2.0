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

import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useBrpStore } from '@/stores/brpStore';
import type { CapacityInputs, Crew, Epic, Pod } from '@/domain/brp';
import { PortfolioView } from './PortfolioView';
import { PodView } from './PodView';
import { CapacityDialog } from './CapacityDialog';
import { MetricsModal } from './MetricsModal';
import { EpicPicker } from './EpicPicker';
import { color, font, fontSize } from '@/theme/tokens';

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

  // ─── Local UI state (modal flags). ──────────────────────────────────
  const [modals, setModals] = useState<ModalState>(INITIAL_MODAL_STATE);
  const closeAllModals = () => setModals(INITIAL_MODAL_STATE);

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
  const failures: { epicId: string; message: string }[] = []; // populated by action layer in B-30

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
        analysisFailures={failures}
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
          // Real wiring lands in B-30 via brpActions. For now this is
          // a no-op placeholder; the button stays interactive so the
          // test for B-26 still passes. Surface a console hint so
          // developers know the wiring isn't there yet.
          // eslint-disable-next-line no-console
          console.info('[BrpView] Run analysis is wired in B-30 (brpActions.runAnalysisFlow).');
        }}
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
 * EpicPickerWrapper — placeholder that opens the picker with an empty
 * candidate list. B-29 will replace this with a wrapper that calls
 * `brpGitlabService.fetchPodEpics(pod.gitlabSubgroupId, …)` on mount
 * and feeds the result in. For now the picker just opens and shows
 * its empty state so the modal plumbing is testable end-to-end.
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
  const loadEpicsIntoPod = useBrpStore((s) => s.loadEpicsIntoPod);
  const candidates: Epic[] = []; // populated by B-29
  const alreadyLoadedIds = useMemo(
    () => new Set(pod.epics.map((e) => e.id)),
    [pod.epics],
  );

  if (!open) return null;

  return (
    <EpicPicker
      open={open}
      podName={pod.name}
      candidates={candidates}
      alreadyLoadedIds={alreadyLoadedIds}
      onClose={onClose}
      onConfirm={(chosen) => loadEpicsIntoPod(pod.id, chosen)}
    />
  );
}

/**
 * Inline marker used by older diagnostics — exported so accidental
 * re-removal during edits still surfaces as a TS error.
 */
export const _brpViewTokens = {
  font: font.sans,
  fontSize: fontSize.sm,
  color: color.grayV,
} as const;
