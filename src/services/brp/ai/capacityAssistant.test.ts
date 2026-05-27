import { describe, it, expect } from 'vitest';
import {
  simulatedCapacityAssistant,
  getCapacityAssistant,
} from './capacityAssistant';
import type { Pod, ReferenceEpic } from '@/domain/brp';

const pod = (overrides: Partial<Pod['capacity']> = {}): Pod => ({
  id: 'p1',
  name: 'P',
  gitlabSubgroupId: 100,
  capacity: {
    resources: 5,
    spPerResource: 10,
    sprintCount: 6,
    holidayDays: 2,
    leaveDays: 4,
    ...overrides,
  },
  epics: [],
});

const ref = (actualSp: number, i = 0): ReferenceEpic => ({
  epicId: `r${i}`,
  title: `ref ${i}`,
  similarity: 0.5,
  actualSp,
});

describe('simulatedCapacityAssistant', () => {
  it('returns confidence 0 with a "no data" rationale when no references', async () => {
    const r = await simulatedCapacityAssistant.suggestCapacity(pod(), []);
    expect(r.confidence).toBe(0);
    expect(r.rationale).toMatch(/no historical/i);
    expect(r.inputs.spPerResource).toBe(10); // unchanged
  });

  it('falls back to DEFAULT_SP_PER_RESOURCE when current spPerResource is 0', async () => {
    const r = await simulatedCapacityAssistant.suggestCapacity(
      pod({ spPerResource: 0 }),
      [],
    );
    expect(r.inputs.spPerResource).toBe(10);
  });

  it('ignores reference epics with actualSp === 0', async () => {
    const r = await simulatedCapacityAssistant.suggestCapacity(pod(), [
      ref(0, 0),
      ref(0, 1),
    ]);
    expect(r.confidence).toBe(0);
  });

  it('suggests median-based SP/resource for 1 reference (conf 0.3)', async () => {
    // 5 resources, single ref of actualSp 50 → 50/5 = 10.
    const r = await simulatedCapacityAssistant.suggestCapacity(pod(), [ref(50)]);
    expect(r.inputs.spPerResource).toBe(10);
    expect(r.confidence).toBe(0.3);
    expect(r.rationale).toMatch(/median of 1/i);
  });

  it('uses real median for 3+ references (conf 0.7)', async () => {
    // 5 resources, refs [10, 30, 50] → median 30 → 30/5 = 6.
    const r = await simulatedCapacityAssistant.suggestCapacity(pod(), [
      ref(10, 0),
      ref(30, 1),
      ref(50, 2),
    ]);
    expect(r.inputs.spPerResource).toBe(6);
    expect(r.confidence).toBe(0.7);
  });

  it('rounds the mean of the two middle values when reference count is even', async () => {
    // refs [10, 20, 30, 40] → median = (20+30)/2 = 25 → 25/5 = 5.
    const r = await simulatedCapacityAssistant.suggestCapacity(pod(), [
      ref(10, 0),
      ref(20, 1),
      ref(30, 2),
      ref(40, 3),
    ]);
    expect(r.inputs.spPerResource).toBe(5);
  });

  it('reaches conf 0.9 once 6+ references are available', async () => {
    const refs = Array.from({ length: 7 }, (_, i) => ref(30 + i, i));
    const r = await simulatedCapacityAssistant.suggestCapacity(pod(), refs);
    expect(r.confidence).toBe(0.9);
  });

  it('clamps the suggestion to [1, 30] SP/resource/sprint', async () => {
    // 5 resources, refs of 0 actualSp filtered, ref of 500 → 500/5 = 100 → clamp 30.
    const high = await simulatedCapacityAssistant.suggestCapacity(pod(), [
      ref(500),
    ]);
    expect(high.inputs.spPerResource).toBe(30);

    // 100 resources, single ref of 50 → 50/100 = 0.5 → round to 0 → clamp to 1.
    const low = await simulatedCapacityAssistant.suggestCapacity(
      pod({ resources: 100 }),
      [ref(50)],
    );
    expect(low.inputs.spPerResource).toBe(1);
  });

  it('preserves holiday/leave/sprintCount/resources from the pod', async () => {
    const p = pod({ holidayDays: 9, leaveDays: 7, sprintCount: 4, resources: 8 });
    const r = await simulatedCapacityAssistant.suggestCapacity(p, [ref(40)]);
    expect(r.inputs.holidayDays).toBe(9);
    expect(r.inputs.leaveDays).toBe(7);
    expect(r.inputs.sprintCount).toBe(4);
    expect(r.inputs.resources).toBe(8);
  });

  it('is deterministic — same inputs always produce the same suggestion', async () => {
    const refs = [ref(10, 0), ref(20, 1), ref(30, 2)];
    const a = await simulatedCapacityAssistant.suggestCapacity(pod(), refs);
    const b = await simulatedCapacityAssistant.suggestCapacity(pod(), refs);
    expect(a).toEqual(b);
  });
});

describe('getCapacityAssistant', () => {
  it('returns the simulated assistant by default', () => {
    expect(getCapacityAssistant()).toBe(simulatedCapacityAssistant);
  });
});
