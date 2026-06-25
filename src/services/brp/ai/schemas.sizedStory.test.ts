import { describe, expect, it } from 'vitest';
import { FrameResultSchema, SizedStorySchema } from './schemas';
import type { FrameResult, SizedStory } from '../../../domain/brp';

// ─── SizedStorySchema (D14 — single canonical decomposition unit) ────

function buildStory(overrides: Partial<SizedStory> = {}): SizedStory {
  return {
    title: 'Add PayPal payment path',
    points: 5,
    acceptanceCriteria: ['User can pay with PayPal', 'Failure is surfaced'],
    splitPattern: 'Path',
    provenance: 'frame-generated',
    ...overrides,
  };
}

describe('SizedStorySchema', () => {
  it('accepts a valid story and round-trips equal', () => {
    const s = buildStory();
    expect(SizedStorySchema.parse(s)).toEqual(s);
  });

  it('accepts the optional reference-class fields', () => {
    const s = buildStory({ referenceEpicId: 'gid://gitlab/Epic/42', rationale: 'like #42' });
    expect(SizedStorySchema.parse(s)).toEqual(s);
  });

  it.each(['Spike', 'Path', 'Interface', 'Data', 'Rules'] as const)(
    'accepts the SPIDR split pattern %s',
    (splitPattern) => {
      expect(SizedStorySchema.parse(buildStory({ splitPattern })).splitPattern).toBe(splitPattern);
    },
  );

  it('rejects a non-SPIDR split pattern', () => {
    expect(() => SizedStorySchema.parse({ ...buildStory(), splitPattern: 'Bogus' })).toThrow();
  });

  it.each(['existing', 'frame-generated'] as const)(
    'accepts provenance %s',
    (provenance) => {
      expect(SizedStorySchema.parse(buildStory({ provenance })).provenance).toBe(provenance);
    },
  );

  it('rejects an unknown provenance', () => {
    expect(() => SizedStorySchema.parse({ ...buildStory(), provenance: 'imagined' })).toThrow();
  });

  it('rejects a non-Fibonacci point', () => {
    expect(() => SizedStorySchema.parse(buildStory({ points: 7 as never }))).toThrow();
  });

  it('rejects when splitPattern is missing', () => {
    const { splitPattern: _omit, ...rest } = buildStory();
    expect(() => SizedStorySchema.parse(rest)).toThrow();
  });
});

// ─── FrameResult.stories (optional canonical field during migration) ──

function buildFrameResult(overrides: Partial<FrameResult> = {}): FrameResult {
  return {
    frameEstimate: 8,
    breakdown: [{ title: 'core', points: 5 }, { title: 'tests', points: 3 }],
    rationale: 'r',
    confidence: 0.8,
    references: [],
    generatedStories: null,
    modelVersion: 'sim-v1',
    analyzedAt: '2026-06-25T00:00:00Z',
    ...overrides,
  };
}

describe('FrameResultSchema.stories', () => {
  it('accepts a FrameResult without stories (transitional/optional)', () => {
    const fr = buildFrameResult();
    expect(FrameResultSchema.parse(fr)).toEqual(fr);
  });

  it('accepts a FrameResult carrying canonical stories', () => {
    const fr = buildFrameResult({ stories: [buildStory({ points: 5 }), buildStory({ points: 3 })] });
    expect(FrameResultSchema.parse(fr)).toEqual(fr);
  });

  it('rejects stories with an invalid point value', () => {
    const fr = buildFrameResult({ stories: [buildStory({ points: 4 as never })] });
    expect(() => FrameResultSchema.parse(fr)).toThrow();
  });
});
