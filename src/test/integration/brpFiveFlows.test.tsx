/**
 * BRP — five canonical flow integration tests (B-31, updated post-
 * Phase-2 quality remediation: pod sections + Open button replaced
 * the PodCard grid, and the epic table is now visible inline at the
 * portfolio level).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

vi.mock('@/services/brp/brpGitlabService', async () => {
  const actual = await vi.importActual<typeof import('@/services/brp/brpGitlabService')>(
    '@/services/brp/brpGitlabService',
  );
  return {
    ...actual,
    fetchCrews: vi.fn(),
    fetchPods: vi.fn(),
    fetchPodEpics: vi.fn(),
    fetchReferenceEpics: vi.fn(),
  };
});

vi.mock('@/services/brp/ai/estimatorProvider', () => ({
  getEstimator: vi.fn(),
}));

import { BrpView } from '@/components/brp/BrpView';
import {
  loadCrewsAction,
  loadPodsAction,
} from '@/services/brp/brpActions';
import {
  fetchCrews,
  fetchPods,
  fetchPodEpics,
  fetchReferenceEpics,
} from '@/services/brp/brpGitlabService';
import { getEstimator } from '@/services/brp/ai/estimatorProvider';
import { useBrpStore } from '@/stores/brpStore';
import { useConfigStore } from '@/stores/configStore';
import type { AIEstimator, AnalysisEvent } from '@/services/brp/ai/types';
import type { Crew, Epic, FrameResult, Pod, ReferenceEpic } from '@/domain/brp';

// ─── Fixtures ───────────────────────────────────────────────

const frameResult = (estimate: number, confidence = 0.7): FrameResult => ({
  frameEstimate: estimate as FrameResult['frameEstimate'],
  breakdown: [{ title: 'b', points: estimate as FrameResult['frameEstimate'] }],
  rationale: 'r',
  confidence,
  references: [],
  generatedStories: null,
  modelVersion: 'stub-1',
  analyzedAt: '2026-05-23T00:00:00Z',
});

const epic = (id: string, podId: string, overrides: Partial<Epic> = {}): Epic => ({
  id,
  iid: Number(id) || 0,
  title: `Epic ${id}`,
  description: 'a'.repeat(200),
  gitlabWebUrl: `https://gitlab/${id}`,
  podId,
  source: 'gitlab',
  humanEstimate: null,
  analysisStatus: 'raw',
  frameResult: null,
  ...overrides,
});

const pod = (id: string, name: string, subgroupId = 100): Pod => ({
  id,
  name,
  gitlabSubgroupId: subgroupId,
  capacity: {
    resources: 5,
    spPerResource: 10,
    sprintCount: 6,
    holidayDays: 2,
    leaveDays: 4,
  },
  epics: [],
});

const crew = (id: string, name: string, pods: Pod[] = [], gitlabGroupId = Number(id)): Crew => ({
  id,
  name,
  gitlabGroupId,
  pods,
});

function stubEstimator(): AIEstimator {
  return {
    async *analyzeEpic(
      e: Epic,
      _refs: readonly ReferenceEpic[],
    ): AsyncIterable<AnalysisEvent> {
      yield { kind: 'started', epicId: e.id };
      yield {
        kind: 'done',
        epicId: e.id,
        result: frameResult(5, 0.7),
      };
    },
  };
}

function resetAll() {
  useBrpStore.getState().reset();
  useConfigStore.setState((s) => ({
    config: {
      ...s.config,
      gitlab: {
        ...s.config.gitlab,
        enabled: true,
        baseUrl: 'https://gitlab.example/api/v4',
        accessToken: 'glpat-fake',
        rootGroupId: '999',
        defaultGroupId: '999',
      },
    },
  }));
  vi.mocked(fetchCrews).mockReset();
  vi.mocked(fetchPods).mockReset();
  vi.mocked(fetchPodEpics).mockReset();
  vi.mocked(fetchReferenceEpics).mockReset();
  vi.mocked(getEstimator).mockReset();
}

// ─── Tests ──────────────────────────────────────────────────

describe('BRP integration — Flow 1: load crews → pods → candidates → add', () => {
  beforeEach(resetAll);

  it('walks the full data-loading path and renders the resulting epics', async () => {
    vi.mocked(fetchCrews).mockResolvedValue({
      success: true,
      data: [crew('c1', 'Alpha')],
    });
    vi.mocked(fetchPods).mockResolvedValue({
      success: true,
      data: [pod('p1', 'Pod A', 200)],
    });
    vi.mocked(fetchPodEpics).mockResolvedValue({
      success: true,
      data: [epic('e1', 'p1'), epic('e2', 'p1')],
    });

    await act(async () => {
      await loadCrewsAction();
      await loadPodsAction('c1');
    });

    render(<BrpView />);
    expect(screen.getByTestId('brp-view').getAttribute('data-mode')).toBe('portfolio');
    // Pod sections + Open button replaced the pod card.
    expect(screen.getByTestId('portfolio-pod-section-p1')).toBeTruthy();

    fireEvent.click(screen.getByTestId('portfolio-pod-open-p1'));
    expect(screen.getByTestId('brp-view').getAttribute('data-mode')).toBe('pod');
    expect(screen.getByTestId('pod-view-empty-epics')).toBeTruthy();

    fireEvent.click(screen.getByTestId('pod-view-action-add-epics'));
    await waitFor(() => {
      expect(screen.getByTestId('epic-picker-row-e1')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('epic-picker-checkbox-e1'));
    fireEvent.click(screen.getByTestId('epic-picker-checkbox-e2'));
    fireEvent.click(screen.getByTestId('epic-picker-confirm'));

    await waitFor(() => {
      expect(screen.getByTestId('epic-row-e1')).toBeTruthy();
      expect(screen.getByTestId('epic-row-e2')).toBeTruthy();
    });
  });
});

describe('BRP integration — Flow 2: capacity dialog updates metrics', () => {
  beforeEach(resetAll);

  it('saving CapacityDialog updates the metrics strip live', () => {
    useBrpStore.getState().loadCrew(crew('c1', 'C', [pod('p1', 'P', 100)]));
    act(() => {
      useBrpStore.getState().selectPod('p1');
    });
    render(<BrpView />);
    expect(screen.getByTestId('pod-view-capacity').textContent).toBe('286');

    fireEvent.click(screen.getByTestId('pod-view-action-capacity'));
    fireEvent.change(screen.getByTestId('capacity-input-resources'), {
      target: { value: '10' },
    });
    fireEvent.click(screen.getByTestId('capacity-dialog-save'));
    expect(screen.getByTestId('pod-view-capacity').textContent).toBe('576');
  });
});

describe('BRP integration — Flow 3: inline human estimate updates variance band', () => {
  beforeEach(resetAll);

  it('changing human estimate re-derives the variance band live', () => {
    const e = epic('e1', 'p1', {
      humanEstimate: 5,
      frameResult: frameResult(5, 0.8),
      analysisStatus: 'done',
    });
    const p = { ...pod('p1', 'P'), epics: [e] };
    useBrpStore.getState().loadCrew(crew('c1', 'C', [p]));
    act(() => {
      useBrpStore.getState().selectPod('p1');
    });

    render(<BrpView />);
    expect(screen.getByTestId('variance-badge').getAttribute('data-variance')).toBe('agree');

    const input = screen.getByTestId('epic-row-human-e1') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.blur(input);

    expect(screen.getByTestId('variance-badge').getAttribute('data-variance')).toBe('re-groom');
  });
});

describe('BRP integration — Flow 4: run analysis end-to-end', () => {
  beforeEach(resetAll);

  it('Run analysis populates frameResult on every epic and shows the success banner', async () => {
    vi.mocked(getEstimator).mockReturnValue(stubEstimator());
    vi.mocked(fetchReferenceEpics).mockResolvedValue({ success: true, data: [] });

    const p = { ...pod('p1', 'P'), epics: [epic('e1', 'p1'), epic('e2', 'p1')] };
    useBrpStore.getState().loadCrew(crew('c1', 'C', [p]));
    act(() => {
      useBrpStore.getState().selectPod('p1');
    });
    render(<BrpView />);

    fireEvent.click(screen.getByTestId('pod-view-action-analyze'));
    await waitFor(() => {
      expect(screen.getByTestId('analysis-progress-success')).toBeTruthy();
    });
    const epics = useBrpStore.getState().crews[0]?.pods[0]?.epics ?? [];
    expect(epics.every((e) => e.frameResult !== null)).toBe(true);
  });
});

describe('BRP integration — Flow 5: portfolio ↔ pod navigation', () => {
  beforeEach(resetAll);

  it('clicking a portfolio pod Open button enters PodView; Back returns to Portfolio', () => {
    useBrpStore.getState().loadCrew(
      crew('c1', 'C', [pod('p1', 'Pod A'), pod('p2', 'Pod B')]),
    );
    render(<BrpView />);

    expect(screen.getByTestId('brp-view').getAttribute('data-mode')).toBe('portfolio');
    fireEvent.click(screen.getByTestId('portfolio-pod-open-p2'));
    expect(screen.getByTestId('brp-view').getAttribute('data-mode')).toBe('pod');
    expect(screen.getByTestId('pod-view-title').textContent).toBe('Pod B');

    fireEvent.click(screen.getByTestId('pod-view-back'));
    expect(screen.getByTestId('brp-view').getAttribute('data-mode')).toBe('portfolio');
    expect(useBrpStore.getState().selectedPodId).toBeNull();
  });
});
