import { describe, expect, it } from 'vitest';
import {
  AnalysisEventSchema,
  FibonacciPointSchema,
  FrameResultSchema,
} from './schemas';
import type { FrameResult } from '../../../domain/brp';

// ─── Fixtures ───────────────────────────────────────────────

function buildFrameResult(overrides: Partial<FrameResult> = {}): FrameResult {
  return {
    frameEstimate: 8,
    breakdown: [
      { title: 'core work', points: 5 },
      { title: 'tests', points: 3 },
    ],
    rationale: 'similar to prior epics',
    confidence: 0.8,
    references: [
      { epicId: 'ref-1', title: 'closed epic', similarity: 0.7, actualSp: 13 },
    ],
    generatedStories: null,
    modelVersion: 'sim-v1',
    analyzedAt: '2026-05-25T00:00:00Z',
    ...overrides,
  };
}

// ─── FibonacciPointSchema ───────────────────────────────────

describe('FibonacciPointSchema', () => {
  it.each([1, 2, 3, 5, 8, 13, 21, 40, 100])(
    'accepts the valid Fibonacci value %i',
    (n) => {
      expect(FibonacciPointSchema.parse(n)).toBe(n);
    },
  );

  it.each([0, 4, 7, 9, 10, 14, 50, -1, 101, 1.5])(
    'rejects the non-Fibonacci value %s',
    (n) => {
      expect(() => FibonacciPointSchema.parse(n)).toThrow();
    },
  );

  it('rejects a string even if it looks like a Fibonacci number', () => {
    expect(() => FibonacciPointSchema.parse('8')).toThrow();
  });
});

// ─── FrameResultSchema ──────────────────────────────────────

describe('FrameResultSchema', () => {
  it('accepts a valid FrameResult', () => {
    const fr = buildFrameResult();
    expect(() => FrameResultSchema.parse(fr)).not.toThrow();
  });

  it('accepts generatedStories present', () => {
    const fr = buildFrameResult({
      generatedStories: [
        { title: 's1', points: 3, acceptanceCriteria: ['AC-1', 'AC-2'] },
      ],
    });
    expect(() => FrameResultSchema.parse(fr)).not.toThrow();
  });

  it('rejects when frameEstimate is non-Fibonacci', () => {
    const fr = buildFrameResult();
    expect(() => FrameResultSchema.parse({ ...fr, frameEstimate: 7 })).toThrow();
  });

  it('rejects when confidence is below 0', () => {
    const fr = buildFrameResult({ confidence: -0.1 });
    expect(() => FrameResultSchema.parse(fr)).toThrow();
  });

  it('rejects when confidence is above 1', () => {
    const fr = buildFrameResult({ confidence: 1.1 });
    expect(() => FrameResultSchema.parse(fr)).toThrow();
  });

  it('rejects when a breakdown item has non-Fibonacci points', () => {
    const fr = buildFrameResult();
    expect(() =>
      FrameResultSchema.parse({
        ...fr,
        breakdown: [{ title: 'x', points: 7 }],
      }),
    ).toThrow();
  });

  it('rejects when a required string field is missing', () => {
    const { rationale: _rationale, ...rest } = buildFrameResult();
    expect(() => FrameResultSchema.parse(rest)).toThrow();
  });

  it('rejects when reference similarity is out of [0,1]', () => {
    const fr = buildFrameResult();
    expect(() =>
      FrameResultSchema.parse({
        ...fr,
        references: [
          { epicId: 'r', title: 't', similarity: 1.2, actualSp: 5 },
        ],
      }),
    ).toThrow();
  });

  it('accepts empty references and empty breakdown', () => {
    const fr = buildFrameResult({ references: [], breakdown: [] });
    expect(() => FrameResultSchema.parse(fr)).not.toThrow();
  });
});

// ─── AnalysisEventSchema ────────────────────────────────────

describe('AnalysisEventSchema', () => {
  it("accepts 'started'", () => {
    expect(() =>
      AnalysisEventSchema.parse({ kind: 'started', epicId: 'E1' }),
    ).not.toThrow();
  });

  it("accepts 'progress' with pct in [0,1]", () => {
    expect(() =>
      AnalysisEventSchema.parse({ kind: 'progress', epicId: 'E1', pct: 0 }),
    ).not.toThrow();
    expect(() =>
      AnalysisEventSchema.parse({ kind: 'progress', epicId: 'E1', pct: 0.5 }),
    ).not.toThrow();
    expect(() =>
      AnalysisEventSchema.parse({ kind: 'progress', epicId: 'E1', pct: 1 }),
    ).not.toThrow();
  });

  it("rejects 'progress' with pct out of [0,1]", () => {
    expect(() =>
      AnalysisEventSchema.parse({ kind: 'progress', epicId: 'E1', pct: 1.5 }),
    ).toThrow();
    expect(() =>
      AnalysisEventSchema.parse({ kind: 'progress', epicId: 'E1', pct: -0.1 }),
    ).toThrow();
  });

  it("accepts 'done' with a valid FrameResult", () => {
    expect(() =>
      AnalysisEventSchema.parse({
        kind: 'done',
        epicId: 'E1',
        result: buildFrameResult(),
      }),
    ).not.toThrow();
  });

  it("rejects 'done' with an invalid FrameResult", () => {
    expect(() =>
      AnalysisEventSchema.parse({
        kind: 'done',
        epicId: 'E1',
        result: buildFrameResult({ confidence: 2 }),
      }),
    ).toThrow();
  });

  it("accepts 'error' with a message", () => {
    expect(() =>
      AnalysisEventSchema.parse({
        kind: 'error',
        epicId: 'E1',
        message: 'boom',
      }),
    ).not.toThrow();
  });

  it('rejects an unknown event kind', () => {
    expect(() =>
      AnalysisEventSchema.parse({ kind: 'cancelled', epicId: 'E1' }),
    ).toThrow();
  });

  it('rejects when epicId is missing', () => {
    expect(() =>
      AnalysisEventSchema.parse({ kind: 'started' }),
    ).toThrow();
  });

  it('rejects when result is missing on a done event', () => {
    expect(() =>
      AnalysisEventSchema.parse({ kind: 'done', epicId: 'E1' }),
    ).toThrow();
  });
});
