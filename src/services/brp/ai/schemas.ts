/**
 * BRP AI seam — Zod runtime schemas (B-8).
 *
 * The Phase 1 TypeScript types in `src/domain/brp.ts` are erased at
 * runtime, so anything that produces a `FrameResult` or an `AnalysisEvent`
 * outside of TypeScript's reach — e.g., a future real LLM estimator that
 * returns parsed JSON in Phase 7 — needs a Zod schema to validate the
 * shape at the boundary.
 *
 * These schemas mirror the domain types 1:1. Whenever you change a type
 * in `src/domain/brp.ts`, update the matching schema here.
 *
 * The current `simulatedEstimator` (B-9) is fully TypeScript-typed and
 * by construction cannot emit invalid events — so the simulator does not
 * itself run these schemas at runtime (that would be redundant work).
 * The schemas exist so that:
 *   1. Tests can prove the schema matches the type (drift caught early).
 *   2. The Phase 7 real estimator has a ready-made parser at its
 *      LLM-output boundary.
 *   3. Any external caller can validate untrusted input cheaply.
 */

import { z } from 'zod';
import type {
  BreakdownItem,
  FibonacciPoint,
  FrameResult,
  GeneratedStory,
  ReferenceEpic,
  SizedStory,
  SplitPattern,
  StoryProvenance,
} from '../../../domain/brp';
import type { AnalysisEvent } from './types';

// ─── FibonacciPoint ─────────────────────────────────────────

/**
 * Runtime mirror of `FibonacciPoint`. Order matches `FIBONACCI_POINTS` in
 * `brp.constants.ts`. A union of number literals — Zod has no built-in
 * "enum of numbers", and number-keyed `z.enum` is strings-only.
 */
export const FibonacciPointSchema: z.ZodType<FibonacciPoint> = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(5),
  z.literal(8),
  z.literal(13),
  z.literal(21),
  z.literal(40),
  z.literal(100),
]);

// ─── FrameResult sub-shapes ─────────────────────────────────

export const BreakdownItemSchema: z.ZodType<BreakdownItem> = z.object({
  title: z.string(),
  points: FibonacciPointSchema,
});

export const ReferenceEpicSchema: z.ZodType<ReferenceEpic> = z.object({
  epicId: z.string(),
  title: z.string(),
  similarity: z.number().min(0).max(1),
  actualSp: z.number(),
});

export const GeneratedStorySchema: z.ZodType<GeneratedStory> = z.object({
  title: z.string(),
  points: FibonacciPointSchema,
  acceptanceCriteria: z.array(z.string()),
});

/** Runtime mirror of `SplitPattern` (SPIDR). */
export const SplitPatternSchema: z.ZodType<SplitPattern> = z.enum([
  'Spike',
  'Path',
  'Interface',
  'Data',
  'Rules',
]);

/** Runtime mirror of `StoryProvenance`. */
export const StoryProvenanceSchema: z.ZodType<StoryProvenance> = z.enum([
  'existing',
  'frame-generated',
]);

/**
 * Runtime mirror of `SizedStory` (D14) — the single canonical decomposition
 * unit. `points` is constrained to the Fibonacci ladder so an invalid weight
 * is rejected at the LLM-output boundary (Layer 2 of the trust stack).
 */
export const SizedStorySchema: z.ZodType<SizedStory> = z.object({
  title: z.string(),
  points: FibonacciPointSchema,
  acceptanceCriteria: z.array(z.string()),
  splitPattern: SplitPatternSchema,
  provenance: StoryProvenanceSchema,
  referenceEpicId: z.string().optional(),
  rationale: z.string().optional(),
});

/**
 * The shape the Azure model is now asked to emit (T6): just the canonical
 * decomposition + an overall rationale/confidence. It deliberately does NOT
 * include an epic total — the load is computed in code as Σ stories.points
 * (INV2), so the model is never given the chance to contradict its own
 * stories. Count and acceptance-criteria checks are enforced in the
 * estimator's validation layer (with targeted re-prompt feedback), not here.
 */
export const EstimatorOutputSchema = z.object({
  stories: z.array(SizedStorySchema),
  rationale: z.string(),
  confidence: z.number().min(0).max(1),
});

export type EstimatorOutput = z.infer<typeof EstimatorOutputSchema>;

// ─── FrameResult ────────────────────────────────────────────

export const FrameResultSchema: z.ZodType<FrameResult> = z.object({
  frameEstimate: FibonacciPointSchema,
  breakdown: z.array(BreakdownItemSchema),
  /** Canonical decomposition (D14); optional during phased migration. */
  stories: z.array(SizedStorySchema).optional(),
  rationale: z.string(),
  /** Confidence is constrained to [0, 1]. */
  confidence: z.number().min(0).max(1),
  references: z.array(ReferenceEpicSchema),
  generatedStories: z.array(GeneratedStorySchema).nullable(),
  modelVersion: z.string(),
  /** ISO-8601 timestamp; not regex-validated here — keep the schema permissive. */
  analyzedAt: z.string(),
});

// ─── AnalysisEvent ──────────────────────────────────────────

/**
 * Discriminated union on `kind`. The 'progress' variant constrains `pct`
 * to [0, 1] so a buggy producer can't emit nonsensical percentages.
 */
export const AnalysisEventSchema: z.ZodType<AnalysisEvent> = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('started'),
    epicId: z.string(),
  }),
  z.object({
    kind: z.literal('progress'),
    epicId: z.string(),
    pct: z.number().min(0).max(1),
  }),
  z.object({
    kind: z.literal('done'),
    epicId: z.string(),
    result: FrameResultSchema,
  }),
  z.object({
    kind: z.literal('error'),
    epicId: z.string(),
    message: z.string(),
  }),
]);
