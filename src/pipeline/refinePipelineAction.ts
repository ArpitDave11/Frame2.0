/**
 * Pipeline Action — T-8.2.
 *
 * Thin boundary layer that wires the pure pipeline orchestrator to
 * application state stores. Reads from epicStore and configStore,
 * calls orchestrator, writes results to stores. Fire-and-forget from UI.
 */

import type { AIClientConfig } from '@/services/ai/types';
import { isAIEnabled } from '@/services/ai/aiClient';
import { useEpicStore } from '@/stores/epicStore';
import { useConfigStore } from '@/stores/configStore';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useBlueprintStore } from '@/stores/blueprintStore';
import { useGitlabStore } from '@/stores/gitlabStore';
import { useUiStore } from '@/stores/uiStore';
import { runPremiumPipeline } from '@/pipeline/pipelineOrchestrator';
import type { PipelineProgress } from '@/pipeline/pipelineTypes';

// ─── Markdown Post-Processor ───────────────────────────────

/**
 * Deterministic cleanup of assembled epic markdown.
 * Runs after pipeline completes, before writing to epicStore.
 * No AI calls — pure string transforms.
 */
function cleanupMarkdown(md: string): string {
  let lines = md.split('\n');

  // 1. Ensure single H1 — keep only the first, strip duplicates
  let foundH1 = false;
  lines = lines.filter((line) => {
    if (/^# [^#]/.test(line)) {
      if (foundH1) return false;
      foundH1 = true;
    }
    return true;
  });

  // 2. Add --- between H2 sections if missing (only when there are 3+ H2s,
  //    indicating a substantial epic rather than a trivial fixture)
  const h2Count = lines.filter((l) => /^## /.test(l)).length;
  const result: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (h2Count >= 3 && /^## /.test(line) && i > 0) {
      let j = result.length - 1;
      while (j >= 0 && (result[j] ?? '').trim() === '') j--;
      if (j >= 0 && (result[j] ?? '').trim() !== '---') {
        result.push('');
        result.push('---');
        result.push('');
      }
    }
    result.push(line);
  }

  // 3. Normalize heading hierarchy — no skipped levels
  let lastLevel = 0;
  const fixed = result.map((line) => {
    const match = line.match(/^(#{1,6})\s/);
    if (match?.[1]) {
      const level = match[1].length;
      if (lastLevel > 0 && level > lastLevel + 1) {
        const fixedLevel = lastLevel + 1;
        lastLevel = fixedLevel;
        return '#'.repeat(fixedLevel) + line.slice(match[1].length);
      }
      lastLevel = level;
    }
    return line;
  });

  // 4. Trim trailing whitespace per line
  return fixed.map((line) => line.trimEnd()).join('\n');
}

// ─── Diagram Post-Processor ───────────────────────────────

/**
 * Strips flowchart-only syntax (classDef, linkStyle, class, :::) from
 * non-flowchart diagram types (sequenceDiagram, stateDiagram, etc.).
 */
function sanitizeDiagram(code: string): string {
  if (!code) return code;
  const firstLine = code.trim().split('\n')[0]?.trim() ?? '';
  // Only strip for non-flowchart diagram types
  if (firstLine.startsWith('flowchart') || firstLine.startsWith('graph')) {
    return code;
  }
  // Remove classDef and linkStyle lines from sequenceDiagram, stateDiagram, etc.
  return code
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      return !trimmed.startsWith('classDef ') &&
             !trimmed.startsWith('linkStyle ') &&
             !trimmed.startsWith('class ') &&
             !trimmed.startsWith(':::');
    })
    .join('\n');
}

// ─── Stage Number Mapping ───────────────────────────────────

const STAGE_MAP: Record<string, 1 | 2 | 3 | 4 | 5 | 6> = {
  comprehension: 1,
  classification: 2,
  structural: 3,
  refinement: 4,
  coherence: 4,
  mandatory: 5,
  validation: 6,
};

// ─── Cancellation ───────────────────────────────────────────

let currentController: AbortController | null = null;

/** Cancel the in-flight refine run. In-flight AI calls abort immediately. */
export function cancelRefinePipeline(): void {
  if (!currentController || currentController.signal.aborted) return;
  usePipelineStore.getState().setStatusNote?.('Cancelling…');
  currentController.abort();
}

// ─── Action Function ────────────────────────────────────────

