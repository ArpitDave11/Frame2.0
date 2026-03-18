/**
 * Pipeline types — compilation and exhaustiveness tests.
 */

import { describe, it, expect } from 'vitest';
import * as PipelineTypes from './pipelineTypes';
import * as SampleData from './fixtures/samplePipelineData';

const EXPECTED_TYPE_NAMES = [
  'sampleEntity',           // EntityRelationship
  'sampleSection',          // SemanticSection
  'sampleRequirement',      // ExtractedRequirement
  'sampleGap',              // RequirementGap
  'sampleScore',            // SectionScore
  'sampleTransformation',   // TransformationAction
  'sampleRefinedSection',   // PipelineRefinedSection
  'sampleUserStory',        // PipelineUserStory
  'sampleAssembledEpic',    // AssembledEpic
  'sampleTraceability',     // TraceabilityRow
  'sampleAudit',            // AuditCheckItem
  'sampleFailure',          // DetectedFailure
  'sampleComprehension',    // ComprehensionOutput
  'sampleClassification',   // ClassificationOutput
  'sampleStructural',       // StructuralOutput
  'sampleRefinement',       // RefinementOutput
  'sampleMandatory',        // MandatoryOutput
  'sampleValidation',       // ValidationOutput
  'sampleMetadata',         // StageMetadata
  'sampleStageResult',      // StageResult
  'sampleConfig',           // PipelineConfig
  'sampleProgress',         // PipelineProgress
  'sampleProgressCallback', // PipelineProgressCallback
  'samplePipelineResult',   // PipelineResult
  'sampleStageFunction',    // StageFunction
  'sampleComprehensionInput',  // ComprehensionInput
  'sampleClassificationInput', // ClassificationInput
  'sampleStructuralInput',     // StructuralInput
  'sampleRefinementInput',     // RefinementInput
  'sampleMandatoryInput',      // MandatoryInput
  'sampleValidationInput',     // ValidationInput
] as const;

describe('pipelineTypes', () => {
  it('exports at least 25 type-level names', () => {
    // Runtime module exports (only re-exports and type aliases that produce runtime values show up)
    // We verify the fixture file has all types instantiated
    const fixtureExports = Object.keys(SampleData);
    expect(fixtureExports.length).toBeGreaterThanOrEqual(25);
  });

  it('fixture instantiates every expected type', () => {
    for (const name of EXPECTED_TYPE_NAMES) {
      expect(SampleData).toHaveProperty(name);
    }
  });

  it('pipelineTypes module is importable (type compilation check)', () => {
    // If this test runs, the module compiled successfully
    expect(PipelineTypes).toBeDefined();
  });

  it('fixture values are well-formed', () => {
    expect(SampleData.sampleComprehension.keyEntities).toHaveLength(1);
    expect(SampleData.sampleClassification.confidence).toBeGreaterThanOrEqual(0);
    expect(SampleData.sampleClassification.confidence).toBeLessThanOrEqual(1);
    expect(SampleData.sampleValidation.overallScore).toBeGreaterThanOrEqual(0);
    expect(SampleData.sampleValidation.overallScore).toBeLessThanOrEqual(100);
    expect(SampleData.sampleConfig.storyCountRange).toHaveLength(2);
  });
});
