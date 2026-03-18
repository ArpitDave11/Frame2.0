/**
 * Stage 1 — Deep Comprehension.
 *
 * Takes raw epic content and produces a structured ComprehensionOutput:
 * entities, requirements, gaps, risks, semantic sections.
 * Calls the AI client with the comprehension prompt, parses JSON,
 * validates output structure. Never throws on recoverable errors.
 */

import type { AIClientConfig } from '@/services/ai/types';
import { callAI } from '@/services/ai/aiClient';
import { withRetry } from '@/services/ai/throttler';
import { buildComprehensionPrompt } from '@/pipeline/prompts/comprehensionPrompt';
import { getScaledWordTarget } from '@/domain/complexity';
import type {
  ComprehensionInput,
  ComprehensionOutput,
  StageResult,
  PipelineConfig,
  PipelineProgressCallback,
} from '@/pipeline/pipelineTypes';

// ─── Constants ──────────────────────────────────────────────

const STAGE_NAME = 'comprehension';
const BASE_WORD_TARGET = 2000;

// ─── Main Stage Function ────────────────────────────────────

export async function runStage1Comprehension(
  input: ComprehensionInput,
  config: PipelineConfig,
  aiConfig: AIClientConfig,
  onProgress?: PipelineProgressCallback,
): Promise<StageResult<ComprehensionOutput>> {
  const startTime = Date.now();

  onProgress?.({
    stageName: STAGE_NAME,
    status: 'running',
    message: 'Analyzing document for entities, requirements, and gaps...',
    timestamp: Date.now(),
  });

  try {
    const prompt = buildComprehensionPrompt({
      rawContent: input.rawContent,
      title: input.title,
      complexityLevel: config.complexity,
      wordTarget: getScaledWordTarget(BASE_WORD_TARGET, config.complexity),
    });

    const response = await withRetry(
      () => callAI(aiConfig, {
        systemPrompt: prompt,
        userPrompt: 'Analyze the document provided above and produce the JSON output as specified.',
        temperature: config.generationTemperature,
      }),
      STAGE_NAME,
      3,
    );

    const parsed = parseComprehensionResponse(response.content);

    if (!parsed) {
      onProgress?.({
        stageName: STAGE_NAME,
        status: 'failed',
        message: 'Failed to parse AI response as valid ComprehensionOutput',
        timestamp: Date.now(),
      });

      return {
        success: false,
        data: emptyComprehensionOutput(),
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
      message: `Extracted ${parsed.keyEntities.length} entities, ${parsed.extractedRequirements.length} requirements`,
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
    const message = error instanceof Error ? error.message : String(error);

    onProgress?.({
      stageName: STAGE_NAME,
      status: 'failed',
      message,
      timestamp: Date.now(),
    });

    return {
      success: false,
      data: emptyComprehensionOutput(),
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

function parseComprehensionResponse(content: string): ComprehensionOutput | null {
  // Try direct JSON parse first
  const json = tryParseJSON(content) ?? tryExtractFromCodeBlock(content);
  if (!json || typeof json !== 'object') return null;
  return validateComprehensionOutput(json as Record<string, unknown>);
}

function tryParseJSON(text: string): unknown {
  try {
    return JSON.parse(text.trim());
  } catch {
    return null;
  }
}

function tryExtractFromCodeBlock(text: string): unknown {
  const match = /```(?:json)?\s*\n?([\s\S]*?)```/.exec(text);
  if (!match?.[1]) return null;
  return tryParseJSON(match[1]);
}

// ─── Validation ─────────────────────────────────────────────

function validateComprehensionOutput(
  obj: Record<string, unknown>,
): ComprehensionOutput | null {
  const keyEntities = asArray(obj['keyEntities']);
  const detectedGaps = asStringArray(obj['detectedGaps']);
  const implicitRisks = asStringArray(obj['implicitRisks']);
  const semanticSections = asArray(obj['semanticSections']);
  const extractedRequirements = asArray(obj['extractedRequirements']);
  const gapAnalysis = asArray(obj['gapAnalysis']);

  // Must have at least keyEntities and extractedRequirements for a valid output
  if (keyEntities.length === 0 && extractedRequirements.length === 0) return null;

  return {
    keyEntities: keyEntities.map(normalizeEntity),
    detectedGaps,
    implicitRisks,
    semanticSections: semanticSections.map(normalizeSemanticSection),
    extractedRequirements: extractedRequirements.map(normalizeRequirement),
    gapAnalysis: gapAnalysis.map(normalizeGap),
  };
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeEntity(raw: unknown): ComprehensionOutput['keyEntities'][number] {
  const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    name: str(obj['name'], 'Unknown'),
    type: str(obj['type'], 'concept'),
    relationships: asStringArray(obj['relationships']),
  };
}

function normalizeSemanticSection(raw: unknown): ComprehensionOutput['semanticSections'][number] {
  const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    id: str(obj['id'], `sec-${Date.now()}`),
    title: str(obj['title'], 'Untitled'),
    content: str(obj['content']),
    purpose: str(obj['purpose']),
  };
}

function normalizeRequirement(raw: unknown): ComprehensionOutput['extractedRequirements'][number] {
  const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const priority = str(obj['priority']);
  return {
    id: str(obj['id'], `REQ-${Date.now()}`),
    description: str(obj['description']),
    priority: (priority === 'high' || priority === 'medium' || priority === 'low') ? priority : 'medium',
    source: str(obj['source']),
  };
}

function normalizeGap(raw: unknown): ComprehensionOutput['gapAnalysis'][number] {
  const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const severity = str(obj['severity']);
  return {
    requirementId: str(obj['requirementId'], 'GENERAL'),
    gapType: str(obj['gapType']),
    severity: (severity === 'critical' || severity === 'major' || severity === 'minor') ? severity : 'minor',
    suggestion: str(obj['suggestion']),
  };
}

// ─── Empty Output ───────────────────────────────────────────

function emptyComprehensionOutput(): ComprehensionOutput {
  return {
    keyEntities: [],
    detectedGaps: [],
    implicitRisks: [],
    semanticSections: [],
    extractedRequirements: [],
    gapAnalysis: [],
  };
}
