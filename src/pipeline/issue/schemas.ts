/**
 * Issue Refinery — Zod schemas for all three pipeline stages (R-3).
 *
 * Authoritative contracts for the strict-`json_schema` response_format
 * passed to Azure OpenAI. The `.describe()` calls on each field carry
 * the budget/vocabulary rules that the model treats as contractual —
 * per the Azure prompt-engineering research, putting constraints in
 * schema descriptions is materially stronger than putting them in
 * prose prompts.
 *
 * Inferred types (`z.infer<typeof XSchema>`) must be structurally
 * compatible with the predeclared interfaces in `./types.ts`. The
 * compatibility is asserted at compile time via the `satisfies` checks
 * at the bottom of this file.
 */

import { z } from 'zod';
import type {
  ComprehensionResult,
  RefinementResult,
  ValidationResult,
} from './types';

// ─── Comprehension ──────────────────────────────────────────────────

export const ComprehensionSchema = z.object({
  epicIntent: z
    .string()
    .min(1)
    .describe('1–2 sentences. The core outcome the parent epic targets.'),
  issueIntent: z
    .string()
    .min(1)
    .describe('1–2 sentences. The core change the current issue proposes.'),
  gaps: z
    .array(z.string())
    .max(8)
    .describe(
      'Specific gaps in the issue body relative to the epic intent. Each item ≤ 25 words. Empty array if none.',
    ),
  ambiguities: z
    .array(z.string())
    .max(8)
    .describe(
      'Vague or interpretable phrases in the issue body, each ≤ 25 words. Quote the ambiguous phrase plus a one-clause interpretation question. Empty array if none.',
    ),
  alignmentNotes: z
    .array(z.string())
    .max(6)
    .describe(
      'Notes about how this issue should align with the epic. Each item ≤ 30 words. Empty array if none.',
    ),
});

// ─── Refinement ─────────────────────────────────────────────────────

export const RefinementSchema = z.object({
  refinedBody: z
    .string()
    .min(50)
    .describe(
      [
        'Full rewritten issue body in Markdown.',
        'Must contain exactly these four sections in order:',
        '## Summary (1–3 sentences),',
        '## Context (why this matters, tie to epic),',
        '## Acceptance Criteria (bulleted, testable),',
        '## Technical Notes (optional, implementation hints).',
        'Do NOT introduce any H1 (# heading); the card provides the title.',
        'Preserve any GitLab quick-action syntax (/label, @user, #issues) from the original.',
        'Word budget: 150–450 words.',
      ].join(' '),
    ),
});

// ─── Validation ─────────────────────────────────────────────────────

export const ValidationSchema = z.object({
  score: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe(
      'Quality score 0–100 for the refined body. Rubric: clarity (25), completeness (25), testable acceptance criteria (25), alignment with epic (25).',
    ),
  findings: z
    .array(z.string())
    .max(10)
    .describe(
      'Actionable findings the user should consider. Each ≤ 20 words. Each finding MUST start with one of [critical], [important], or [nit] so the UI can color-code. Empty array if score = 100.',
    ),
});

// ─── Compile-time compatibility check ───────────────────────────────
// Helper that fails to compile if T isn't `true`. We invoke it inside an
// always-false branch so it has zero runtime cost but the type system
// still validates that the Zod-inferred shapes are bidirectionally
// assignable to the predeclared interfaces in ./types.ts.

function assertType<_T extends true>(): void {}

type IsExactly<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

// Calling the assertion with each shape pair forces the type check.
// If types.ts and the Zod schemas drift apart, these lines fail to compile.
assertType<IsExactly<z.infer<typeof ComprehensionSchema>, ComprehensionResult>>();
assertType<IsExactly<z.infer<typeof RefinementSchema>, RefinementResult>>();
assertType<IsExactly<z.infer<typeof ValidationSchema>, ValidationResult>>();
