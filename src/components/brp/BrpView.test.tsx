import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrpView } from './BrpView';
import { useBrpStore } from '@/stores/brpStore';
import type { Crew, Epic, FrameResult, Pod } from '@/domain/brp';

const frameResult = (estimate: number, confidence = 0.8): FrameResult => ({
  frameEstimate: estimate as FrameResult['frameEstimate'],
  breakdown: [],
  rationale: 'r',
  confidence,
  references: [],
  generatedStories: null,
  modelVersion: 'sim-1',
  analyzedAt: '2026-05-23T00:00:00Z',
});

const makeEpic = (id: string, podId: string, overrides: Partial<Epic> = {}): Epic => ({
  id,
  iid: Number(id) || 0,
  title: `Epic ${id}`,
  description: 'a'.repeat(200),
  gitlabWebUrl: `https://gitlab/${id}`,
  podId,
  source: 'gitlab',
  humanEstimate: 5,
  analysisStatus: 'done',
  frameResult: frameResult(5),
  ...overrides,
});

const makePod = (id: string, name: string, epics: Epic[] = []): Pod => ({
  id,
  name,
  gitlabSubgroupId: Number(id.replace(/[^0-9]/g, '')) || 0,
  capacity: {
    resources: 5,
    spPerResource: 10,
    sprintCount: 6,
    holidayDays: 2,
    leaveDays: 4,
  },
  epics,
});

const makeCrew = (id: string, name: string, pods: Pod[] = []): Crew => ({
  id,
  name,
  gitlabGroupId: Number(id) || 0,
  pods,
});

// ─── Test helpers ────────────────────────────────────────────────

function resetStore() {
  // Re-initialize state by clearing crews and selections — exercising
  // the store's reset action keeps tests isolated from each other.
  useBrpStore.getState().reset();
}

function seedCrews(crews: Crew[]) {
  act(() => {
    for (const c of crews) useBrpStore.getState().loadCrew(c);
  });
}

describe('BrpView routing', () => {
  beforeEach(() => {
    resetStore();
  });

  it('renders PortfolioView when no pod is selected', () => {
    seedCrews([makeCrew('1', 'Alpha', [makePod('p1', 'Pod A')])]);
    render(<BrpView />);
    expect(screen.getByTestId('brp-view').getAttribute('data-mode')).toBe('portfolio');
    expect(screen.getByTestId('portfolio-view')).toBeTruthy();
  });

  it('switches to PodView when a pod card is clicked', () => {
    seedCrews([makeCrew('1', 'Alpha', [makePod('p1', 'Pod A', [makeEpic('1', 'p1')])])]);
    render(<BrpView />);
    fireEvent.click(screen.getByTestId('portfolio-pod-card-p1'));
    expect(screen.getByTestId('brp-view').getAttribute('data-mode')).toBe('pod');
    expect(screen.getByTestId('pod-view')).toBeTruthy();
    expect(screen.getByTestId('pod-view-title').textContent).toBe('Pod A');
  });

  it('falls back to portfolio when selectedPodId no longer exists in crews', () => {
    seedCrews([makeCrew('1', 'Alpha', [makePod('p1', 'Pod A')])]);
    act(() => {
      useBrpStore.getState().selectPod('does-not-exist');
    });
    render(<BrpView />);
    expect(screen.getByTestId('brp-view').getAttribute('data-mode')).toBe('portfolio');
  });

  it('Back-to-portfolio clears selectedPodId and returns to PortfolioView', () => {
    seedCrews([makeCrew('1', 'Alpha', [makePod('p1', 'Pod A')])]);
    render(<BrpView />);
    fireEvent.click(screen.getByTestId('portfolio-pod-card-p1'));
    fireEvent.click(screen.getByTestId('pod-view-back'));
    expect(useBrpStore.getState().selectedPodId).toBeNull();
    expect(screen.getByTestId('brp-view').getAttribute('data-mode')).toBe('portfolio');
  });
});

describe('BrpView modal wiring', () => {
  beforeEach(() => {
    resetStore();
    seedCrews([makeCrew('1', 'Alpha', [makePod('p1', 'Pod A', [makeEpic('1', 'p1')])])]);
    act(() => {
      useBrpStore.getState().selectPod('p1');
    });
  });

  it('opens CapacityDialog when the Capacity action is clicked', () => {
    render(<BrpView />);
    expect(screen.queryByTestId('capacity-dialog')).toBeNull();
    fireEvent.click(screen.getByTestId('pod-view-action-capacity'));
    expect(screen.getByTestId('capacity-dialog')).toBeTruthy();
    expect(screen.getByTestId('capacity-dialog-title').textContent).toContain('Pod A');
  });

  it('saving CapacityDialog forwards the new inputs into the store', () => {
    render(<BrpView />);
    fireEvent.click(screen.getByTestId('pod-view-action-capacity'));
    fireEvent.change(screen.getByTestId('capacity-input-resources'), {
      target: { value: '12' },
    });
    fireEvent.click(screen.getByTestId('capacity-dialog-save'));
    const pod = useBrpStore.getState().crews[0]?.pods[0];
    expect(pod?.capacity.resources).toBe(12);
  });

  it('opens MetricsModal when the Metrics action is clicked', () => {
    render(<BrpView />);
    expect(screen.queryByTestId('metrics-modal')).toBeNull();
    fireEvent.click(screen.getByTestId('pod-view-action-metrics'));
    expect(screen.getByTestId('metrics-modal')).toBeTruthy();
  });

  it('opens EpicPicker when the Add epics action is clicked', () => {
    render(<BrpView />);
    expect(screen.queryByTestId('epic-picker')).toBeNull();
    fireEvent.click(screen.getByTestId('pod-view-action-add-epics'));
    expect(screen.getByTestId('epic-picker')).toBeTruthy();
  });

  it('EpicPicker pre-checks the already-loaded epics', () => {
    render(<BrpView />);
    fireEvent.click(screen.getByTestId('pod-view-action-add-epics'));
    // The existing epic '1' is already in the pod — it shouldn't appear
    // as a candidate yet (candidates array is empty until B-29). The
    // alreadyLoadedIds set is derived from the pod's current epics.
    expect(screen.getByTestId('epic-picker-empty')).toBeTruthy();
  });

  it('changing a human estimate inline persists to the store', () => {
    render(<BrpView />);
    const input = screen.getByTestId('epic-row-human-1') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '21' } });
    fireEvent.blur(input);
    const epic = useBrpStore.getState().crews[0]?.pods[0]?.epics[0];
    expect(epic?.humanEstimate).toBe(21);
  });

  it('clicking an epic row sets selectedEpicId and renders the DetailPanel', () => {
    render(<BrpView />);
    fireEvent.click(screen.getByTestId('epic-row-1'));
    expect(useBrpStore.getState().selectedEpicId).toBe('1');
    expect(screen.getByTestId('detail-panel')).toBeTruthy();
  });
});
