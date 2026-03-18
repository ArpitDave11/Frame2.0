/**
 * Stage 4 — Content Refinement.
 *
 * Rewrites each section according to the transformation plan from Stage 3.
 * Called once per section. Handles "keep" (pass-through), "restructure",
 * "merge", "split", and "add" actions. Supports retry iterations with
 * validation feedback. Reports per-section progress.
 */

import type { AIClientConfig } from '@/services/ai/types';
import { callAI } from '@/services/ai/aiClient';
import { withRetry } from '@/services/ai/throttler';
import { buildRefinementPrompt } from '@/pipeline/prompts/refinementPrompt';
import { discoverSections } from '@/domain/sectionDiscovery';
import { loadCategoryTemplate, getFormatInstruction, findSectionConfig } from '@/services/templates/templateLoader';
import type {
  RefinementInput,
  RefinementOutput,
  PipelineRefinedSection,
  TransformationAction,
  StageResult,
  PipelineConfig,
  PipelineProgressCallback,
  ValidationOutput,
} from '@/pipeline/pipelineTypes';

// ─── Constants ──────────────────────────────────────────────

const STAGE_NAME = 'refinement';

// ─── Main Stage Function ────────────────────────────────────

export async function runStage4Refinement(
  input: RefinementInput,
  config: PipelineConfig,
  aiConfig: AIClientConfig,
  onProgress?: PipelineProgressCallback,
): Promise<StageResult<RefinementOutput>> {
  const startTime = Date.now();
  let totalTokens = 0;
  let model = '';

  onProgress?.({
    stageName: STAGE_NAME,
    status: 'running',
    message: 'Beginning section-by-section refinement...',
    timestamp: Date.now(),
  });

  const category = input.classification.primaryCategory;
  const template = loadCategoryTemplate(category);
  const discovered = discoverSections(input.rawContent);
  const plan = input.structural.transformationPlan;
  const totalSections = plan.length;

  const refinedSections: PipelineRefinedSection[] = [];
  let successCount = 0;

  for (let i = 0; i < plan.length; i++) {
    const action = plan[i]!;
    const sectionIndex = i + 1;

    onProgress?.({
      stageName: STAGE_NAME,
      status: 'running',
      message: `Refining section ${sectionIndex}/${totalSections}: ${action.sectionId}`,
      timestamp: Date.now(),
    });

    try {
      const result = await refineSingleSection(
        action,
        discovered,
        category,
        template,
        config,
        aiConfig,
        input.previousFeedback,
      );

      totalTokens += result.tokensUsed;
      if (result.model) model = result.model;
      successCount++;

      for (const section of result.sections) {
        refinedSections.push(section);
      }
    } catch (error) {
      // Partial failure: log and continue with other sections
      const errMsg = error instanceof Error ? error.message : String(error);
      refinedSections.push({
        sectionId: action.sectionId,
        title: action.sectionId,
        content: `[Refinement failed: ${errMsg}]`,
        formatUsed: 'prose',
      });
    }
  }

  const success = successCount > 0;

  onProgress?.({
    stageName: STAGE_NAME,
    status: success ? 'complete' : 'failed',
    message: success
      ? `Refined ${refinedSections.length} sections`
      : 'No sections were refined successfully',
    timestamp: Date.now(),
  });

  return {
    success,
    data: { refinedSections },
    metadata: {
      stageName: STAGE_NAME,
      duration: Date.now() - startTime,
      tokensUsed: totalTokens,
      model,
    },
  };
}

// ─── Per-Section Refinement ─────────────────────────────────

interface SectionRefinementResult {
  sections: PipelineRefinedSection[];
  tokensUsed: number;
  model: string;
}

