/**
 * Issue Refinery — Validation stage runner (R-7).
 *
 * Scores the refined issue body and returns { score, findings[] }. Score is
 * advisory only — the UI never gates Publish on it. Single Instructor-style
 * retry on schema-validation failure; throws on second failure.
 */

import { z } from 'zod';
import { callAI } from '@/services/ai/aiClient';
import { withRetry } from '@/services/ai/throttler';
import type { AIClientConfig } from '@/services/ai/types';
import { buildPrompts } from '../promptAssembly';
import { ValidationSchema } from '../schemas';
import type { ValidationResult } from '../types';

const STAGE_NAME = 'issue-refinery:validation';
const TEMPERATURE = 0.2;

export async function runValidation(
  aiConfig: AIClientConfig,
  epicBody: string,
  issueBody: string,
  refinedBody: string,
): Promise<ValidationResult> {
  const { systemPrompt, userPrompt } = buildPrompts('validation', epicBody, issueBody, {
    refined: refinedBody,
  });
  const jsonSchema = z.toJSONSchema(ValidationSchema) as Record<string, unknown>;

  const baseRequest = {
    systemPrompt,
    temperature: TEMPERATURE,
    reasoningEffort: 'minimal' as const,
    responseFormat: {
      type: 'json_schema' as const,
      json_schema: { name: 'ValidationResult', strict: true, schema: jsonSchema },
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
    '\nReturn a corrected JSON object matching ValidationResult exactly.';

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
): { success: true; data: ValidationResult } | { success: false; errorMessage: string } {
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch (e) {
    return {
      success: false,
      errorMessage: `Response was not valid JSON: ${(e as Error).message}`,
    };
  }
  const parsed = ValidationSchema.safeParse(json);
  if (parsed.success) return { success: true, data: parsed.data };
  return { success: false, errorMessage: JSON.stringify(parsed.error.issues) };
}
