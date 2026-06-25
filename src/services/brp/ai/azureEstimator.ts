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
import { EstimatorOutputSchema, FrameResultSchema } from './schemas';
import { validateStories } from './storyValidation';
import type { AIEstimator, AnalysisEvent } from './types';
import type { Epic, FibonacciPoint, FrameResult, ReferenceEpic, SizedStory } from '@/domain/brp';
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

Decompose the epic into well-formed user stories and size each one. Produce ONLY a JSON object of exactly this shape (no surrounding prose, no markdown fences):

{
  "stories": [
    {
      "title": string,
      "points": <Fibonacci ${FIBONACCI_LADDER}>,
      "acceptanceCriteria": [string, ...],
      "splitPattern": "Spike" | "Path" | "Interface" | "Data" | "Rules",
      "provenance": "existing" | "frame-generated",
      "referenceEpicId": string | null,
      "rationale": string | null
    }
  ],
  "rationale": string,
  "confidence": number between 0 and 1
}

Rules:
- Produce between 2 and 8 stories. Each story must satisfy INVEST (Independent, Negotiable, Valuable, Estimable, Small, Testable) and have at least one acceptance criterion.
- Every "points" value MUST be exactly one of these Fibonacci numbers: ${FIBONACCI_LADDER}. Never output any value outside this set.
- "splitPattern" is the SPIDR technique used to carve out the story (Spike, Path, Interface, Data, Rules).
- "provenance" is "existing" if the story already exists on the epic, otherwise "frame-generated".
- Do NOT output an epic-level total — the epic's size is the SUM of these story points and is computed by the tool.
- Keep the top-level "rationale" concise (1-3 sentences).`;

function buildUserPrompt(epic: Epic, references: readonly ReferenceEpic[]): string {
  // Reference-class anchoring (T5): present the closed reference epics as a
  // calibration ladder sorted by ACTUAL story points (low → high). This is
  // the dominant accuracy lever in the research — sizing each story relative
  // to historical analogues with known outcomes, rather than picking numbers
  // in a vacuum. epicId is included so the model can cite the analogue it used.
  const sortedRefs = [...references].sort((a, b) => a.actualSp - b.actualSp);
  const refsBlock =
    sortedRefs.length === 0
      ? 'NONE — no closed reference epics available; size conservatively from the description and lower your confidence accordingly.'
      : sortedRefs
          .map(
            (r) =>
              `- epicId=${r.epicId} actualSp=${r.actualSp} similarity=${r.similarity.toFixed(2)} title="${r.title}"`,
          )
          .join('\n');

  return [
    `Epic to size:`,
    `iid: !${epic.iid}`,
    `title: ${epic.title}`,
    `description: ${epic.description}`,
    ``,
    `Historical reference epics (closed, in the same pod), sorted by actual story points — use these as your calibration scale:`,
    refsBlock,
    ``,
    `Sizing rules:`,
    `- Size each story by relative comparison to the nearest reference epic(s) by actual story points — do not invent numbers in isolation.`,
    `- When you use a reference for a story, name it (its epicId) and explain the comparison briefly in that story's rationale.`,
    `- Keep the whole decomposition's points consistent with the references' scale.`,
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
  const story = {
    type: 'object',
    additionalProperties: false,
    properties: {
      title: { type: 'string' },
      points: { type: 'integer', enum: fibEnum },
      acceptanceCriteria: { type: 'array', items: { type: 'string' } },
      splitPattern: { type: 'string', enum: ['Spike', 'Path', 'Interface', 'Data', 'Rules'] },
      provenance: { type: 'string', enum: ['existing', 'frame-generated'] },
      // Strict mode requires every property in `required`; genuinely-optional
      // fields are modelled as nullable.
      referenceEpicId: { type: ['string', 'null'] },
      rationale: { type: ['string', 'null'] },
    },
    required: [
      'title', 'points', 'acceptanceCriteria', 'splitPattern',
      'provenance', 'referenceEpicId', 'rationale',
    ],
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
          stories: { type: 'array', items: story },
          rationale: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['stories', 'rationale', 'confidence'],
      },
    },
  };
}

export const AZURE_MODEL_VERSION = 'brp-azure-v2';

