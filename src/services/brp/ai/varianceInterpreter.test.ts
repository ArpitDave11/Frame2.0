import { describe, it, expect } from 'vitest';
import {
  simulatedVarianceInterpreter,
  getVarianceInterpreter,
} from './varianceInterpreter';
import type { Epic, FrameResult } from '@/domain/brp';

const frameResult = (
  estimate: number,
  confidence = 0.8,
  breakdownLines = 2,
): FrameResult => ({
  frameEstimate: estimate as FrameResult['frameEstimate'],
  breakdown: Array.from({ length: breakdownLines }, (_, i) => ({
    title: `b${i}`,
    points: 3 as FrameResult['frameEstimate'],
  })),
  rationale: 'r',
  confidence,
  references: [],
  generatedStories: null,
  modelVersion: 'sim',
  analyzedAt: '2026-05-23T00:00:00Z',
});

const epic = (overrides: Partial<Epic> = {}): Epic => ({
  id: 'e1',
  iid: 1,
  title: 't',
  description: 'a'.repeat(200),
  gitlabWebUrl: 'x',
  podId: 'p1',
  source: 'gitlab',
  humanEstimate: 5,
  analysisStatus: 'done',
  frameResult: frameResult(5),
  ...overrides,
});

describe('simulatedVarianceInterpreter', () => {
  it('returns null for agree variance', async () => {
    const r = await simulatedVarianceInterpreter.explain(epic());
    expect(r).toBeNull();
  });

  it('returns null for pending variance (human estimate missing)', async () => {
    const r = await simulatedVarianceInterpreter.explain(
      epic({ humanEstimate: null }),
    );
    expect(r).toBeNull();
  });

  it('returns null for pending variance (no FRAME result yet despite long description)', async () => {
    // Long description + no frameResult → variance is 'pending' (not flagged),
    // so the interpreter has no message — it leaves UI silent.
    const r = await simulatedVarianceInterpreter.explain(
      epic({ analysisStatus: 'raw', frameResult: null }),
    );
    expect(r).toBeNull();
  });

  it('explains flagged when description is below the min length', async () => {
    const r = await simulatedVarianceInterpreter.explain(
      epic({ description: 'short', analysisStatus: 'raw', frameResult: null }),
    );
    expect(r?.band).toBe('flagged');
    expect(r?.message).toMatch(/description too short/i);
  });

  it('explains caution with direction + magnitude + breakdown count', async () => {
    // human=5, frame=8 → delta=+3 → |3|/8 = 0.375 → caution
    const r = await simulatedVarianceInterpreter.explain(
      epic({ humanEstimate: 5, frameResult: frameResult(8, 0.8, 3) }),
    );
    expect(r?.band).toBe('caution');
    expect(r?.message).toContain('higher by 3');
    expect(r?.message).toContain('3 breakdown lines');
  });

  it('explains re-groom with a grooming recommendation', async () => {
    // human=1, frame=8 → |7|/8 = 0.875 → re-groom
    const r = await simulatedVarianceInterpreter.explain(
      epic({ humanEstimate: 1, frameResult: frameResult(8, 0.8, 2) }),
    );
    expect(r?.band).toBe('re-groom');
    expect(r?.message).toMatch(/grooming/i);
  });

  it('uses "lower" wording when delta is negative (planner > FRAME)', async () => {
    const r = await simulatedVarianceInterpreter.explain(
      epic({ humanEstimate: 8, frameResult: frameResult(5, 0.8, 2) }),
    );
    expect(r?.message).toContain('lower by 3');
  });

  it('handles empty breakdown gracefully', async () => {
    const r = await simulatedVarianceInterpreter.explain(
      epic({ humanEstimate: 1, frameResult: frameResult(8, 0.8, 0) }),
    );
    expect(r?.message).toContain('no breakdown line');
  });
});

describe('getVarianceInterpreter', () => {
  it('returns the simulated interpreter by default', () => {
    expect(getVarianceInterpreter()).toBe(simulatedVarianceInterpreter);
  });
});
