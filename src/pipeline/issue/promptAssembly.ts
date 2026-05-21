/**
 * Issue Refinery — sandwich prompt assembly (R-4).
 *
 * Builds the `{ systemPrompt, userPrompt }` pair handed to `aiClient.callAI`
 * for each pipeline stage. The defining feature is **prompt-cache discipline**:
 * the static prefix (system rules + <epic>…</epic> + <issue>…</issue>) is
 * byte-identical across all three stage calls. Azure caches the prefix; stages
 * 2 and 3 hit the cache and the document portion costs ~zero on those calls.
 *
 * If anything in the static prefix gets interpolated with a timestamp, ID,
 * or stray whitespace, the cache busts and per-call cost ~quadruples. The
 * companion test asserts byte-equality across stages — keep it green.
 */

import type { ComprehensionResult } from './types';

export type Stage = 'comprehension' | 'refinement' | 'validation';

export interface StagePrevious {
  /** Required when assembling the refinement stage. */
  comprehension?: ComprehensionResult;
  /** Required when assembling the validation stage. */
  refined?: string;
}

// ─── Static text — must remain byte-identical across calls ──────────

export const SYSTEM_RULES =
  'You are an assistant that refines GitLab issues.\n' +
  'You will be given a parent <epic> and the current <issue> body.\n' +
  'You will be asked to perform one of three tasks: comprehension, refinement, or validation.\n' +
  '\n' +
  'Rules:\n' +
  '1. Output MUST match the provided JSON schema exactly. No surrounding prose.\n' +
  '2. Ground every claim in the provided <epic> or <issue>. Do not invent facts.\n' +
  '3. Preserve GitLab quick-action syntax (/label, @user, #123) from the original issue.\n' +
  '4. Never emit H1 (# heading). Use H2 (##) as the top heading level.\n' +
  '5. If the issue body is empty or only whitespace, return minimal output:\n' +
  '   - Comprehension: gaps = ["Issue body is empty."]\n' +
  '   - Refinement: refinedBody = a generic acceptance-criteria-only skeleton\n' +
  '   - Validation: score = 10, findings = ["[critical] Original issue had no content."]';

export const STAGE_INSTRUCTIONS: Record<Stage, string> = {
  comprehension:
    'Analyze the <issue> relative to the <epic>. Return ComprehensionSchema. ' +
    'Every gap must cite a missing detail observable in the issue.',
  refinement:
    'Rewrite the <issue> using the <comprehension> analysis. ' +
    'Address each listed gap and ambiguity. Return RefinementSchema with the four required sections.',
  validation:
    'Score the <refined> issue body 0-100 per the rubric. Return ValidationSchema. ' +
    'Tag each finding with [critical], [important], or [nit].',
};

// ─── Builder ────────────────────────────────────────────────────────

/**
 * Build the system + user prompt for a single stage call.
 *
 * Invariant: for fixed (epicBody, issueBody), the substring of `userPrompt`
 * up to and including `</issue>` is identical regardless of `stage`. Only the
 * tail (the previous-stage context block and the stage instruction) varies.
 */
export function buildPrompts(
  stage: Stage,
  epicBody: string,
  issueBody: string,
  previous?: StagePrevious,
): { systemPrompt: string; userPrompt: string } {
  // Static document block — byte-identical across stages for the same inputs.
  const documentBlock = `<epic>\n${epicBody}\n</epic>\n\n<issue>\n${issueBody}\n</issue>`;

  // Stage-specific context block (varies per stage; not cached).
  let contextBlock = '';
  if (stage === 'refinement' && previous?.comprehension) {
    contextBlock = `\n\n<comprehension>\n${JSON.stringify(previous.comprehension)}\n</comprehension>`;
  } else if (stage === 'validation' && previous?.refined !== undefined) {
    contextBlock = `\n\n<refined>\n${previous.refined}\n</refined>`;
  }

  const userPrompt = `${documentBlock}${contextBlock}\n\n${STAGE_INSTRUCTIONS[stage]}`;
  return { systemPrompt: SYSTEM_RULES, userPrompt };
}

/**
 * Returns the cache-sensitive prefix of the userPrompt — everything up to and
 * including `</issue>`. Used by the byte-equality test to assert that this
 * prefix is identical regardless of stage. Exported for testing only.
 */
export function getCachePrefix(epicBody: string, issueBody: string): string {
  return `<epic>\n${epicBody}\n</epic>\n\n<issue>\n${issueBody}\n</issue>`;
}
