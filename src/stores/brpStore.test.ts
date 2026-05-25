import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBrpStore } from './brpStore';
import { computeCapacity, computeVariance } from '../domain/brp';
import type {
  AIEstimator,
  AnalysisEvent,
  CapacityInputs,
  Crew,
  Epic,
  FrameResult,
  PI,
  Pod,
  ReferenceEpic,
} from '../domain/brp';

// ─── Fixtures ───────────────────────────────────────────────

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
    analyzedAt: '2026-05-25T00:00:00Z',
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
    ): AsyncIterable<AnalysisEvent> {
      for (const ev of eventsFor(epic)) {
        yield ev;
      }
    },
  };
}

beforeEach(() => {
  useBrpStore.getState().reset();
});

// ─── Initial state shape ────────────────────────────────────

describe('brpStore — initial state', () => {
  it('starts empty: no crews, no PI, idle analysis, portfolio view', () => {
    const s = useBrpStore.getState();
    expect(s.crews).toEqual([]);
    expect(s.currentPI).toBeNull();
    expect(s.view).toBe('portfolio');
    expect(s.selectedCrewId).toBeNull();
    expect(s.selectedPodId).toBeNull();
    expect(s.selectedEpicId).toBeNull();
    expect(s.collapsedPods).toBeInstanceOf(Set);
    expect(s.collapsedPods.size).toBe(0);
    expect(s.reGroomOnlyFilter).toBe(false);
    expect(s.openModal).toBeNull();
    expect(s.modalContext).toBeNull();
    expect(s.analysisStatus).toBe('idle');
  });
});

// ─── Loading ────────────────────────────────────────────────

describe('brpStore — loadCrew', () => {
  it('appends a single crew', () => {
    const crew = buildCrew();
    useBrpStore.getState().loadCrew(crew);
    expect(useBrpStore.getState().crews).toEqual([crew]);
  });

  it('appends multiple crews preserving insertion order', () => {
    const a = buildCrew({ id: 'crew-A', name: 'Alpha' });
    const b = buildCrew({ id: 'crew-B', name: 'Bravo' });
    const c = buildCrew({ id: 'crew-C', name: 'Charlie' });
    useBrpStore.getState().loadCrew(a);
    useBrpStore.getState().loadCrew(b);
    useBrpStore.getState().loadCrew(c);
    expect(useBrpStore.getState().crews.map((x) => x.id)).toEqual([
      'crew-A',
      'crew-B',
      'crew-C',
    ]);
  });

  it('appends — does NOT replace — even when the same id is loaded again', () => {
    const a = buildCrew({ id: 'crew-A', name: 'first' });
    const a2 = buildCrew({ id: 'crew-A', name: 'second' });
    useBrpStore.getState().loadCrew(a);
    useBrpStore.getState().loadCrew(a2);
    const crews = useBrpStore.getState().crews;
    expect(crews).toHaveLength(2);
    expect(crews.map((c) => c.name)).toEqual(['first', 'second']);
  });
});

describe('brpStore — loadPods', () => {
  it('sets pods on the targeted crew, leaves others untouched', () => {
    const a = buildCrew({ id: 'crew-A', name: 'Alpha' });
    const b = buildCrew({ id: 'crew-B', name: 'Bravo' });
    useBrpStore.getState().loadCrew(a);
    useBrpStore.getState().loadCrew(b);

    const pods = [buildPod({ id: 'pod-X' }), buildPod({ id: 'pod-Y' })];
    useBrpStore.getState().loadPods('crew-A', pods);

    const crews = useBrpStore.getState().crews;
    expect(crews.find((c) => c.id === 'crew-A')!.pods.map((p) => p.id)).toEqual([
      'pod-X',
      'pod-Y',
    ]);
    expect(crews.find((c) => c.id === 'crew-B')!.pods).toEqual([]);
  });

  it('REPLACES the previous pods on a crew (does not merge)', () => {
    useBrpStore.getState().loadCrew(buildCrew({ id: 'crew-A' }));
    useBrpStore.getState().loadPods('crew-A', [buildPod({ id: 'pod-old' })]);
    useBrpStore.getState().loadPods('crew-A', [buildPod({ id: 'pod-new' })]);
    const crew = useBrpStore.getState().crews[0]!;
    expect(crew.pods.map((p) => p.id)).toEqual(['pod-new']);
  });

  it('silently no-ops when the crewId is unknown', () => {
    useBrpStore.getState().loadCrew(buildCrew({ id: 'crew-A' }));
    useBrpStore.getState().loadPods('crew-ghost', [buildPod()]);
    const crews = useBrpStore.getState().crews;
    expect(crews).toHaveLength(1);
    expect(crews[0]!.pods).toEqual([]);
  });
});

