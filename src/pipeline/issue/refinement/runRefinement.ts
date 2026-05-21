/**
 * Issue Refinery — Refinement stage runner (R-6).
 *
 * Thin wrapper around `runStageWithRetry`. Stage-specific config:
 *   - schema: RefinementSchema
 *   - temperature: 0.4 (moderate creativity for rewriting)
 *   - no reasoningEffort (default generation)
 */

import type { AIClientConfig } from '@/services/ai/types';
import { buildPrompts } from '../promptAssembly';
import { RefinementSchema } from '../schemas';
import { runStageWithRetry } from '../stageRunner';
import type { ComprehensionResult, RefinementResult } from '../types';

export async function runRefinement(
  aiConfig: AIClientConfig,
  epicBody: string,
  issueBody: string,
  comprehension: ComprehensionResult,
): Promise<RefinementResult> {
  const { systemPrompt, userPrompt } = buildPrompts('refinement', epicBody, issueBody, {
    comprehension,
  });

  return runStageWithRetry({
    stageName: 'issue-refinery:refinement',
    schema: RefinementSchema,
    schemaName: 'RefinementResult',
    aiConfig,
    systemPrompt,
    userPrompt,
    temperature: 0.4,
  });
}