/** Nearest Fibonacci ladder value to a free integer (for the legacy display estimate). */
function nearestFibonacci(n: number): FibonacciPoint {
  let best: FibonacciPoint = FIBONACCI_POINTS[0]!;
  let bestDist = Infinity;
  for (const p of FIBONACCI_POINTS) {
    const d = Math.abs(p - n);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

/**
 * Normalize the canonical model output (stories + rationale + confidence)
 * into a full FrameResult. The load is Σ stories.points (INV2); the legacy
 * `frameEstimate`/`breakdown`/`generatedStories` are back-filled FROM the
 * stories so transitional consumers keep working and can never disagree
 * with the canonical list.
 */
function normalizeOutput(
  out: { stories: SizedStory[]; rationale: string; confidence: number },
  references: readonly ReferenceEpic[],
): FrameResult {
  const sum = out.stories.reduce((s, x) => s + x.points, 0);
  return {
    frameEstimate: nearestFibonacci(sum),
    breakdown: out.stories.map((s) => ({ title: s.title, points: s.points })),
    stories: out.stories,
    rationale: out.rationale,
    confidence: out.confidence,
    references: [...references],
    generatedStories: out.stories
      .filter((s) => s.provenance === 'frame-generated')
      .map((s) => ({ title: s.title, points: s.points, acceptanceCriteria: s.acceptanceCriteria })),
    modelVersion: AZURE_MODEL_VERSION,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Back-fill a `stories` list onto a legacy-shaped FrameResult (old data, or
 * the protected test's stub). Keeps `computeEpicLoad` and the wider UI on the
 * single canonical field even before the model output fully migrates.
 */
function ensureStories(fr: FrameResult): FrameResult {
  if (fr.stories && fr.stories.length > 0) return fr;
  return {
    ...fr,
    stories: fr.breakdown.map((b) => ({
      title: b.title,
      points: b.points,
      acceptanceCriteria: [],
      splitPattern: 'Path' as const,
      provenance: 'frame-generated' as const,
    })),
  };
}

type ParseOutcome =
  | { kind: 'ok'; result: FrameResult }
  | { kind: 'retry'; feedback: string[] }
  | { kind: 'error'; message: string };

/**
 * Parse + validate one model response. Resolution order:
 *   1. canonical stories shape → run INVEST/SPIDR/count validation; if it
 *      fails, return `retry` with targeted feedback (the reconciliation step).
 *   2. legacy FrameResult shape → accept, back-filling stories (compat path).
 *   3. otherwise → `error` (non-JSON or neither shape valid).
 */
function parseAndValidate(raw: string, references: readonly ReferenceEpic[]): ParseOutcome {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFence(raw));
  } catch (e: unknown) {
    return { kind: 'error', message: `Model returned non-JSON: ${e instanceof Error ? e.message : String(e)}` };
  }

  const canonical = EstimatorOutputSchema.safeParse(parsed);
  if (canonical.success) {
    const check = validateStories(canonical.data.stories);
    if (!check.ok) return { kind: 'retry', feedback: check.errors };
    return { kind: 'ok', result: normalizeOutput(canonical.data, references) };
  }

  const legacy = FrameResultSchema.safeParse(parsed);
  if (legacy.success) {
    return { kind: 'ok', result: ensureStories(legacy.data) };
  }

  return {
    kind: 'error',
    message: `Model output failed schema validation: ${canonical.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ')}`,
  };
}

/** Re-prompt appended after a validation failure, listing the exact issues to fix. */
function buildRetryPrompt(epic: Epic, references: readonly ReferenceEpic[], feedback: string[]): string {
  return [
    buildUserPrompt(epic, references),
    ``,
    `Your previous response was rejected for these reasons — fix ALL of them and return corrected JSON:`,
    ...feedback.map((f) => `- ${f}`),
  ].join('\n');
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

      const config = deps.readConfig();
      // BRP analysis runs through the Azure adapter only (B-36).
      const endpoint = config.endpoints?.azureEndpoint ?? '';
      if (!endpoint) {
        yield { kind: 'error', epicId: epic.id, message: 'AI endpoint is not configured' };
        return;
      }

      // One initial attempt plus, on a story-validation failure, a single
      // re-prompt carrying targeted feedback (the reconciliation step, T6).
      // Parse/network/non-JSON failures are NOT retried — they surface as-is.
      let userPrompt = buildUserPrompt(epic, references);
      let lastFeedback: string[] | null = null;

      for (let attempt = 0; attempt < 2; attempt++) {
        let raw: string;
        try {
          const response = await call(config.azure, endpoint, {
            systemPrompt: SYSTEM_PROMPT,
            userPrompt,
            maxTokens: 1200,
            temperature: 0.2,
            // T4: lock output shape + Fibonacci enum; seed per-epic (+attempt)
            // for run-to-run reproducibility (not temperature — refuted).
            responseFormat: buildResponseFormat(),
            seed: seedFromEpicId(epic.id) + attempt,
          });
          raw = response.content;
        } catch (e: unknown) {
          yield { kind: 'error', epicId: epic.id, message: e instanceof Error ? e.message : String(e) };
          return;
        }

        if (signal?.aborted) {
          yield { kind: 'error', epicId: epic.id, message: 'Aborted after request' };
          return;
        }

        const outcome = parseAndValidate(raw, references);
        if (outcome.kind === 'ok') {
          yield { kind: 'done', epicId: epic.id, result: outcome.result };
          return;
        }
        if (outcome.kind === 'error') {
          yield { kind: 'error', epicId: epic.id, message: outcome.message };
          return;
        }
        // kind === 'retry': re-prompt once with the validation feedback.
        lastFeedback = outcome.feedback;
        userPrompt = buildRetryPrompt(epic, references, outcome.feedback);
      }

      yield {
        kind: 'error',
        epicId: epic.id,
        message: `Model output failed story validation after re-prompt: ${(lastFeedback ?? []).join('; ')}`,
      };
    },
  };
}
