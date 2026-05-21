/**
 * Issue Refinery — pure pipeline orchestrator (R-8).
 *
 * Drives the three stages sequentially: Comprehension → Refinement → Validation.
 * No store access, no UI imports, no fetch logic — just composition.
 *
 * **Scope guard:** this orchestrator MUST NOT import from `src/pipeline/stages/**`
 * or `src/pipeline/orchestrator*` — those are the locked, untouched epic-pipeline
 * code. Issue Refinery lives entirely within `src/pipeline/issue/**`.
 *
 * Failure semantics: stages are atomic. If any stage throws, the pipeline
 * re-throws with `{ stage, cause }` context so the action layer can show
 * the user which step failed. Partial results from completed earlier stages
 * are not returned — the caller gets exactly success-or-error.
 */

import type { AIClientConfig } from '@/services/ai/types';
import { runComprehension } from './comprehension/runComprehension';
import { runRefinement } from './refinement/runRefinement';
import { runValidation } from './validation/runValidation';
import type { ComprehensionResult, RefinementResult, ValidationResult } from './types';

export type StageId = 'comprehension' | 'refinement' | 'validation';

export interface IssuePipelineResult {
  comprehension: ComprehensionResult;
  refined: RefinementResult;
  validation: ValidationResult;
  /**
   * Per-stage `cached_tokens` reported by the LLM provider, in call order.
   * Currently always zeros — `aiClient.callAI` does not yet expose
   * `data.usage.prompt_tokens_details.cached_tokens`. A future task will
   * extend AIResponse; the orchestrator's contract already carries the field
   * so callers and the dev HUD don't need to change.
   */
  cachedTokens: number[];
}

export interface IssuePipelineError extends Error {
  stage: StageId;
  cause: unknown;
}

function tagError(stage: StageId, cause: unknown): IssuePipelineError {
  const message = cause instanceof Error ? cause.message : String(cause);
  const err = new Error(`[issue-refinery:${stage}] ${message}`) as IssuePipelineError;
  err.stage = stage;
  err.cause = cause;
  return err;
}

/**
 * Run the 3-stage issue refinery pipeline. Pure — no side effects beyond the
 * AI calls performed by the stage runners.
 *
 * @throws IssuePipelineError tagged with `stage` and `cause`.
 */
export async function runIssuePipeline(
  aiConfig: AIClientConfig,
  epicBody: string,
  issueBody: string,
): Promise<IssuePipelineResult> {
  let comprehension: ComprehensionResult;
  try {
    comprehension = await runComprehension(aiConfig, epicBody, issueBody);
  } catch (e) {
    throw tagError('comprehension', e);
  }

  let refined: RefinementResult;
  try {
    refined = await runRefinement(aiConfig, epicBody, issueBody, comprehension);
  } catch (e) {
    throw tagError('refinement', e);
  }

  let validation: ValidationResult;
  try {
    validation = await runValidation(aiConfig, epicBody, issueBody, refined.refinedBody);
  } catch (e) {
    throw tagError('validation', e);
  }

  return {
    comprehension,
    refined,
    validation,
    cachedTokens: [0, 0, 0],
  };
}
