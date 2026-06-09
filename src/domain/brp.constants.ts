/**
 * BRP Constants — Phase 1 (B-1).
 *
 * The Fibonacci scale, variance thresholds, and capacity defaults referenced
 * by the pure functions in `brp.ts`. Centralized here so a UI knob or a
 * later A/B test can change a single number without code-grepping for it.
 *
 * Values frozen at module level. No magic numbers should appear in `brp.ts`.
 */

import type { FibonacciPoint } from './brp';

// ─── Scales ─────────────────────────────────────────────────

/**
 * The canonical Fibonacci point scale used for FRAME estimates.
 * Order matters — used as a discrete domain for hash-seeded sampling
 * in the simulator (Phase 3). Frozen as readonly tuple.
 */
export const FIBONACCI_POINTS: readonly FibonacciPoint[] = Object.freeze([
  1, 2, 3, 5, 8, 13, 21, 40, 100,
] as const);

// ─── Capacity defaults ──────────────────────────────────────

/** Default story-points per resource per sprint when a Pod is loaded raw. */
export const DEFAULT_SP_PER_RESOURCE = 10;

// ─── Variance thresholds ────────────────────────────────────

/**
 * Variance band thresholds for `computeVariance`. The ratio is
 * `|delta| / max(humanEstimate, frameEstimate)`.
 *
 *   ratio ≤ AGREE   → 'agree'
 *   ratio ≤ CAUTION → 'caution'
 *   else            → 're-groom'
 *
 * Boundaries are inclusive (≤), so a ratio of exactly 0.20 is 'agree'.
 */
export const VARIANCE_AGREE_THRESHOLD = 0.2;
export const VARIANCE_CAUTION_THRESHOLD = 0.5;

/**
 * If `computeVariance` would return 'agree' but the FrameResult's
 * `confidence` is below this threshold, the band is bumped to 'caution'.
 * Rationale: a low-confidence agreement is not a real agreement.
 */
export const CONFIDENCE_BUMP_THRESHOLD = 0.4;

// ─── Description heuristic (flagged) ────────────────────────

/**
 * Minimum description length (characters) below which an unanalyzed Epic
 * is considered too thin to estimate and is returned as 'flagged' by
 * `computeVariance` instead of 'pending'.
 *
 * 80 chars ≈ one short sentence. Conservative: most real epics clear this
 * easily; only obviously empty stubs are flagged. Document-driven refinement
 * in Phase 5 may revise this against real data.
 */
export const FLAGGED_DESCRIPTION_MIN_CHARS = 80;
