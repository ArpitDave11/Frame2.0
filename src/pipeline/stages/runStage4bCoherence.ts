/**
 * Stage 4b — Cross-Section Coherence Pass.
 *
 * Runs AFTER Stage 4 (per-section refinement) and BEFORE Stage 5 (mandatory).
 * Single AI call that reads all sections together and fixes contradictions,
 * redundancy, missing cross-references, and inconsistent terminology.
 */

import type { AIClientConfig } from '@/services/ai/types';
import { callAI } from '@/services/ai/aiClient';
import { withRetry } from '@/services/ai/throttler';
import { buildCoherencePrompt } from '@/pipeline/prompts/coherencePrompt';
import type {
  RefinementOutput,
  ClassificationOutput,
  PipelineRefinedSection,
  StageResult,
  PipelineConfig,
  PipelineProgressCallback,
} from '@/pipeline/pipelineTypes';

// ─── Types ──────────────────────────────────────────────────

export interface CoherenceInput {
  readonly refinement: RefinementOutput;
  readonly classification: ClassificationOutput;
}

export interface CoherenceFix {
  readonly type: 'contradiction' | 'redundancy' | 'missing-crossref' | 'terminology';
  readonly sections: readonly string[];
  readonly description: string;
}

export interface CoherenceOutput {
  readonly refinedSections: readonly PipelineRefinedSection[];
  readonly fixes: readonly CoherenceFix[];
}

// ─── Constants ──────────────────────────────────────────────

const STAGE_NAME = 'coherence';

// ─── Main Stage Function ────────────────────────────────────

export async function runStage4bCoherence(
  input: CoherenceInput,
  config: PipelineConfig,
  aiConfig: AIClientConfig,
  onProgress?: PipelineProgressCallback,
): Promise<StageResult<CoherenceOutput>> {
  const startTime = Date.now();

  onProgress?.({
    stageName: STAGE_NAME,
    status: 'running',
    message: 'Checking cross-section coherence...',
    timestamp: Date.now(),
  });

  try {
    const allSections = input.refinement.refinedSections
      .map((s) => `### ${s.title} (${s.sectionId})\n${s.content}`)
      .join('\n\n---\n\n');

    const prompt = buildCoherencePrompt({
      allSections,
      categoryName: input.classification.primaryCategory,
      complexityLevel: config.complexity,
    });

    const response = await withRetry(
      () => callAI(aiConfig, {
        systemPrompt: prompt,
        userPrompt: 'Review the sections for coherence and produce the JSON output.',
        temperature: config.generationTemperature,
      }),
      STAGE_NAME,
      3,
    );

    const parsed = parseCoherenceResponse(response.content, input.refinement.refinedSections);

    if (!parsed) {
      // Graceful degradation: return original sections unchanged
      onProgress?.({
        stageName: STAGE_NAME,
        status: 'complete',
        message: 'Coherence check skipped (could not parse AI response)',
        timestamp: Date.now(),
      });

      return {
        success: true,
        data: { refinedSections: input.refinement.refinedSections, fixes: [] },
        metadata: {
          stageName: STAGE_NAME,
          duration: Date.now() - startTime,
          tokensUsed: response.usage?.totalTokens ?? 0,
          model: response.model,
        },
      };
    }

    onProgress?.({
      stageName: STAGE_NAME,
      status: 'complete',
      message: parsed.fixes.length > 0
        ? `Fixed ${parsed.fixes.length} coherence issue(s)`
        : 'No coherence issues found',
      timestamp: Date.now(),
    });

    return {
      success: true,
      data: parsed,
      metadata: {
        stageName: STAGE_NAME,
        duration: Date.now() - startTime,
        tokensUsed: response.usage?.totalTokens ?? 0,
        model: response.model,
      },
    };
  } catch (error) {
    // Graceful degradation: return original sections on any error
    onProgress?.({
      stageName: STAGE_NAME,
      status: 'complete',
      message: 'Coherence check skipped due to error — using original sections',
      timestamp: Date.now(),
    });

    return {
      success: true,
      data: { refinedSections: input.refinement.refinedSections, fixes: [] },
      metadata: {
        stageName: STAGE_NAME,
        duration: Date.now() - startTime,
        tokensUsed: 0,
        model: '',
      },
    };
  }
}

// ─── JSON Parsing ───────────────────────────────────────────

function parseCoherenceResponse(
  content: string,
  originalSections: readonly PipelineRefinedSection[],
): CoherenceOutput | null {
  const json = tryParseJSON(content) ?? tryExtractFromCodeBlock(content);
  if (!json || typeof json !== 'object') return null;

  const obj = json as Record<string, unknown>;
  const rawSections = Array.isArray(obj['refinedSections']) ? obj['refinedSections'] as unknown[] : [];
  const rawFixes = Array.isArray(obj['fixes']) ? obj['fixes'] as unknown[] : [];

  // If AI returned no sections, fall back to originals
  const sections: PipelineRefinedSection[] = rawSections.length > 0
    ? rawSections.map(normalizeSection)
    : [...originalSections];

  const fixes: CoherenceFix[] = rawFixes.map(normalizeFix).filter((f) => f.description.length > 0);

  return { refinedSections: sections, fixes };
}

function normalizeSection(raw: unknown): PipelineRefinedSection {
  const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    sectionId: typeof obj['sectionId'] === 'string' ? obj['sectionId'] : 'unknown',
    title: typeof obj['title'] === 'string' ? obj['title'] : 'Untitled',
    content: typeof obj['content'] === 'string' ? obj['content'] : '',
    formatUsed: typeof obj['formatUsed'] === 'string' ? obj['formatUsed'] : 'prose',
  };
}

const VALID_FIX_TYPES = ['contradiction', 'redundancy', 'missing-crossref', 'terminology'] as const;

function normalizeFix(raw: unknown): CoherenceFix {
  const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const rawType = typeof obj['type'] === 'string' ? obj['type'] : '';
  const type = VALID_FIX_TYPES.includes(rawType as CoherenceFix['type'])
    ? (rawType as CoherenceFix['type'])
    : 'terminology';

  return {
    type,
    sections: Array.isArray(obj['sections'])
      ? (obj['sections'] as unknown[]).filter((v): v is string => typeof v === 'string')
      : [],
    description: typeof obj['description'] === 'string' ? obj['description'] : '',
  };
}

function tryParseJSON(text: string): unknown {
  try { return JSON.parse(text.trim()); } catch { return null; }
}

function tryExtractFromCodeBlock(text: string): unknown {
  const match = /```(?:json)?\s*\n?([\s\S]*?)```/.exec(text);
  if (!match?.[1]) return null;
  return tryParseJSON(match[1]);
}
