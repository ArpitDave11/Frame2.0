import { describe, expect, it } from 'vitest';
import { computeCapacity } from './brp';
import type { CapacityInputs } from './brp';

// Velocity-based capacity (T8, D1/D2): total = max(0, previousVelocity − holidaySP − leaveSP)

function inputs(overrides: Partial<CapacityInputs> = {}): CapacityInputs {
  return {
    previousVelocity: 120,
    resources: 6,
    spPerResource: 10, // legacy, must be ignored when previousVelocity is set
    sprintCount: 6, //    legacy, must be ignored when previousVelocity is set
    holidayDays: 0,
    leaveDays: 0,
    ...overrides,
  };
}

describe('computeCapacity — velocity-based (T8)', () => {
  it('uses previousVelocity as gross, ignoring spPerResource/sprintCount', () => {
    const r = computeCapacity(inputs({ previousVelocity: 120 }));
    expect(r.gross).toBe(120); // NOT 6×10×6=360
    expect(r.total).toBe(120);
  });

  it('subtracts holidays (×resources) and leave from velocity', () => {
    const r = computeCapacity(inputs({ previousVelocity: 120, resources: 6, holidayDays: 2, leaveDays: 5 }));
    expect(r.holidayDeduction).toBe(12); // 2 × 6
    expect(r.leaveDeduction).toBe(5);
    expect(r.total).toBe(103); // 120 − 12 − 5
  });

  it('clamps total at 0 when deductions exceed velocity', () => {
    const r = computeCapacity(inputs({ previousVelocity: 10, resources: 6, holidayDays: 3, leaveDays: 0 }));
    expect(r.total).toBe(0); // 10 − 18 → clamp 0
  });

  it('treats a negative previousVelocity as 0 gross', () => {
    const r = computeCapacity(inputs({ previousVelocity: -50 }));
    expect(r.gross).toBe(0);
    expect(r.total).toBe(0);
  });

  it('zero velocity yields zero total', () => {
    expect(computeCapacity(inputs({ previousVelocity: 0 })).total).toBe(0);
  });

  it('falls back to the legacy product when previousVelocity is undefined', () => {
    const r = computeCapacity({
      resources: 6, spPerResource: 10, sprintCount: 6, holidayDays: 2, leaveDays: 5,
    });
    expect(r.gross).toBe(360); // legacy 6×10×6
    expect(r.total).toBe(343);
  });
});