describe('brpStore — loadEpicsIntoPod', () => {
  it('sets epics on the targeted pod across any crew', () => {
    const a = buildCrew({
      id: 'crew-A',
      pods: [buildPod({ id: 'pod-X' }), buildPod({ id: 'pod-Y' })],
    });
    const b = buildCrew({ id: 'crew-B', pods: [buildPod({ id: 'pod-Z' })] });
    useBrpStore.getState().loadCrew(a);
    useBrpStore.getState().loadCrew(b);

    const epics = [buildEpic({ id: 'E1' }), buildEpic({ id: 'E2' })];
    useBrpStore.getState().loadEpicsIntoPod('pod-Y', epics);

    const podY = useBrpStore
      .getState()
      .crews.flatMap((c) => c.pods)
      .find((p) => p.id === 'pod-Y')!;
    expect(podY.epics.map((e) => e.id)).toEqual(['E1', 'E2']);

    const podX = useBrpStore
      .getState()
      .crews.flatMap((c) => c.pods)
      .find((p) => p.id === 'pod-X')!;
    expect(podX.epics).toEqual([]);
  });

  it('REPLACES the previous epics on a pod', () => {
    useBrpStore.getState().loadCrew(buildCrew({ id: 'crew-A', pods: [buildPod({ id: 'pod-X' })] }));
    useBrpStore.getState().loadEpicsIntoPod('pod-X', [buildEpic({ id: 'old' })]);
    useBrpStore.getState().loadEpicsIntoPod('pod-X', [buildEpic({ id: 'new' })]);
    const podX = useBrpStore.getState().crews[0]!.pods[0]!;
    expect(podX.epics.map((e) => e.id)).toEqual(['new']);
  });

  it('silently no-ops when the podId is unknown', () => {
    useBrpStore.getState().loadCrew(buildCrew({ id: 'crew-A', pods: [buildPod({ id: 'pod-X' })] }));
    useBrpStore.getState().loadEpicsIntoPod('pod-ghost', [buildEpic()]);
    const podX = useBrpStore.getState().crews[0]!.pods[0]!;
    expect(podX.epics).toEqual([]);
  });
});

// ─── reset ──────────────────────────────────────────────────

describe('brpStore — reset', () => {
  it('clears all state back to the initial empty shape', () => {
    const s = useBrpStore.getState();
    s.loadCrew(buildCrew({ id: 'crew-A', pods: [buildPod({ id: 'pod-X' })] }));
    s.loadEpicsIntoPod('pod-X', [buildEpic()]);
    s.selectCrew('crew-A');
    s.setReGroomOnlyFilter(true);
    s.openModalFor('capacity', { podId: 'pod-X' });
    expect(useBrpStore.getState().crews).toHaveLength(1);

    useBrpStore.getState().reset();

    const after = useBrpStore.getState();
    expect(after.crews).toEqual([]);
    expect(after.collapsedPods.size).toBe(0);
    expect(after.openModal).toBeNull();
    expect(after.modalContext).toBeNull();
    expect(after.selectedCrewId).toBeNull();
    expect(after.reGroomOnlyFilter).toBe(false);
    expect(after.analysisStatus).toBe('idle');
  });

  it('returns a FRESH Set for collapsedPods (not a shared reference)', () => {
    useBrpStore.getState().reset();
    const before = useBrpStore.getState().collapsedPods;
    before.add('pod-X');
    useBrpStore.getState().reset();
    const after = useBrpStore.getState().collapsedPods;
    expect(after).not.toBe(before);
    expect(after.size).toBe(0);
  });
});

