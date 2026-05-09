/**
 * Doc Intelligence action — production-grade prompt pipeline.
 *
 * Flow: upload → Docling extract → nano pre-classify → 3 parallel gpt-5.5 calls
 *       (strict json_schema) → post-validate → 1 retry if needed → sections.
 *
 * Model config:
 *   Pre-classifier: gpt-5-nano (minimal reasoning, low verbosity)
 *   Summary:        gpt-5.5   (medium reasoning, low verbosity)
 *   Insights:       gpt-5.5   (high reasoning, medium verbosity)
 *   Visuals:        gpt-5.5   (medium reasoning, low verbosity)
 *
 * All calls use strict json_schema + seed:42 for reproducibility.
 */

import { useDocIntelStore } from '@/stores/docIntelStore';
import { useConfigStore } from '@/stores/configStore';
import { useUiStore } from '@/stores/uiStore';
import { isAIEnabled, callAI } from '@/services/ai/aiClient';
import { analyzeDocument as callAnalyzeAPI } from './docIntelClient';
import {
  buildSystemMessage,
  buildSummaryUserMessage,
  buildInsightsUserMessage,
  buildVisualsUserMessage,
  buildClassifierUserMessage,
  type PromptContext,
} from './lensPrompts';
import { CLASSIFIER_SCHEMA, SUMMARY_SCHEMA, INSIGHTS_SCHEMA, VISUALS_SCHEMA } from './schemas';
import {
  validateSummary,
  validateInsights,
  validateVisuals,
  buildRetryMessage,
  type ValidationError,
} from './validators';
import type { AIClientConfig, AIRequest } from '@/services/ai/types';

// ─── Model Constants ───────────────────────────────────────

const DOCINTEL_MODEL = 'gpt-5.5';
const CLASSIFIER_MODEL = 'gpt-5-nano';
const SEED = 42;

// ─── AI Config Builders ────────────────────────────────────

function makeDocIntelConfig(baseCfg: AIClientConfig, model: string): AIClientConfig {
  return {
    provider: baseCfg.provider,
    azure: { ...baseCfg.azure, deploymentName: model },
    openai: { ...baseCfg.openai, model },
    endpoints: baseCfg.endpoints,
  };
}

function getBaseConfig(): AIClientConfig {
  const cfg = useConfigStore.getState().config;
  return {
    provider: cfg.ai.provider,
    azure: cfg.ai.azure,
    openai: cfg.ai.openai,
    endpoints: cfg.endpoints,
  };
}

// ─── Section Formatters ────────────────────────────────────

function formatSummary(parsed: Record<string, unknown>): string {
  return [
    `# ${(parsed.title as string) ?? 'Document Analysis'}`,
    '',
    `> ${(parsed.one_line_summary as string) ?? ''}`,
    '',
    (parsed.executive_summary as string) ?? '',
    '',
    '---',
    '',
    '## Audience Brief',
    '',
    (parsed.audience_brief as string) ?? '',
  ].join('\n');
}

function formatInsights(parsed: Record<string, unknown>): string {
  const parts: string[] = ['## Key Insights', ''];
  for (const i of (parsed.key_insights as Array<Record<string, string>>) ?? []) {
    parts.push(`### ${i.heading}`, '', i.body_md ?? '', '');
    if (i.evidence_quote) parts.push(`> _"${i.evidence_quote}"_`, '');
  }
  parts.push('---', '', '## Simplified Explanations', '');
  for (const e of (parsed.simplified_explanations as Array<Record<string, string>>) ?? []) {
    parts.push(`**${e.term}:** ${e.plain_md ?? ''}`, '');
  }
  parts.push('---', '', '## Risks', '');
  for (const r of (parsed.risks as Array<Record<string, string>>) ?? []) {
    parts.push(`- **[${r.likelihood}/${r.impact}]** ${r.description_md ?? ''}`, '');
  }
  return parts.join('\n');
}

