/**
 * Pipeline types and interfaces — T-4.1.
 *
 * Shared type contracts for all pipeline stages, the scorer,
 * the orchestrator, and the action function. Every property is
 * readonly; no `any` types anywhere.
 */

import type { ComplexityLevel, EpicCategory } from '@/domain/types';

// ─── Supporting Types ───────────────────────────────────────

export interface EntityRelationship {
  readonly name: string;
  readonly type: string;
  readonly relationships: readonly string[];
}

export interface SemanticSection {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly purpose: string;
}

export interface ExtractedRequirement {
  readonly id: string;
  readonly description: string;
  readonly priority: 'high' | 'medium' | 'low';
  readonly source: string;
}

export interface RequirementGap {
  readonly requirementId: string;
  readonly gapType: string;
  readonly severity: 'critical' | 'major' | 'minor';
  readonly suggestion: string;
}

export interface SectionScore {
  readonly sectionId: string;
  readonly completeness: number;  // 1–10
  readonly relevance: number;     // 1–10
  readonly placement: number;     // 1–10
  readonly overall: number;       // 1–10
}

export interface TransformationAction {
  readonly sectionId: string;
  readonly action: 'keep' | 'restructure' | 'merge' | 'split' | 'add';
  readonly details: string;
}

export interface PipelineRefinedSection {
  readonly sectionId: string;
  readonly title: string;
  readonly content: string;
  readonly formatUsed: string;
}

export interface PipelineUserStory {
  readonly id: string;
  readonly title: string;
  readonly asA: string;
  readonly iWant: string;
  readonly soThat: string;
  readonly acceptanceCriteria: readonly string[];
  readonly priority: 'high' | 'medium' | 'low';
}

export interface AssembledEpic {
  readonly title: string;
  readonly sections: readonly { readonly id: string; readonly title: string; readonly content: string }[];
  readonly metadata: Record<string, unknown>;
}

export interface TraceabilityRow {
  readonly requirementId: string;
  readonly coveredBy: readonly string[];
  readonly coverage: 'full' | 'partial' | 'missing';
}

export interface AuditCheckItem {
  readonly checkName: string;
  readonly passed: boolean;
  readonly score: number;
  readonly details: string;
}

export interface DetectedFailure {
  readonly pattern: string;
  readonly severity: 'critical' | 'major' | 'minor';
  readonly recommendation: string;
}

// ─── Stage Output Types ─────────────────────────────────────

export interface ComprehensionOutput {
  readonly keyEntities: readonly EntityRelationship[];
  readonly detectedGaps: readonly string[];
  readonly implicitRisks: readonly string[];
  readonly semanticSections: readonly SemanticSection[];
  readonly extractedRequirements: readonly ExtractedRequirement[];
  readonly gapAnalysis: readonly RequirementGap[];
}

export interface ClassificationOutput {
  readonly primaryCategory: EpicCategory;
  readonly confidence: number;          // 0–1
  readonly categoryConfig: Record<string, unknown>;
  readonly reasoning: string;
}

export interface StructuralOutput {
  readonly sectionScores: readonly SectionScore[];
  readonly transformationPlan: readonly TransformationAction[];
  readonly missingSections: readonly string[];
}

export interface RefinementOutput {
  readonly refinedSections: readonly PipelineRefinedSection[];
}

export interface MandatoryOutput {
  readonly architectureDiagram: string;   // Mermaid syntax
  readonly userStories: readonly PipelineUserStory[];
  readonly assembledEpic: AssembledEpic;
}

export interface ValidationOutput {
  readonly traceabilityMatrix: readonly TraceabilityRow[];
  readonly auditChecks: readonly AuditCheckItem[];
  readonly overallScore: number;          // 0–100
  readonly passed: boolean;
  readonly detectedFailures: readonly DetectedFailure[];
  readonly feedback: readonly string[];   // fed back into Stage 4 on retry
}

// ─── Pipeline-Level Types ───────────────────────────────────

export interface StageResult<T> {
  readonly success: boolean;
  readonly data: T;
  readonly metadata: StageMetadata;
}

export interface StageMetadata {
  readonly stageName: string;
  readonly duration: number;
  readonly tokensUsed: number;
  readonly model: string;
  readonly iteration?: number;
}

export interface PipelineConfig {
  readonly complexity: ComplexityLevel;
  readonly maxIterations: number;
  readonly passingScore: number;
  readonly storyCountRange: readonly [number, number];
  readonly generationTemperature: number;      // Stages 1, 3, 4, 5 — default 0.3
  readonly validationTemperature: number;      // Stage 6 — default 0.7
  readonly classificationTemperature: number;  // Stage 2 — default 0.5
  readonly userApprovedSections: readonly string[];  // section IDs the user has manually edited
}

export interface PipelineProgress {
  readonly stageName: string;
  readonly status: 'pending' | 'running' | 'complete' | 'failed' | 'retrying';
  readonly iteration?: number;
  readonly score?: number;
  readonly message?: string;
  readonly timestamp: number;
}

export type PipelineProgressCallback = (progress: PipelineProgress) => void;

export interface PipelineResult {
  readonly success: boolean;
  readonly epicContent: string;
  readonly comprehension: ComprehensionOutput;
  readonly classification: ClassificationOutput;
  readonly structural: StructuralOutput;
  readonly refinement: RefinementOutput;
  readonly mandatory: MandatoryOutput;
  readonly validation: ValidationOutput;
  readonly iterations: number;
  readonly totalDuration: number;
}

export type StageFunction<TInput, TOutput> = (
  input: TInput,
  config: PipelineConfig,
  onProgress?: PipelineProgressCallback,
) => Promise<StageResult<TOutput>>;

// ─── Stage Input Types ──────────────────────────────────────

export interface ComprehensionInput {
  readonly rawContent: string;
  readonly title: string;
}

export interface ClassificationInput {
  readonly comprehension: ComprehensionOutput;
  readonly rawContent: string;
}

export interface StructuralInput {
  readonly comprehension: ComprehensionOutput;
  readonly classification: ClassificationOutput;
  readonly rawContent: string;
}

export interface RefinementInput {
  readonly structural: StructuralOutput;
  readonly classification: ClassificationOutput;
  readonly comprehension: ComprehensionOutput;
  readonly rawContent: string;
  readonly previousFeedback?: ValidationOutput;
}

export interface MandatoryInput {
  readonly refinement: RefinementOutput;
  readonly classification: ClassificationOutput;
  readonly comprehension: ComprehensionOutput;
  readonly config: PipelineConfig;
}

export interface ValidationInput {
  readonly mandatory: MandatoryOutput;
  readonly comprehension: ComprehensionOutput;
  readonly classification: ClassificationOutput;
  readonly config: PipelineConfig;
}
