/**
 * Pipeline Orchestrator — T-4.15.
 *
 * Two-phase execution: linear (stages 1-3 once) then iterative
 * (stages 4→5→6 loop until validation passes or max iterations).
 * Pure async function — no global state, no store access.
 */

import type { AIClientConfig } from '@/services/ai/types';
import { getComplexityConfig, getScaledStoryCount } from '@/domain/complexity';
import type { ComplexityLevel } from '@/domain/types';
import { runStage1Comprehension } from '@/pipeline/stages/runStage1Comprehension';
import { runStage2Classification } from '@/pipeline/stages/runStage2Classification';
import { runStage3Structural } from '@/pipeline/stages/runStage3Structural';
import { runStage4Refinement } from '@/pipeline/stages/runStage4Refinement';
import { runStage4bCoherence } from '@/pipeline/stages/runStage4bCoherence';
import { runStage5Mandatory } from '@/pipeline/stages/runStage5Mandatory';
import { runStage6Validation } from '@/pipeline/stages/runStage6Validation';
import type {
  PipelineConfig,
  PipelineResult,
  PipelineProgressCallback,
  ComprehensionOutput,
  ClassificationOutput,
  StructuralOutput,
  RefinementOutput,
  MandatoryOutput,
  ValidationOutput,
} from '@/pipeline/pipelineTypes';

// ─── Options ────────────────────────────────────────────────

export interface PipelineOrchestratorOptions {
  readonly rawContent: string;
  readonly title: string;
  readonly complexity: ComplexityLevel;
  readonly aiConfig: AIClientConfig;
  readonly onProgress?: PipelineProgressCallback;
  readonly sla?: number;
}

// ─── Config Builder ─────────────────────────────────────────

export function buildPipelineConfig(
  complexity: ComplexityLevel,
  userApprovedSections: readonly string[] = [],
  sla?: number,
): PipelineConfig {
  const cc = getComplexityConfig(complexity);
  const storyRange = getScaledStoryCount(complexity);

  // When SLA is provided, override story count range based on point capacity
  const finalStoryRange: readonly [number, number] = sla
    ? [Math.ceil(sla / 5), Math.min(sla, 30)]
    : [storyRange.min, storyRange.max];

  return {
    complexity,
    maxIterations: cc.maxPipelineIterations,
    passingScore: cc.validationThreshold,
    storyCountRange: finalStoryRange,
    generationTemperature: 0.3,
    validationTemperature: 0.7,
    classificationTemperature: 0.5,
    userApprovedSections,
    sla,
  };
}

// ─── Orchestrator ───────────────────────────────────────────

