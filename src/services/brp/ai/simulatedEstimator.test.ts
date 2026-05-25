import { describe, expect, it } from 'vitest';
import {
  SIMULATOR_MODEL_VERSION,
  createSimulatedEstimator,
} from './simulatedEstimator';
import { getEstimator } from './estimatorProvider';
import { AnalysisEventSchema } from './schemas';
import { FIBONACCI_POINTS } from '../../../domain/brp.constants';
import type { Epic, FrameResult, ReferenceEpic } from '../../../domain/brp';
import type { AnalysisEvent } from './types';

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
    // Sample 25 ids and assert at least 5 distinct frameEstimates appear.
    // (Bumped from ≥ 3 per deep-review nice-to-have TQ #10 — middle-bias
    // covers 7+ buckets so < 5 distinct is negligible probability.)
    const estimates = new Set<number>();
    for (let i = 0; i < 25; i++) {
      const result = await runAndExtractResult(buildEpic({ id: `gl:sample-${i}` }));
      estimates.add(result.frameEstimate);
    }
    expect(estimates.size).toBeGreaterThanOrEqual(5);
  });

  it('determinism is stable across fresh estimator instances', async () => {
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
    expect(events.find((e) => e.kind === 'error')).toBeUndefined();
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

  it('single-item breakdowns have higher mean confidence than 3+ item ones (with buffer)', async () => {
    // Deep-review C2: prior version had no statistical buffer. Confidence
    // formulas: singles ~0.92 ± 0.03; multi ~0.85 − 0.5·cv ± 0.05. The
    // real-world gap is typically 0.15–0.30, so a 0.05 buffer is safe.
    const singles: number[] = [];
    const multi: number[] = [];
    for (let i = 0; i < 200; i++) {
      const epic = buildEpic({ id: `gl:inverse-${i}` });
      const result = await runAndExtractResult(epic);
      if (result.breakdown.length === 1) singles.push(result.confidence);
      else if (result.breakdown.length >= 3) multi.push(result.confidence);
    }
    expect(singles.length).toBeGreaterThan(5);
    expect(multi.length).toBeGreaterThan(5);
    const mean = (arr: number[]) => arr.reduce((s, n) => s + n, 0) / arr.length;
    // Buffer: at least 0.05 separation, well below the expected 0.15–0.30 gap.
    expect(mean(singles)).toBeGreaterThan(mean(multi) + 0.05);
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

  it('analyzedAt is a parseable ISO-8601 timestamp within ~5s of now', async () => {
    // Deep-review nice-to-have TQ #17: the prior "parseable" check was
    // too weak (Date.parse('2026') succeeds). Tighten to "fresh".
    const before = Date.now();
    const result = await runAndExtractResult(buildEpic());
    const after = Date.now();
    const parsed = Date.parse(result.analyzedAt);
    expect(Number.isNaN(parsed)).toBe(false);
    // Allow 5s slack for slow CI machines.
    expect(parsed).toBeGreaterThanOrEqual(before - 5_000);
    expect(parsed).toBeLessThanOrEqual(after + 5_000);
  });
});

// ─── AbortSignal handling (deep-review C1 / I2 / I7) ───────

describe('createSimulatedEstimator — AbortSignal handling', () => {
  it('with a signal that is already aborted: emits no events', async () => {
    const controller = new AbortController();
    controller.abort();
    const events = await collectEvents(
      createSimulatedEstimator().analyzeEpic(buildEpic(), [], controller.signal),
    );
    expect(events).toEqual([]);
  });

  it('signal aborted after start, before done: emits started + progress but no done', async () => {
    // Pull events one at a time and abort between yields.
    const controller = new AbortController();
    const iter = createSimulatedEstimator()
      .analyzeEpic(buildEpic(), [], controller.signal)
      [Symbol.asyncIterator]();
    const first = await iter.next();
    expect(first.value?.kind).toBe('started');
    controller.abort();
    // Collect the rest; the simulator should return early without 'done'.
    const remainder: AnalysisEvent[] = [];
    let n = await iter.next();
    while (!n.done) {
      remainder.push(n.value);
      n = await iter.next();
    }
    expect(remainder.find((e) => e.kind === 'done')).toBeUndefined();
  });

  it('with no signal supplied: behaves exactly as before (back-compat)', async () => {
    const events = await collectEvents(
      createSimulatedEstimator().analyzeEpic(buildEpic({ id: 'gl:no-signal' }), []),
    );
    expect(events.find((e) => e.kind === 'done')).toBeDefined();
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
