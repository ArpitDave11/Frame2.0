/**
 * Story-quality validation for the FRAME estimator (T6, trust Layer 2).
 *
 * JSON Schema / zod can lock the SHAPE and the Fibonacci enum, but not the
 * cross-cutting quality rules (INVEST: at least one acceptance criterion;
 * a sensible story count). Those are enforced here so a malformed
 * decomposition is rejected — and, on the first failure, fed back to the
 * model as targeted re-prompt guidance rather than silently "fixed".
 */

import { FIBONACCI_POINTS } from '@/domain/brp.constants';
import type { SizedStory } from '@/domain/brp';

/** A decomposition smaller than this isn't a breakdown; larger should be combined. */
export const MIN_STORIES = 2;
export const MAX_STORIES = 8;

export interface StoryValidationResult {
  ok: boolean;
  /** Human-readable issues, used verbatim as model re-prompt feedback. */
  errors: string[];
}

export function validateStories(stories: readonly SizedStory[]): StoryValidationResult {
  const errors: string[] = [];

  if (stories.length < MIN_STORIES) {
    errors.push(`Produce at least ${MIN_STORIES} stories (got ${stories.length}); split the work further.`);
  }
  if (stories.length > MAX_STORIES) {
    errors.push(`Produce at most ${MAX_STORIES} stories (got ${stories.length}); combine the smallest ones.`);
  }

  const fib = new Set<number>(FIBONACCI_POINTS);
  stories.forEach((s, i) => {
    const label = `Story ${i + 1} ("${s.title}")`;
    if (!fib.has(s.points)) {
      errors.push(`${label} has points=${s.points}, which is not a Fibonacci value (${FIBONACCI_POINTS.join(', ')}).`);
    }
    const acCount = (s.acceptanceCriteria ?? []).filter((a) => a.trim().length > 0).length;
    if (acCount === 0) {
      errors.push(`${label} has no acceptance criteria; every story needs at least one.`);
    }
  });

  return { ok: errors.length === 0, errors };
}
