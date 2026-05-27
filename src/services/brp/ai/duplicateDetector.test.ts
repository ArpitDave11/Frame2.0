import { describe, it, expect } from 'vitest';
import {
  simulatedDuplicateDetector,
  getDuplicateDetector,
  DUPLICATE_THRESHOLD,
} from './duplicateDetector';
import type { Epic } from '@/domain/brp';

const epic = (id: string, title: string): Epic => ({
  id,
  iid: Number(id) || 0,
  title,
  description: '',
  gitlabWebUrl: '',
  podId: 'p1',
  source: 'gitlab',
  humanEstimate: null,
  analysisStatus: 'raw',
  frameResult: null,
});

describe('simulatedDuplicateDetector', () => {
  it('returns empty for 0 or 1 epic', async () => {
    expect(await simulatedDuplicateDetector.findDuplicates([])).toEqual([]);
    expect(
      await simulatedDuplicateDetector.findDuplicates([epic('1', 'anything')]),
    ).toEqual([]);
  });

  it('returns no groups when titles are clearly distinct', async () => {
    const result = await simulatedDuplicateDetector.findDuplicates([
      epic('1', 'Implement payment checkout flow'),
      epic('2', 'Migrate database schema for reporting'),
      epic('3', 'Onboarding email templates'),
    ]);
    expect(result).toEqual([]);
  });

  it('groups two epics with near-identical titles', async () => {
    // "improve checkout flow performance" vs "improve checkout flow speed"
    // tokens: {improve, checkout, flow, performance} vs {improve, checkout, flow, speed}
    // intersection 3, union 5 → 3/5 = 0.6 ≥ threshold.
    const result = await simulatedDuplicateDetector.findDuplicates([
      epic('1', 'Improve checkout flow performance'),
      epic('2', 'Improve checkout flow speed'),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.epicIds.sort()).toEqual(['1', '2']);
    expect(result[0]?.topSimilarity).toBeGreaterThanOrEqual(DUPLICATE_THRESHOLD);
  });

  it('groups transitively (A~B, B~C → {A,B,C})', async () => {
    const result = await simulatedDuplicateDetector.findDuplicates([
      epic('1', 'Improve checkout flow performance'),
      epic('2', 'Improve checkout flow speed'),
      epic('3', 'Checkout flow performance improvements'),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.epicIds.sort()).toEqual(['1', '2', '3']);
  });

  it('treats stop words like "the" / "a" / "for" as noise', async () => {
    // tokens both: {checkout, flow, performance} → 3/3 = 1.0
    const result = await simulatedDuplicateDetector.findDuplicates([
      epic('1', 'Checkout flow performance'),
      epic('2', 'The checkout flow performance'),
    ]);
    expect(result).toHaveLength(1);
  });

  it('exposes the highest pairwise similarity inside the group', async () => {
    // Identical 4-token overlap from 5-token sets → 4 / (5+5-4) = 4/6 ≈ 0.667
    const result = await simulatedDuplicateDetector.findDuplicates([
      epic('1', 'one two three four five'),
      epic('2', 'one two three four six'),
    ]);
    expect(result[0]?.topSimilarity).toBeCloseTo(4 / 6, 2);
  });

  it('returns multiple disjoint groups when present', async () => {
    // Group A: "user authentication login bug" pair → intersection 3 of union 4 = 0.75
    // Group B: "billing report monthly export" pair → intersection 3 of union 4 = 0.75
    const result = await simulatedDuplicateDetector.findDuplicates([
      epic('a1', 'user authentication login bug'),
      epic('a2', 'user authentication login fix'),
      epic('b1', 'billing report monthly export'),
      epic('b2', 'billing report monthly download'),
      epic('z', 'migrate logging opentelemetry stack'),
    ]);
    expect(result).toHaveLength(2);
    const groupKeys = result.map((g) => g.epicIds.sort().join(',')).sort();
    expect(groupKeys).toEqual(['a1,a2', 'b1,b2']);
  });

  it('is deterministic — same inputs always produce the same groups', async () => {
    const epics = [
      epic('1', 'Improve checkout flow performance'),
      epic('2', 'Improve checkout flow speed'),
    ];
    const a = await simulatedDuplicateDetector.findDuplicates(epics);
    const b = await simulatedDuplicateDetector.findDuplicates(epics);
    expect(a).toEqual(b);
  });
});

describe('getDuplicateDetector', () => {
  it('returns the simulated detector by default', () => {
    expect(getDuplicateDetector()).toBe(simulatedDuplicateDetector);
  });
});