function formatVisuals(parsed: Record<string, unknown>): string {
  const diagrams = (parsed.diagrams as Array<Record<string, string>>) ?? [];
  if (!diagrams.length) return '_No diagrams generated — try regenerating._';
  const parts: string[] = [];
  for (const d of diagrams) {
    parts.push(`### ${d.title ?? 'Diagram'}`, '', '```mermaid', d.mermaid_source ?? '', '```', '');
    if (d.caption) parts.push(`_${d.caption}_`, '');
  }
  return parts.join('\n');
}

// ─── Nano Pre-Classifier ───────────────────────────────────

interface ClassifierResult {
  summaryWords: number;
  insightCount: number;
  diagramCount: number;
}

const DEFAULT_TARGETS: ClassifierResult = { summaryWords: 90, insightCount: 5, diagramCount: 2 };

async function classifyDocument(docMarkdown: string, baseCfg: AIClientConfig): Promise<ClassifierResult> {
  try {
    const config = makeDocIntelConfig(baseCfg, CLASSIFIER_MODEL);
    const preview = docMarkdown.slice(0, 12000); // ~3000 tokens
    const response = await callAI(config, {
      systemPrompt: 'Classify this document for downstream analysis sizing.',
      userPrompt: buildClassifierUserMessage(preview),
      maxTokens: 200,
      responseFormat: CLASSIFIER_SCHEMA,
      reasoningEffort: 'minimal',
      verbosity: 'low',
      seed: SEED,
    });
    const parsed = JSON.parse(response.content);
    return {
      summaryWords: parsed.recommended_summary_words ?? DEFAULT_TARGETS.summaryWords,
      insightCount: parsed.recommended_insight_count ?? DEFAULT_TARGETS.insightCount,
      diagramCount: parsed.recommended_diagram_count ?? DEFAULT_TARGETS.diagramCount,
    };
  } catch {
    return DEFAULT_TARGETS; // fail silently — use sensible defaults
  }
}

// ─── Call with Retry ───────────────────────────────────────

async function callWithRetry(
  config: AIClientConfig,
  request: AIRequest,
  validate: (parsed: Record<string, unknown>) => Promise<ValidationError[]> | ValidationError[],
): Promise<Record<string, unknown>> {
  // Attempt 1
  const response1 = await callAI(config, request);
  const parsed1 = JSON.parse(response1.content);
  const errors1 = await validate(parsed1);

  if (errors1.length === 0) return parsed1;

  // Attempt 2 — Instructor-style retry
  const retryMsg = buildRetryMessage(errors1);
  const retryRequest: AIRequest = {
    ...request,
    // Append prior response + error as conversation continuation
    userPrompt: [
      request.userPrompt,
      '\n\n--- PRIOR RESPONSE (has errors) ---\n',
      response1.content,
      '\n\n--- RETRY INSTRUCTION ---\n',
      retryMsg,
    ].join(''),
  };

  const response2 = await callAI(config, retryRequest);
  return JSON.parse(response2.content);
  // No attempt 3 — if retry fails, caller gets whatever attempt 2 produced
}

// ─── Main Action ───────────────────────────────────────────

