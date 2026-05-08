/**
 * Doc Intelligence action — orchestrates upload + 3 parallel AI calls.
 *
 * Flow: upload file → /analyze API → setDocument → startAnalysis →
 * 3 parallel callAI (summary, insights, visuals) → updateSection per result.
 */

import { useDocIntelStore } from '@/stores/docIntelStore';
import { useConfigStore } from '@/stores/configStore';
import { useUiStore } from '@/stores/uiStore';
import { isAIEnabled, callAI } from '@/services/ai/aiClient';
import { analyzeDocument as callAnalyzeAPI } from './docIntelClient';
import { getLensSystemPrompt, buildSummaryPrompt, buildInsightsPrompt, buildVisualsPrompt } from './lensPrompts';
import type { AIClientConfig } from '@/services/ai/types';

// ─── JSON Parser (handles raw + fenced) ────────────────────

function parseJSON(raw: string): Record<string, unknown> | null {
  try { return JSON.parse(raw); } catch { /* try markdown fence */ }
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match?.[1]) try { return JSON.parse(match[1]); } catch { /* fall through */ }
  return null;
}

// ─── Section Formatters ────────────────────────────────────

function formatSummary(parsed: Record<string, unknown> | null): string {
  if (!parsed) return '_Analysis failed — try regenerating._';
  return [
    `# ${(parsed.title as string) ?? 'Document Analysis'}`,
    '',
    `> ${(parsed.oneLineSummary as string) ?? ''}`,
    '',
    (parsed.executiveSummaryMd as string) ?? '',
    '',
    '---',
    '',
    '## Audience Brief',
    '',
    (parsed.audienceBriefMd as string) ?? '',
  ].join('\n');
}

function formatInsights(parsed: Record<string, unknown> | null): string {
  if (!parsed) return '_Analysis failed — try regenerating._';
  const parts: string[] = ['## Key Insights', ''];
  for (const i of (parsed.keyInsights as Array<Record<string, string>>) ?? []) {
    parts.push(`### ${i.heading}`, '', i.bodyMd ?? '', '');
  }
  parts.push('---', '', '## Simplified Explanations', '');
  for (const e of (parsed.simplifiedExplanations as Array<Record<string, string>>) ?? []) {
    parts.push(`**${e.term}:** ${e.plainMd ?? ''}`, '');
  }
  parts.push('---', '', '## Risks', '');
  for (const r of (parsed.risks as Array<Record<string, string>>) ?? []) {
    parts.push(`- **[${r.likelihood}/${r.impact}]** ${r.descriptionMd ?? ''}`, '');
  }
  return parts.join('\n');
}

function formatVisuals(parsed: Record<string, unknown> | null): string {
  const diagrams = (parsed?.diagrams as Array<Record<string, string>>) ?? [];
  if (!diagrams.length) return '_No diagrams generated — try regenerating._';
  const parts: string[] = [];
  for (const d of diagrams) {
    parts.push(`### ${d.title ?? 'Diagram'}`, '', '```mermaid', d.mermaidSource ?? '', '```', '');
    if (d.caption) parts.push(`_${d.caption}_`, '');
  }
  return parts.join('\n');
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
  const focusContext = store.focusContext;

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

  // Step 2: Fire 3 parallel AI calls
  store.startAnalysis();

  const aiConfig: AIClientConfig = {
    provider: cfg.ai.provider,
    azure: cfg.ai.azure,
    openai: cfg.ai.openai,
    endpoints: cfg.endpoints,
  };

  const systemPrompt = getLensSystemPrompt(lens, focusContext);
  const docContext = uploadResult.data.markdown;

  const calls = [
    { id: 'summary', prompt: buildSummaryPrompt(docContext), format: formatSummary },
    { id: 'insights', prompt: buildInsightsPrompt(docContext), format: formatInsights },
    { id: 'visuals', prompt: buildVisualsPrompt(docContext), format: formatVisuals },
  ] as const;

  await Promise.allSettled(
    calls.map(async ({ id, prompt, format }) => {
      try {
        const response = await callAI(aiConfig, { systemPrompt, userPrompt: prompt });
        const parsed = parseJSON(response.content);
        const markdown = format(parsed);
        useDocIntelStore.getState().updateSection(id, markdown);
      } catch (e) {
        useDocIntelStore.getState().failSection(id, e instanceof Error ? e.message : 'AI call failed');
      }
    }),
  );

  // Explanations = extracted from insights response (same data, different view)
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
  const cfg = useConfigStore.getState().config;
  const docMarkdown = store.documentMarkdown;
  if (!docMarkdown) return;

  const lens = store.lens ?? 'summary';
  const systemPrompt = getLensSystemPrompt(lens, store.focusContext);
  const aiConfig: AIClientConfig = {
    provider: cfg.ai.provider, azure: cfg.ai.azure,
    openai: cfg.ai.openai, endpoints: cfg.endpoints,
  };

  const prompts: Record<string, { prompt: string; format: (p: Record<string, unknown> | null) => string }> = {
    summary: { prompt: buildSummaryPrompt(docMarkdown), format: formatSummary },
    insights: { prompt: buildInsightsPrompt(docMarkdown), format: formatInsights },
    explanations: { prompt: buildInsightsPrompt(docMarkdown), format: formatInsights },
    visuals: { prompt: buildVisualsPrompt(docMarkdown), format: formatVisuals },
  };

  const entry = prompts[sectionId];
  if (!entry) return;

  // Mark generating
  const sections = store.sections.map(s =>
    s.id === sectionId ? { ...s, status: 'generating' as const } : s,
  );
  useDocIntelStore.setState({ sections });

  try {
    const response = await callAI(aiConfig, { systemPrompt, userPrompt: entry.prompt });
    const parsed = parseJSON(response.content);
    useDocIntelStore.getState().updateSection(sectionId, entry.format(parsed));
  } catch (e) {
    useDocIntelStore.getState().failSection(sectionId, e instanceof Error ? e.message : 'Regeneration failed');
  }
}