// ─── Capacity ───────────────────────────────────────────────

describe('brpStore — updatePodCapacity', () => {
  it('writes the 5 raw inputs to the target pod', () => {
    useBrpStore.getState().loadCrew(
      buildCrew({ id: 'crew-A', pods: [buildPod({ id: 'pod-X' })] }),
    );
    const inputs: CapacityInputs = {
      resources: 6,
      spPerResource: 10,
      sprintCount: 6,
      holidayDays: 2,
      leaveDays: 5,
    };
    useBrpStore.getState().updatePodCapacity('pod-X', inputs);

    const pod = useBrpStore.getState().crews[0]!.pods[0]!;
    expect(pod.capacity).toEqual(inputs);
    expect(computeCapacity(pod.capacity).total).toBe(343);
  });

  it('does not add a totalCapacity field to the stored pod', () => {
    useBrpStore.getState().loadCrew(
      buildCrew({ id: 'crew-A', pods: [buildPod({ id: 'pod-X' })] }),
    );
    useBrpStore.getState().updatePodCapacity('pod-X', {
      resources: 6,
      spPerResource: 10,
      sprintCount: 6,
      holidayDays: 2,
      leaveDays: 5,
    });
    const pod = useBrpStore.getState().crews[0]!.pods[0]!;
    expect(pod).not.toHaveProperty('totalCapacity');
  });

  it('leaves other pods untouched', () => {
    useBrpStore.getState().loadCrew(
      buildCrew({
        id: 'crew-A',
        pods: [
          buildPod({ id: 'pod-X', capacity: { resources: 1, spPerResource: 10, sprintCount: 1, holidayDays: 0, leaveDays: 0 } }),
          buildPod({ id: 'pod-Y', capacity: { resources: 2, spPerResource: 10, sprintCount: 1, holidayDays: 0, leaveDays: 0 } }),
        ],
      }),
    );
    useBrpStore.getState().updatePodCapacity('pod-X', {
      resources: 99,
      spPerResource: 99,
      sprintCount: 99,
      holidayDays: 0,
      leaveDays: 0,
    });
    const podY = useBrpStore.getState().crews[0]!.pods[1]!;
    expect(podY.capacity.resources).toBe(2);
  });

  it('silently no-ops when the podId is unknown', () => {
    useBrpStore.getState().loadCrew(
      buildCrew({ id: 'crew-A', pods: [buildPod({ id: 'pod-X' })] }),
    );
    expect(() =>
      useBrpStore.getState().updatePodCapacity('pod-ghost', {
        resources: 1,
        spPerResource: 1,
        sprintCount: 1,
        holidayDays: 0,
        leaveDays: 0,
      }),
    ).not.toThrow();
    const pod = useBrpStore.getState().crews[0]!.pods[0]!;
    expect(pod.capacity.resources).toBe(4);
  });
});

// ─── Estimates ──────────────────────────────────────────────

