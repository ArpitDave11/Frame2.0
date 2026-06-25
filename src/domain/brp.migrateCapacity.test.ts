import { describe, expect, it } from 'vitest';
import { migrateCapacityInputs, computeCapacity } from './brp';
import type { CapacityInputs } from './brp';

// T10: backfill previousVelocity from the legacy product, preserving total.

const legacy: CapacityInputs = {
  resources: 6,
  spPerResource: 10,
  sprintCount: 6,
  holidayDays: 2,
  leaveDays: 5,
};

describe('migrateCapacityInputs (T10)', () => {
  it('derives previousVelocity from resources×spPerResource×sprintCount when absent', () => {
    expect(migrateCapacityInputs(legacy).previousVelocity).toBe(360); // 6×10×6
  });

  it('preserves the pod total capacity after migration', () => {
    const before = computeCapacity(legacy).total; // legacy fallback path
    const after = computeCapacity(migrateCapacityInputs(legacy)).total; // explicit velocity
    expect(after).toBe(before);
  });

  it('leaves an explicit previousVelocity untouched (including 0)', () => {
    expect(migrateCapacityInputs({ ...legacy, previousVelocity: 99 }).previousVelocity).toBe(99);
    expect(migrateCapacityInputs({ ...legacy, previousVelocity: 0 }).previousVelocity).toBe(0);
  });

  it('is idempotent', () => {
    const once = migrateCapacityInputs(legacy);
    expect(migrateCapacityInputs(once)).toEqual(once);
  });

  it('never derives a negative velocity', () => {
    const r = migrateCapacityInputs({ ...legacy, resources: 0 });
    expect(r.previousVelocity).toBe(0);
  });
});
