/**
 * Issue Refinery — Comprehension stage runner (R-5).
 *
 * Thin wrapper around `runStageWithRetry`. Stage-specific config:
 *   - schema: ComprehensionSchema
 *   - temperature: 0.2 (deterministic extraction)
 *   - reasoningEffort: 'minimal'
 */

import type { AIClientConfig } from '@/services/ai/types';
import { buildPrompts } from '../promptAssembly';
import { ComprehensionSchema } from '../schemas';
import { runStageWithRetry } from '../stageRunner';
import type { ComprehensionResult } from '../types';

export async function runComprehension(
  aiConfig: AIClientConfig,
  epicBody: string,
  issueBody: string,
): Promise<ComprehensionResult> {
  const { systemPrompt, userPrompt } = buildPrompts('comprehension', epicBody, issueBody);

  return runStageWithRetry({
    stageName: 'issue-refinery:comprehension',
    schema: ComprehensionSchema,
    schemaName: 'ComprehensionResult',
    aiConfig,
    systemPrompt,
    userPrompt,
    temperature: 0.2,
    reasoningEffort: 'minimal',
  });
}
