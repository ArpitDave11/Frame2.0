import { describe, it, expect } from 'vitest';
import {
  computeCapacity,
  computeDelta,
  computeVariance,
  computePodMetrics,
} from './brp';
import type {
  CapacityInputs,
  Epic,
  FrameResult,
  Pod,
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

/** Build a baseline Pod with default capacity (4 × 10 × 5 = 200 gross). */
function buildPod(overrides: Partial<Pod> = {}): Pod {
  return {
    id: 'pod-1',
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

// ─── computeCapacity ────────────────────────────────────────

describe('computeCapacity', () => {
  it('PRD worked example: 6 × 10 × 6 − (2 × 6) − 5 = 343', () => {
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
    expect(result.total).toBe(0);
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
    expect(result.holidayDeduction).toBe(0);
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
    expect(result.leaveDeduction).toBe(7);
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
    expect(computeCapacity(inputs)).toEqual(computeCapacity(inputs));
  });
});

// ─── computeDelta ───────────────────────────────────────────

describe('computeDelta', () => {
  it('returns null when frameResult is missing', () => {
    expect(computeDelta(buildEpic({ frameResult: null }))).toBeNull();
  });

  it('returns null when humanEstimate is missing', () => {
    expect(computeDelta(buildEpic({ humanEstimate: null }))).toBeNull();
  });

  it('returns null when both sides are missing', () => {
    expect(
      computeDelta(buildEpic({ humanEstimate: null, frameResult: null })),
    ).toBeNull();
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
  it("returns 'pending' for a raw epic (no frameResult) with normal-length description", () => {
    const epic = buildEpic({ analysisStatus: 'raw', frameResult: null });
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

  // Deep-review C3: the step-1 check is `status !== 'done' || frameResult ===
  // null` — an OR. Each arm must be independently testable. The tests below
  // hold one arm constant so we know WHICH check fired.

  it("[C3 arm A] status 'analyzing' + valid frameResult + fat desc → 'pending'", () => {
    // frameResult is non-null, but status is not 'done' → first OR arm fires.
    // If production accidentally checked frameResult === null only, this
    // would fail (the FR is valid).
    const epic = buildEpic({
      analysisStatus: 'analyzing',
      frameResult: buildFrameResult({ frameEstimate: 8 }),
    });
    expect(computeVariance(epic)).toBe('pending');
  });

  it("[C3 arm B] status 'done' + frameResult null + fat desc → 'pending'", () => {
    // frameResult is null, but status IS 'done' → second OR arm fires.
    // If production accidentally checked status only, this would fail.
    const epic = buildEpic({
      analysisStatus: 'done',
      frameResult: null,
    });
    expect(computeVariance(epic)).toBe('pending');
  });

  it("treats 'error' status as pending (fat desc) or flagged (thin)", () => {
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
    expect(computeVariance(buildEpic({ humanEstimate: null }))).toBe('pending');
  });
});

describe('computeVariance — step 3 (threshold boundaries)', () => {
  it("ratio exactly 0.20 → 'agree' (inclusive)", () => {
    // human=10, frame=8 → |10-8|/10 = 0.20
    const epic = buildEpic({
      humanEstimate: 10,
      frameResult: buildFrameResult({ frameEstimate: 8 }),
    });
    expect(computeVariance(epic)).toBe('agree');
  });

  // Deep-review I12: tightened boundary tests. Earlier "just above 0.20"
  // used ratio 0.375 — comfortably above the boundary but not tight.
  // We pin tight just-above cases here using Fibonacci-safe frame values.
  it("[I12] ratio just above 0.20 (≈ 0.2157) → 'caution'", () => {
    // human=51, frame=40 → |51-40|/51 = 11/51 = 0.2157...
    const epic = buildEpic({
      humanEstimate: 51,
      frameResult: buildFrameResult({ frameEstimate: 40 }),
    });
    expect(computeVariance(epic)).toBe('caution');
  });

  it("loose ratio 0.375 (well above 0.20) → 'caution'", () => {
    // Kept as a broader-band sanity check; not a boundary test.
    const epic = buildEpic({
      humanEstimate: 8,
      frameResult: buildFrameResult({ frameEstimate: 5 }),
    });
    expect(computeVariance(epic)).toBe('caution');
  });

  it("ratio exactly 0.50 → 'caution' (inclusive)", () => {
    // human=10, frame=5 → 0.50
    const epic = buildEpic({
      humanEstimate: 10,
      frameResult: buildFrameResult({ frameEstimate: 5 }),
    });
    expect(computeVariance(epic)).toBe('caution');
  });

  it("[I12] ratio just above 0.50 (≈ 0.5061) → 're-groom'", () => {
    // human=81, frame=40 → 41/81 = 0.5061...
    const epic = buildEpic({
      humanEstimate: 81,
      frameResult: buildFrameResult({ frameEstimate: 40 }),
    });
    expect(computeVariance(epic)).toBe('re-groom');
  });

  it("loose ratio 0.625 (well above 0.50) → 're-groom'", () => {
    // Kept as a broader-band sanity check.
    const epic = buildEpic({
      humanEstimate: 8,
      frameResult: buildFrameResult({ frameEstimate: 3 }),
    });
    expect(computeVariance(epic)).toBe('re-groom');
  });

  it('works symmetrically when FRAME is higher (denom = frame)', () => {
    // human=3, frame=8 → 5/8 = 0.625
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
    const cautionEpic = buildEpic({
      humanEstimate: 8,
      frameResult: buildFrameResult({ frameEstimate: 5, confidence: 0.1 }),
    });
    expect(computeVariance(cautionEpic)).toBe('caution');

    const reGroomEpic = buildEpic({
      humanEstimate: 8,
      frameResult: buildFrameResult({ frameEstimate: 3, confidence: 0.1 }),
    });
    expect(computeVariance(reGroomEpic)).toBe('re-groom');
  });
});

// ─── computePodMetrics ──────────────────────────────────────

describe('computePodMetrics', () => {
  it('empty pod: all-zero loads, zero avgConfidence (NOT NaN), correct totalCapacity', () => {
    const pod = buildPod();
    const metrics = computePodMetrics(pod);
    expect(metrics.totalCapacity).toBe(200);
    expect(metrics.humanLoad).toBe(0);
    expect(metrics.frameLoad).toBe(0);
    expect(metrics.balance).toBe(200);
    expect(metrics.avgConfidence).toBe(0);
    expect(metrics.epicCount).toBe(0);
    expect(metrics.flaggedCount).toBe(0);
    expect(metrics.reGroomCount).toBe(0);
  });

  it('normal pod with mixed bands: loads sum non-flagged epics only', () => {
    const pod = buildPod({
      epics: [
        buildEpic({
          id: 'E1',
          humanEstimate: 8,
          frameResult: buildFrameResult({ frameEstimate: 8, confidence: 0.9 }),
        }),
        buildEpic({
          id: 'E2',
          humanEstimate: 8,
          frameResult: buildFrameResult({ frameEstimate: 5, confidence: 0.8 }),
        }),
        buildEpic({
          id: 'E3',
          humanEstimate: 8,
          frameResult: buildFrameResult({ frameEstimate: 3, confidence: 0.7 }),
        }),
        buildEpic({
          id: 'E4',
          humanEstimate: 21,
          analysisStatus: 'raw',
          frameResult: null,
          description: 'thin',
        }),
      ],
    });
    const metrics = computePodMetrics(pod);
    expect(metrics.humanLoad).toBe(24);
    expect(metrics.frameLoad).toBe(16);
    expect(metrics.balance).toBe(200 - 16);
    expect(metrics.epicCount).toBe(4);
    expect(metrics.flaggedCount).toBe(1);
    expect(metrics.reGroomCount).toBe(1);
    expect(metrics.avgConfidence).toBeCloseTo(0.8, 10);
  });

  it('regression guard: flagged epic with humanEstimate is NOT added to humanLoad', () => {
    const pod = buildPod({
      epics: [
        buildEpic({ id: 'normal', humanEstimate: 13 }),
        buildEpic({
          id: 'flagged',
          humanEstimate: 100,
          analysisStatus: 'raw',
          frameResult: null,
          description: 'x',
        }),
      ],
    });
    const metrics = computePodMetrics(pod);
    expect(metrics.humanLoad).toBe(13);
    expect(metrics.flaggedCount).toBe(1);
  });

  it('all-flagged pod: humanLoad=0, frameLoad=0, balance=totalCapacity', () => {
    const pod = buildPod({
      epics: [
        buildEpic({
          id: 'F1',
          humanEstimate: 21,
          analysisStatus: 'raw',
          frameResult: null,
          description: '',
        }),
        buildEpic({
          id: 'F2',
          humanEstimate: 8,
          analysisStatus: 'raw',
          frameResult: null,
          description: 'tiny',
        }),
      ],
    });
    const metrics = computePodMetrics(pod);
    expect(metrics.humanLoad).toBe(0);
    expect(metrics.frameLoad).toBe(0);
    expect(metrics.balance).toBe(200);
    expect(metrics.avgConfidence).toBe(0);
    expect(metrics.epicCount).toBe(2);
    expect(metrics.flaggedCount).toBe(2);
    expect(metrics.reGroomCount).toBe(0);
  });

  it('pending epic (FRAME done, no human estimate): humanLoad excludes it, frameLoad includes it', () => {
    const pod = buildPod({
      epics: [
        buildEpic({
          id: 'P1',
          humanEstimate: null,
          frameResult: buildFrameResult({ frameEstimate: 13, confidence: 0.7 }),
        }),
      ],
    });
    const metrics = computePodMetrics(pod);
    expect(metrics.humanLoad).toBe(0);
    expect(metrics.frameLoad).toBe(13);
    expect(metrics.avgConfidence).toBeCloseTo(0.7, 10);
    expect(metrics.flaggedCount).toBe(0);
  });

  it('over-committed pod has negative balance', () => {
    const pod = buildPod({
      capacity: {
        resources: 1,
        spPerResource: 10,
        sprintCount: 1,
        holidayDays: 0,
        leaveDays: 0,
      },
      epics: [
        buildEpic({
          id: 'big',
          humanEstimate: 5,
          frameResult: buildFrameResult({ frameEstimate: 100 }),
        }),
      ],
    });
    const metrics = computePodMetrics(pod);
    expect(metrics.totalCapacity).toBe(10);
    expect(metrics.frameLoad).toBe(100);
    expect(metrics.balance).toBe(-90);
  });

  it('is pure — repeated calls return equal results', () => {
    const pod = buildPod({
      epics: [
        buildEpic({ id: 'A' }),
        buildEpic({
          id: 'B',
          humanEstimate: 5,
          frameResult: buildFrameResult({ frameEstimate: 13 }),
        }),
      ],
    });
    expect(computePodMetrics(pod)).toEqual(computePodMetrics(pod));
  });
});
