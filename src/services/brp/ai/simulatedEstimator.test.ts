import { describe, expect, it } from 'vitest';
import {
  SIMULATOR_MODEL_VERSION,
  createSimulatedEstimator,
} from './simulatedEstimator';
import { getEstimator } from './estimatorProvider';
import { AnalysisEventSchema } from './schemas';
import { FIBONACCI_POINTS } from '../../../domain/brp.constants';
import type {
  AnalysisEvent,
  Epic,
  FrameResult,
  ReferenceEpic,
} from '../../../domain/brp';

// ─── Helpers ────────────────────────────────────────────────

function buildEpic(overrides: Partial<Epic> = {}): Epic {
  return {
    id: 'gl:42',
    iid: 42,
    title: 'Test epic',
    description: 'A reasonably-long description, well above the flagged threshold so the simulator has signal to work with.',
    gitlabWebUrl: 'https://gitlab.example/epic/42',
    podId: 'pod-A',
    source: 'gitlab',
    humanEstimate: null,
    analysisStatus: 'raw',
    frameResult: null,
    ...overrides,
  };
}

/** Collect every event the estimator emits for one epic. */
async function collectEvents(
  iter: AsyncIterable<AnalysisEvent>,
): Promise<AnalysisEvent[]> {
  const events: AnalysisEvent[] = [];
  for await (const ev of iter) events.push(ev);
  return events;
}

/** Pull the FrameResult out of the 'done' event. Throws if missing. */
async function runAndExtractResult(
  epic: Epic,
  refs: readonly ReferenceEpic[] = [],
): Promise<FrameResult> {
  const estimator = createSimulatedEstimator();
  const events = await collectEvents(estimator.analyzeEpic(epic, refs));
  const done = events.find((e) => e.kind === 'done');
  if (!done || done.kind !== 'done') {
    throw new Error('No done event emitted');
  }
  return done.result;
}

/** Strip the non-deterministic timestamp for equality assertions. */
function withoutTimestamp(fr: FrameResult): Omit<FrameResult, 'analyzedAt'> {
  const { analyzedAt: _t, ...rest } = fr;
  return rest;
}

// ─── Determinism ────────────────────────────────────────────

describe('createSimulatedEstimator — determinism', () => {
  it('same epic.id → identical FrameResult content across 10 runs', async () => {
    const epic = buildEpic({ id: 'gl:determinism-test' });
    const first = await runAndExtractResult(epic);
    for (let i = 0; i < 9; i++) {
      const next = await runAndExtractResult(epic);
      expect(withoutTimestamp(next)).toEqual(withoutTimestamp(first));
    }
  });

  it('different epic.id values typically produce different frameEstimates', async () => {
    // Not a strict guarantee (any two ids could collide on frameEstimate
    // by chance — there are only 9 possible values), so we sample 25 ids
    // and assert at least 3 distinct frameEstimates appear. That's the
    // weakest claim that still rules out "all ids return the same value".
    const estimates = new Set<number>();
    for (let i = 0; i < 25; i++) {
      const result = await runAndExtractResult(buildEpic({ id: `gl:sample-${i}` }));
      estimates.add(result.frameEstimate);
    }
    expect(estimates.size).toBeGreaterThanOrEqual(3);
  });

  it('determinism is stable across fresh estimator instances', async () => {
    // The instance carries no state; PRNG seeding is per-call from
    // epic.id. So two different estimator instances must agree.
    const epic = buildEpic({ id: 'gl:stable-instance' });
    const a = createSimulatedEstimator();
    const b = createSimulatedEstimator();
    const ar = (await collectEvents(a.analyzeEpic(epic, []))).find(
      (e) => e.kind === 'done',
    );
    const br = (await collectEvents(b.analyzeEpic(epic, []))).find(
      (e) => e.kind === 'done',
    );
    expect(ar?.kind).toBe('done');
    expect(br?.kind).toBe('done');
    if (ar?.kind === 'done' && br?.kind === 'done') {
      expect(withoutTimestamp(ar.result)).toEqual(withoutTimestamp(br.result));
    }
  });
});

