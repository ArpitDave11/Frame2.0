/**
 * BRP AI seam — deterministic simulated estimator (B-9).
 *
 * Produces realistic-looking FrameResults for any Epic without an LLM
 * call. Same `epic.id` → same FrameResult (across reruns, across
 * processes), so Phase 5 components and integration tests can rely on
 * stable analysis output until the real LLM estimator lands in P7.
 *
 * NOT pure in the strictest sense — `analyzedAt` carries a real
 * timestamp so downstream UI can render "last analyzed" sensibly. The
 * content fields (frameEstimate, breakdown, confidence) ARE
 * deterministic from the epic id; the determinism tests assert that.
 *
 * The store imports only the AIEstimator interface from
 * `src/domain/brp.ts` and never reaches into this file directly; the
 * provider in `estimatorProvider.ts` is the single seam.
 */

import type {
  AIEstimator,
  AnalysisEvent,
  BreakdownItem,
  Epic,
  FibonacciPoint,
  FrameResult,
  ReferenceEpic,
} from '../../../domain/brp';
import { FIBONACCI_POINTS } from '../../../domain/brp.constants';

// ─── Deterministic randomness ───────────────────────────────

/**
 * Java-style string hash (32-bit signed → unsigned), used as the seed
 * for the PRNG below. Same input string → same number across reruns.
 */
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 1; // avoid 0-seed degeneracy
}

/**
 * Mulberry32 — small fast deterministic PRNG. Same seed → same sequence.
 * Returns a function that yields uniform values in [0, 1) on each call.
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// ─── Estimate selection ─────────────────────────────────────

/**
 * Pick the FrameEstimate from the Fibonacci scale. We bias slightly away
 * from the tails (1 and 100 are rare in real planning) by sampling from
 * the middle 7 values most of the time and the tails occasionally.
 */
function pickFrameEstimate(rng: () => number): FibonacciPoint {
  // 80% of the time pick from FIBONACCI_POINTS[1..7] (2..40), else any.
  const useMiddle = rng() < 0.8;
  if (useMiddle) {
    const middle = FIBONACCI_POINTS.slice(1, 8); // 2,3,5,8,13,21,40
    return middle[Math.floor(rng() * middle.length)]!;
  }
  return FIBONACCI_POINTS[Math.floor(rng() * FIBONACCI_POINTS.length)]!;
}

// ─── Breakdown templates ────────────────────────────────────

/**
 * Pre-curated breakdown templates per Fibonacci point value. Each
 * template's `points` array sums to within ±1 of the key — checked by
 * the test suite. Templates avoid the "single-item breakdown is boring"
 * trap by including at least one multi-item template per non-trivial key.
 *
 * Why precomputed: greedy or random splits of a Fibonacci target into
 * Fibonacci pieces drift outside the ±1 tolerance for 40 and 100 (the
 * gaps between 21↔40 and 40↔100 are large). A small lookup table is
 * cheaper to reason about than a constraint-satisfaction routine.
 */
const BREAKDOWN_TEMPLATES: Readonly<Record<FibonacciPoint, ReadonlyArray<ReadonlyArray<FibonacciPoint>>>> = {
  1: [[1]],
  2: [[2], [1, 1]],
  3: [[3], [1, 2]],
  5: [[5], [2, 3]],
  8: [[8], [3, 5], [3, 3, 2]],
  13: [[13], [5, 8], [3, 5, 5]],
  21: [[21], [8, 13], [5, 8, 8]],
  40: [[40], [21, 13, 5], [13, 13, 13], [21, 8, 8, 3]],
  100: [[100], [40, 40, 21], [40, 40, 13, 8], [40, 21, 21, 13, 5]],
};

const COMPONENT_TITLES = [
  'Core implementation',
  'Tests & validation',
  'Integration glue',
  'Edge cases & polish',
  'Migration',
];

function pickBreakdown(target: FibonacciPoint, rng: () => number): BreakdownItem[] {
  const templates = BREAKDOWN_TEMPLATES[target];
  const template = templates[Math.floor(rng() * templates.length)]!;
  return template.map((points, i) => ({
    title: COMPONENT_TITLES[i] ?? `Component ${i + 1}`,
    points,
  }));
}

