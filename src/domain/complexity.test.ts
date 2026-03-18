import { describe, it, expect } from 'vitest';
import {
  COMPLEXITY_CONFIGS,
  getComplexityConfig,
  getScaledWordTarget,
  getScaledStoryCount,
} from './complexity';
import type { ComplexityLevel } from './types';

// ─── getComplexityConfig ────────────────────────────────────

describe('getComplexityConfig', () => {
  it('simple returns multiplier 0.5', () => {
    expect(getComplexityConfig('simple').wordTargetMultiplier).toBe(0.5);
  });

  it('moderate returns multiplier 1.0', () => {
    expect(getComplexityConfig('moderate').wordTargetMultiplier).toBe(1.0);
  });

  it('complex returns upper-bound multiplier (1.5)', () => {
    expect(getComplexityConfig('complex').wordTargetMultiplier).toBe(1.5);
  });

  it('simple validation threshold is 70', () => {
    expect(getComplexityConfig('simple').validationThreshold).toBe(70);
  });

  it('moderate validation threshold is 80', () => {
    expect(getComplexityConfig('moderate').validationThreshold).toBe(80);
  });

  it('complex validation threshold is 85', () => {
    expect(getComplexityConfig('complex').validationThreshold).toBe(85);
  });

  it('simple max iterations is 2', () => {
    expect(getComplexityConfig('simple').maxPipelineIterations).toBe(2);
  });

  it('moderate max iterations is 3', () => {
    expect(getComplexityConfig('moderate').maxPipelineIterations).toBe(3);
  });

  it('complex max iterations is 5', () => {
    expect(getComplexityConfig('complex').maxPipelineIterations).toBe(5);
  });

  it('simple section inclusion is required-only', () => {
    expect(getComplexityConfig('simple').sectionInclusion).toBe('required-only');
  });

  it('complex section inclusion is all', () => {
    expect(getComplexityConfig('complex').sectionInclusion).toBe('all');
  });

  it('simple does not include story points', () => {
    expect(getComplexityConfig('simple').includeStoryPoints).toBe(false);
  });

  it('moderate includes story points', () => {
    expect(getComplexityConfig('moderate').includeStoryPoints).toBe(true);
  });

  it('complex includes story points', () => {
    expect(getComplexityConfig('complex').includeStoryPoints).toBe(true);
  });

  it('simple diagram complexity is single', () => {
    expect(getComplexityConfig('simple').diagramComplexity).toBe('single');
  });

  it('complex diagram complexity is multiple', () => {
    expect(getComplexityConfig('complex').diagramComplexity).toBe('multiple');
  });

  it('simple format complexity is simplified', () => {
    expect(getComplexityConfig('simple').formatComplexity).toBe('simplified');
  });

  it('complex format complexity is full', () => {
    expect(getComplexityConfig('complex').formatComplexity).toBe('full');
  });

  it('simple acceptance criteria per story is 1-2', () => {
    const ac = getComplexityConfig('simple').acceptanceCriteriaPerStory;
    expect(ac).toEqual({ min: 1, max: 2 });
  });

  it('complex acceptance criteria per story is 3-5', () => {
    const ac = getComplexityConfig('complex').acceptanceCriteriaPerStory;
    expect(ac).toEqual({ min: 3, max: 5 });
  });
});

// ─── All 3 levels have valid configs ────────────────────────

describe('COMPLEXITY_CONFIGS completeness', () => {
  const levels: ComplexityLevel[] = ['simple', 'moderate', 'complex'];
  const requiredKeys = [
    'sectionInclusion',
    'wordTargetMultiplier',
    'storyCountRange',
    'acceptanceCriteriaPerStory',
    'includeStoryPoints',
    'diagramComplexity',
    'validationThreshold',
    'maxPipelineIterations',
    'formatComplexity',
  ];

  for (const level of levels) {
    it(`${level} config has all required fields`, () => {
      const config = COMPLEXITY_CONFIGS[level];
      for (const key of requiredKeys) {
        expect(config).toHaveProperty(key);
        expect((config as unknown as Record<string, unknown>)[key]).not.toBeUndefined();
      }
    });
  }
});

// ─── getScaledWordTarget ────────────────────────────────────

describe('getScaledWordTarget', () => {
  it('simple scales 200 to ~100', () => {
    expect(getScaledWordTarget(200, 'simple')).toBe(100);
  });

  it('moderate scales 200 to 200', () => {
    expect(getScaledWordTarget(200, 'moderate')).toBe(200);
  });

  it('complex scales 200 to >= 200', () => {
    expect(getScaledWordTarget(200, 'complex')).toBeGreaterThanOrEqual(200);
  });

  it('complex scales 200 to 300', () => {
    expect(getScaledWordTarget(200, 'complex')).toBe(300);
  });

  it('rounds to integer', () => {
    const result = getScaledWordTarget(333, 'simple');
    expect(Number.isInteger(result)).toBe(true);
    expect(result).toBe(167); // 333 * 0.5 = 166.5, rounded to 167
  });
});

// ─── getScaledStoryCount ────────────────────────────────────

describe('getScaledStoryCount', () => {
  it('simple story count range is 5-8', () => {
    expect(getScaledStoryCount('simple')).toEqual({ min: 5, max: 8 });
  });

  it('moderate story count range is 10-15', () => {
    expect(getScaledStoryCount('moderate')).toEqual({ min: 10, max: 15 });
  });

  it('complex story count range is 15-25', () => {
    expect(getScaledStoryCount('complex')).toEqual({ min: 15, max: 25 });
  });
});
