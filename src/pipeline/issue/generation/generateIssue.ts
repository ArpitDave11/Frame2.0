/**
 * One-Click Issue — generation stage.
 *
 * Turns a single natural-language prompt (+ optional parent-epic context and
 * the group's labels / members / iterations) into a complete GitLab issue
 * draft AND a set of suggested metadata (weight, priority, labels, assignee)
 * with short rationales. Mirrors the Issue-Refinery stage pattern:
 * Zod-validated strict json_schema + Instructor retry via `runStageWithRetry`.
 *
 * Suggestions are advisory — the review UI lets the user override every value
 * before anything is written to GitLab.
 */

import { z } from 'zod';
import type { AIClientConfig } from '@/services/ai/types';
import { runStageWithRetry } from '../stageRunner';

export const GeneratedIssueSchema = z.object({
  title: z
    .string()
    .min(3)
    .describe('Imperative issue title, ≤ 12 words, no trailing period.'),
  description: z
    .string()
    .min(30)
    .describe(
      'Markdown body: a "## Summary" paragraph, then a "## User Story" in the "As a … I want … so that …" form. No H1 heading. Do not include acceptance criteria here — they are a separate field.',
    ),
  acceptanceCriteria: z
    .array(z.string())
    .min(1)
    .max(10)
    .describe('Testable, verifiable acceptance criteria. Each ≤ 20 words. At least one.'),
  dependencies: z
    .array(z.string())
    .max(6)
    .describe('Known dependencies or blockers. Each ≤ 20 words. Empty array if none.'),
  risks: z
    .array(z.string())
    .max(6)
    .describe('Risks or open questions. Each ≤ 20 words. Empty array if none.'),
  suggestedWeight: z
    .number()
    .int()
    .min(1)
    .max(21)
    .describe('Story points — one of 1, 2, 3, 5, 8, 13, 21 — estimating effort.'),
  suggestedPriority: z
    .string()
    .describe('Exactly one of: low, medium, high, critical. Based on impact and urgency.'),
  suggestedLabels: z
    .array(z.string())
    .max(6)
    .describe(
      'Labels chosen ONLY from the provided group label list, using their exact names. Empty array if none fit.',
    ),
  suggestedAssignee: z
    .string()
    .describe(
      'The username (not display name) of the best-fit assignee from the provided member list, or an empty string if there is no clear match.',
    ),
  rationale: z
    .object({
      weight: z.string().describe('≤ 15 words: why this weight.'),
      priority: z.string().describe('≤ 15 words: why this priority.'),
      assignee: z.string().describe('≤ 15 words: why this assignee, or why none.'),
      labels: z.string().describe('≤ 15 words: why these labels.'),
    })
    .describe('Brief reasons for each suggestion, shown in the review panel.'),
});

export type GeneratedIssue = z.infer<typeof GeneratedIssueSchema>;

export interface GenerationInput {
  /** The user's raw natural-language request. */
  prompt: string;
  /** Optional parent epic for grounding. */
  epic?: { title: string; body: string } | null;
  /** Group label names the AI may choose from. */
  labels?: string[];
  /** Candidate assignees (display name + username). */
  members?: { name: string; username: string }[];
  /** Available iteration titles (for context only; iteration is set in review). */
  iterations?: string[];
}

const SYSTEM_PROMPT = `<system>
You are an expert product owner and business analyst. From a single short prompt you produce ONE well-formed GitLab issue (a user story) plus pragmatic planning metadata.

RULES (non-negotiable):
- Write for engineers: concrete, testable, no filler. Every sentence must add information.
- Title: imperative, ≤ 12 words, no trailing period.
- Description: a "## Summary" paragraph then a "## User Story" ("As a … I want … so that …"). No H1. Acceptance criteria go in their own field, not the body.
- Acceptance criteria: each ≤ 20 words, independently verifiable.
- Only choose labels from the provided list, by exact name. Never invent labels.
- Only choose an assignee whose username appears in the provided member list; otherwise return an empty string.
- Weight is Fibonacci story points (1,2,3,5,8,13,21). Priority is one of low|medium|high|critical.
- Keep every rationale ≤ 15 words.
- Output ONLY the JSON object required by the schema.
</system>`;

function buildUserPrompt(input: GenerationInput): string {
  const parts: string[] = [];
  parts.push(`<request>\n${input.prompt.trim()}\n</request>`);

  if (input.epic && (input.epic.title || input.epic.body)) {
    parts.push(
      `<parent_epic>\nTitle: ${input.epic.title}\n${input.epic.body ? `Body:\n${input.epic.body}` : ''}\n</parent_epic>`,
    );
  }

  const labels = (input.labels ?? []).filter(Boolean);
  parts.push(
    labels.length
      ? `<available_labels>\n${labels.join(', ')}\n</available_labels>`
      : `<available_labels>(none — return an empty labels array)</available_labels>`,
  );

  const members = input.members ?? [];
  parts.push(
    members.length
      ? `<candidate_assignees>\n${members.map((m) => `${m.username} — ${m.name}`).join('\n')}\n</candidate_assignees>`
      : `<candidate_assignees>(none — return an empty assignee string)</candidate_assignees>`,
  );

  const iters = (input.iterations ?? []).filter(Boolean);
  if (iters.length) parts.push(`<iterations>\n${iters.join('\n')}\n</iterations>`);

  parts.push('Produce the issue draft and metadata as the required JSON object.');
  return parts.join('\n\n');
}

/** Run the one-click generation stage. Temperature 0.4 — some creativity, mostly grounded. */
export async function runIssueGeneration(
  aiConfig: AIClientConfig,
  input: GenerationInput,
): Promise<GeneratedIssue> {
  return runStageWithRetry({
    stageName: 'issue-refinery:generation',
    schema: GeneratedIssueSchema,
    schemaName: 'GeneratedIssue',
    aiConfig,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(input),
    temperature: 0.4,
  });
}
