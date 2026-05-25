import { beforeEach, describe, expect, it } from 'vitest';
import { useBrpStore } from './brpStore';
import type { Crew, Epic, Pod } from '../domain/brp';

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

beforeEach(() => {
  // Reset to a known empty state before every test. The store is a
  // module-singleton in production; isolation matters for tests.
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

// ─── Loading — loadCrew ─────────────────────────────────────

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
    // The action is intentionally a thin append; dedup is the caller's job.
    const a = buildCrew({ id: 'crew-A', name: 'first' });
    const a2 = buildCrew({ id: 'crew-A', name: 'second' });
    useBrpStore.getState().loadCrew(a);
    useBrpStore.getState().loadCrew(a2);
    const crews = useBrpStore.getState().crews;
    expect(crews).toHaveLength(2);
    expect(crews.map((c) => c.name)).toEqual(['first', 'second']);
  });
});

// ─── Loading — loadPods ─────────────────────────────────────

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
    // crew-A still has no pods; no error thrown
    const crews = useBrpStore.getState().crews;
    expect(crews).toHaveLength(1);
    expect(crews[0]!.pods).toEqual([]);
  });
});

// ─── Loading — loadEpicsIntoPod ─────────────────────────────

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

    // Untouched pods stay empty
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
    expect(useBrpStore.getState().crews).toHaveLength(1);

    useBrpStore.getState().reset();

    const after = useBrpStore.getState();
    expect(after.crews).toEqual([]);
    expect(after.collapsedPods.size).toBe(0);
    expect(after.openModal).toBeNull();
    expect(after.analysisStatus).toBe('idle');
  });

  it('returns a FRESH Set for collapsedPods (not a shared reference)', () => {
    // Reset → mutate → reset → expect new Set, not the same one carrying over.
    useBrpStore.getState().reset();
    const before = useBrpStore.getState().collapsedPods;
    before.add('pod-X'); // direct mutation — would be a real bug but tests the invariant
    useBrpStore.getState().reset();
    const after = useBrpStore.getState().collapsedPods;
    expect(after).not.toBe(before);
    expect(after.size).toBe(0);
  });
});

// ─── Reviewer-grep equivalent: no derived state stored ──────

describe('brpStore — no derived state invariant', () => {
  it('Crew/Pod/Epic on state have no variance/delta/totalCapacity fields', () => {
    const epic = buildEpic({
      id: 'E1',
      humanEstimate: 5,
      analysisStatus: 'done',
      frameResult: {
        frameEstimate: 8,
        breakdown: [{ title: 'work', points: 8 }],
        rationale: 'similar',
        confidence: 0.9,
        references: [],
        generatedStories: null,
        modelVersion: 'sim-v1',
        analyzedAt: '2026-05-24T00:00:00Z',
      },
    });
    const pod = buildPod({ id: 'pod-X', epics: [epic] });
    const crew = buildCrew({ id: 'crew-A', pods: [pod] });
    useBrpStore.getState().loadCrew(crew);

    const storedCrew = useBrpStore.getState().crews[0]!;
    const storedPod = storedCrew.pods[0]!;
    const storedEpic = storedPod.epics[0]!;

    // Crew should be just { id, name, gitlabGroupId, pods }.
    expect(Object.keys(storedCrew).sort()).toEqual(
      ['gitlabGroupId', 'id', 'name', 'pods'].sort(),
    );

    // Pod should be just { id, name, gitlabSubgroupId, capacity, epics } —
    // no totalCapacity.
    expect(Object.keys(storedPod).sort()).toEqual(
      ['capacity', 'epics', 'gitlabSubgroupId', 'id', 'name'].sort(),
    );
    expect(storedPod).not.toHaveProperty('totalCapacity');

    // Epic should have no variance/delta/frameEstimate at top level —
    // all FRAME outputs live inside the nullable frameResult.
    expect(storedEpic).not.toHaveProperty('variance');
    expect(storedEpic).not.toHaveProperty('delta');
    expect(storedEpic).not.toHaveProperty('frameEstimate');
  });
});