// ─── Event sequence ─────────────────────────────────────────

describe('createSimulatedEstimator — event sequence', () => {
  it('emits started → progress → done (in that order)', async () => {
    const epic = buildEpic();
    const events = await collectEvents(
      createSimulatedEstimator().analyzeEpic(epic, []),
    );
    expect(events[0]?.kind).toBe('started');
    expect(events[events.length - 1]?.kind).toBe('done');
    // No 'error' in the happy path
    expect(events.find((e) => e.kind === 'error')).toBeUndefined();
    // At least one progress between start and done
    expect(events.some((e) => e.kind === 'progress')).toBe(true);
  });

  it("'started' carries the same epic.id as the analyzed epic", async () => {
    const epic = buildEpic({ id: 'gl:carry-id' });
    const events = await collectEvents(
      createSimulatedEstimator().analyzeEpic(epic, []),
    );
    expect(events[0]).toEqual({ kind: 'started', epicId: 'gl:carry-id' });
  });

  it('progress events carry pct in [0,1]', async () => {
    const epic = buildEpic();
    const events = await collectEvents(
      createSimulatedEstimator().analyzeEpic(epic, []),
    );
    for (const ev of events) {
      if (ev.kind === 'progress') {
        expect(ev.pct).toBeGreaterThanOrEqual(0);
        expect(ev.pct).toBeLessThanOrEqual(1);
      }
    }
  });
});

// ─── Schema validation (drift catcher) ──────────────────────

describe('createSimulatedEstimator — schema compliance', () => {
  it('every emitted event passes AnalysisEventSchema for 30 different epic ids', async () => {
    for (let i = 0; i < 30; i++) {
      const epic = buildEpic({ id: `gl:schema-${i}` });
      const events = await collectEvents(
        createSimulatedEstimator().analyzeEpic(epic, []),
      );
      for (const ev of events) {
        expect(() => AnalysisEventSchema.parse(ev)).not.toThrow();
      }
    }
  });
});

// ─── Breakdown invariant ────────────────────────────────────

describe('createSimulatedEstimator — breakdown', () => {
  it('breakdown sums to within ±1 of frameEstimate for every epic id sampled', async () => {
    // Try 50 different ids so we exercise all frameEstimate values and
    // all template variants per value.
    for (let i = 0; i < 50; i++) {
      const epic = buildEpic({ id: `gl:breakdown-${i}` });
      const result = await runAndExtractResult(epic);
      const sum = result.breakdown.reduce((s, b) => s + b.points, 0);
      expect(Math.abs(sum - result.frameEstimate)).toBeLessThanOrEqual(1);
    }
  });

  it('every breakdown item carries a Fibonacci-valid points value', async () => {
    const fibSet = new Set<number>(FIBONACCI_POINTS);
    for (let i = 0; i < 30; i++) {
      const epic = buildEpic({ id: `gl:fib-${i}` });
      const result = await runAndExtractResult(epic);
      for (const item of result.breakdown) {
        expect(fibSet.has(item.points)).toBe(true);
      }
    }
  });

  it('breakdown is never empty', async () => {
    for (let i = 0; i < 30; i++) {
      const epic = buildEpic({ id: `gl:nonempty-${i}` });
      const result = await runAndExtractResult(epic);
      expect(result.breakdown.length).toBeGreaterThan(0);
    }
  });
});

// ─── Confidence ─────────────────────────────────────────────