async function refineSingleSection(
  action: TransformationAction,
  discovered: ReturnType<typeof discoverSections>,
  category: string,
  template: ReturnType<typeof loadCategoryTemplate>,
  config: PipelineConfig,
  aiConfig: AIClientConfig,
  previousFeedback?: ValidationOutput,
): Promise<SectionRefinementResult> {
  const existingSection = discovered.find(
    (s) => s.normalizedTitle === action.sectionId.replace(/-/g, ' ')
      || s.title.toLowerCase() === action.sectionId.toLowerCase()
      || s.normalizedTitle.replace(/\s+/g, '-') === action.sectionId,
  );

  const sectionContent = existingSection?.content ?? '';
  const sectionTitle = existingSection?.title ?? action.sectionId;

  // "keep" — pass through unchanged, no AI call
  if (action.action === 'keep' && sectionContent) {
    const sectionConfig = findSectionConfig(sectionTitle, template);
    return {
      sections: [{
        sectionId: action.sectionId,
        title: sectionTitle,
        content: sectionContent,
        formatUsed: sectionConfig?.format ?? 'prose',
      }],
      tokensUsed: 0,
      model: '',
    };
  }

  // All other actions: call AI
  const sectionConfig = findSectionConfig(sectionTitle, template);
  const formatInstruction = getFormatInstruction(sectionConfig?.format, sectionConfig?.columns);
  const wordTarget = sectionConfig?.wordLimit ?? sectionConfig?.target ?? 300;

  // Extract relevant feedback for this section (if retry)
  const sectionFeedback = previousFeedback
    ? extractSectionFeedback(action.sectionId, previousFeedback)
    : undefined;

  const iterationNumber = previousFeedback ? 1 : 0;

  const prompt = buildRefinementPrompt({
    sectionTitle,
    sectionContent,
    transformationAction: action.action,
    categoryName: category,
    formatInstruction,
    complexityLevel: config.complexity,
    wordTarget,
    previousFeedback: sectionFeedback,
    iterationNumber,
  });

  const response = await withRetry(
    () => callAI(aiConfig, {
      systemPrompt: prompt,
      userPrompt: 'Refine the section as specified and produce the JSON output.',
      temperature: config.generationTemperature,
    }),
    `${STAGE_NAME}:${action.sectionId}`,
    3,
  );

  const parsed = parseRefinedSection(response.content);

  if (!parsed) {
    return {
      sections: [{
        sectionId: action.sectionId,
        title: sectionTitle,
        content: sectionContent || '[AI produced unparseable output]',
        formatUsed: sectionConfig?.format ?? 'prose',
      }],
      tokensUsed: response.usage?.totalTokens ?? 0,
      model: response.model,
    };
  }

  // Handle "split": AI returns one section, but we tag it as the focused sub-section
  return {
    sections: [parsed],
    tokensUsed: response.usage?.totalTokens ?? 0,
    model: response.model,
  };
}

// ─── Feedback Extraction ────────────────────────────────────

function extractSectionFeedback(
  sectionId: string,
  feedback: ValidationOutput,
): string | undefined {
  const relevantItems = feedback.feedback.filter(
    (item) => item.toLowerCase().includes(sectionId.toLowerCase()),
  );

  if (relevantItems.length === 0) return undefined;
  return relevantItems.join('\n');
}

// ─── JSON Parsing ───────────────────────────────────────────

function parseRefinedSection(content: string): PipelineRefinedSection | null {
  const json = tryParseJSON(content) ?? tryExtractFromCodeBlock(content);
  if (!json || typeof json !== 'object') return null;

  const obj = json as Record<string, unknown>;
  const sectionId = typeof obj['sectionId'] === 'string' ? obj['sectionId'] : '';
  const title = typeof obj['title'] === 'string' ? obj['title'] : '';
  const sectionContent = typeof obj['content'] === 'string' ? obj['content'] : '';
  const formatUsed = typeof obj['formatUsed'] === 'string' ? obj['formatUsed'] : 'prose';

  if (!sectionId && !title && !sectionContent) return null;

  return { sectionId: sectionId || title, title: title || sectionId, content: sectionContent, formatUsed };
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
