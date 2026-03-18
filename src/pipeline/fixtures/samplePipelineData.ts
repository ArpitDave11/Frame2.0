/**
 * Fixture file — validates that every exported pipeline type can be instantiated.
 * This file MUST compile with strict: true.
 */

import type {
  EntityRelationship,
  SemanticSection,
  ExtractedRequirement,
  RequirementGap,
  SectionScore,
  TransformationAction,
  PipelineRefinedSection,
  PipelineUserStory,
  AssembledEpic,
  TraceabilityRow,
  AuditCheckItem,
  DetectedFailure,
  ComprehensionOutput,
  ClassificationOutput,
  StructuralOutput,
  RefinementOutput,
  MandatoryOutput,
  ValidationOutput,
  StageResult,
  StageMetadata,
  PipelineConfig,
  PipelineProgress,
  PipelineProgressCallback,
  PipelineResult,
  StageFunction,
  ComprehensionInput,
  ClassificationInput,
  StructuralInput,
  RefinementInput,
  MandatoryInput,
  ValidationInput,
} from '../pipelineTypes';

// ─── Supporting types ───────────────────────────────────────

export const sampleEntity: EntityRelationship = {
  name: 'UserService',
  type: 'service',
  relationships: ['AuthModule', 'Database'],
};

export const sampleSection: SemanticSection = {
  id: 'sec-1',
  title: 'Overview',
  content: 'High-level overview content.',
  purpose: 'Introduce the epic scope',
};

export const sampleRequirement: ExtractedRequirement = {
  id: 'req-1',
  description: 'System must support OAuth2 login.',
  priority: 'high',
  source: 'BRD Section 3',
};

export const sampleGap: RequirementGap = {
  requirementId: 'req-1',
  gapType: 'missing-acceptance-criteria',
  severity: 'major',
  suggestion: 'Add measurable acceptance criteria.',
};

export const sampleScore: SectionScore = {
  sectionId: 'sec-1',
  completeness: 8,
  relevance: 9,
  placement: 7,
  overall: 8,
};

export const sampleTransformation: TransformationAction = {
  sectionId: 'sec-1',
  action: 'restructure',
  details: 'Split into sub-sections for clarity.',
};

export const sampleRefinedSection: PipelineRefinedSection = {
  sectionId: 'sec-1',
  title: 'Overview',
  content: 'Refined overview content.',
  formatUsed: 'prose',
};

export const sampleUserStory: PipelineUserStory = {
  id: 'story-1',
  title: 'User Login',
  asA: 'registered user',
  iWant: 'to log in with OAuth2',
  soThat: 'I can access my dashboard securely',
  acceptanceCriteria: ['OAuth2 redirect works', 'Token stored securely'],
  priority: 'high',
};

export const sampleAssembledEpic: AssembledEpic = {
  title: 'User Authentication Epic',
  sections: [{ id: 'sec-1', title: 'Overview', content: 'Assembled content.' }],
  metadata: { version: 1 },
};

export const sampleTraceability: TraceabilityRow = {
  requirementId: 'req-1',
  coveredBy: ['sec-1', 'story-1'],
  coverage: 'full',
};

export const sampleAudit: AuditCheckItem = {
  checkName: 'completeness',
  passed: true,
  score: 95,
  details: 'All required sections present.',
};

export const sampleFailure: DetectedFailure = {
  pattern: 'Missing error handling section',
  severity: 'minor',
  recommendation: 'Add error handling guidance.',
};

// ─── Stage output types ─────────────────────────────────────

export const sampleComprehension: ComprehensionOutput = {
  keyEntities: [sampleEntity],
  detectedGaps: ['No rollback plan'],
  implicitRisks: ['Third-party dependency risk'],
  semanticSections: [sampleSection],
  extractedRequirements: [sampleRequirement],
  gapAnalysis: [sampleGap],
};