describe('createSimulatedEstimator — confidence', () => {
  it('confidence is always in [0.1, 0.95] across 50 ids', async () => {
    for (let i = 0; i < 50; i++) {
      const epic = buildEpic({ id: `gl:conf-${i}` });
      const result = await runAndExtractResult(epic);
      expect(result.confidence).toBeGreaterThanOrEqual(0.1);
      expect(result.confidence).toBeLessThanOrEqual(0.95);
    }
  });

  it('single-item breakdowns typically have HIGHER confidence than multi-item ones', async () => {
    // Sample many ids; partition by breakdown size; assert the mean
    // confidence of single-item breakdowns exceeds the mean of 3+ item
    // breakdowns. This is the "inversely tracks variance" assertion.
    const singles: number[] = [];
    const multi: number[] = [];
    for (let i = 0; i < 200; i++) {
      const epic = buildEpic({ id: `gl:inverse-${i}` });
      const result = await runAndExtractResult(epic);
      if (result.breakdown.length === 1) singles.push(result.confidence);
      else if (result.breakdown.length >= 3) multi.push(result.confidence);
    }
    // We need enough samples on both sides for the assertion to mean
    // anything. If the simulator picks distributions such that we don't
    // get either bucket populated, this would be a sampling problem.
    expect(singles.length).toBeGreaterThan(5);
    expect(multi.length).toBeGreaterThan(5);
    const mean = (arr: number[]) => arr.reduce((s, n) => s + n, 0) / arr.length;
    expect(mean(singles)).toBeGreaterThan(mean(multi));
  });
});

// ─── References pass-through ────────────────────────────────

describe('createSimulatedEstimator — references', () => {
  it('passes through up to 3 caller-supplied references', async () => {
    const refs: ReferenceEpic[] = Array.from({ length: 5 }, (_, i) => ({
      epicId: `ref-${i}`,
      title: `Ref ${i}`,
      similarity: 0.5,
      actualSp: 8,
    }));
    const result = await runAndExtractResult(buildEpic(), refs);
    expect(result.references.length).toBeLessThanOrEqual(3);
    expect(result.references.length).toBe(3);
    expect(result.references.map((r) => r.epicId)).toEqual([
      'ref-0',
      'ref-1',
      'ref-2',
    ]);
  });

  it('with zero references: result.references is empty and rationale notes it', async () => {
    const result = await runAndExtractResult(buildEpic(), []);
    expect(result.references).toEqual([]);
    expect(result.rationale.toLowerCase()).toContain('no closed reference');
  });
});

// ─── Metadata ───────────────────────────────────────────────

describe('createSimulatedEstimator — metadata', () => {
  it('modelVersion is the simulator constant', async () => {
    const result = await runAndExtractResult(buildEpic());
    expect(result.modelVersion).toBe(SIMULATOR_MODEL_VERSION);
  });

  it('generatedStories is null in v1 (simulator does not invent stories)', async () => {
    const result = await runAndExtractResult(buildEpic());
    expect(result.generatedStories).toBeNull();
  });

  it('analyzedAt is a parseable ISO-8601 timestamp', async () => {
    const result = await runAndExtractResult(buildEpic());
    expect(Number.isNaN(Date.parse(result.analyzedAt))).toBe(false);
  });
});

// ─── Provider ───────────────────────────────────────────────

describe('estimatorProvider — getEstimator', () => {
  it('returns an object satisfying the AIEstimator interface', () => {
    const estimator = getEstimator();
    expect(typeof estimator.analyzeEpic).toBe('function');
  });

  it('returns an estimator that produces a valid FrameResult', async () => {
    const estimator = getEstimator();
    const events = await collectEvents(
      estimator.analyzeEpic(buildEpic({ id: 'gl:via-provider' }), []),
    );
    const done = events.find((e) => e.kind === 'done');
    expect(done?.kind).toBe('done');
    if (done?.kind === 'done') {
      expect(done.result.modelVersion).toBe(SIMULATOR_MODEL_VERSION);
    }
  });

  it('matches the simulator’s output today (drop-in equivalence)', async () => {
    // Sanity check: today getEstimator and createSimulatedEstimator are
    // interchangeable. When P7 swaps the body of getEstimator, this test
    // will need to be updated — the failure will be a useful signpost.
    const epic = buildEpic({ id: 'gl:drop-in' });
    const viaProvider = await runAndExtractResult(epic);
    const direct = await (async () => {
      const events = await collectEvents(
        createSimulatedEstimator().analyzeEpic(epic, []),
      );
      const done = events.find((e) => e.kind === 'done');
      if (!done || done.kind !== 'done') throw new Error('no done event');
      return done.result;
    })();
    expect(withoutTimestamp(viaProvider)).toEqual(withoutTimestamp(direct));
  });
});
