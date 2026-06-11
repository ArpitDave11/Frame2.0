/**
 * One-Click Task — generation stage.
 *
 * Turns a short prompt (+ the parent issue's context) into a single
 * implementation subtask: title, description, acceptance criteria, and a
 * suggested weight. Lighter than the full issue generator. Mirrors the
 * Issue-Refinery stage pattern (strict json_schema + Instructor retry).
 */

import { z } from 'zod';
import type { AIClientConfig } from '@/services/ai/types';
import { runStageWithRetry } from '../stageRunner';

export const GeneratedTaskSchema = z.object({
  title: z.string().min(3).describe('Imperative task title, ≤ 12 words, no trailing period.'),
  description: z
    .string()
    .min(10)
    .describe('1–3 sentence markdown description of the implementation task. No H1 heading.'),
  acceptanceCriteria: z
    .array(z.string())
    .max(8)
    .describe('Concrete done-criteria for this task, each ≤ 20 words. Empty array allowed.'),
  suggestedWeight: z
    .number()
    .int()
    .min(1)
    .max(13)
    .describe('Story points for this subtask — one of 1, 2, 3, 5, 8, 13.'),
});

export type GeneratedTask = z.infer<typeof GeneratedTaskSchema>;

const SYSTEM_PROMPT = `<system>
You break a parent issue into ONE concrete implementation subtask (a GitLab task).
RULES: Title imperative, ≤ 12 words, no trailing period. Description 1–3 sentences, no H1.
Acceptance criteria each ≤ 20 words and verifiable. Weight is Fibonacci story points (1,2,3,5,8,13).
Scope the task narrowly — it is a child of the parent issue, not a restatement of it.
Output ONLY the JSON object required by the schema.
</system>`;

export async function runTaskGeneration(
  aiConfig: AIClientConfig,
  input: { prompt: string; parent: { title: string; body: string } },
): Promise<GeneratedTask> {
  const userPrompt = [
    `<parent_issue>\nTitle: ${input.parent.title}\n${input.parent.body ? `Body:\n${input.parent.body}` : ''}\n</parent_issue>`,
    `<request>\n${input.prompt.trim()}\n</request>`,
    'Produce the subtask as the required JSON object.',
  ].join('\n\n');

  return runStageWithRetry({
    stageName: 'issue-refinery:task-generation',
    schema: GeneratedTaskSchema,
    schemaName: 'GeneratedTask',
    aiConfig,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.4,
  });
}
