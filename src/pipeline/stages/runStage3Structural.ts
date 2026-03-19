/**
 * Stage 3 — Structural Assessment.
 *
 * Scores each section on completeness/relevance/placement, plans
 * transformations, and identifies missing sections. Bridges analysis
 * (stages 1-2) to action (stages 4-6).
 */

import type { AIClientConfig } from '@/services/ai/types';
import { callAI } from '@/services/ai/aiClient';
import { withRetry } from '@/services/ai/throttler';
import { buildStructuralPrompt } from '@/pipeline/prompts/structuralPrompt';
import { summarizeComprehension } from '@/pipeline/stages/runStage2Classification';
import { discoverSections, findMissingRequiredSections } from '@/domain/sectionDiscovery';
import { loadCategoryTemplate, getScaledTemplate } from '@/services/templates/templateLoader';
import type { EpicCategory } from '@/domain/types';
import type {
  StructuralInput,
  StructuralOutput,
  SectionScore,
  TransformationAction,
  StageResult,
  PipelineConfig,
  PipelineProgressCallback,
} from '@/pipeline/pipelineTypes';

// ─── Constants ──────────────────────────────────────────────

const STAGE_NAME = 'structural';

const VALID_ACTIONS: readonly TransformationAction['action'][] = [
  'keep', 'restructure', 'merge', 'split', 'add',
];

// ─── Main Stage Function ────────────────────────────────────

export async function runStage3Structural(
  input: StructuralInput,
  config: PipelineConfig,
  aiConfig: AIClientConfig,
  onProgress?: PipelineProgressCallback,
): Promise<StageResult<StructuralOutput>> {
  const startTime = Date.now();

  onProgress?.({
    stageName: STAGE_NAME,
    status: 'running',
    message: 'Assessing document structure and planning transformations...',
    timestamp: Date.now(),
  });

  try {
    const category = input.classification.primaryCategory;
    const discovered = discoverSections(input.rawContent);
    const sectionTitles = discovered.map((s) => s.title);

    const scaledTemplate = getScaledTemplate(category, config.complexity);
    const templateSectionNames = [
      ...Object.keys(scaledTemplate.requiredSections),
      ...Object.keys(scaledTemplate.optionalSections),
    ];

    const prompt = buildStructuralPrompt({
      comprehensionSummary: summarizeComprehension(input.comprehension),
      classificationResult: JSON.stringify(input.classification),
      rawContent: input.rawContent,
      sectionList: sectionTitles,
      complexityLevel: config.complexity,
      categoryTemplateSections: templateSectionNames,
    });

    const response = await withRetry(
      () => callAI(aiConfig, {
        systemPrompt: prompt,
        userPrompt: 'Assess the document structure and produce the JSON output as specified.',
        temperature: config.generationTemperature,
      }),
      STAGE_NAME,
      3,
    );

    const parsed = parseStructuralResponse(response.content);

    if (!parsed) {
      // Fallback: build a basic structural output from local analysis
      const fallback = buildFallbackOutput(discovered, category, templateSectionNames);

      onProgress?.({
        stageName: STAGE_NAME,
        status: 'complete',
        message: 'AI parsing failed — used local fallback assessment',
        timestamp: Date.now(),
      });

      return {
        success: true,
        data: fallback,
        metadata: {
          stageName: STAGE_NAME,
          duration: Date.now() - startTime,
          tokensUsed: response.usage?.totalTokens ?? 0,
          model: response.model,
        },
      };
    }

    // Override transformation plan for user-approved sections → force 'keep'
    const finalPlan = parsed.transformationPlan.map((action) => {
      if (config.userApprovedSections.includes(action.sectionId)) {
        return { ...action, action: 'keep' as const, details: 'User-approved section — preserving manual edits' };
      }
      return action;
    });
    const finalOutput = { ...parsed, transformationPlan: finalPlan };

    onProgress?.({
      stageName: STAGE_NAME,
      status: 'complete',
      message: `Assessed ${finalOutput.sectionScores.length} sections, ${finalOutput.missingSections.length} missing`,
      timestamp: Date.now(),
    });

    return {
      success: true,
      data: finalOutput,
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
      data: { sectionScores: [], transformationPlan: [], missingSections: [] },
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

function parseStructuralResponse(content: string): StructuralOutput | null {
  const json = tryParseJSON(content) ?? tryExtractFromCodeBlock(content);
  if (!json || typeof json !== 'object') return null;
  return validateStructuralOutput(json as Record<string, unknown>);
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

function validateStructuralOutput(obj: Record<string, unknown>): StructuralOutput | null {
  const rawScores = Array.isArray(obj['sectionScores']) ? obj['sectionScores'] as unknown[] : [];
  const rawPlan = Array.isArray(obj['transformationPlan']) ? obj['transformationPlan'] as unknown[] : [];
  const rawMissing = Array.isArray(obj['missingSections']) ? obj['missingSections'] as unknown[] : [];

  if (rawScores.length === 0 && rawPlan.length === 0) return null;

  const sectionScores: SectionScore[] = rawScores.map(normalizeScore);
  const transformationPlan: TransformationAction[] = rawPlan.map(normalizeAction);
  const missingSections: string[] = rawMissing
    .filter((v): v is string => typeof v === 'string');

  return { sectionScores, transformationPlan, missingSections };
}

function clampScore(value: unknown): number {
  const num = typeof value === 'number' ? value : 5;
  return Math.max(1, Math.min(10, Math.round(num)));
}

function normalizeScore(raw: unknown): SectionScore {
  const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const completeness = clampScore(obj['completeness']);
  const relevance = clampScore(obj['relevance']);
  const placement = clampScore(obj['placement']);
  const overall = clampScore(obj['overall']);

  return {
    sectionId: typeof obj['sectionId'] === 'string' ? obj['sectionId'] : 'unknown',
    completeness,
    relevance,
    placement,
    overall,
  };
}

function normalizeAction(raw: unknown): TransformationAction {
  const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const rawAction = typeof obj['action'] === 'string' ? obj['action'] : '';
  const action = VALID_ACTIONS.includes(rawAction as TransformationAction['action'])
    ? (rawAction as TransformationAction['action'])
    : 'restructure';

  return {
    sectionId: typeof obj['sectionId'] === 'string' ? obj['sectionId'] : 'unknown',
    action,
    details: typeof obj['details'] === 'string' ? obj['details'] : '',
  };
}

// ─── Fallback Local Assessment ──────────────────────────────

function buildFallbackOutput(
  discovered: ReturnType<typeof discoverSections>,
  category: EpicCategory,
  _templateSectionNames: readonly string[],
): StructuralOutput {
  const template = loadCategoryTemplate(category);
  const missing = findMissingRequiredSections(discovered, {
    category,
    sections: Object.entries(template.requiredSections).map(([name, config]) => ({
      name,
      required: true,
      wordTarget: config.wordLimit ?? config.target ?? 300,
    })),
  });

  const sectionScores: SectionScore[] = discovered.map((s) => ({
    sectionId: s.normalizedTitle.replace(/\s+/g, '-'),
    completeness: Math.min(10, Math.max(1, Math.round(s.wordCount / 50))),
    relevance: 5,
    placement: 5,
    overall: 5,
  }));

  const transformationPlan: TransformationAction[] = discovered.map((s) => ({
    sectionId: s.normalizedTitle.replace(/\s+/g, '-'),
    action: s.wordCount < 30 ? 'add' as const : 'restructure' as const,
    details: s.wordCount < 30 ? 'Section is a stub — needs substantial content' : 'Restructure for category alignment',
  }));

  return { sectionScores, transformationPlan, missingSections: missing };
}
