import { describe, it, expect } from 'vitest';
import {
  computeCapacity,
  computeDelta,
  computeVariance,
} from './brp';
import type {
  CapacityInputs,
  Epic,
  FrameResult,
} from './brp';

// ─── Test fixtures ──────────────────────────────────────────

/** Build a baseline FrameResult; override any field you care about. */
function buildFrameResult(overrides: Partial<FrameResult> = {}): FrameResult {
  return {
    frameEstimate: 8,
    breakdown: [{ title: 'core work', points: 8 }],
    rationale: 'similar to prior epics',
    confidence: 0.8,
    references: [],
    generatedStories: null,
    modelVersion: 'sim-v1',
    analyzedAt: '2026-05-24T00:00:00Z',
    ...overrides,
  };
}

/** Build a baseline Epic; override any field you care about. */
function buildEpic(overrides: Partial<Epic> = {}): Epic {
  return {
    id: 'gl:1',
    iid: 1,
    title: 'Sample epic',
    // 100 chars — comfortably above FLAGGED_DESCRIPTION_MIN_CHARS (80)
    description:
      'A reasonably-fleshed-out epic body that comfortably exceeds the thin-description threshold.',
    gitlabWebUrl: 'https://gitlab.example/epic/1',
    podId: 'pod-1',
    source: 'gitlab',
    humanEstimate: 8,
    analysisStatus: 'done',
    frameResult: buildFrameResult(),
    ...overrides,
  };
}

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

// ─── computeDelta ───────────────────────────────────────────

describe('computeDelta', () => {
  it('returns null when frameResult is missing', () => {
    const epic = buildEpic({ frameResult: null });
    expect(computeDelta(epic)).toBeNull();
  });

  it('returns null when humanEstimate is missing', () => {
    const epic = buildEpic({ humanEstimate: null });
    expect(computeDelta(epic)).toBeNull();
  });

  it('returns null when both sides are missing', () => {
    const epic = buildEpic({ humanEstimate: null, frameResult: null });
    expect(computeDelta(epic)).toBeNull();
  });

  it('returns positive when FRAME estimates higher', () => {
    const epic = buildEpic({
      humanEstimate: 5,
      frameResult: buildFrameResult({ frameEstimate: 13 }),
    });
    expect(computeDelta(epic)).toBe(8);
  });

  it('returns negative when FRAME estimates lower', () => {
    const epic = buildEpic({
      humanEstimate: 13,
      frameResult: buildFrameResult({ frameEstimate: 5 }),
    });
    expect(computeDelta(epic)).toBe(-8);
  });

  it('returns 0 when estimates match', () => {
    const epic = buildEpic({
      humanEstimate: 8,
      frameResult: buildFrameResult({ frameEstimate: 8 }),
    });
    expect(computeDelta(epic)).toBe(0);
  });
});

// ─── computeVariance ────────────────────────────────────────

describe('computeVariance — step 1 (status not done OR no frameResult)', () => {
  it("returns 'pending' for a raw epic with a normal-length description", () => {
    const epic = buildEpic({
      analysisStatus: 'raw',
      frameResult: null,
      // default description in buildEpic is ~100 chars (above the 80 cutoff)
    });
    expect(computeVariance(epic)).toBe('pending');
  });

  it("returns 'flagged' for a raw epic with a thin description (< 80 chars)", () => {
    const epic = buildEpic({
      analysisStatus: 'raw',
      frameResult: null,
      description: 'too short',
    });
    expect(computeVariance(epic)).toBe('flagged');
  });

  it("returns 'flagged' for a raw epic with empty description", () => {
    const epic = buildEpic({
      analysisStatus: 'raw',
      frameResult: null,
      description: '',
    });
    expect(computeVariance(epic)).toBe('flagged');
  });

  it("treats 'analyzing' status the same as 'raw' (frameResult still null)", () => {
    const epic = buildEpic({
      analysisStatus: 'analyzing',
      frameResult: null,
    });
    expect(computeVariance(epic)).toBe('pending');
  });

  it("treats 'error' status as pending (with fat description) or flagged (with thin)", () => {
    const fat = buildEpic({ analysisStatus: 'error', frameResult: null });
    expect(computeVariance(fat)).toBe('pending');
    const thin = buildEpic({
      analysisStatus: 'error',
      frameResult: null,
      description: 'oops',
    });
    expect(computeVariance(thin)).toBe('flagged');
  });
});