describe('brpStore — setHumanEstimate', () => {
  it('sets a value on the target epic; variance derives correctly', () => {
    useBrpStore.getState().loadCrew(
      buildCrew({
        id: 'crew-A',
        pods: [
          buildPod({
            id: 'pod-X',
            epics: [
              buildEpic({
                id: 'E1',
                humanEstimate: null,
                analysisStatus: 'done',
                frameResult: buildFrameResult({ frameEstimate: 8, confidence: 0.9 }),
              }),
            ],
          }),
        ],
      }),
    );

    let epic = useBrpStore.getState().crews[0]!.pods[0]!.epics[0]!;
    expect(computeVariance(epic)).toBe('pending');

    useBrpStore.getState().setHumanEstimate('E1', 8);
    epic = useBrpStore.getState().crews[0]!.pods[0]!.epics[0]!;
    expect(epic.humanEstimate).toBe(8);
    expect(computeVariance(epic)).toBe('agree');
  });

  it('clears a value with null', () => {
    useBrpStore.getState().loadCrew(
      buildCrew({
        id: 'crew-A',
        pods: [
          buildPod({ id: 'pod-X', epics: [buildEpic({ id: 'E1', humanEstimate: 13 })] }),
        ],
      }),
    );
    useBrpStore.getState().setHumanEstimate('E1', null);
    const epic = useBrpStore.getState().crews[0]!.pods[0]!.epics[0]!;
    expect(epic.humanEstimate).toBeNull();
  });

  it('does not touch other epics (cross-pod)', () => {
    useBrpStore.getState().loadCrew(
      buildCrew({
        id: 'crew-A',
        pods: [
          buildPod({ id: 'pod-X', epics: [buildEpic({ id: 'E1', humanEstimate: 5 })] }),
          buildPod({ id: 'pod-Y', epics: [buildEpic({ id: 'E2', humanEstimate: 13 })] }),
        ],
      }),
    );
    useBrpStore.getState().setHumanEstimate('E1', 100);
    const e2 = useBrpStore.getState().crews[0]!.pods[1]!.epics[0]!;
    expect(e2.humanEstimate).toBe(13);
  });

  it('silently no-ops on unknown epicId', () => {
    useBrpStore.getState().loadCrew(
      buildCrew({
        id: 'crew-A',
        pods: [buildPod({ id: 'pod-X', epics: [buildEpic({ id: 'E1', humanEstimate: 5 })] })],
      }),
    );
    expect(() => useBrpStore.getState().setHumanEstimate('E-ghost', 99)).not.toThrow();
    const e1 = useBrpStore.getState().crews[0]!.pods[0]!.epics[0]!;
    expect(e1.humanEstimate).toBe(5);
  });
});

// ─── Analysis ───────────────────────────────────────────────

describe('brpStore — setEpicAnalysisStatus', () => {
  it('sets per-epic status without touching frameResult', () => {
    useBrpStore.getState().loadCrew(
      buildCrew({
        id: 'crew-A',
        pods: [buildPod({ id: 'pod-X', epics: [buildEpic({ id: 'E1' })] })],
      }),
    );
    useBrpStore.getState().setEpicAnalysisStatus('E1', 'analyzing');
    const e = useBrpStore.getState().crews[0]!.pods[0]!.epics[0]!;
    expect(e.analysisStatus).toBe('analyzing');
    expect(e.frameResult).toBeNull();
  });

  it('does not clear a prior frameResult when transitioning back to "analyzing"', () => {
    useBrpStore.getState().loadCrew(
      buildCrew({
        id: 'crew-A',
        pods: [
          buildPod({
            id: 'pod-X',
            epics: [
              buildEpic({
                id: 'E1',
                analysisStatus: 'done',
                frameResult: buildFrameResult({ frameEstimate: 8 }),
              }),
            ],
          }),
        ],
      }),
    );
    useBrpStore.getState().setEpicAnalysisStatus('E1', 'analyzing');
    const e = useBrpStore.getState().crews[0]!.pods[0]!.epics[0]!;
    expect(e.analysisStatus).toBe('analyzing');
    expect(e.frameResult?.frameEstimate).toBe(8);
  });
});

describe('brpStore — setEpicFrameResult', () => {
  it('sets the result AND transitions status to "done" atomically', () => {
    useBrpStore.getState().loadCrew(
      buildCrew({
        id: 'crew-A',
        pods: [
          buildPod({
            id: 'pod-X',
            epics: [buildEpic({ id: 'E1', analysisStatus: 'analyzing' })],
          }),
        ],
      }),
    );
    const result = buildFrameResult({ frameEstimate: 13, confidence: 0.95 });
    useBrpStore.getState().setEpicFrameResult('E1', result);
    const e = useBrpStore.getState().crews[0]!.pods[0]!.epics[0]!;
    expect(e.frameResult).toEqual(result);
    expect(e.analysisStatus).toBe('done');
  });
});

