/**
 * Issue Refinery — Refinement stage runner (R-6).
 *
 * Consumes the parent epic body, the original issue body, and the
 * Comprehension stage output. Returns a refined issue body matching
 * `RefinementSchema`. Single Instructor-style retry on schema-validation
 * failure; throws on second failure.
 */

import { z } from 'zod';
import { callAI } from '@/services/ai/aiClient';
import { withRetry } from '@/services/ai/throttler';
import type { AIClientConfig } from '@/services/ai/types';
import { buildPrompts } from '../promptAssembly';
import { RefinementSchema } from '../schemas';
import type { ComprehensionResult, RefinementResult } from '../types';

const STAGE_NAME = 'issue-refinery:refinement';
const TEMPERATURE = 0.4;

export async function runRefinement(
  aiConfig: AIClientConfig,
  epicBody: string,
  issueBody: string,
  comprehension: ComprehensionResult,
): Promise<RefinementResult> {
  const { systemPrompt, userPrompt } = buildPrompts('refinement', epicBody, issueBody, {
    comprehension,
  });
  const jsonSchema = z.toJSONSchema(RefinementSchema) as Record<string, unknown>;

  const baseRequest = {
    systemPrompt,
    temperature: TEMPERATURE,
    responseFormat: {
      type: 'json_schema' as const,
      json_schema: { name: 'RefinementResult', strict: true, schema: jsonSchema },
    },
  };

  const firstResponse = await withRetry(
    () => callAI(aiConfig, { ...baseRequest, userPrompt }),
    STAGE_NAME,
  );
  const firstParsed = safeParseContent(firstResponse.content);
  if (firstParsed.success) return firstParsed.data;

  const retryUserPrompt =
    userPrompt +
    '\n\nPREVIOUS ATTEMPT FAILED JSON-SCHEMA VALIDATION:\n' +
    firstParsed.errorMessage +
    '\nReturn a corrected JSON object matching RefinementResult exactly.';

  const secondResponse = await withRetry(
    () => callAI(aiConfig, { ...baseRequest, userPrompt: retryUserPrompt }),
    STAGE_NAME,
  );
  const secondParsed = safeParseContent(secondResponse.content);
  if (secondParsed.success) return secondParsed.data;

  throw new Error(
    `[${STAGE_NAME}] schema validation failed twice. Last error: ${secondParsed.errorMessage}`,
  );
}

function safeParseContent(
  content: string,
): { success: true; data: RefinementResult } | { success: false; errorMessage: string } {
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch (e) {
    return {
      success: false,
      errorMessage: `Response was not valid JSON: ${(e as Error).message}`,
    };
  }
  const parsed = RefinementSchema.safeParse(json);
  if (parsed.success) return { success: true, data: parsed.data };
  return { success: false, errorMessage: JSON.stringify(parsed.error.issues) };
}
