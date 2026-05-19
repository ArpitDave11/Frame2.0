/**
 * Issue Refinery — shared pipeline result types.
 *
 * These interfaces describe the strict JSON-schema outputs of the three
 * stages (Comprehension, Refinement, Validation). Zod schemas in
 * `schemas.ts` are designed to produce values matching these shapes;
 * `z.infer<>` types from the schemas should be structurally identical.
 *
 * Defined in their own module so the store (R-2) can depend on them
 * without pulling in the Zod schema module (R-3).
 */

export interface ComprehensionResult {
  /** 1–2 sentences. The core outcome the parent epic targets. */
  epicIntent: string;
  /** 1–2 sentences. The core change the current issue proposes. */
  issueIntent: string;
  /**
   * Specific gaps in the issue body relative to the epic intent.
   * Empty array if none. Each item ≤ 25 words.
   */
  gaps: string[];
  /**
   * Vague or interpretable phrases in the issue body. Each item ≤ 25 words.
   */
  ambiguities: string[];
  /**
   * Notes about how this issue should align with the epic. Each ≤ 30 words.
   */
  alignmentNotes: string[];
}

export interface RefinementResult {
  /**
   * Full rewritten issue body in Markdown. Contains four sections in order:
   * ## Summary, ## Context, ## Acceptance Criteria, ## Technical Notes.
   * No H1. Word budget 150–450.
   */
  refinedBody: string;
}

export interface ValidationResult {
  /** Quality score 0–100 per the rubric (clarity 25, completeness 25, testable AC 25, alignment 25). */
  score: number;
  /**
   * Findings the user should consider. Each ≤ 20 words. Prefixed with
   * `[critical]`, `[important]`, or `[nit]` so the UI can color-code.
   * Empty array if score = 100.
   */
  findings: string[];
}

/**
 * Phase machine for the Issue Refinery store.
 *
 * Forward transitions only (idle → comprehending → refining → validating
 * → ready → publishing → idle). Reverse transitions allowed only from
 * `ready` (back to `comprehending` on user-initiated re-Refine) or from
 * `error` (back to `idle` on user dismiss).
 */
export type Phase =
  | 'idle'
  | 'comprehending'
  | 'refining'
  | 'validating'
  | 'ready'
  | 'publishing'
  | 'error';