describe('brpStore — runAnalysis', () => {
  it('walks every epic across crews/pods; transitions idle → running → done', async () => {
    useBrpStore.getState().loadCrew(
      buildCrew({
        id: 'crew-A',
        pods: [
          buildPod({ id: 'pod-X', epics: [buildEpic({ id: 'E1' }), buildEpic({ id: 'E2' })] }),
        ],
      }),
    );
    useBrpStore.getState().loadCrew(
      buildCrew({
        id: 'crew-B',
        pods: [buildPod({ id: 'pod-Y', epics: [buildEpic({ id: 'E3' })] })],
      }),
    );

    const analyzed: string[] = [];
    const estimator = buildEstimator((epic) => {
      analyzed.push(epic.id);
      return [
        { kind: 'started', epicId: epic.id },
        { kind: 'done', epicId: epic.id, result: buildFrameResult({ frameEstimate: 8 }) },
      ];
    });

    expect(useBrpStore.getState().analysisStatus).toBe('idle');
    await useBrpStore.getState().runAnalysis(estimator);
    expect(useBrpStore.getState().analysisStatus).toBe('done');
    expect(analyzed.sort()).toEqual(['E1', 'E2', 'E3']);

    for (const id of ['E1', 'E2', 'E3']) {
      const e = useBrpStore
        .getState()
        .crews.flatMap((c) => c.pods.flatMap((p) => p.epics))
        .find((ep) => ep.id === id)!;
      expect(e.analysisStatus).toBe('done');
      expect(e.frameResult?.frameEstimate).toBe(8);
    }
  });

  it("sets per-epic status to 'analyzing' before each estimator call", async () => {
    useBrpStore.getState().loadCrew(
      buildCrew({
        id: 'crew-A',
        pods: [buildPod({ id: 'pod-X', epics: [buildEpic({ id: 'E1' })] })],
      }),
    );

    let observedStatusAtStart: string | undefined;
    const estimator: AIEstimator = {
      async *analyzeEpic(epic) {
        observedStatusAtStart = useBrpStore
          .getState()
          .crews.flatMap((c) => c.pods.flatMap((p) => p.epics))
          .find((e) => e.id === epic.id)?.analysisStatus;
        yield { kind: 'done', epicId: epic.id, result: buildFrameResult() };
      },
    };

    await useBrpStore.getState().runAnalysis(estimator);
    expect(observedStatusAtStart).toBe('analyzing');
  });

  it("on 'error' event: sets epic status to 'error', frameResult stays null", async () => {
    useBrpStore.getState().loadCrew(
      buildCrew({
        id: 'crew-A',
        pods: [buildPod({ id: 'pod-X', epics: [buildEpic({ id: 'E1' })] })],
      }),
    );
    const estimator = buildEstimator((epic) => [
      { kind: 'error', epicId: epic.id, message: 'boom' },
    ]);
    await useBrpStore.getState().runAnalysis(estimator);
    const e = useBrpStore.getState().crews[0]!.pods[0]!.epics[0]!;
    expect(e.analysisStatus).toBe('error');
    expect(e.frameResult).toBeNull();
  });

  it("when estimator throws outside the event stream: epic ends in 'error', run continues", async () => {
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
    const estimator: AIEstimator = {
      async *analyzeEpic(epic) {
        if (epic.id === 'E1') throw new Error('estimator died');
        yield { kind: 'done', epicId: epic.id, result: buildFrameResult({ frameEstimate: 5 }) };
      },
    };

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await useBrpStore.getState().runAnalysis(estimator);
    consoleSpy.mockRestore();

    const epics = useBrpStore.getState().crews[0]!.pods[0]!.epics;
    expect(epics.find((e) => e.id === 'E1')!.analysisStatus).toBe('error');
    expect(epics.find((e) => e.id === 'E2')!.analysisStatus).toBe('done');
    expect(useBrpStore.getState().analysisStatus).toBe('done');
  });

  it('with no epics loaded: transitions idle → running → done without invoking estimator', async () => {
    const estimator = buildEstimator(() => {
      throw new Error('should not be called when there are no epics');
    });
    await useBrpStore.getState().runAnalysis(estimator);
    expect(useBrpStore.getState().analysisStatus).toBe('done');
  });

  it('invokes getReferences once per epic and passes the result to the estimator', async () => {
    useBrpStore.getState().loadCrew(
      buildCrew({
        id: 'crew-A',
        pods: [buildPod({ id: 'pod-X', epics: [buildEpic({ id: 'E1' })] })],
      }),
    );
    const refs: ReferenceEpic[] = [
      { epicId: 'ref-1', title: 'Closed reference', similarity: 0.7, actualSp: 13 },
    ];
    const seen: { epicId: string; refs: readonly ReferenceEpic[] }[] = [];
    const estimator: AIEstimator = {
      async *analyzeEpic(epic, references) {
        seen.push({ epicId: epic.id, refs: references });
        yield { kind: 'done', epicId: epic.id, result: buildFrameResult() };
      },
    };
    await useBrpStore.getState().runAnalysis(estimator, () => refs);
    expect(seen).toHaveLength(1);
    expect(seen[0]!.refs).toEqual(refs);
  });
});