export async function refinePipelineAction(): Promise<void> {
  const epicStore = useEpicStore.getState();
  const cfg = useConfigStore.getState().config;
  const pipelineStore = usePipelineStore.getState();
  const addToast = useUiStore.getState().addToast;

  // ─── Guard: already running ───────────────────────────────
  if (pipelineStore.isRunning) return;

  // ─── Guard: no AI provider ────────────────────────────────
  if (!isAIEnabled(cfg)) {
    addToast({
      type: 'error',
      title: 'No AI provider configured. Open Settings to configure one.',
    });
    return;
  }

  // ─── Guard: no content ────────────────────────────────────
  const { markdown, document, complexity } = epicStore;
  if (!markdown.trim()) {
    addToast({ type: 'error', title: 'No epic content to refine.' });
    return;
  }

  const rawTitle = document?.title ?? '';
  const isLoadedFromGitLab = useGitlabStore.getState().loadedEpicIid !== null;
  // Loaded epics: preserve title. New epics with long/empty titles: let AI generate.
  const titleNeedsGeneration = !isLoadedFromGitLab && (rawTitle.length > 80 || rawTitle.length === 0);
  const title = titleNeedsGeneration ? '' : rawTitle;

  // ─── Build AI config ──────────────────────────────────────
  const aiConfig: AIClientConfig = {
    provider: cfg.ai.provider,
    azure: cfg.ai.azure,
    openai: cfg.ai.openai,
    endpoints: cfg.endpoints,
  };

  // ─── Start Pipeline ───────────────────────────────────────
  pipelineStore.startPipeline();
  const controller = new AbortController();
  currentController = controller;

  // ─── Progress Callback ────────────────────────────────────
  const onProgress = (progress: PipelineProgress) => {
    const store = usePipelineStore.getState();
    const stageNum = STAGE_MAP[progress.stageName];
    if (stageNum) {
      const status =
        progress.status === 'complete'
          ? 'complete'
          : progress.status === 'failed'
            ? 'error'
            : 'running';
      store.updateStage(stageNum, status, progress.message ?? '');
    }
    // Track iteration updates
    if (progress.iteration != null) {
      store.setCurrentIteration(progress.iteration);
    }
    // Quality-gate loop: tell the user WHY it's running again
    if (progress.stageName === 'pipeline' && progress.status === 'retrying') {
      const max = progress.maxIterations ?? store.maxIterations;
      store.setStatusNote?.(
        `Score ${progress.score} < ${progress.threshold} — re-refining (pass ${(progress.iteration ?? 0) + 1}/${max})`,
      );
      if (progress.maxIterations != null) store.setMaxIterations?.(progress.maxIterations);
    }
  };

  // ─── Execute Pipeline ─────────────────────────────────────
  try {
    const result = await runPremiumPipeline({
      rawContent: markdown,
      title,
      complexity,
      aiConfig,
      onProgress,
      sla: epicStore.sla ?? undefined,
      signal: controller.signal,
    });

    // Cancelled mid-run — discard results, restore a clean slate
    if (controller.signal.aborted) {
      usePipelineStore.getState().reset();
      useUiStore.getState().closeModal();
      addToast({ type: 'info', title: 'Refine cancelled — your content is unchanged.' });
      return;
    }

    // Hard failure with nothing produced (e.g. AI unreachable) — keep the
    // modal open with a persistent, actionable error instead of auto-closing
    if (!result.success && !result.epicContent) {
      const reason = result.error ?? 'Pipeline failed before producing content';
      usePipelineStore.getState().setStatusNote?.(null);
      usePipelineStore.getState().failPipeline(reason);
      return;
    }

    usePipelineStore.getState().setStatusNote?.(null);

    if (result.success && result.epicContent) {
      // Write refined epic to epicStore (post-processed for consistent GFM)
      useEpicStore.getState().applyRefinedEpic(cleanupMarkdown(result.epicContent));

      // Set quality score (validation is 0-100, store expects 0-10)
      useEpicStore.getState().setQualityScore(result.validation.overallScore / 10);

      // Set diagram code if available
      if (result.mandatory.architectureDiagram) {
        const _diagCode = result.mandatory.architectureDiagram;
        const _diagType = (_diagCode.match(/^\s*(?:%%\{[^}]*\}%%\s*)*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie)/m)?.[1] ?? 'flowchart').replace(/^graph.*/, 'flowchart');
        useBlueprintStore.getState().setCode(sanitizeDiagram(_diagCode), _diagType);
      }

      // Store full validation output for critique UI
      usePipelineStore.getState().setLastValidation(result.validation);

      // Complete pipeline with result summary
      usePipelineStore.getState().completePipeline({
        refinedMarkdown: result.epicContent,
        category: result.classification.primaryCategory,
        categoryConfidence: result.classification.confidence,
        sectionCount: result.mandatory.assembledEpic.sections.length,
        storyCount: result.mandatory.userStories.length,
        wordCount: result.epicContent.split(/\s+/).length,
        validationScore: result.validation.overallScore,
        stages: {
          1: { status: 'complete', message: `${result.comprehension.keyEntities.length} entities`, durationMs: 0 },
          2: { status: 'complete', message: `${result.classification.primaryCategory}`, durationMs: 0 },
          3: { status: 'complete', message: `${result.structural.sectionScores.length} sections scored`, durationMs: 0 },
          4: { status: 'complete', message: `${result.refinement.refinedSections.length} sections refined`, durationMs: 0 },
          5: { status: 'complete', message: `${result.mandatory.userStories.length} stories`, durationMs: 0 },
          6: { status: 'complete', message: `Score: ${result.validation.overallScore}`, durationMs: 0 },
        },
      });

      // Update category to what the AI detected (useful when user selected "General")
      if (result.classification.primaryCategory) {
        useEpicStore.getState().setCategory(result.classification.primaryCategory);
      }
    } else {
      // Partial success — pipeline ran but didn't pass quality threshold.
      // Still write content (user gets best effort) and complete (not fail)
      // so the modal auto-closes. Warning toast tells user the score was low.
      if (result.epicContent) {
        useEpicStore.getState().applyRefinedEpic(cleanupMarkdown(result.epicContent));
        if (result.validation.overallScore > 0) {
          useEpicStore.getState().setQualityScore(result.validation.overallScore / 10);
        }
        if (result.mandatory.architectureDiagram) {
          const _diagCode = result.mandatory.architectureDiagram;
        const _diagType = (_diagCode.match(/^\s*(?:%%\{[^}]*\}%%\s*)*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie)/m)?.[1] ?? 'flowchart').replace(/^graph.*/, 'flowchart');
        useBlueprintStore.getState().setCode(sanitizeDiagram(_diagCode), _diagType);
        }
      }

      // Store full validation output for critique UI (partial success)
      usePipelineStore.getState().setLastValidation(result.validation);

      usePipelineStore.getState().completePipeline({
        refinedMarkdown: result.epicContent || '',
        category: result.classification.primaryCategory,
        categoryConfidence: result.classification.confidence,
        sectionCount: result.mandatory.assembledEpic.sections.length,
        storyCount: result.mandatory.userStories.length,
        wordCount: (result.epicContent || '').split(/\s+/).length,
        validationScore: result.validation.overallScore,
        stages: {
          1: { status: 'complete', message: '', durationMs: 0 },
          2: { status: 'complete', message: '', durationMs: 0 },
          3: { status: 'complete', message: '', durationMs: 0 },
          4: { status: 'complete', message: '', durationMs: 0 },
          5: { status: 'complete', message: '', durationMs: 0 },
          6: { status: 'complete', message: `Score: ${result.validation.overallScore}`, durationMs: 0 },
        },
      });

      // Update category to what the AI detected (useful when user selected "General")
      if (result.classification.primaryCategory) {
        useEpicStore.getState().setCategory(result.classification.primaryCategory);
      }

      addToast({
        type: 'warning',
        title: `Score ${result.validation.overallScore}/100 after ${result.iterations} iteration(s). Content applied — consider refining again.`,
      });
    }
  } catch (error) {
    if (controller.signal.aborted) {
      usePipelineStore.getState().reset();
      useUiStore.getState().closeModal();
      addToast({ type: 'info', title: 'Refine cancelled — your content is unchanged.' });
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    usePipelineStore.getState().setStatusNote?.(null);
    usePipelineStore.getState().failPipeline(`Pipeline error: ${message}`);
    addToast({ type: 'error', title: `Pipeline failed: ${message}` });
  } finally {
    if (currentController === controller) currentController = null;
  }
}
