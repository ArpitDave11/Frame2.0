/**
 * Task 2-2 — computeCrewMetrics pure-function tests.
 */
import { describe, it, expect } from 'vitest';
import { computeCrewMetrics } from './brp';
import type { Crew, Epic, FrameResult, Pod } from './brp';

const frameResult = (estimate: number, confidence = 0.8): FrameResult => ({
  frameEstimate: estimate as FrameResult['frameEstimate'],
  breakdown: [],
  rationale: 'r',
  confidence,
  references: [],
  generatedStories: null,
  modelVersion: 'sim',
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
  humanEstimate: 5,
  analysisStatus: 'done',
  frameResult: frameResult(5),
  ...overrides,
});

const pod = (id: string, epics: Epic[] = []): Pod => ({
  id,
  name: `Pod ${id}`,
  gitlabSubgroupId: 100,
  capacity: {
    resources: 5,
    spPerResource: 10,
    sprintCount: 6,
    holidayDays: 2,
    leaveDays: 4,
  },
  epics: epics.map((e) => ({ ...e, podId: id })),
});

const crew = (id: string, pods: Pod[] = []): Crew => ({
  id,
  name: `Crew ${id}`,
  gitlabGroupId: Number(id) || 0,
  pods,
});

describe('computeCrewMetrics (Task 2-2)', () => {
  it('returns all zeros for an empty crew', () => {
    const m = computeCrewMetrics(crew('c1'));
    expect(m).toEqual({
      totalCapacity: 0,
      humanLoad: 0,
      frameLoad: 0,
      balance: 0,
      podsOver: 0,
      totalPods: 0,
      epicsToReGroom: 0,
      totalEpics: 0,
      flaggedCount: 0,
    });
  });

  it('single-pod crew matches the pod metrics', () => {
    // 5×10×6 = 300 gross; 2×5 = 10 holiday; 4 leave; total = 286.
    // 2 agree epics → humanLoad 10, frameLoad 10.
    const epics = [
      epic('1', 'p1'),
      epic('2', 'p1'),
    ];
    const c = crew('c1', [pod('p1', epics)]);
    const m = computeCrewMetrics(c);
    expect(m.totalCapacity).toBe(286);
    expect(m.humanLoad).toBe(10);
    expect(m.frameLoad).toBe(10);
    expect(m.balance).toBe(276);
    expect(m.totalPods).toBe(1);
    expect(m.podsOver).toBe(0);
    expect(m.totalEpics).toBe(2);
  });

  it('sums across multiple pods', () => {
    const c = crew('c1', [
      pod('p1', [epic('1', 'p1')]),
      pod('p2', [epic('2', 'p2'), epic('3', 'p2')]),
    ]);
    const m = computeCrewMetrics(c);
    expect(m.totalPods).toBe(2);
    expect(m.totalEpics).toBe(3);
    expect(m.totalCapacity).toBe(286 * 2);
    expect(m.humanLoad).toBe(15);
    expect(m.frameLoad).toBe(15);
  });

  it('counts pods over capacity', () => {
    // p1: capacity 286, FRAME load 89×6 = 534 → over.
    // p2: capacity 286, FRAME load 5 → fine.
    const overEpics = Array.from({ length: 6 }, (_, i) =>
      epic(String(i + 10), 'p1', {
        humanEstimate: 13,
        frameResult: frameResult(89),
      }),
    );
    const c = crew('c1', [pod('p1', overEpics), pod('p2', [epic('1', 'p2')])]);
    const m = computeCrewMetrics(c);
    expect(m.podsOver).toBe(1);
    expect(m.totalPods).toBe(2);
  });

  it('counts re-groom epics across pods', () => {
    // human=1 vs frame=8 → |7|/8 = 0.875 → re-groom.
    const regroomEpic = epic('rg', 'p1', {
      humanEstimate: 1,
      frameResult: frameResult(8),
    });
    const c = crew('c1', [pod('p1', [regroomEpic, epic('a', 'p1')]), pod('p2', [epic('b', 'p2')])]);
    const m = computeCrewMetrics(c);
    expect(m.epicsToReGroom).toBe(1);
  });

  it('counts flagged epics across pods', () => {
    // Description below 80 chars + no FRAME result → flagged.
    const flaggedEpic = epic('fl', 'p1', {
      description: 'short',
      analysisStatus: 'raw',
      frameResult: null,
    });
    const c = crew('c1', [pod('p1', [flaggedEpic, epic('ok', 'p1')])]);
    const m = computeCrewMetrics(c);
    expect(m.flaggedCount).toBe(1);
  });

  it('balance is totalCapacity − frameLoad', () => {
    const c = crew('c1', [pod('p1', [epic('1', 'p1', { humanEstimate: 5, frameResult: frameResult(13) })])]);
    const m = computeCrewMetrics(c);
    expect(m.balance).toBe(m.totalCapacity - m.frameLoad);
  });

  it('is pure — same crew always yields the same metrics', () => {
    const c = crew('c1', [pod('p1', [epic('1', 'p1'), epic('2', 'p1')])]);
    const first = computeCrewMetrics(c);
    const second = computeCrewMetrics(c);
    expect(first).toEqual(second);
  });
});
