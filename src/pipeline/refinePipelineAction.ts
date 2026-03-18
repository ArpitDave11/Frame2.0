/**
 * Pipeline Action — T-4.16.
 *
 * Thin boundary layer that wires the pure pipeline orchestrator to
 * application state stores. Reads from epicStore, calls orchestrator,
 * writes results to both stores. Handles double-run prevention.
 */

import type { ComplexityLevel } from '@/domain/types';
import type { AIClientConfig } from '@/services/ai/types';
import { useEpicStore } from '@/stores/epicStore';
import { usePipelineStore } from '@/stores/pipelineStore';
import { runPremiumPipeline } from '@/pipeline/pipelineOrchestrator';
import type { PipelineProgress } from '@/pipeline/pipelineTypes';

// ─── Stage Number Mapping ───────────────────────────────────

const STAGE_NUMBER_MAP: Record<string, 1 | 2 | 3 | 4 | 5 | 6> = {
  comprehension: 1,
  classification: 2,
  structural: 3,
  refinement: 4,
  mandatory: 5,
  validation: 6,
};

// ─── Action Interface ───────────────────────────────────────

export interface RefinePipelineActionParams {
  readonly complexity: ComplexityLevel;
  readonly aiConfig: AIClientConfig;
}

// ─── Action Function ────────────────────────────────────────

export async function refinePipelineAction(
  params: RefinePipelineActionParams,
): Promise<void> {
  const epicStore = useEpicStore.getState();
  const pipelineStore = usePipelineStore.getState();

  // ─── Input Validation ───────────────────────────────────

  if (pipelineStore.isRunning) {
    throw new Error('Pipeline is already running');
  }

  const { markdown, document } = epicStore;
  if (!markdown.trim()) {
    throw new Error('No epic content to refine');
  }

  const title = document?.title ?? 'Untitled Epic';

  // ─── Start Pipeline ─────────────────────────────────────

  pipelineStore.startPipeline();

  // ─── Progress Callback ──────────────────────────────────

  const onProgress = (progress: PipelineProgress) => {
    const store = usePipelineStore.getState();
    const stageNum = STAGE_NUMBER_MAP[progress.stageName];
    if (stageNum) {
      const status = progress.status === 'complete' ? 'complete'
        : progress.status === 'failed' ? 'error'
        : 'running';
      store.updateStage(stageNum, status, progress.message ?? '');
    }
  };

  // ─── Execute Pipeline ───────────────────────────────────

  try {
    const result = await runPremiumPipeline({
      rawContent: markdown,
      title,
      complexity: params.complexity,
      aiConfig: params.aiConfig,
      onProgress,
    });

    if (result.success && result.epicContent) {
      // Write refined epic to epicStore
      useEpicStore.getState().applyRefinedEpic(result.epicContent);

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
      // Pipeline completed but did not pass validation
      usePipelineStore.getState().failPipeline(
        `Pipeline did not pass validation after ${result.iterations} iteration(s). Score: ${result.validation.overallScore}`,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    usePipelineStore.getState().failPipeline(`Pipeline error: ${message}`);
  }
}