export const sampleClassification: ClassificationOutput = {
  primaryCategory: 'feature_specification',
  confidence: 0.92,
  categoryConfig: { template: 'feature-spec-v2' },
  reasoning: 'Content describes a user-facing feature with acceptance criteria.',
};

export const sampleStructural: StructuralOutput = {
  sectionScores: [sampleScore],
  transformationPlan: [sampleTransformation],
  missingSections: ['Risk Assessment'],
};

export const sampleRefinement: RefinementOutput = {
  refinedSections: [sampleRefinedSection],
};

export const sampleMandatory: MandatoryOutput = {
  architectureDiagram: 'graph TD;\n  A-->B;',
  userStories: [sampleUserStory],
  assembledEpic: sampleAssembledEpic,
};

export const sampleValidation: ValidationOutput = {
  traceabilityMatrix: [sampleTraceability],
  auditChecks: [sampleAudit],
  overallScore: 88,
  passed: true,
  detectedFailures: [sampleFailure],
  feedback: ['Consider adding a rollback section.'],
};

// ─── Pipeline-level types ───────────────────────────────────

export const sampleMetadata: StageMetadata = {
  stageName: 'comprehension',
  duration: 1200,
  tokensUsed: 3500,
  model: 'claude-sonnet-4-20250514',
  iteration: 1,
};

export const sampleStageResult: StageResult<ComprehensionOutput> = {
  success: true,
  data: sampleComprehension,
  metadata: sampleMetadata,
};

export const sampleConfig: PipelineConfig = {
  complexity: 'moderate',
  maxIterations: 3,
  passingScore: 80,
  storyCountRange: [10, 15],
  generationTemperature: 0.3,
  validationTemperature: 0.7,
  classificationTemperature: 0.5,
};

export const sampleProgress: PipelineProgress = {
  stageName: 'comprehension',
  status: 'complete',
  iteration: 1,
  score: 88,
  message: 'Comprehension stage complete.',
  timestamp: Date.now(),
};

export const sampleProgressCallback: PipelineProgressCallback = (_progress) => {
  // no-op for fixture purposes
};

export const samplePipelineResult: PipelineResult = {
  success: true,
  epicContent: '# Epic Document\n\nFull markdown content here.',
  comprehension: sampleComprehension,
  classification: sampleClassification,
  structural: sampleStructural,
  refinement: sampleRefinement,
  mandatory: sampleMandatory,
  validation: sampleValidation,
  iterations: 2,
  totalDuration: 15000,
};

// ─── Stage function type ────────────────────────────────────

export const sampleStageFunction: StageFunction<ComprehensionInput, ComprehensionOutput> =
  async (_input, _config, _onProgress) => ({
    success: true,
    data: sampleComprehension,
    metadata: {
      stageName: 'comprehension',
      duration: 1000,
      tokensUsed: 2000,
      model: 'test',
      iteration: 1,
    },
  });

// ─── Stage input types ──────────────────────────────────────

export const sampleComprehensionInput: ComprehensionInput = {
  rawContent: 'Raw epic content here.',
  title: 'User Authentication',
};

export const sampleClassificationInput: ClassificationInput = {
  comprehension: sampleComprehension,
  rawContent: 'Raw content.',
};

export const sampleStructuralInput: StructuralInput = {
  comprehension: sampleComprehension,
  classification: sampleClassification,
  rawContent: 'Raw content.',
};

export const sampleRefinementInput: RefinementInput = {
  structural: sampleStructural,
  classification: sampleClassification,
  comprehension: sampleComprehension,
  rawContent: 'Raw content.',
  previousFeedback: sampleValidation,
};

export const sampleMandatoryInput: MandatoryInput = {
  refinement: sampleRefinement,
  classification: sampleClassification,
  comprehension: sampleComprehension,
  config: sampleConfig,
};

export const sampleValidationInput: ValidationInput = {
  mandatory: sampleMandatory,
  comprehension: sampleComprehension,
  classification: sampleClassification,
  config: sampleConfig,
};