export async function runDocIntelAnalysis(file: File): Promise<void> {
  const store = useDocIntelStore.getState();
  const cfg = useConfigStore.getState().config;
  const addToast = useUiStore.getState().addToast;

  if (!isAIEnabled(cfg)) {
    addToast({ type: 'error', title: 'No AI provider configured. Open Settings.' });
    return;
  }

  const lens = store.lens ?? 'summary';
  const baseCfg = getBaseConfig();

  // Step 1: Upload + extract via backend
  const uploadResult = await callAnalyzeAPI(file);
  if (!uploadResult.ok) {
    addToast({ type: 'error', title: `Upload failed: ${uploadResult.error}` });
    return;
  }

  store.setDocument({
    fileName: uploadResult.data.fileName,
    markdown: uploadResult.data.markdown,
    outline: uploadResult.data.outline,
    tables: uploadResult.data.tables,
    metadata: uploadResult.data.metadata,
  });

  // Step 2: Nano pre-classifier — get complexity-adaptive targets
  const targets = await classifyDocument(uploadResult.data.markdown, baseCfg);

  // Step 3: Sequential-then-parallel — Summary first, then Insights + Visuals
  // Research: Insights and Visuals depend on Summary for coherence.
  // Running Summary first and injecting it as sibling context produces
  // more consistent cross-section output.
  store.startAnalysis();

  const docIntelCfg = makeDocIntelConfig(baseCfg, DOCINTEL_MODEL);
  const systemPrompt = buildSystemMessage(lens);

  const baseCtx: PromptContext = {
    documentMarkdown: uploadResult.data.markdown,
    fileName: uploadResult.data.fileName,
    pageCount: uploadResult.data.pages,
    userFocus: store.focusContext,
    targets,
  };

  // Phase A: Summary (sequential — no siblings yet)
  let summaryMarkdown = '';
  try {
    const summaryParsed = await callWithRetry(
      docIntelCfg,
      {
        systemPrompt,
        userPrompt: buildSummaryUserMessage(baseCtx),
        maxTokens: 1500,
        responseFormat: SUMMARY_SCHEMA,
        reasoningEffort: 'medium' as const,
        verbosity: 'low' as const,
        seed: SEED,
      },
      (p) => validateSummary(p, targets),
    );
    summaryMarkdown = formatSummary(summaryParsed);
    useDocIntelStore.getState().updateSection('summary', summaryMarkdown);
  } catch (e) {
    useDocIntelStore.getState().failSection('summary', e instanceof Error ? e.message : 'Summary failed');
  }

  // Phase B: Insights + Visuals in parallel — with Summary as sibling context
  const ctxWithSummary: PromptContext = {
    ...baseCtx,
    siblingContext: summaryMarkdown ? { summary: summaryMarkdown } : undefined,
  };

  await Promise.allSettled([
    (async () => {
      try {
        const parsed = await callWithRetry(
          docIntelCfg,
          {
            systemPrompt,
            userPrompt: buildInsightsUserMessage(ctxWithSummary),
            maxTokens: 4000,
            responseFormat: INSIGHTS_SCHEMA,
            reasoningEffort: 'high' as const,
            verbosity: 'medium' as const,
            seed: SEED,
          },
          (p) => validateInsights(p, targets),
        );
        useDocIntelStore.getState().updateSection('insights', formatInsights(parsed));
      } catch (e) {
        useDocIntelStore.getState().failSection('insights', e instanceof Error ? e.message : 'Insights failed');
      }
    })(),
    (async () => {
      try {
        const parsed = await callWithRetry(
          docIntelCfg,
          {
            systemPrompt,
            userPrompt: buildVisualsUserMessage(ctxWithSummary),
            maxTokens: 2000,
            responseFormat: VISUALS_SCHEMA,
            reasoningEffort: 'medium' as const,
            verbosity: 'low' as const,
            seed: SEED,
          },
          (p) => validateVisuals(p, targets),
        );
        useDocIntelStore.getState().updateSection('visuals', formatVisuals(parsed));
      } catch (e) {
        useDocIntelStore.getState().failSection('visuals', e instanceof Error ? e.message : 'Visuals failed');
      }
    })(),
  ]);

  // Explanations = extracted from insights (same data, different view)
  const insightsSec = useDocIntelStore.getState().sections.find(s => s.id === 'insights');
  if (insightsSec?.status === 'done') {
    useDocIntelStore.getState().updateSection('explanations', insightsSec.markdown);
  } else {
    useDocIntelStore.getState().failSection('explanations', 'Insights call failed — explanations unavailable');
  }
}

// ─── Per-Section Regenerate ────────────────────────────────