// ─── Navigation, UI, Modals ─────────────────────────────────

describe('brpStore — setView', () => {
  it("toggles view between 'portfolio' and 'pod'", () => {
    expect(useBrpStore.getState().view).toBe('portfolio');
    useBrpStore.getState().setView('pod');
    expect(useBrpStore.getState().view).toBe('pod');
    useBrpStore.getState().setView('portfolio');
    expect(useBrpStore.getState().view).toBe('portfolio');
  });
});

describe('brpStore — selectCrew / selectPod / selectEpic', () => {
  it('selectCrew sets and clears', () => {
    useBrpStore.getState().selectCrew('crew-A');
    expect(useBrpStore.getState().selectedCrewId).toBe('crew-A');
    useBrpStore.getState().selectCrew(null);
    expect(useBrpStore.getState().selectedCrewId).toBeNull();
  });

  it('selectPod sets and clears independently of crew', () => {
    useBrpStore.getState().selectCrew('crew-A');
    useBrpStore.getState().selectPod('pod-X');
    expect(useBrpStore.getState().selectedCrewId).toBe('crew-A');
    expect(useBrpStore.getState().selectedPodId).toBe('pod-X');
    useBrpStore.getState().selectPod(null);
    expect(useBrpStore.getState().selectedPodId).toBeNull();
    // Crew selection persists
    expect(useBrpStore.getState().selectedCrewId).toBe('crew-A');
  });

  it('selectEpic sets and clears', () => {
    useBrpStore.getState().selectEpic('E1');
    expect(useBrpStore.getState().selectedEpicId).toBe('E1');
    useBrpStore.getState().selectEpic(null);
    expect(useBrpStore.getState().selectedEpicId).toBeNull();
  });
});

describe('brpStore — togglePodCollapse', () => {
  it('adds podId when not present', () => {
    useBrpStore.getState().togglePodCollapse('pod-X');
    expect(useBrpStore.getState().collapsedPods.has('pod-X')).toBe(true);
  });

  it('removes podId when present (idempotent on second call)', () => {
    useBrpStore.getState().togglePodCollapse('pod-X');
    useBrpStore.getState().togglePodCollapse('pod-X');
    expect(useBrpStore.getState().collapsedPods.has('pod-X')).toBe(false);
  });

  it('returns a NEW Set instance per toggle (identity changes for selectors)', () => {
    const before = useBrpStore.getState().collapsedPods;
    useBrpStore.getState().togglePodCollapse('pod-X');
    const after = useBrpStore.getState().collapsedPods;
    expect(after).not.toBe(before);
  });

  it('handles multiple pods independently', () => {
    useBrpStore.getState().togglePodCollapse('pod-X');
    useBrpStore.getState().togglePodCollapse('pod-Y');
    useBrpStore.getState().togglePodCollapse('pod-Z');
    useBrpStore.getState().togglePodCollapse('pod-Y'); // remove Y
    const collapsed = useBrpStore.getState().collapsedPods;
    expect(collapsed.has('pod-X')).toBe(true);
    expect(collapsed.has('pod-Y')).toBe(false);
    expect(collapsed.has('pod-Z')).toBe(true);
  });
});