export async function runPremiumPipeline(
  options: PipelineOrchestratorOptions,
): Promise<PipelineResult> {
  const startTime = Date.now();
  const { rawContent, title, complexity, aiConfig, onProgress, sla } = options;
  const config = buildPipelineConfig(complexity, [], sla);

  // Empty outputs for failure returns
  const emptyComp: ComprehensionOutput = { keyEntities: [], detectedGaps: [], implicitRisks: [], semanticSections: [], extractedRequirements: [], gapAnalysis: [] };
  const emptyClass: ClassificationOutput = { primaryCategory: 'technical_design', confidence: 0, categoryConfig: {}, reasoning: '' };
  const emptyStruct: StructuralOutput = { sectionScores: [], transformationPlan: [], missingSections: [] };
  const emptyRefine: RefinementOutput = { refinedSections: [] };
  const emptyMandatory: MandatoryOutput = { architectureDiagram: '', userStories: [], assembledEpic: { title: '', sections: [], metadata: {} } };
  const emptyValidation: ValidationOutput = { traceabilityMatrix: [], auditChecks: [], overallScore: 0, passed: false, detectedFailures: [], feedback: [] };

  try {
    // ─── Phase 1: Linear (stages 1-3) ─────────────────────

    // Stage 1: Comprehension
    const s1 = await runStage1Comprehension(
      { rawContent, title }, config, aiConfig, onProgress,
    );
    if (!s1.success) {
      return failResult('Stage 1 (Comprehension) failed', startTime, emptyComp, emptyClass, emptyStruct, emptyRefine, emptyMandatory, emptyValidation, 0);
    }

    // Stage 2: Classification
    const s2 = await runStage2Classification(
      { comprehension: s1.data, rawContent }, config, aiConfig, onProgress,
    );
    if (!s2.success) {
      return failResult('Stage 2 (Classification) failed', startTime, s1.data, emptyClass, emptyStruct, emptyRefine, emptyMandatory, emptyValidation, 0);
    }

    // Stage 3: Structural
    const s3 = await runStage3Structural(
      { comprehension: s1.data, classification: s2.data, rawContent }, config, aiConfig, onProgress,
    );
    if (!s3.success) {
      return failResult('Stage 3 (Structural) failed', startTime, s1.data, s2.data, emptyStruct, emptyRefine, emptyMandatory, emptyValidation, 0);
    }

    // ─── Phase 2: Iterative (stages 4→5→6) ────────────────

    let refinement: RefinementOutput = emptyRefine;
    let mandatory: MandatoryOutput = emptyMandatory;
    let validation: ValidationOutput = emptyValidation;
    let previousFeedback: ValidationOutput | undefined;
    let iterations = 0;

    for (let i = 0; i < config.maxIterations; i++) {
      iterations = i + 1;

      // Stage 4: Refinement
      const s4 = await runStage4Refinement(
        {
          structural: s3.data,
          classification: s2.data,
          comprehension: s1.data,
          rawContent,
          previousFeedback,
        },
        config, aiConfig, onProgress,
      );
      refinement = s4.data;

      // Stage 4b: Cross-section coherence (skip on first iteration —
      // freshly generated sections are consistent; only needed on retries
      // where feedback-driven patches may introduce contradictions)
      if (i > 0) {
        const s4b = await runStage4bCoherence(
          { refinement: s4.data, classification: s2.data },
          config, aiConfig, onProgress,
        );
        if (s4b.success && s4b.data.fixes.length > 0) {
          refinement = { refinedSections: s4b.data.refinedSections };
        }
      }

      // Stage 5: Mandatory (even if refinement partially failed)
      const s5 = await runStage5Mandatory(
        {
          refinement,
          classification: s2.data,
          comprehension: s1.data,
          config,
          title,
        },
        config, aiConfig, onProgress,
      );
      mandatory = s5.data;

      // Stage 6: Validation
      const s6 = await runStage6Validation(
        {
          mandatory: s5.data,
          comprehension: s1.data,
          classification: s2.data,
          config,
        },
        config, aiConfig, onProgress,
      );
      validation = s6.data;

      if (validation.passed) {
        onProgress?.({
          stageName: 'pipeline',
          status: 'complete',
          score: validation.overallScore,
          message: `Pipeline passed on iteration ${iterations} (score: ${validation.overallScore})`,
          timestamp: Date.now(),
        });

        return {
          success: true,
          epicContent: assembleEpicMarkdown(mandatory),
          comprehension: s1.data,
          classification: s2.data,
          structural: s3.data,
          refinement,
          mandatory,
          validation,
          iterations,
          totalDuration: Date.now() - startTime,
        };
      }

      // Not passed — prepare for retry
      previousFeedback = validation;

      onProgress?.({
        stageName: 'pipeline',
        status: 'retrying',
        iteration: iterations,
        score: validation.overallScore,
        message: `Iteration ${iterations} scored ${validation.overallScore}/${config.passingScore} — retrying`,
        timestamp: Date.now(),
      });
    }

    // Max iterations reached
    onProgress?.({
      stageName: 'pipeline',
      status: 'failed',
      score: validation.overallScore,
      message: `Max iterations (${config.maxIterations}) reached. Best score: ${validation.overallScore}`,
      timestamp: Date.now(),
    });

    return {
      success: false,
      epicContent: assembleEpicMarkdown(mandatory),
      comprehension: s1.data,
      classification: s2.data,
      structural: s3.data,
      refinement,
      mandatory,
      validation,
      iterations,
      totalDuration: Date.now() - startTime,
    };
  } catch (error) {
    onProgress?.({
      stageName: 'pipeline',
      status: 'failed',
      message: error instanceof Error ? error.message : String(error),
      timestamp: Date.now(),
    });

    return failResult(
      error instanceof Error ? error.message : String(error),
      startTime, emptyComp, emptyClass, emptyStruct, emptyRefine, emptyMandatory, emptyValidation, 0,
    );
  }
}

// ─── Helpers ────────────────────────────────────────────────

function assembleEpicMarkdown(mandatory: MandatoryOutput): string {
  const epic = mandatory.assembledEpic;
  if (!epic.title && epic.sections.length === 0) return '';

  const parts = [`# ${epic.title}`];
  for (const section of epic.sections) {
    parts.push('', `## ${section.title}`, '', section.content);
  }
  return parts.join('\n');
}

function failResult(
  _message: string,
  startTime: number,
  comprehension: ComprehensionOutput,
  classification: ClassificationOutput,
  structural: StructuralOutput,
  refinement: RefinementOutput,
  mandatory: MandatoryOutput,
  validation: ValidationOutput,
  iterations: number,
): PipelineResult {
  return {
    success: false,
    epicContent: '',
    comprehension,
    classification,
    structural,
    refinement,
    mandatory,
    validation,
    iterations,
    totalDuration: Date.now() - startTime,
  };
}