// ─── Confidence ─────────────────────────────────────────────

/**
 * Confidence inversely tracks breakdown variance (coefficient of
 * variation), with a small deterministic jitter from the rng. Clamped
 * to [0.1, 0.95] so the value is always usable as a probability.
 *
 *   Single-item breakdown    → ~0.90–0.95 (high confidence, no spread)
 *   Tight 2-3 item breakdown → ~0.65–0.85
 *   Wide multi-item breakdown→ approaches 0.10 (low confidence)
 */
function computeConfidence(breakdown: readonly BreakdownItem[], rng: () => number): number {
  if (breakdown.length === 1) {
    return clamp(0.92 + (rng() - 0.5) * 0.06, 0.1, 0.95);
  }
  const points = breakdown.map((b) => b.points);
  const mean = points.reduce((s, p) => s + p, 0) / points.length;
  if (mean === 0) return 0.1;
  const variance = points.reduce((s, p) => s + (p - mean) ** 2, 0) / points.length;
  const stdev = Math.sqrt(variance);
  const cv = stdev / mean; // coefficient of variation
  // Baseline 0.85 for tight breakdowns; each unit of cv removes 0.5;
  // ±0.05 deterministic jitter from rng.
  const raw = 0.85 - cv * 0.5 + (rng() - 0.5) * 0.1;
  return clamp(raw, 0.1, 0.95);
}

// ─── Rationale ──────────────────────────────────────────────

function buildRationale(
  epic: Epic,
  frameEstimate: FibonacciPoint,
  refCount: number,
): string {
  const titleSnippet = epic.title.length > 60 ? `${epic.title.slice(0, 60)}…` : epic.title;
  if (refCount > 0) {
    return `"${titleSnippet}" sized as ${frameEstimate} SP from ${refCount} similar reference epic(s). Breakdown follows the dominant work pattern observed in those references.`;
  }
  return `"${titleSnippet}" sized as ${frameEstimate} SP using structural cues from the epic's title and description. No closed reference epics were available, so confidence is reduced accordingly.`;
}

// ─── The estimator ──────────────────────────────────────────

export const SIMULATOR_MODEL_VERSION = 'brp-simulator-v1';

/**
 * Create a fresh simulated AIEstimator. Each instance is stateless;
 * determinism comes from the `epic.id`-seeded PRNG per call, not from
 * shared state on the instance. Multiple parallel estimators are safe.
 */
export function createSimulatedEstimator(): AIEstimator {
  return {
    async *analyzeEpic(
      epic: Epic,
      references: readonly ReferenceEpic[],
    ): AsyncIterable<AnalysisEvent> {
      const seed = hashCode(epic.id);
      const rng = mulberry32(seed);

      // Started — terminal marker for "I've picked this one up".
      yield { kind: 'started', epicId: epic.id };

      // One progress tick mid-flight. A real LLM might emit many; for
      // the simulator one is enough to exercise consumer event loops.
      yield { kind: 'progress', epicId: epic.id, pct: 0.5 };

      // Compose the result deterministically.
      const frameEstimate = pickFrameEstimate(rng);
      const breakdown = pickBreakdown(frameEstimate, rng);
      const confidence = computeConfidence(breakdown, rng);
      // Pass through up to 3 of the caller-supplied references.
      const usedRefs = references.slice(0, 3);

      const result: FrameResult = {
        frameEstimate,
        breakdown,
        rationale: buildRationale(epic, frameEstimate, usedRefs.length),
        confidence,
        references: [...usedRefs],
        generatedStories: null,
        modelVersion: SIMULATOR_MODEL_VERSION,
        // Real wall-clock time — this is the one non-deterministic field
        // on purpose, so the UI can render "last analyzed N seconds ago".
        // Determinism tests assert equality of everything EXCEPT this.
        analyzedAt: new Date().toISOString(),
      };

      yield { kind: 'done', epicId: epic.id, result };
    },
  };
}
