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
import { useUiStore } from '@/stores/uiStore';
import { runPremiumPipeline } from '@/pipeline/pipelineOrchestrator';
import type { PipelineProgress } from '@/pipeline/pipelineTypes';

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

  const title = document?.title ?? 'Untitled Epic';

  // ─── Build AI config ──────────────────────────────────────
  const aiConfig: AIClientConfig = {
    provider: cfg.ai.provider,
    azure: cfg.ai.azure,
    openai: cfg.ai.openai,
    endpoints: cfg.endpoints,
  };

  // ─── Start Pipeline ───────────────────────────────────────
  pipelineStore.startPipeline();

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
  };

  // ─── Execute Pipeline ─────────────────────────────────────
  try {
    const result = await runPremiumPipeline({
      rawContent: markdown,
      title,
      complexity,
      aiConfig,
      onProgress,
    });

    if (result.success && result.epicContent) {
      // Write refined epic to epicStore
      useEpicStore.getState().applyRefinedEpic(result.epicContent);

      // Set quality score (validation is 0-100, store expects 0-10)
      useEpicStore.getState().setQualityScore(result.validation.overallScore / 10);

      // Set diagram code if available
      if (result.mandatory.architectureDiagram) {
        useBlueprintStore.getState().setCode(result.mandatory.architectureDiagram);
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
    } else {
      // Partial success — pipeline ran but didn't pass quality threshold.
      // Still write content (user gets best effort) and complete (not fail)
      // so the modal auto-closes. Warning toast tells user the score was low.
      if (result.epicContent) {
        useEpicStore.getState().applyRefinedEpic(result.epicContent);
        if (result.validation.overallScore > 0) {
          useEpicStore.getState().setQualityScore(result.validation.overallScore / 10);
        }
        if (result.mandatory.architectureDiagram) {
          useBlueprintStore.getState().setCode(result.mandatory.architectureDiagram);
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

      addToast({
        type: 'warning',
        title: `Score ${result.validation.overallScore}/100 after ${result.iterations} iteration(s). Content applied — consider refining again.`,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    usePipelineStore.getState().failPipeline(`Pipeline error: ${message}`);
    addToast({ type: 'error', title: `Pipeline failed: ${message}` });
  }
}
