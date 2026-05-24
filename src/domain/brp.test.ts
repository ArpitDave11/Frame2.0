import { describe, it, expect } from 'vitest';
import { computeCapacity } from './brp';
import type { CapacityInputs } from './brp';

// ─── computeCapacity ────────────────────────────────────────

describe('computeCapacity', () => {
  it('PRD worked example: 6 × 10 × 6 − (2 × 6) − 5 = 343', () => {
    // The named acceptance example from docs/Brp_plan/p1.md and the
    // headless PRD (B-2). If this ever breaks, the formula is wrong.
    const inputs: CapacityInputs = {
      resources: 6,
      spPerResource: 10,
      sprintCount: 6,
      holidayDays: 2,
      leaveDays: 5,
    };
    const result = computeCapacity(inputs);
    expect(result.gross).toBe(360);
    expect(result.holidayDeduction).toBe(12);
    expect(result.leaveDeduction).toBe(5);
    expect(result.total).toBe(343);
  });

  it('clamps total at 0 when deductions exceed gross', () => {
    // 1 person × 10 SP × 1 sprint = 10 gross. 100 leave days swamps it.
    const result = computeCapacity({
      resources: 1,
      spPerResource: 10,
      sprintCount: 1,
      holidayDays: 0,
      leaveDays: 100,
    });
    expect(result.gross).toBe(10);
    expect(result.leaveDeduction).toBe(100);
    expect(result.total).toBe(0); // not -90
  });

  it('zero resources yields zero gross and zero total', () => {
    const result = computeCapacity({
      resources: 0,
      spPerResource: 10,
      sprintCount: 6,
      holidayDays: 5,
      leaveDays: 5,
    });
    expect(result.gross).toBe(0);
    expect(result.holidayDeduction).toBe(0); // 5 × 0
    expect(result.total).toBe(0);
  });

  it('zero deductions: total equals gross', () => {
    const result = computeCapacity({
      resources: 4,
      spPerResource: 10,
      sprintCount: 5,
      holidayDays: 0,
      leaveDays: 0,
    });
    expect(result.gross).toBe(200);
    expect(result.total).toBe(200);
  });

  it('holiday deduction multiplies by resources (holiday hits everyone)', () => {
    // 3 holidays × 10 people = 30, not 3.
    const result = computeCapacity({
      resources: 10,
      spPerResource: 10,
      sprintCount: 1,
      holidayDays: 3,
      leaveDays: 0,
    });
    expect(result.gross).toBe(100);
    expect(result.holidayDeduction).toBe(30);
    expect(result.total).toBe(70);
  });

  it('leave deduction is taken as-is (already total person-days)', () => {
    // 7 leave days = 7 SP off the top, regardless of resource count.
    const result = computeCapacity({
      resources: 5,
      spPerResource: 10,
      sprintCount: 2,
      holidayDays: 0,
      leaveDays: 7,
    });
    expect(result.gross).toBe(100);
    expect(result.leaveDeduction).toBe(7); // NOT 7 × 5
    expect(result.total).toBe(93);
  });

  it('is pure — repeated calls with the same input return identical results', () => {
    const inputs: CapacityInputs = {
      resources: 6,
      spPerResource: 10,
      sprintCount: 6,
      holidayDays: 2,
      leaveDays: 5,
    };
    const a = computeCapacity(inputs);
    const b = computeCapacity(inputs);
    expect(a).toEqual(b);
  });
});
