/**
 * Stage 2 — Category Classification.
 *
 * Classifies the epic into exactly one of 7 categories with a confidence
 * score. Consumes Stage 1 comprehension output for informed classification.
 * Validates category against EpicCategory enum, clamps confidence to 0-1.
 */

import type { AIClientConfig } from '@/services/ai/types';
import { callAI } from '@/services/ai/aiClient';
import { withRetry } from '@/services/ai/throttler';
import { buildClassificationPrompt } from '@/pipeline/prompts/classificationPrompt';
import type { EpicCategory } from '@/domain/types';
import type {
  ClassificationInput,
  ClassificationOutput,
  ComprehensionOutput,
  StageResult,
  PipelineConfig,
  PipelineProgressCallback,
} from '@/pipeline/pipelineTypes';

// ─── Constants ──────────────────────────────────────────────

const STAGE_NAME = 'classification';

const VALID_CATEGORIES: readonly EpicCategory[] = [
  'business_requirement',
  'technical_design',
  'feature_specification',
  'api_specification',
  'infrastructure_design',
  'migration_plan',
  'integration_spec',
];

const DEFAULT_CATEGORY: EpicCategory = 'technical_design';

// ─── Main Stage Function ────────────────────────────────────

export async function runStage2Classification(
  input: ClassificationInput,
  config: PipelineConfig,
  aiConfig: AIClientConfig,
  onProgress?: PipelineProgressCallback,
): Promise<StageResult<ClassificationOutput>> {
  const startTime = Date.now();

  onProgress?.({
    stageName: STAGE_NAME,
    status: 'running',
    message: 'Classifying document into category...',
    timestamp: Date.now(),
  });

  try {
    const prompt = buildClassificationPrompt({
      comprehensionSummary: summarizeComprehension(input.comprehension),
      rawContent: input.rawContent,
      availableCategories: [...VALID_CATEGORIES],
      complexityLevel: config.complexity,
    });

    const response = await withRetry(
      () => callAI(aiConfig, {
        systemPrompt: prompt,
        userPrompt: 'Classify the document provided above and produce the JSON output as specified.',
      }),
      STAGE_NAME,
      3,
    );

    const parsed = parseClassificationResponse(response.content);

    if (!parsed) {
      onProgress?.({
        stageName: STAGE_NAME,
        status: 'failed',
        message: 'Failed to parse AI response as valid ClassificationOutput',
        timestamp: Date.now(),
      });

      return {
        success: false,
        data: emptyClassificationOutput(),
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
      message: `Classified as ${parsed.primaryCategory} (confidence: ${(parsed.confidence * 100).toFixed(0)}%)`,
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
      data: emptyClassificationOutput(),
      metadata: {
        stageName: STAGE_NAME,
        duration: Date.now() - startTime,
        tokensUsed: 0,
        model: '',
      },
    };
  }
}

// ─── Comprehension Summary ──────────────────────────────────

export function summarizeComprehension(comp: ComprehensionOutput): string {
  const lines: string[] = [];

  if (comp.keyEntities.length > 0) {
    lines.push('Key Entities:');
    for (const e of comp.keyEntities) {
      const rels = e.relationships.length > 0 ? ` (relates to: ${e.relationships.join(', ')})` : '';
      lines.push(`  - ${e.name} [${e.type}]${rels}`);
    }
  }

  if (comp.extractedRequirements.length > 0) {
    lines.push('');
    lines.push('Extracted Requirements:');
    for (const r of comp.extractedRequirements) {
      lines.push(`  - ${r.id}: ${r.description} [${r.priority}]`);
    }
  }

  if (comp.detectedGaps.length > 0) {
    lines.push('');
    lines.push('Detected Gaps:');
    for (const g of comp.detectedGaps) {
      lines.push(`  - ${g}`);
    }
  }

  if (comp.implicitRisks.length > 0) {
    lines.push('');
    lines.push('Implicit Risks:');
    for (const r of comp.implicitRisks) {
      lines.push(`  - ${r}`);
    }
  }

  if (comp.semanticSections.length > 0) {
    lines.push('');
    lines.push('Semantic Sections:');
    for (const s of comp.semanticSections) {
      lines.push(`  - ${s.title}: ${s.purpose}`);
    }
  }

  return lines.join('\n');
}

// ─── JSON Parsing ───────────────────────────────────────────

function parseClassificationResponse(content: string): ClassificationOutput | null {
  const json = tryParseJSON(content) ?? tryExtractFromCodeBlock(content);
  if (!json || typeof json !== 'object') return null;
  return validateClassificationOutput(json as Record<string, unknown>);
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

function validateClassificationOutput(
  obj: Record<string, unknown>,
): ClassificationOutput | null {
  const rawCategory = typeof obj['primaryCategory'] === 'string' ? obj['primaryCategory'] : '';
  const primaryCategory = VALID_CATEGORIES.includes(rawCategory as EpicCategory)
    ? (rawCategory as EpicCategory)
    : DEFAULT_CATEGORY;

  const rawConfidence = typeof obj['confidence'] === 'number' ? obj['confidence'] : 0.5;
  const confidence = Math.max(0, Math.min(1, rawConfidence));

  const categoryConfig = (typeof obj['categoryConfig'] === 'object' && obj['categoryConfig'] !== null)
    ? (obj['categoryConfig'] as Record<string, unknown>)
    : {};

  const reasoning = typeof obj['reasoning'] === 'string' ? obj['reasoning'] : '';

  // A classification with no reasoning at all is suspicious but not fatal
  if (!rawCategory && !reasoning) return null;

  return { primaryCategory, confidence, categoryConfig, reasoning };
}

// ─── Empty Output ───────────────────────────────────────────

function emptyClassificationOutput(): ClassificationOutput {
  return {
    primaryCategory: DEFAULT_CATEGORY,
    confidence: 0,
    categoryConfig: {},
    reasoning: '',
  };
}
