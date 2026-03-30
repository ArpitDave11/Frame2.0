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
import { enforceWordLimit } from '@/domain/epicSerializer';
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

  // Sections that Stage 5 will generate authoritatively — skip AI calls for these
  const STAGES_OWNED = new Set(['user stories', 'architecture diagram', 'architecture overview']);

  // ── Targeted repair: on retry, only re-refine sections with feedback ──
  // Build set of section IDs that need repair based on validation feedback.
  // Sections without feedback keep their previous refinement output.
  const needsRepair = input.previousFeedback
    ? identifyFailedSections(plan, input.previousFeedback)
    : null; // null = first pass, refine everything

  const previousSectionMap = new Map<string, PipelineRefinedSection>();
  if (needsRepair && input.previousRefinement) {
    for (const s of input.previousRefinement.refinedSections) {
      previousSectionMap.set(s.sectionId, s);
    }
  }

  const sectionsToRefine = needsRepair
    ? plan.filter((a) => needsRepair.has(a.sectionId))
    : plan;

  onProgress?.({
    stageName: STAGE_NAME,
    status: 'running',
    message: needsRepair
      ? `Targeted repair: re-refining ${sectionsToRefine.length}/${plan.length} sections...`
      : `Refining ${plan.length} sections in parallel...`,
    timestamp: Date.now(),
  });

  const CONCURRENCY_LIMIT = 5;
  const orderedResults: Array<{ index: number; sections: PipelineRefinedSection[]; tokensUsed: number }> = [];

  // Process in batches of CONCURRENCY_LIMIT
  for (let batchStart = 0; batchStart < plan.length; batchStart += CONCURRENCY_LIMIT) {
    const batch = plan.slice(batchStart, batchStart + CONCURRENCY_LIMIT);

    const batchPromises = batch.map(async (action, batchIdx) => {
      const globalIdx = batchStart + batchIdx;

      // Skip sections owned by Stage 5 — no wasted AI call
      if (STAGES_OWNED.has((action.displayName || action.sectionId).toLowerCase().trim())) {
        return { index: globalIdx, sections: [] as PipelineRefinedSection[], tokensUsed: 0 };
      }

      // Targeted repair: reuse previous output for sections that passed validation
      if (needsRepair && !needsRepair.has(action.sectionId)) {
        const prev = previousSectionMap.get(action.sectionId);
        if (prev) {
          return { index: globalIdx, sections: [prev], tokensUsed: 0 };
        }
      }

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

        // F08: enforce word limits — read max from template config, fallback 500
        // Diagrams and flowcharts are exempt from word limits (max: 0 in template, or mermaid format)
        const cappedSections = result.sections.map((s) => {
          const secCfg = findSectionConfig(s.title, template);
          const isDiagram = secCfg?.format?.startsWith('mermaid') || s.content.includes('```mermaid');
          if (isDiagram) return s;
          const maxWords = secCfg?.max ?? 500;
          return { ...s, content: enforceWordLimit(s.content, maxWords) };
        });
        // Emit per-section progress for streaming UI
        for (const s of cappedSections) {
          onProgress?.({
            stageName: STAGE_NAME,
            status: 'running',
            message: `Completed section: ${s.title}`,
            timestamp: Date.now(),
            sectionComplete: {
              sectionId: s.sectionId,
              title: s.title,
              index: globalIdx + 1,
              total: plan.length,
            },
          });
        }

        return { index: globalIdx, sections: cappedSections, tokensUsed: result.tokensUsed };
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        return {
          index: globalIdx,
          sections: [{
            sectionId: action.sectionId,
            title: action.displayName || action.sectionId,
            content: `_Error generating this section: ${errMsg}_`,
            formatUsed: 'error',
          }] as PipelineRefinedSection[],
          tokensUsed: 0,
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    orderedResults.push(...batchResults);
  }

  // Reassemble in original order, filtering out empty (skipped) entries
  orderedResults.sort((a, b) => a.index - b.index);
  const refinedSections: PipelineRefinedSection[] = [];
  for (const r of orderedResults) {
    for (const s of r.sections) refinedSections.push(s);
  }

  const success = refinedSections.some((s) => s.formatUsed !== 'error');

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
    maxWords: sectionConfig?.max ?? undefined,
    previousFeedback: sectionFeedback,
    iterationNumber,
    documentContext: rawContent,
  });

  const response = await withRetry(
    () => callAI(aiConfig, {
      systemPrompt: prompt,
      userPrompt: sectionFeedback
        ? `Refine the section as specified and produce the JSON output.\n\n<iteration_feedback>\n${sectionFeedback}\n<directive>Address the above while preserving all existing strengths.</directive>\n</iteration_feedback>`
        : 'Refine the section as specified and produce the JSON output.',
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

// ─── Targeted Repair ───────────────────────────────────────

/**
 * Identify sections that need re-refinement based on validation feedback.
 * A section needs repair if any feedback item mentions its ID/title,
 * or if it has a detected failure. Returns a Set of sectionIds.
 */
export function identifyFailedSections(
  plan: readonly TransformationAction[],
  feedback: ValidationOutput,
): Set<string> {
  const failed = new Set<string>();

  // Check each section against feedback items and detected failures
  for (const action of plan) {
    const id = action.sectionId.toLowerCase();
    const name = (action.displayName || action.sectionId).toLowerCase();

    // Check feedback strings
    for (const item of feedback.feedback) {
      const lower = item.toLowerCase();
      if (lower.includes(id) || lower.includes(name)) {
        failed.add(action.sectionId);
        break;
      }
    }

    // Check detected failures
    for (const f of feedback.detectedFailures) {
      const pattern = f.pattern.toLowerCase();
      const rec = f.recommendation.toLowerCase();
      if (pattern.includes(id) || pattern.includes(name) || rec.includes(id) || rec.includes(name)) {
        failed.add(action.sectionId);
        break;
      }
    }
  }

  // If no specific sections identified but feedback exists, repair all
  // (safety fallback — generic feedback should still trigger improvement)
  if (failed.size === 0 && feedback.feedback.length > 0) {
    for (const action of plan) {
      failed.add(action.sectionId);
    }
  }

  return failed;
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
