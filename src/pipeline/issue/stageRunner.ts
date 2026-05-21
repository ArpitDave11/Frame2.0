/**
 * Issue Refinery — shared stage runner.
 *
 * Replaces the duplicated body that previously lived in each of the three
 * stage modules (Comprehension / Refinement / Validation). Owns:
 *   - JSON Schema generation (via `toStrictJsonSchema`, which strips
 *     keywords Azure/OpenAI strict mode rejects)
 *   - Network-retry wrapping via `withRetry`
 *   - Instructor-style schema-fail retry (one extra call with the validation
 *     error appended to the user prompt)
 *   - Final throw on second schema-fail with diagnostic
 *
 * Stage-specific concerns (temperature, schema, response_format name,
 * prompt assembly) are passed in as parameters.
 */

import { z, type ZodTypeAny } from 'zod';
import { callAI } from '@/services/ai/aiClient';
import { withRetry } from '@/services/ai/throttler';
import type { AIClientConfig, AIRequest } from '@/services/ai/types';
import { toStrictJsonSchema } from './toStrictJsonSchema';

export interface StageRunOptions<S extends ZodTypeAny> {
  /** Logged tag for retries + error messages, e.g. "issue-refinery:comprehension". */
  stageName: string;
  /** Zod schema used for response validation. */
  schema: S;
  /** `json_schema.name` passed to the LLM (also surfaced in errors). */
  schemaName: string;
  aiConfig: AIClientConfig;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  /** Azure-specific knob; omitted for stages that need normal generation. */
  reasoningEffort?: AIRequest['reasoningEffort'];
}

export async function runStageWithRetry<S extends ZodTypeAny>(
  opts: StageRunOptions<S>,
): Promise<z.infer<S>> {
  const strictSchema = toStrictJsonSchema(z.toJSONSchema(opts.schema));

  const baseRequest = {
    systemPrompt: opts.systemPrompt,
    temperature: opts.temperature,
    ...(opts.reasoningEffort ? { reasoningEffort: opts.reasoningEffort } : {}),
    responseFormat: {
      type: 'json_schema' as const,
      json_schema: { name: opts.schemaName, strict: true, schema: strictSchema },
    },
  };

  const firstResponse = await withRetry(
    () => callAI(opts.aiConfig, { ...baseRequest, userPrompt: opts.userPrompt }),
    opts.stageName,
  );
  const firstParsed = safeParseContent(opts.schema, firstResponse.content);
  if (firstParsed.success) return firstParsed.data;

  const retryUserPrompt =
    opts.userPrompt +
    '\n\nPREVIOUS ATTEMPT FAILED JSON-SCHEMA VALIDATION:\n' +
    firstParsed.errorMessage +
    `\nReturn a corrected JSON object matching ${opts.schemaName} exactly.`;

  const secondResponse = await withRetry(
    () => callAI(opts.aiConfig, { ...baseRequest, userPrompt: retryUserPrompt }),
    opts.stageName,
  );
  const secondParsed = safeParseContent(opts.schema, secondResponse.content);
  if (secondParsed.success) return secondParsed.data;

  throw new Error(
    `[${opts.stageName}] schema validation failed twice. Last error: ${secondParsed.errorMessage}`,
  );
}

function safeParseContent<S extends ZodTypeAny>(
  schema: S,
  content: string,
): { success: true; data: z.infer<S> } | { success: false; errorMessage: string } {
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch (e) {
    return {
      success: false,
      errorMessage: `Response was not valid JSON: ${(e as Error).message}`,
    };
  }
  const parsed = schema.safeParse(json);
  if (parsed.success) return { success: true, data: parsed.data };
  return { success: false, errorMessage: JSON.stringify(parsed.error.issues) };
}
