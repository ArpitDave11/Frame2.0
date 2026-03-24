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
      message: `Refining section ${sectionIndex}/${totalSections}: ${action.displayName || action.sectionId}`,
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
        input.rawContent,
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
      console.error(`Stage 4: Failed to refine section "${action.displayName}":`, error);
      refinedSections.push({
        sectionId: action.sectionId,
        title: action.displayName || action.sectionId,
        content: `_Error generating this section: ${errMsg}_`,
        formatUsed: 'error',
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
  rawContent: string,
  previousFeedback?: ValidationOutput,
): Promise<SectionRefinementResult> {
  const existingSection = discovered.find(
    (s) => s.normalizedTitle === action.sectionId.replace(/-/g, ' ')
      || s.title.toLowerCase() === action.sectionId.toLowerCase()
      || s.normalizedTitle.replace(/\s+/g, '-') === action.sectionId,
  );

  const sectionContent = existingSection?.content ?? '';
  const sectionTitle = action.displayName || existingSection?.title || action.sectionId;

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
    documentContext: rawContent,
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

  // FIX: Use robust parseAIJson instead of old parseRefinedSection
  const parsed = parseAIJson<{ sectionId?: string; title?: string; content?: string; formatUsed?: string }>(response.content);

  if (parsed && parsed.content) {
    return {
      sections: [{
        sectionId: action.sectionId,
        title: sectionTitle,              // ALWAYS use displayName-derived title
        content: parsed.content,
        formatUsed: parsed.formatUsed ?? 'prose',
      }],
      tokensUsed: response.usage?.totalTokens ?? 0,
      model: response.model,
    };
  }

  // Parse failed — use raw AI text as content. NEVER use '[AI produced unparseable output]'
  return {
    sections: [{
      sectionId: action.sectionId,
      title: sectionTitle,
      content: response.content || sectionContent || `_Content for ${sectionTitle} could not be generated._`,
      formatUsed: 'raw',
    }],
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

// ─── Robust JSON Parsing ────────────────────────────────────

/**
 * Robust JSON extraction from AI responses.
 * AI models frequently wrap JSON in markdown code blocks.
 * Tries 3 strategies. Returns parsed object or null (never throws).
 */
function parseAIJson<T = unknown>(raw: string): T | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Strategy 1: Direct parse
  try { return JSON.parse(trimmed) as T; } catch { /* continue */ }

  // Strategy 2: Strip markdown code block wrappers
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch?.[1]) {
    try { return JSON.parse(codeBlockMatch[1].trim()) as T; } catch { /* continue */ }
  }

  // Strategy 3: Extract between first { and last }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as T; } catch { /* continue */ }
  }

  return null;
}
