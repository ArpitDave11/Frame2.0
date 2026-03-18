/**
 * Complexity Scaling Configuration — BRD FR-5.
 *
 * Maps each ComplexityLevel to scaling factors that control how deep
 * the AI pipeline goes: section inclusion, word targets, story counts,
 * validation thresholds, and pipeline iteration limits.
 */

import type { ComplexityLevel } from './types';

// ─── Config Interface ───────────────────────────────────────

export interface ComplexityConfig {
  sectionInclusion: 'required-only' | 'required-plus-key-optional' | 'all';
  wordTargetMultiplier: number;
  storyCountRange: { min: number; max: number };
  acceptanceCriteriaPerStory: { min: number; max: number };
  includeStoryPoints: boolean;
  diagramComplexity: 'single' | 'standard' | 'multiple';
  validationThreshold: number;
  maxPipelineIterations: number;
  formatComplexity: 'simplified' | 'standard' | 'full';
}

// ─── Scaling Configs (BRD FR-5 Table) ───────────────────────

export const COMPLEXITY_CONFIGS: Readonly<Record<ComplexityLevel, Readonly<ComplexityConfig>>> = Object.freeze({
  simple: Object.freeze({
    sectionInclusion: 'required-only',
    wordTargetMultiplier: 0.5,
    storyCountRange: { min: 5, max: 8 },
    acceptanceCriteriaPerStory: { min: 1, max: 2 },
    includeStoryPoints: false,
    diagramComplexity: 'single',
    validationThreshold: 70,
    maxPipelineIterations: 2,
    formatComplexity: 'simplified',
  }),
  moderate: Object.freeze({
    sectionInclusion: 'required-plus-key-optional',
    wordTargetMultiplier: 1.0,
    storyCountRange: { min: 10, max: 15 },
    acceptanceCriteriaPerStory: { min: 2, max: 3 },
    includeStoryPoints: true,
    diagramComplexity: 'standard',
    validationThreshold: 80,
    maxPipelineIterations: 3,
    formatComplexity: 'standard',
  }),
  complex: Object.freeze({
    sectionInclusion: 'all',
    wordTargetMultiplier: 1.5,
    storyCountRange: { min: 15, max: 25 },
    acceptanceCriteriaPerStory: { min: 3, max: 5 },
    includeStoryPoints: true,
    diagramComplexity: 'multiple',
    validationThreshold: 85,
    maxPipelineIterations: 5,
    formatComplexity: 'full',
  }),
});

// ─── Accessor Functions ─────────────────────────────────────

export function getComplexityConfig(level: ComplexityLevel): ComplexityConfig {
  return COMPLEXITY_CONFIGS[level];
}

export function getScaledWordTarget(
  baseTarget: number,
  level: ComplexityLevel,
): number {
  return Math.round(baseTarget * COMPLEXITY_CONFIGS[level].wordTargetMultiplier);
}

export function getScaledStoryCount(
  level: ComplexityLevel,
): { min: number; max: number } {
  return COMPLEXITY_CONFIGS[level].storyCountRange;
}
