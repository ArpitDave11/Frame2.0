/**
 * Issue Refinery — Validation stage runner (R-7).
 *
 * Thin wrapper around `runStageWithRetry`. Stage-specific config:
 *   - schema: ValidationSchema
 *   - temperature: 0.2 (deterministic scoring)
 *   - reasoningEffort: 'minimal'
 *
 * Output is advisory per locked decision D6 — the UI never gates Publish on it.
 */

import type { AIClientConfig } from '@/services/ai/types';
import { buildPrompts } from '../promptAssembly';
import { ValidationSchema } from '../schemas';
import { runStageWithRetry } from '../stageRunner';
import type { ValidationResult } from '../types';

export async function runValidation(
  aiConfig: AIClientConfig,
  epicBody: string,
  issueBody: string,
  refinedBody: string,
): Promise<ValidationResult> {
  const { systemPrompt, userPrompt } = buildPrompts('validation', epicBody, issueBody, {
    refined: refinedBody,
  });

  return runStageWithRetry({
    stageName: 'issue-refinery:validation',
    schema: ValidationSchema,
    schemaName: 'ValidationResult',
    aiConfig,
    systemPrompt,
    userPrompt,
    temperature: 0.2,
    reasoningEffort: 'minimal',
  });
}
