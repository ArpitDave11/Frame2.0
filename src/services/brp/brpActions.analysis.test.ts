/**
 * brpActions analysis flow tests (B-30). Kept separate from
 * brpActions.test.ts so each file mocks just what its scope needs.
 *
 * The store's runAnalysis consumes an `AsyncIterable<AnalysisEvent>`,
 * so the stub estimator uses an async generator. `done` events carry
 * the FrameResult; `error` events carry a message. Throwing inside
 * the generator is also surfaced as an error by the store loop.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./brpGitlabService', async () => {
  const actual = await vi.importActual<typeof import('./brpGitlabService')>(
    './brpGitlabService',
  );
  return {
    ...actual,
    fetchReferenceEpics: vi.fn(),
  };
});

vi.mock('./ai/estimatorProvider', () => ({
  getEstimator: vi.fn(),
}));

import {
  runAnalysisAction,
  runAnalysisForPodAction,
} from './brpActions';
import { fetchReferenceEpics } from './brpGitlabService';
import { getEstimator } from './ai/estimatorProvider';
import { useBrpStore } from '@/stores/brpStore';
import { useConfigStore } from '@/stores/configStore';
import type { AIEstimator, AnalysisEvent } from './ai/types';
import type { Crew, Epic, FrameResult, Pod, ReferenceEpic } from '@/domain/brp';

// ─── Fixtures ───────────────────────────────────────────────

const frameResult = (estimate: number): FrameResult => ({
  frameEstimate: estimate as FrameResult['frameEstimate'],
  breakdown: [{ title: 'b', points: estimate as FrameResult['frameEstimate'] }],
  rationale: 'r',
  confidence: 0.7,
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

function stubEstimator(opts: {
  delayMs?: number;
  failEpicIds?: ReadonlySet<string>;
  estimate?: number;
  onAnalyze?: (epic: Epic, refs: readonly ReferenceEpic[]) => void;
} = {}): AIEstimator {
  return {
    async *analyzeEpic(
      e: Epic,
      refs: readonly ReferenceEpic[],
      signal?: AbortSignal,
    ): AsyncIterable<AnalysisEvent> {
      opts.onAnalyze?.(e, refs);
      yield { kind: 'started', epicId: e.id };
      if (opts.delayMs) {
        await new Promise((resolve, reject) => {
          const t = setTimeout(resolve, opts.delayMs);
          signal?.addEventListener('abort', () => {
            clearTimeout(t);
            reject(new DOMException('aborted', 'AbortError'));
          });
        });
      }
      if (opts.failEpicIds?.has(e.id)) {
        yield {
          kind: 'error',
          epicId: e.id,
          message: `stub fail for ${e.id}`,
        };
        return;
      }
      yield {
        kind: 'done',
        epicId: e.id,
        result: frameResult(opts.estimate ?? 5),
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
  vi.mocked(fetchReferenceEpics).mockReset();
  vi.mocked(getEstimator).mockReset();
}

// ─── Tests ──────────────────────────────────────────────────

describe('runAnalysisAction', () => {
  beforeEach(resetAll);

  it('runs analysis across all loaded epics and returns no failures on success', async () => {
    vi.mocked(getEstimator).mockReturnValue(stubEstimator());
    useBrpStore.getState().loadCrew(
      crew('c1', 'C', [pod('p1', 'P', [epic('e1', 'p1'), epic('e2', 'p1')])]),
    );

    const result = await runAnalysisAction();
    expect(result.aborted).toBe(false);
    expect(result.failures).toEqual([]);
    const epics = useBrpStore.getState().crews[0]?.pods[0]?.epics ?? [];
    expect(epics.every((e) => e.frameResult !== null)).toBe(true);
  });

  it('collects per-epic failures into result.failures', async () => {
    vi.mocked(getEstimator).mockReturnValue(
      stubEstimator({ failEpicIds: new Set(['e2']) }),
    );
    useBrpStore.getState().loadCrew(
      crew('c1', 'C', [pod('p1', 'P', [epic('e1', 'p1'), epic('e2', 'p1'), epic('e3', 'p1')])]),
    );

    const result = await runAnalysisAction();
    expect(result.aborted).toBe(false);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]?.epicId).toBe('e2');
    expect(result.failures[0]?.message).toMatch(/stub fail/);
  });
});

describe('runAnalysisForPodAction', () => {
  beforeEach(resetAll);

  it('returns a failure entry when the pod is not loaded', async () => {
    const r = await runAnalysisForPodAction('unknown-pod');
    expect(r.failures).toHaveLength(1);
    expect(r.failures[0]?.epicId).toBe('<missing-pod>');
    expect(vi.mocked(getEstimator)).not.toHaveBeenCalled();
  });

  it('fetches the pod closed reference epics and supplies them to the estimator', async () => {
    const seenRefs: ReadonlyArray<ReferenceEpic>[] = [];
    vi.mocked(getEstimator).mockReturnValue(
      stubEstimator({
        onAnalyze: (_e, refs) => {
          seenRefs.push([...refs]);
        },
      }),
    );
    vi.mocked(fetchReferenceEpics).mockResolvedValue({
      success: true,
      data: [
        { epicId: 'r1', title: 'past', similarity: 0.5, actualSp: 5 },
      ],
    });
    useBrpStore.getState().loadCrew(
      crew('c1', 'C', [pod('p1', 'P', [epic('e1', 'p1')])]),
    );

    await runAnalysisForPodAction('p1');
    expect(vi.mocked(fetchReferenceEpics)).toHaveBeenCalledTimes(1);
    expect(seenRefs[0]).toEqual([
      { epicId: 'r1', title: 'past', similarity: 0.5, actualSp: 5 },
    ]);
  });

  it('falls back to no references when fetchReferenceEpics errors', async () => {
    const seenRefs: ReadonlyArray<ReferenceEpic>[] = [];
    vi.mocked(getEstimator).mockReturnValue(
      stubEstimator({
        onAnalyze: (_e, refs) => {
          seenRefs.push([...refs]);
        },
      }),
    );
    vi.mocked(fetchReferenceEpics).mockResolvedValue({
      success: false,
      error: { code: 'network', message: 'boom' },
    });
    useBrpStore.getState().loadCrew(
      crew('c1', 'C', [pod('p1', 'P', [epic('e1', 'p1')])]),
    );

    const r = await runAnalysisForPodAction('p1');
    expect(r.failures).toEqual([]);
    expect(seenRefs[0]).toEqual([]);
  });

  it('falls back to no references when GitLab is disabled (and still runs)', async () => {
    useConfigStore.setState((s) => ({
      config: { ...s.config, gitlab: { ...s.config.gitlab, enabled: false } },
    }));
    const seenRefs: ReadonlyArray<ReferenceEpic>[] = [];
    vi.mocked(getEstimator).mockReturnValue(
      stubEstimator({
        onAnalyze: (_e, refs) => {
          seenRefs.push([...refs]);
        },
      }),
    );
    useBrpStore.getState().loadCrew(
      crew('c1', 'C', [pod('p1', 'P', [epic('e1', 'p1')])]),
    );

    const r = await runAnalysisForPodAction('p1');
    expect(r.failures).toEqual([]);
    expect(seenRefs[0]).toEqual([]);
    expect(vi.mocked(fetchReferenceEpics)).not.toHaveBeenCalled();
  });
});