export async function regenerateSection(sectionId: string): Promise<void> {
  const store = useDocIntelStore.getState();
  const docMarkdown = store.documentMarkdown;
  if (!docMarkdown) return;

  const lens = store.lens ?? 'summary';
  const baseCfg = getBaseConfig();
  const docIntelCfg = makeDocIntelConfig(baseCfg, DOCINTEL_MODEL);
  const systemPrompt = buildSystemMessage(lens);

  // Re-classify for current targets (cheap, ensures consistency)
  const targets = await classifyDocument(docMarkdown, baseCfg);

  // Collect sibling sections' current content for cross-section coherence
  const siblingContext: Record<string, string> = {};
  for (const sec of store.sections) {
    if (sec.id !== sectionId && sec.status === 'done' && sec.markdown) {
      siblingContext[sec.id] = sec.markdown;
    }
  }

  const promptCtx: PromptContext = {
    documentMarkdown: docMarkdown,
    fileName: store.fileName ?? 'document',
    pageCount: store.metadata?.pageCount ?? 1,
    userFocus: store.focusContext,
    targets,
    siblingContext: Object.keys(siblingContext).length > 0 ? siblingContext : undefined,
  };

  const configs: Record<string, {
    request: AIRequest;
    validate: (p: Record<string, unknown>) => Promise<ValidationError[]> | ValidationError[];
    format: (p: Record<string, unknown>) => string;
  }> = {
    summary: {
      request: {
        systemPrompt, userPrompt: buildSummaryUserMessage(promptCtx),
        maxTokens: 1500, responseFormat: SUMMARY_SCHEMA,
        reasoningEffort: 'medium', verbosity: 'low', seed: SEED,
      },
      validate: (p) => validateSummary(p, targets),
      format: formatSummary,
    },
    insights: {
      request: {
        systemPrompt, userPrompt: buildInsightsUserMessage(promptCtx),
        maxTokens: 4000, responseFormat: INSIGHTS_SCHEMA,
        reasoningEffort: 'high', verbosity: 'medium', seed: SEED,
      },
      validate: (p) => validateInsights(p, targets),
      format: formatInsights,
    },
    explanations: {
      request: {
        systemPrompt, userPrompt: buildInsightsUserMessage(promptCtx),
        maxTokens: 4000, responseFormat: INSIGHTS_SCHEMA,
        reasoningEffort: 'high', verbosity: 'medium', seed: SEED,
      },
      validate: (p) => validateInsights(p, targets),
      format: formatInsights,
    },
    visuals: {
      request: {
        systemPrompt, userPrompt: buildVisualsUserMessage(promptCtx),
        maxTokens: 2000, responseFormat: VISUALS_SCHEMA,
        reasoningEffort: 'medium', verbosity: 'low', seed: SEED,
      },
      validate: (p) => validateVisuals(p, targets),
      format: formatVisuals,
    },
  };

  const entry = configs[sectionId];
  if (!entry) return;

  // Mark generating
  const sections = store.sections.map(s =>
    s.id === sectionId ? { ...s, status: 'generating' as const } : s,
  );
  useDocIntelStore.setState({ sections });

  try {
    const parsed = await callWithRetry(docIntelCfg, entry.request, entry.validate);
    useDocIntelStore.getState().updateSection(sectionId, entry.format(parsed));
  } catch (e) {
    useDocIntelStore.getState().failSection(sectionId, e instanceof Error ? e.message : 'Regeneration failed');
  }
}

// ─── Schema Warming ────────────────────────────────────────

/**
 * Fire 4 minimal calls to prime Azure's CFG schema cache.
 * Eliminates 2-60s cold-start penalty on first real analysis.
 * Call once on DocIntelView mount. Fire-and-forget.
 */
export async function warmSchemas(baseCfg?: AIClientConfig): Promise<void> {
  const cfg = baseCfg ?? getBaseConfig();
  const docIntelCfg = makeDocIntelConfig(cfg, DOCINTEL_MODEL);
  const nanoCfg = makeDocIntelConfig(cfg, CLASSIFIER_MODEL);
  const tiny = 'Hello';

  await Promise.allSettled([
    callAI(nanoCfg, { systemPrompt: tiny, userPrompt: tiny, maxTokens: 1, responseFormat: CLASSIFIER_SCHEMA, seed: SEED }),
    callAI(docIntelCfg, { systemPrompt: tiny, userPrompt: tiny, maxTokens: 1, responseFormat: SUMMARY_SCHEMA, seed: SEED }),
    callAI(docIntelCfg, { systemPrompt: tiny, userPrompt: tiny, maxTokens: 1, responseFormat: INSIGHTS_SCHEMA, seed: SEED }),
    callAI(docIntelCfg, { systemPrompt: tiny, userPrompt: tiny, maxTokens: 1, responseFormat: VISUALS_SCHEMA, seed: SEED }),
  ]);
}
