/**
 * TRUST INVARIANT — CI GATE (Task 7, INV2).
 *
 * The single guarantee that makes BRP's sizing trustworthy: the load FRAME
 * attributes to an epic is, by construction, the SUM of the story points it
 * displays. There is no separate model-emitted total that can drift, so the
 * number on screen can never contradict the decomposition on screen.
 *
 *      computeEpicLoad(epic) === Σ epic.frameResult.stories[].points
 *
 * If this test ever fails, the tool can show a total that disagrees with its
 * own stories — the exact "it's lying" failure this feature exists to prevent.
 * Do not weaken or skip it.
 */

import { describe, expect, it } from 'vitest';
import { computeEpicLoad } from './brp';
import { FIBONACCI_POINTS } from './brp.constants';
import { createSimulatedEstimator } from '../services/brp/ai/simulatedEstimator';
import type { Epic, FibonacciPoint, FrameResult, SizedStory, AnalysisEvent } from './brp';

// ─── Deterministic generator (no fast-check dependency) ─────

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomStory(rng: () => number): SizedStory {
  const points = FIBONACCI_POINTS[Math.floor(rng() * FIBONACCI_POINTS.length)] as FibonacciPoint;
  return {
    title: `story-${Math.floor(rng() * 1e6)}`,
    points,
    acceptanceCriteria: ['ac'],
    splitPattern: 'Path',
    provenance: 'frame-generated',
  };
}

function epicWithStories(stories: SizedStory[]): Epic {
  const fr: FrameResult = {
    frameEstimate: 8, // deliberately arbitrary — must NOT influence the load
    breakdown: [{ title: 'legacy', points: 100 }], // deliberately wrong — must be ignored
    stories,
    rationale: 'r',
    confidence: 0.7,
    references: [],
    generatedStories: null,
    modelVersion: 'test',
    analyzedAt: '2026-06-25T00:00:00Z',
  };
  return {
    id: 'gl:1', iid: 1, title: 'E', description: 'd'.repeat(120),
    gitlabWebUrl: 'u', podId: 'p', source: 'gitlab',
    humanEstimate: null, analysisStatus: 'done', frameResult: fr,
  };
}

async function lastDone(iter: AsyncIterable<AnalysisEvent>): Promise<FrameResult> {
  let result: FrameResult | undefined;
  for await (const ev of iter) if (ev.kind === 'done') result = ev.result;
  return result!;
}

describe('TRUST INVARIANT: epic load === Σ visible story points (INV2, CI gate)', () => {
  it('holds for 200 randomly generated story decompositions', () => {
    const rng = mulberry32(0xc0ffee);
    for (let i = 0; i < 200; i++) {
      const n = 1 + Math.floor(rng() * 6); // 1..6 stories
      const stories = Array.from({ length: n }, () => randomStory(rng));
      const expected = stories.reduce((s, x) => s + x.points, 0);
      expect(computeEpicLoad(epicWithStories(stories))).toBe(expected);
    }
  });

  it('ignores frameEstimate and breakdown entirely when stories are present', () => {
    // frameEstimate=8, breakdown sums to 100, but the visible stories sum to 6.
    const epic = epicWithStories([
      { title: 'a', points: 3, acceptanceCriteria: ['x'], splitPattern: 'Data', provenance: 'existing' },
      { title: 'b', points: 3, acceptanceCriteria: ['y'], splitPattern: 'Rules', provenance: 'frame-generated' },
    ]);
    expect(computeEpicLoad(epic)).toBe(6);
  });

  it('holds for the real simulated estimator output across many epic ids', async () => {
    const estimator = createSimulatedEstimator();
    for (let i = 0; i < 50; i++) {
      const epicId = `gl:${i * 7 + 1}`;
      const base = epicWithStories([]);
      const fr = await lastDone(
        estimator.analyzeEpic({ ...base, id: epicId, frameResult: null }, []),
      );
      const epic: Epic = { ...base, id: epicId, frameResult: fr };
      const sum = (fr.stories ?? []).reduce((s, x) => s + x.points, 0);
      expect(computeEpicLoad(epic)).toBe(sum);
      // The simulator must always produce a non-empty decomposition so the
      // load is never a naked number (INV6 at the producer level).
      expect((fr.stories ?? []).length).toBeGreaterThan(0);
    }
  });
});
