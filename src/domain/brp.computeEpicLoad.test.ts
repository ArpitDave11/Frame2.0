import { describe, expect, it } from 'vitest';
import { computeEpicLoad } from './brp';
import type { Epic, FrameResult, SizedStory } from './brp';

// ─── Fixtures ───────────────────────────────────────────────

function story(points: SizedStory['points'], title = 't'): SizedStory {
  return {
    title,
    points,
    acceptanceCriteria: ['ac'],
    splitPattern: 'Path',
    provenance: 'frame-generated',
  };
}

function frameResult(overrides: Partial<FrameResult> = {}): FrameResult {
  return {
    frameEstimate: 13,
    breakdown: [{ title: 'core', points: 13 }],
    rationale: 'r',
    confidence: 0.8,
    references: [],
    generatedStories: null,
    modelVersion: 'sim-v1',
    analyzedAt: '2026-06-25T00:00:00Z',
    ...overrides,
  };
}

function epic(overrides: Partial<Epic> = {}): Epic {
  return {
    id: 'gl:1',
    iid: 1,
    title: 'Epic',
    description: 'A sufficiently long epic description for the heuristics.',
    gitlabWebUrl: 'https://gitlab.example/epic/1',
    podId: 'pod-1',
    source: 'gitlab',
    humanEstimate: null,
    analysisStatus: 'done',
    frameResult: frameResult(),
    ...overrides,
  };
}

// ─── computeEpicLoad (INV2: load === Σ stories.points) ──────

describe('computeEpicLoad', () => {
  it('returns 0 when the epic has not been analyzed', () => {
    expect(computeEpicLoad(epic({ frameResult: null, analysisStatus: 'raw' }))).toBe(0);
  });

  it('sums the canonical story points when stories are present', () => {
    const e = epic({ frameResult: frameResult({ stories: [story(3), story(5), story(8)] }) });
    expect(computeEpicLoad(e)).toBe(16);
  });

  it('uses the story sum even when it differs from the legacy frameEstimate', () => {
    // frameEstimate says 13 but the visible stories sum to 18 — the load
    // must follow what is shown (the stories), never the standalone number.
    const e = epic({ frameResult: frameResult({ frameEstimate: 13, stories: [story(5), story(13)] }) });
    expect(computeEpicLoad(e)).toBe(18);
  });

  it('handles a single-story decomposition', () => {
    const e = epic({ frameResult: frameResult({ stories: [story(21)] }) });
    expect(computeEpicLoad(e)).toBe(21);
  });

  it('falls back to frameEstimate for legacy data with no stories', () => {
    const e = epic({ frameResult: frameResult({ frameEstimate: 8, stories: undefined }) });
    expect(computeEpicLoad(e)).toBe(8);
  });

  it('falls back to frameEstimate when stories is an empty array', () => {
    const e = epic({ frameResult: frameResult({ frameEstimate: 5, stories: [] }) });
    expect(computeEpicLoad(e)).toBe(5);
  });
});
