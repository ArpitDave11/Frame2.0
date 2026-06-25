/**
 * Azure OpenAI–backed BRP estimator (B-36).
 *
 * Implements the AIEstimator seam by calling Azure OpenAI through the
 * existing `callAzure` client. Prompts the model for a structured JSON
 * payload, validates it with the Phase 3 zod schema (FrameResultSchema),
 * and yields it as the `done` event the store loop consumes.
 *
 * The estimator is created with `createAzureEstimator(deps)` so tests
 * can substitute the Azure client and the config reader without spinning
 * up the whole configStore. The default `getEstimator()` swap (B-37)
 * supplies the production deps.
 *
 * Two narrow design choices worth flagging:
 *
 * 1. We emit `started` immediately so the UI's progress banner can
 *    show "current: <title>" before the (possibly multi-second) network
 *    call resolves. After the call lands we emit either `done` or
 *    `error` — never both. The store's runAnalysis loop relies on
 *    exactly one terminal event per call.
 *
 * 2. Aborts are honored at TWO boundaries: before the fetch (cheap
 *    early-out) and after the fetch (so a slow response that lands
 *    after Cancel still doesn't write to the store). The boundary
 *    check is the cooperative contract the store loop expects.
 */

import { callAzure } from '@/services/ai/azureClient';
import type { AIClientConfig, AIRequest } from '@/services/ai/types';
import { FrameResultSchema } from './schemas';
import type { AIEstimator, AnalysisEvent } from './types';
import type { Epic, FrameResult, ReferenceEpic } from '@/domain/brp';
import { FIBONACCI_POINTS } from '@/domain/brp.constants';

/**
 * The canonical Fibonacci ladder, sourced from the single constant so the
 * prompt can never drift from `FibonacciPoint` / the zod schema again
 * (the prior prompt asked for 34/55/89, which the schema rejects).
 */
const FIBONACCI_LADDER = FIBONACCI_POINTS.join('|');

export interface AzureEstimatorDeps {
  /** Returns the active AI config (provider, azure, openai, endpoints). */
  readConfig: () => AIClientConfig;
  /** Defaults to the real `callAzure`; overridable for tests. */
  call?: typeof callAzure;
}

const SYSTEM_PROMPT = `You are FRAME, a Scrum sizing assistant for the BRP (Breakdown & Re-groom Planning) tool.

Given an epic and optional historical reference epics, produce a JSON object that matches this exact shape (no surrounding prose, no markdown fences):

{
  "frameEstimate": <Fibonacci ${FIBONACCI_LADDER}>,
  "breakdown": [ { "title": string, "points": <Fibonacci ${FIBONACCI_LADDER}> } ],
  "rationale": string,
  "confidence": number between 0 and 1,
  "references": [ { "epicId": string, "title": string, "similarity": 0..1, "actualSp": number } ],
  "generatedStories": null | [ { "title": string, "points": <Fibonacci ${FIBONACCI_LADDER}>, "acceptanceCriteria": [string] } ],
  "modelVersion": string,
  "analyzedAt": ISO-8601 timestamp
}

Every "points" and "frameEstimate" value MUST be exactly one of these Fibonacci numbers: ${FIBONACCI_LADDER}. Never output any value outside this set.

Use "generatedStories": null when the epic already contains a decomposition; otherwise invent 2-5 plausible stories that sum approximately to the estimate. Keep the rationale concise (1-3 sentences).`;

function buildUserPrompt(epic: Epic, references: readonly ReferenceEpic[]): string {
  const refsBlock =
    references.length === 0
      ? 'NONE'
      : references
          .map(
            (r, i) =>
              `[${i + 1}] iid? title="${r.title}" actualSp=${r.actualSp} similarity=${r.similarity.toFixed(2)}`,
          )
          .join('\n');

  return [
    `Epic to size:`,
    `iid: !${epic.iid}`,
    `title: ${epic.title}`,
    `description: ${epic.description}`,
    ``,
    `Historical references (closed epics in the same pod):`,
    refsBlock,
    ``,
    `Return only the JSON object — no prose, no fences.`,
  ].join('\n');
}

/**
 * Strip a Markdown code fence wrapper if the model insists on one.
 * Defensive — the prompt asks for no fences, but real models often
 * disobey. Returns the input untouched when no fence is present.
 */
