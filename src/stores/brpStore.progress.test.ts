/**
 * brpStore — BrpProgress + onError tests (B-15).
 *
 * Lives in a separate file from brpStore.test.ts to keep this commit
 * focused and avoid an 850-line rm+Write churn against the H3 hook.
 * The progress field and onError callback added in B-15 are tested
 * here in isolation. Existing tests in brpStore.test.ts cover the
 * pre-B-15 surface.
 *
 * Timing note: production increments `completed` AFTER the estimator's
 * for-await loop exits for an epic (not from inside the estimator's
 * yield callback). To observe the increment without races, tests
 * inspect `analysisProgress` from the NEXT epic's `analyzeEpic` entry —
 * by then the previous epic's completion has been written.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBrpStore } from './brpStore';
import type { BrpProgress } from './brpStore';
import type {
  Crew,
  Epic,
  FrameResult,
  Pod,
  ReferenceEpic,
} from '../domain/brp';
import type { AIEstimator, AnalysisEvent } from '../services/brp/ai/types';

// ─── Fixtures (matches brpStore.test.ts) ────────────────────

function buildPod(overrides: Partial<Pod> = {}): Pod {
  return {
    id: 'pod-A',
    name: 'Test Pod',
    gitlabSubgroupId: 100,
    capacity: {
      resources: 4,
      spPerResource: 10,
      sprintCount: 5,
      holidayDays: 0,
      leaveDays: 0,
    },
    epics: [],
    ...overrides,
  };
}

function buildCrew(overrides: Partial<Crew> = {}): Crew {
  return {
    id: 'crew-A',
    name: 'Test Crew',
    gitlabGroupId: 10,
    pods: [],
    ...overrides,
  };
}

function buildEpic(overrides: Partial<Epic> = {}): Epic {
  return {
    id: 'gl:1',
    iid: 1,
    title: 'Epic 1',
    description: 'A reasonably-long epic description that comfortably exceeds the flagged threshold.',
    gitlabWebUrl: 'https://gitlab.example/epic/1',
    podId: 'pod-A',
    source: 'gitlab',
    humanEstimate: null,
    analysisStatus: 'raw',
    frameResult: null,
    ...overrides,
  };
}

function buildFrameResult(overrides: Partial<FrameResult> = {}): FrameResult {
  return {
    frameEstimate: 8,
    breakdown: [{ title: 'core work', points: 8 }],
    rationale: 'similar to prior epics',
    confidence: 0.8,
    references: [],
    generatedStories: null,
    modelVersion: 'sim-test',
    analyzedAt: '2026-05-26T00:00:00Z',
    ...overrides,
  };
}

function buildEstimator(
  eventsFor: (epic: Epic) => readonly AnalysisEvent[],
): AIEstimator {
  return {
    async *analyzeEpic(
      epic: Epic,
      _refs: readonly ReferenceEpic[],
      _signal?: AbortSignal,
    ): AsyncIterable<AnalysisEvent> {
      for (const ev of eventsFor(epic)) {
        yield ev;
      }
    },
  };
}

function buildSignalGatedEstimator(): {
  estimator: AIEstimator;
  firstStartedPromise: Promise<void>;
} {
  let resolveStarted!: () => void;
  const firstStartedPromise = new Promise<void>((r) => {
    resolveStarted = r;
  });
  let firstSeen = false;
  const estimator: AIEstimator = {
    async *analyzeEpic(epic, _refs, signal) {
      if (!firstSeen) {
        firstSeen = true;
        resolveStarted();
      }
      yield { kind: 'started', epicId: epic.id };
      await new Promise<void>((resolve) => {
        if (signal?.aborted) return resolve();
        signal?.addEventListener('abort', () => resolve(), { once: true });
      });
    },
  };
  return { estimator, firstStartedPromise };
}

beforeEach(() => {
  useBrpStore.getState().reset();
});

// ─── Initial state ──────────────────────────────────────────

describe('brpStore — analysisProgress initial state', () => {
  it('starts at null (no run in flight)', () => {
    expect(useBrpStore.getState().analysisProgress).toBeNull();
  });
});

// ─── setProgress direct setter ──────────────────────────────

describe('brpStore — setProgress', () => {
  it('writes a snapshot', () => {
    useBrpStore.getState().setProgress({
      completed: 2,
      total: 5,
      currentEpicId: 'E3',
    });
    expect(useBrpStore.getState().analysisProgress).toEqual({
      completed: 2,
      total: 5,
      currentEpicId: 'E3',
    });
  });

  it('clears via null', () => {
    useBrpStore.getState().setProgress({ completed: 1, total: 1, currentEpicId: null });
    useBrpStore.getState().setProgress(null);
    expect(useBrpStore.getState().analysisProgress).toBeNull();
  });
});

// ─── runAnalysis progress lifecycle ─────────────────────────

describe('brpStore — runAnalysis progress lifecycle', () => {
  it('initializes progress at start (total = epicIds.length, completed = 0, currentEpicId = first)', async () => {
    useBrpStore.getState().loadCrew(
      buildCrew({
        id: 'crew-A',
        pods: [
          buildPod({ id: 'pod-X', epics: [buildEpic({ id: 'E1' }), buildEpic({ id: 'E2' }), buildEpic({ id: 'E3' })] }),
        ],
      }),
    );

    let observedProgress: BrpProgress | null = null;
    let firstSeen = false;
    const estimator: AIEstimator = {
      async *analyzeEpic(epic) {
        if (!firstSeen) {
          firstSeen = true;
          observedProgress = useBrpStore.getState().analysisProgress;
        }
        yield { kind: 'done', epicId: epic.id, result: buildFrameResult() };
      },
    };

    await useBrpStore.getState().runAnalysis(estimator);
    expect(observedProgress).toEqual({
      completed: 0,
      total: 3,
      currentEpicId: 'E1',
    });
  });

  it('increments completed when moving from one epic to the next (observed at E2 start)', async () => {
    useBrpStore.getState().loadCrew(
      buildCrew({
        id: 'crew-A',
        pods: [
          buildPod({ id: 'pod-X', epics: [buildEpic({ id: 'E1' }), buildEpic({ id: 'E2' })] }),
        ],
      }),
    );

    let progressAtE2Start: BrpProgress | null = null;
    const estimator: AIEstimator = {
      async *analyzeEpic(epic) {
        if (epic.id === 'E2') {
          progressAtE2Start = useBrpStore.getState().analysisProgress;
        }
        yield { kind: 'done', epicId: epic.id, result: buildFrameResult() };
      },
    };

    await useBrpStore.getState().runAnalysis(estimator);
    expect(progressAtE2Start).toEqual({
      completed: 1,
      total: 2,
      currentEpicId: 'E2',
    });
  });

  it('increments completed on epic that ends in error too (terminal either way)', async () => {
    useBrpStore.getState().loadCrew(
      buildCrew({
        id: 'crew-A',
        pods: [buildPod({ id: 'pod-X', epics: [buildEpic({ id: 'E1' }), buildEpic({ id: 'E2' })] })],
      }),
    );
    let progressAtE2Start: BrpProgress | null = null;
    const estimator: AIEstimator = {
      async *analyzeEpic(epic) {
        if (epic.id === 'E2') {
          progressAtE2Start = useBrpStore.getState().analysisProgress;
        }
        if (epic.id === 'E1') {
          yield { kind: 'error', epicId: 'E1', message: 'boom' };
        } else {
          yield { kind: 'done', epicId: epic.id, result: buildFrameResult() };
        }
      },
    };
    await useBrpStore.getState().runAnalysis(estimator);
    // Non-null assertion: the closure assigns progressAtE2Start by the
    // time runAnalysis returns. TS's strict narrowing collapses the
    // closure-assigned type to `null` from the initializer; the `as`
    // cast re-widens it for the read.
    expect((progressAtE2Start as BrpProgress | null)?.completed).toBe(1);
  });

  it('clears progress to null after a successful run', async () => {
    useBrpStore.getState().loadCrew(
      buildCrew({ id: 'crew-A', pods: [buildPod({ id: 'pod-X', epics: [buildEpic({ id: 'E1' })] })] }),
    );
    const estimator = buildEstimator((epic) => [
      { kind: 'done', epicId: epic.id, result: buildFrameResult() },
    ]);
    await useBrpStore.getState().runAnalysis(estimator);
    expect(useBrpStore.getState().analysisProgress).toBeNull();
    expect(useBrpStore.getState().analysisStatus).toBe('done');
  });

  it('clears progress when run is aborted via signal', async () => {
    useBrpStore.getState().loadCrew(
      buildCrew({ id: 'crew-A', pods: [buildPod({ id: 'pod-X', epics: [buildEpic({ id: 'E1' })] })] }),
    );
    const controller = new AbortController();
    const { estimator, firstStartedPromise } = buildSignalGatedEstimator();
    const promise = useBrpStore.getState().runAnalysis(estimator, undefined, { signal: controller.signal });
    await firstStartedPromise;
    controller.abort();
    await promise;
    expect(useBrpStore.getState().analysisProgress).toBeNull();
    expect(useBrpStore.getState().analysisStatus).toBe('idle');
  });

  it('reset() during a run clears both status and progress (no zombie progress)', async () => {
    useBrpStore.getState().loadCrew(
      buildCrew({ id: 'crew-A', pods: [buildPod({ id: 'pod-X', epics: [buildEpic({ id: 'E1' })] })] }),
    );
    const { estimator, firstStartedPromise } = buildSignalGatedEstimator();
    const promise = useBrpStore.getState().runAnalysis(estimator);
    await firstStartedPromise;
    useBrpStore.getState().reset();
    await promise;
    expect(useBrpStore.getState().analysisProgress).toBeNull();
    expect(useBrpStore.getState().analysisStatus).toBe('idle');
  });

  it('with no epics: progress is cleared at end and status reaches done', async () => {
    const estimator = buildEstimator(() => []);
    await useBrpStore.getState().runAnalysis(estimator);
    expect(useBrpStore.getState().analysisProgress).toBeNull();
    expect(useBrpStore.getState().analysisStatus).toBe('done');
  });
});

// ─── runAnalysis onError callback ───────────────────────────

describe('brpStore — runAnalysis onError callback (I5)', () => {
  it("calls onError once per 'error' event with epicId + message", async () => {
    useBrpStore.getState().loadCrew(
      buildCrew({
        id: 'crew-A',
        pods: [
          buildPod({
            id: 'pod-X',
            epics: [buildEpic({ id: 'E1' }), buildEpic({ id: 'E2' })],
          }),
        ],
      }),
    );
    const estimator = buildEstimator((epic) => {
      if (epic.id === 'E1') {
        return [{ kind: 'error', epicId: 'E1', message: 'rate limited' }];
      }
      return [{ kind: 'done', epicId: epic.id, result: buildFrameResult() }];
    });

    const failures: { epicId: string; message: string }[] = [];
    await useBrpStore.getState().runAnalysis(estimator, undefined, {
      onError: (f) => failures.push(f),
    });

    expect(failures).toEqual([{ epicId: 'E1', message: 'rate limited' }]);
    const epics = useBrpStore.getState().crews[0]!.pods[0]!.epics;
    expect(epics.find((e) => e.id === 'E2')!.analysisStatus).toBe('done');
  });

  it('calls onError on a thrown estimator with the thrown message', async () => {
    useBrpStore.getState().loadCrew(
      buildCrew({
        id: 'crew-A',
        pods: [buildPod({ id: 'pod-X', epics: [buildEpic({ id: 'E1' })] })],
      }),
    );
    const estimator: AIEstimator = {
      async *analyzeEpic() {
        throw new Error('connection refused');
      },
    };
    const failures: { epicId: string; message: string }[] = [];
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await useBrpStore.getState().runAnalysis(estimator, undefined, {
      onError: (f) => failures.push(f),
    });
    consoleSpy.mockRestore();

    expect(failures).toHaveLength(1);
    expect(failures[0]).toEqual({ epicId: 'E1', message: 'connection refused' });
  });

  it('falls back to console.error when no onError supplied (backwards-compat)', async () => {
    useBrpStore.getState().loadCrew(
      buildCrew({
        id: 'crew-A',
        pods: [buildPod({ id: 'pod-X', epics: [buildEpic({ id: 'E1' })] })],
      }),
    );
    const estimator = buildEstimator((epic) => [
      { kind: 'error', epicId: epic.id, message: 'timeout' },
    ]);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await useBrpStore.getState().runAnalysis(estimator);
    expect(consoleSpy).toHaveBeenCalled();
    const errorMessages = consoleSpy.mock.calls.map((c) => String(c[0]));
    expect(errorMessages.some((m) => m.includes('E1') && m.includes('timeout'))).toBe(true);
    consoleSpy.mockRestore();
  });

  it("does NOT double-call onError when 'error' event is followed by a throw", async () => {
    useBrpStore.getState().loadCrew(
      buildCrew({
        id: 'crew-A',
        pods: [buildPod({ id: 'pod-X', epics: [buildEpic({ id: 'E1' })] })],
      }),
    );
    const estimator: AIEstimator = {
      async *analyzeEpic(epic) {
        yield { kind: 'error', epicId: epic.id, message: 'first failure' };
        throw new Error('second failure');
      },
    };
    const failures: { epicId: string; message: string }[] = [];
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await useBrpStore.getState().runAnalysis(estimator, undefined, {
      onError: (f) => failures.push(f),
    });
    consoleSpy.mockRestore();
    expect(failures).toHaveLength(1);
    expect(failures[0]!.message).toBe('first failure');
  });
});
