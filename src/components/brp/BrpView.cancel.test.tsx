/**
 * B-32 C4 — cancel/unmount tests for BrpView's analysis flow.
 *
 * Kept in a separate file (rather than appended to BrpView.test.tsx)
 * because the test-file pre-edit hook blocks edits to existing tests.
 * New-file additions are allowed.
 *
 * Covers:
 *   - C1: cancelling mid-run does NOT show a success banner
 *   - C3: navigating away mid-run aborts the controller (cleanup runs)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

vi.mock('@/services/brp/brpGitlabService', async () => {
  const actual = await vi.importActual<typeof import('@/services/brp/brpGitlabService')>(
    '@/services/brp/brpGitlabService',
  );
  return {
    ...actual,
    fetchReferenceEpics: vi.fn(),
  };
});

vi.mock('@/services/brp/ai/estimatorProvider', () => ({
  getEstimator: vi.fn(),
}));

import { BrpView } from './BrpView';
import { fetchReferenceEpics } from '@/services/brp/brpGitlabService';
import { getEstimator } from '@/services/brp/ai/estimatorProvider';
import { useBrpStore } from '@/stores/brpStore';
import { useConfigStore } from '@/stores/configStore';
import type { AIEstimator, AnalysisEvent } from '@/services/brp/ai/types';
import type { Crew, Epic, FrameResult, Pod, ReferenceEpic } from '@/domain/brp';

const frameResult = (estimate: number): FrameResult => ({
  frameEstimate: estimate as FrameResult['frameEstimate'],
  breakdown: [],
  rationale: 'r',
  confidence: 0.7,
  references: [],
  generatedStories: null,
  modelVersion: 'stub',
  analyzedAt: '2026-05-23T00:00:00Z',
});

const epic = (id: string, podId: string): Epic => ({
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
});

const pod = (id: string, name: string, epics: Epic[] = []): Pod => ({
  id,
  name,
  gitlabSubgroupId: Number(id.replace(/\D/g, '')) || 0,
  capacity: {
    resources: 5,
    spPerResource: 10,
    sprintCount: 6,
    holidayDays: 2,
    leaveDays: 4,
  },
  epics: epics.map((e) => ({ ...e, podId: id })),
});

const crew = (id: string, name: string, pods: Pod[] = []): Crew => ({
  id,
  name,
  gitlabGroupId: Number(id) || 0,
  pods,
});

/**
 * Estimator that holds each epic in 'analyzing' state until a resolver
 * is called. Lets tests pause mid-run, abort, then unblock and confirm
 * the abort took effect.
 */
function pausingEstimator(): {
  estimator: AIEstimator;
  release: () => void;
  // Map of epicId → number of times analyzeEpic was entered.
  callsByEpic: Map<string, number>;
} {
  const callsByEpic = new Map<string, number>();
  let resolveCurrent: (() => void) | null = null;
  return {
    callsByEpic,
    release: () => {
      resolveCurrent?.();
      resolveCurrent = null;
    },
    estimator: {
      async *analyzeEpic(
        e: Epic,
        _refs: readonly ReferenceEpic[],
        signal?: AbortSignal,
      ): AsyncIterable<AnalysisEvent> {
        callsByEpic.set(e.id, (callsByEpic.get(e.id) ?? 0) + 1);
        yield { kind: 'started', epicId: e.id };
        await new Promise<void>((resolve, reject) => {
          resolveCurrent = resolve;
          signal?.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'AbortError'));
          });
        });
        yield { kind: 'done', epicId: e.id, result: frameResult(5) };
      },
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
  vi.mocked(fetchReferenceEpics).mockReset();
  vi.mocked(getEstimator).mockReset();
  vi.mocked(fetchReferenceEpics).mockResolvedValue({ success: true, data: [] });
}

describe('BrpView analysis cancel (B-32 C1/C4)', () => {
  beforeEach(resetAll);

  it('cancelling mid-run does NOT render a success banner', async () => {
    const { estimator } = pausingEstimator();
    vi.mocked(getEstimator).mockReturnValue(estimator);

    const p = pod('p1', 'P', [epic('e1', 'p1'), epic('e2', 'p1')]);
    useBrpStore.getState().loadCrew(crew('c1', 'C', [p]));
    act(() => {
      useBrpStore.getState().selectPod('p1');
    });
    render(<BrpView />);

    fireEvent.click(screen.getByTestId('pod-view-action-analyze'));
    // Running banner appears once the store flips analysisStatus.
    await waitFor(() => {
      expect(screen.getByTestId('analysis-progress-running')).toBeTruthy();
    });
    // Cancel.
    fireEvent.click(screen.getByTestId('analysis-progress-cancel'));
    // The run resolves to {aborted: true} → BrpView keeps lastRun=null
    // → AnalysisProgress returns null (no banner).
    await waitFor(() => {
      expect(screen.queryByTestId('analysis-progress-running')).toBeNull();
    });
    expect(screen.queryByTestId('analysis-progress-success')).toBeNull();
    expect(screen.queryByTestId('analysis-progress-partial')).toBeNull();
  });
});