function stripFence(s: string): string {
  const m = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```\s*$/i);
  return m ? (m[1] ?? s) : s;
}

/**
 * Java-style string hash → a stable non-negative seed. Deriving the seed
 * from `epic.id` makes the estimate reproducible per epic (same epic →
 * same seed → same output), which the research found is the real source of
 * reproducibility — not temperature, which was adversarially refuted.
 */
function seedFromEpicId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

/**
 * Azure OpenAI structured-output schema (T4). Locks the response SHAPE to
 * what the current prompt asks for and constrains every `points` value to
 * the Fibonacci enum at the model boundary (trust Layer 2). Strict mode
 * requires `additionalProperties: false` and every property in `required`;
 * `generatedStories` is nullable-and-required per Azure's strict rules.
 *
 * This mirrors the legacy FrameResult shape the parser (`FrameResultSchema`)
 * still expects. The migration of the model OUTPUT to the canonical
 * `stories` shape happens in T6, where prompt + schema + parser move
 * together. JSON Schema cannot express the cross-field "sum to load" rule —
 * that is guaranteed in code by `computeEpicLoad` (INV2), not here.
 */
function buildResponseFormat(): NonNullable<AIRequest['responseFormat']> {
  const fibEnum = [...FIBONACCI_POINTS];
  const breakdownItem = {
    type: 'object',
    additionalProperties: false,
    properties: {
      title: { type: 'string' },
      points: { type: 'integer', enum: fibEnum },
    },
    required: ['title', 'points'],
  };
  const generatedStory = {
    type: 'object',
    additionalProperties: false,
    properties: {
      title: { type: 'string' },
      points: { type: 'integer', enum: fibEnum },
      acceptanceCriteria: { type: 'array', items: { type: 'string' } },
    },
    required: ['title', 'points', 'acceptanceCriteria'],
  };
  const reference = {
    type: 'object',
    additionalProperties: false,
    properties: {
      epicId: { type: 'string' },
      title: { type: 'string' },
      similarity: { type: 'number' },
      actualSp: { type: 'number' },
    },
    required: ['epicId', 'title', 'similarity', 'actualSp'],
  };
  return {
    type: 'json_schema',
    json_schema: {
      name: 'frame_epic_sizing',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          frameEstimate: { type: 'integer', enum: fibEnum },
          breakdown: { type: 'array', items: breakdownItem },
          rationale: { type: 'string' },
          confidence: { type: 'number' },
          references: { type: 'array', items: reference },
          generatedStories: { type: ['array', 'null'], items: generatedStory },
          modelVersion: { type: 'string' },
          analyzedAt: { type: 'string' },
        },
        required: [
          'frameEstimate', 'breakdown', 'rationale', 'confidence',
          'references', 'generatedStories', 'modelVersion', 'analyzedAt',
        ],
      },
    },
  };
}

export function createAzureEstimator(deps: AzureEstimatorDeps): AIEstimator {
  const call = deps.call ?? callAzure;

  return {
    async *analyzeEpic(
      epic: Epic,
      references: readonly ReferenceEpic[],
      signal?: AbortSignal,
    ): AsyncIterable<AnalysisEvent> {
      yield { kind: 'started', epicId: epic.id };

      if (signal?.aborted) {
        yield { kind: 'error', epicId: epic.id, message: 'Aborted before request' };
        return;
      }

      let raw: string;
      try {
        const config = deps.readConfig();
        // BRP analysis runs through the Azure adapter only (B-36).
        // OpenAI-direct support can land later via a sibling estimator.
        const endpoint = config.endpoints?.azureEndpoint ?? '';
        if (!endpoint) {
          yield {
            kind: 'error',
            epicId: epic.id,
            message: 'AI endpoint is not configured',
          };
          return;
        }
        const response = await call(config.azure, endpoint, {
          systemPrompt: SYSTEM_PROMPT,
          userPrompt: buildUserPrompt(epic, references),
          maxTokens: 1200,
          temperature: 0.2,
          // T4: lock output shape + Fibonacci enum, and seed per-epic for
          // run-to-run reproducibility (not temperature — refuted).
          responseFormat: buildResponseFormat(),
          seed: seedFromEpicId(epic.id),
        });
        raw = response.content;
      } catch (e: unknown) {
        yield {
          kind: 'error',
          epicId: epic.id,
          message: e instanceof Error ? e.message : String(e),
        };
        return;
      }

      if (signal?.aborted) {
        yield { kind: 'error', epicId: epic.id, message: 'Aborted after request' };
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(stripFence(raw));
      } catch (e: unknown) {
        yield {
          kind: 'error',
          epicId: epic.id,
          message: `Model returned non-JSON: ${e instanceof Error ? e.message : String(e)}`,
        };
        return;
      }

      const validation = FrameResultSchema.safeParse(parsed);
      if (!validation.success) {
        yield {
          kind: 'error',
          epicId: epic.id,
          message: `Model output failed schema validation: ${validation.error.issues
            .slice(0, 3)
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('; ')}`,
        };
        return;
      }

      const result: FrameResult = validation.data;
      yield { kind: 'done', epicId: epic.id, result };
    },
  };
}