describe('brpStore — setReGroomOnlyFilter', () => {
  it('toggles the flag', () => {
    expect(useBrpStore.getState().reGroomOnlyFilter).toBe(false);
    useBrpStore.getState().setReGroomOnlyFilter(true);
    expect(useBrpStore.getState().reGroomOnlyFilter).toBe(true);
    useBrpStore.getState().setReGroomOnlyFilter(false);
    expect(useBrpStore.getState().reGroomOnlyFilter).toBe(false);
  });
});

describe('brpStore — openModalFor / closeModal', () => {
  it('opens a modal with no context', () => {
    useBrpStore.getState().openModalFor('metrics');
    expect(useBrpStore.getState().openModal).toBe('metrics');
    expect(useBrpStore.getState().modalContext).toBeNull();
  });

  it('opens a modal with podId context', () => {
    useBrpStore.getState().openModalFor('capacity', { podId: 'pod-X' });
    expect(useBrpStore.getState().openModal).toBe('capacity');
    expect(useBrpStore.getState().modalContext).toEqual({ podId: 'pod-X' });
  });

  it('replaces the previous modal+context wholesale on a new open', () => {
    useBrpStore.getState().openModalFor('capacity', { podId: 'pod-X' });
    useBrpStore.getState().openModalFor('metrics');
    expect(useBrpStore.getState().openModal).toBe('metrics');
    expect(useBrpStore.getState().modalContext).toBeNull();
  });

  it('closeModal clears both openModal and modalContext', () => {
    useBrpStore.getState().openModalFor('capacity', { podId: 'pod-X' });
    useBrpStore.getState().closeModal();
    expect(useBrpStore.getState().openModal).toBeNull();
    expect(useBrpStore.getState().modalContext).toBeNull();
  });
});

describe('brpStore — setCurrentPI', () => {
  it('sets and clears the active PI', () => {
    const pi: PI = {
      id: 'PI-2026-Q3',
      name: 'PI 2026 Q3',
      startDate: '2026-07-01',
      endDate: '2026-09-30',
      sprintCount: 6,
    };
    useBrpStore.getState().setCurrentPI(pi);
    expect(useBrpStore.getState().currentPI).toEqual(pi);
    useBrpStore.getState().setCurrentPI(null);
    expect(useBrpStore.getState().currentPI).toBeNull();
  });
});

// ─── Reviewer-grep equivalent: no derived state stored ──────

describe('brpStore — no derived state invariant', () => {
  it('Crew/Pod/Epic on state have no variance/delta/totalCapacity/frameEstimate fields', () => {
    const epic = buildEpic({
      id: 'E1',
      humanEstimate: 5,
      analysisStatus: 'done',
      frameResult: buildFrameResult({ frameEstimate: 8 }),
    });
    const pod = buildPod({ id: 'pod-X', epics: [epic] });
    const crew = buildCrew({ id: 'crew-A', pods: [pod] });
    useBrpStore.getState().loadCrew(crew);

    const storedCrew = useBrpStore.getState().crews[0]!;
    const storedPod = storedCrew.pods[0]!;
    const storedEpic = storedPod.epics[0]!;

    expect(Object.keys(storedCrew).sort()).toEqual(
      ['gitlabGroupId', 'id', 'name', 'pods'].sort(),
    );
    expect(Object.keys(storedPod).sort()).toEqual(
      ['capacity', 'epics', 'gitlabSubgroupId', 'id', 'name'].sort(),
    );
    expect(storedPod).not.toHaveProperty('totalCapacity');
    expect(storedEpic).not.toHaveProperty('variance');
    expect(storedEpic).not.toHaveProperty('delta');
    expect(storedEpic).not.toHaveProperty('frameEstimate');
  });
});
