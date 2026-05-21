/**
 * Issue Refinery — Comprehension stage runner (R-5).
 *
 * Calls Azure OpenAI with the comprehension prompt + strict json_schema, parses
 * the response with `ComprehensionSchema`, and returns a typed result. On
 * schema-validation failure, retries once with the validation error appended
 * to the user prompt (Instructor pattern). On second failure, throws.
 */

import { z } from 'zod';
import { callAI } from '@/services/ai/aiClient';
import { withRetry } from '@/services/ai/throttler';
import type { AIClientConfig } from '@/services/ai/types';
import { buildPrompts } from '../promptAssembly';
import { ComprehensionSchema } from '../schemas';
import type { ComprehensionResult } from '../types';

const STAGE_NAME = 'issue-refinery:comprehension';
const TEMPERATURE = 0.2;

export async function runComprehension(
  aiConfig: AIClientConfig,
  epicBody: string,
  issueBody: string,
): Promise<ComprehensionResult> {
  const { systemPrompt, userPrompt } = buildPrompts('comprehension', epicBody, issueBody);
  const jsonSchema = z.toJSONSchema(ComprehensionSchema) as Record<string, unknown>;

  const baseRequest = {
    systemPrompt,
    temperature: TEMPERATURE,
    reasoningEffort: 'minimal' as const,
    responseFormat: {
      type: 'json_schema' as const,
      json_schema: { name: 'ComprehensionResult', strict: true, schema: jsonSchema },
    },
  };

  // First attempt.
  const firstResponse = await withRetry(
    () => callAI(aiConfig, { ...baseRequest, userPrompt }),
    STAGE_NAME,
  );
  const firstParsed = safeParseContent(firstResponse.content);
  if (firstParsed.success) return firstParsed.data;

  // Instructor-pattern retry — append validation error to the prompt.
  const retryUserPrompt =
    userPrompt +
    '\n\nPREVIOUS ATTEMPT FAILED JSON-SCHEMA VALIDATION:\n' +
    firstParsed.errorMessage +
    '\nReturn a corrected JSON object matching ComprehensionResult exactly.';

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
): { success: true; data: ComprehensionResult } | { success: false; errorMessage: string } {
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch (e) {
    return {
      success: false,
      errorMessage: `Response was not valid JSON: ${(e as Error).message}`,
    };
  }
  const parsed = ComprehensionSchema.safeParse(json);
  if (parsed.success) return { success: true, data: parsed.data };
  return { success: false, errorMessage: JSON.stringify(parsed.error.issues) };
}
