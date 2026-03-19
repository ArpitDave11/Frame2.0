/**
 * Tests for Stage 3 — Structural Assessment prompt builder.
 */

import { describe, it, expect } from 'vitest';
import {
  buildStructuralPrompt,
  PROMPT_VERSION,
  type StructuralPromptVars,
} from './structuralPrompt';

const FIXTURE_VARS: StructuralPromptVars = {
  comprehensionSummary: '{"keyEntities":[{"name":"PaymentService","type":"service","relationships":["Database","Gateway"]}],"detectedGaps":["No retry strategy"],"implicitRisks":["Gateway downtime"],"semanticSections":[],"extractedRequirements":[],"gapAnalysis":[]}',
  classificationResult: '{"primaryCategory":"technical_design","confidence":0.91,"categoryConfig":{"tone":"precise and technical"},"reasoning":"Document describes system architecture."}',
  rawContent: 'The payment service processes transactions via the payment gateway. It stores records in PostgreSQL and provides a REST API for the frontend.',
  sectionList: ['Overview', 'Architecture', 'Data Model', 'API Design', 'Deployment'],
  complexityLevel: 'moderate',
  categoryTemplateSections: ['Overview', 'Architecture', 'Data Model', 'API Design', 'Security', 'Testing Strategy', 'Deployment'],
};

describe('structuralPrompt', () => {
  describe('PROMPT_VERSION', () => {
    it('exports a semver version string', () => {
      expect(PROMPT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('buildStructuralPrompt', () => {
    it('contains all three scoring dimension names', () => {
      const result = buildStructuralPrompt(FIXTURE_VARS);
      expect(result).toContain('completeness');
      expect(result).toContain('relevance');
      expect(result).toContain('placement');
    });

    it('contains all 5 transformation action types', () => {
      const result = buildStructuralPrompt(FIXTURE_VARS);
      const actions = ['keep', 'restructure', 'merge', 'split', 'add'];
      for (const action of actions) {
        expect(result).toContain(`**${action}**`);
      }
    });

    it('includes calibration examples for scoring', () => {
      const result = buildStructuralPrompt(FIXTURE_VARS);
      // Check for low/mid/high calibration examples
      expect(result).toContain('1–3');
      expect(result).toContain('4–6');
      expect(result).toContain('7–8');
      expect(result).toContain('9–10');
      // Check for concrete example text
      expect(result).toContain('Stub or placeholder');
      expect(result).toContain('Comprehensive');
    });

    it('references StructuralOutput fields in the output schema', () => {
      const result = buildStructuralPrompt(FIXTURE_VARS);
      expect(result).toContain('"sectionScores"');
      expect(result).toContain('"transformationPlan"');
      expect(result).toContain('"missingSections"');
    });

    it('references SectionScore fields', () => {
      const result = buildStructuralPrompt(FIXTURE_VARS);
      expect(result).toContain('"sectionId"');
      expect(result).toContain('"completeness"');
      expect(result).toContain('"relevance"');
      expect(result).toContain('"placement"');
      expect(result).toContain('"overall"');
    });

    it('references TransformationAction fields', () => {
      const result = buildStructuralPrompt(FIXTURE_VARS);
      expect(result).toContain('"action"');
      expect(result).toContain('"details"');
    });

    it('interpolates the comprehension summary', () => {
      const result = buildStructuralPrompt(FIXTURE_VARS);
      expect(result).toContain('PaymentService');
      expect(result).toContain('No retry strategy');
    });

    it('interpolates the classification result', () => {
      const result = buildStructuralPrompt(FIXTURE_VARS);
      expect(result).toContain('technical_design');
      expect(result).toContain('system architecture');
    });

    it('interpolates the raw content', () => {
      const result = buildStructuralPrompt(FIXTURE_VARS);
      expect(result).toContain('payment gateway');
      expect(result).toContain('PostgreSQL');
    });

    it('lists discovered sections with numbering', () => {
      const result = buildStructuralPrompt(FIXTURE_VARS);
      expect(result).toContain('1. Overview');
      expect(result).toContain('2. Architecture');
      expect(result).toContain('5. Deployment');
    });

    it('lists expected template sections', () => {
      const result = buildStructuralPrompt(FIXTURE_VARS);
      expect(result).toContain('Security');
      expect(result).toContain('Testing Strategy');
    });

    it('includes complexity-specific instructions for simple', () => {
      const result = buildStructuralPrompt({ ...FIXTURE_VARS, complexityLevel: 'simple' });
      expect(result).toContain('SIMPLE');
      expect(result).toContain('required sections');
    });

    it('includes complexity-specific instructions for moderate', () => {
      const result = buildStructuralPrompt(FIXTURE_VARS);
      expect(result).toContain('MODERATE');
      expect(result).toContain('balanced scoring');
    });

    it('includes complexity-specific instructions for complex', () => {
      const result = buildStructuralPrompt({ ...FIXTURE_VARS, complexityLevel: 'complex' });
      expect(result).toContain('COMPLEX');
      expect(result).toContain('rigorously');
    });

    it('includes overall score weighting formula', () => {
      const result = buildStructuralPrompt(FIXTURE_VARS);
      expect(result).toContain('40%');
      expect(result).toContain('30%');
    });

    it('does not contain unresolved template variables', () => {
      const result = buildStructuralPrompt(FIXTURE_VARS);
      expect(result).toContain(FIXTURE_VARS.rawContent);
      expect(result).toContain('PaymentService');
      expect(result).toContain('MODERATE');
      expect(result).not.toMatch(/\$\{/);
    });

    it('includes system identity section', () => {
      const result = buildStructuralPrompt(FIXTURE_VARS);
      expect(result).toContain('<system>');
      expect(result).toContain('document structure analyst');
    });

    it('includes JSON output format specification', () => {
      const result = buildStructuralPrompt(FIXTURE_VARS);
      expect(result).toContain('<output_format>');
      expect(result).toContain('```json');
    });

    it('includes example_output block when fewShotExample is provided', () => {
      const result = buildStructuralPrompt({
        ...FIXTURE_VARS,
        fewShotExample: '{"sectionScores":[]}',
      });
      expect(result).toContain('<example_output>');
      expect(result).toContain('HIGH QUALITY output');
      expect(result).toContain('{"sectionScores":[]}');
      expect(result).toContain('</example_output>');
    });

    it('does NOT include example_output block when fewShotExample is omitted', () => {
      const result = buildStructuralPrompt(FIXTURE_VARS);
      expect(result).not.toContain('<example_output>');
      expect(result).not.toContain('</example_output>');
    });

    it('snapshot test — detects unintended prompt changes', () => {
      const fixedVars: StructuralPromptVars = {
        comprehensionSummary: '{}',
        classificationResult: '{}',
        rawContent: 'Fixed content for snapshot.',
        sectionList: ['Overview', 'Details'],
        complexityLevel: 'simple',
        categoryTemplateSections: ['Overview', 'Details', 'Summary'],
      };
      const result = buildStructuralPrompt(fixedVars);
      expect(result).toMatchSnapshot();
    });
  });
});