describe('computeVariance — step 2 (analyzed but no humanEstimate)', () => {
  it("returns 'pending' when FRAME finished but planner hasn't entered an estimate", () => {
    const epic = buildEpic({ humanEstimate: null });
    expect(computeVariance(epic)).toBe('pending');
  });
});

describe('computeVariance — step 3 (threshold boundaries)', () => {
  it("ratio exactly 0.20 → 'agree' (inclusive)", () => {
    // human=10, frame=8 → |10-8|/max(10,8) = 2/10 = 0.20 → agree (boundary)
    const epic = buildEpic({
      humanEstimate: 10,
      frameResult: buildFrameResult({ frameEstimate: 8 }),
    });
    expect(computeVariance(epic)).toBe('agree');
  });

  it("ratio just above 0.20 → 'caution'", () => {
    // human=8, frame=5 → |8-5|/8 = 3/8 = 0.375 → caution
    // (5 is Fibonacci-valid; 0.375 is comfortably above the 0.20 boundary)
    const epic = buildEpic({
      humanEstimate: 8,
      frameResult: buildFrameResult({ frameEstimate: 5 }),
    });
    expect(computeVariance(epic)).toBe('caution');
  });

  it("ratio exactly 0.50 → 'caution' (inclusive)", () => {
    // human=10, frame=5 → |10-5|/10 = 0.50 → caution (boundary)
    const epic = buildEpic({
      humanEstimate: 10,
      frameResult: buildFrameResult({ frameEstimate: 5 }),
    });
    expect(computeVariance(epic)).toBe('caution');
  });

  it("ratio just above 0.50 → 're-groom'", () => {
    // human=8, frame=3 → |8-3|/8 = 5/8 = 0.625 → re-groom
    const epic = buildEpic({
      humanEstimate: 8,
      frameResult: buildFrameResult({ frameEstimate: 3 }),
    });
    expect(computeVariance(epic)).toBe('re-groom');
  });

  it('works symmetrically when FRAME is higher (denom = frame)', () => {
    // human=3, frame=8 → |3-8|/8 = 5/8 = 0.625 → re-groom
    const epic = buildEpic({
      humanEstimate: 3,
      frameResult: buildFrameResult({ frameEstimate: 8 }),
    });
    expect(computeVariance(epic)).toBe('re-groom');
  });

  it("identical estimates → 'agree' regardless of magnitude", () => {
    const epic = buildEpic({
      humanEstimate: 100,
      frameResult: buildFrameResult({ frameEstimate: 100 }),
    });
    expect(computeVariance(epic)).toBe('agree');
  });
});

describe('computeVariance — step 4 (confidence bump)', () => {
  it("'agree' with confidence ≥ 0.40 stays 'agree'", () => {
    const epic = buildEpic({
      humanEstimate: 8,
      frameResult: buildFrameResult({ frameEstimate: 8, confidence: 0.4 }),
    });
    expect(computeVariance(epic)).toBe('agree');
  });

  it("'agree' with confidence < 0.40 bumps to 'caution'", () => {
    const epic = buildEpic({
      humanEstimate: 8,
      frameResult: buildFrameResult({ frameEstimate: 8, confidence: 0.39 }),
    });
    expect(computeVariance(epic)).toBe('caution');
  });

  it("low confidence does NOT downgrade 'caution' or 're-groom'", () => {
    // already 'caution' (ratio 0.375) — confidence bump only applies to 'agree'
    const cautionEpic = buildEpic({
      humanEstimate: 8,
      frameResult: buildFrameResult({ frameEstimate: 5, confidence: 0.1 }),
    });
    expect(computeVariance(cautionEpic)).toBe('caution');

    // already 're-groom' (ratio 0.625)
    const reGroomEpic = buildEpic({
      humanEstimate: 8,
      frameResult: buildFrameResult({ frameEstimate: 3, confidence: 0.1 }),
    });
    expect(computeVariance(reGroomEpic)).toBe('re-groom');
  });
});