describe('BrpView unmount cleanup (B-32 C3)', () => {
  beforeEach(resetAll);

  it('unmounting mid-run aborts the controller and stops processing further epics', async () => {
    const { estimator, callsByEpic, release } = pausingEstimator();
    vi.mocked(getEstimator).mockReturnValue(estimator);

    const p = pod('p1', 'P', [epic('e1', 'p1'), epic('e2', 'p1'), epic('e3', 'p1')]);
    useBrpStore.getState().loadCrew(crew('c1', 'C', [p]));
    act(() => {
      useBrpStore.getState().selectPod('p1');
    });
    const { unmount } = render(<BrpView />);

    fireEvent.click(screen.getByTestId('pod-view-action-analyze'));
    await waitFor(() => {
      expect(screen.getByTestId('analysis-progress-running')).toBeTruthy();
    });
    // First epic should be in flight by now.
    expect(callsByEpic.get('e1')).toBe(1);
    expect(callsByEpic.has('e2')).toBe(false);

    // Unmount mid-run. The useEffect cleanup must abort the controller,
    // which causes the store's runAnalysis loop to break out before
    // calling analyzeEpic('e2').
    unmount();
    // Release the suspended estimator so the abort signal can land
    // (the AbortError causes the for-await to throw out).
    release();
    // Give the abort signal a tick to propagate.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(callsByEpic.has('e2')).toBe(false);
    expect(callsByEpic.has('e3')).toBe(false);
  });
});

describe('runAnalysis pod scoping (B-32 C2)', () => {
  beforeEach(resetAll);

  it('Run analysis on PodView only touches THIS pod\'s epics, not other pods', async () => {
    const seenEpicIds: string[] = [];
    vi.mocked(getEstimator).mockReturnValue({
      async *analyzeEpic(e: Epic): AsyncIterable<AnalysisEvent> {
        seenEpicIds.push(e.id);
        yield { kind: 'started', epicId: e.id };
        yield { kind: 'done', epicId: e.id, result: frameResult(5) };
      },
    });
    const p1 = pod('p1', 'Pod A', [epic('a1', 'p1'), epic('a2', 'p1')]);
    const p2 = pod('p2', 'Pod B', [epic('b1', 'p2')]);
    useBrpStore.getState().loadCrew(crew('c1', 'C', [p1, p2]));
    act(() => {
      useBrpStore.getState().selectPod('p1');
    });
    render(<BrpView />);

    fireEvent.click(screen.getByTestId('pod-view-action-analyze'));
    await waitFor(() => {
      expect(screen.getByTestId('analysis-progress-success')).toBeTruthy();
    });
    // Only p1's epics should have been analyzed.
    expect(seenEpicIds.sort()).toEqual(['a1', 'a2']);
    // p2.b1 untouched (frameResult still null).
    expect(
      useBrpStore.getState().crews[0]?.pods[1]?.epics[0]?.frameResult,
    ).toBeNull();
  });
});

describe('DetailPanel href safety (B-32 I4)', () => {
  beforeEach(resetAll);

  it('neuters a javascript: URL in epic.gitlabWebUrl', () => {
    const malicious = {
      ...epic('e1', 'p1'),
      gitlabWebUrl: 'javascript:alert(1)',
      description: 'a'.repeat(200),
      humanEstimate: 5,
      frameResult: frameResult(5),
      analysisStatus: 'done' as const,
    };
    const p = { ...pod('p1', 'P'), epics: [malicious] };
    useBrpStore.getState().loadCrew(crew('c1', 'C', [p]));
    act(() => {
      useBrpStore.getState().selectPod('p1');
      useBrpStore.getState().selectEpic('e1');
    });
    render(<BrpView />);
    const link = screen.getByTestId('detail-panel-gitlab-link') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('#');
  });
});
