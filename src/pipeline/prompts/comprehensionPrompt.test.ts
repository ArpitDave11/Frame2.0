/**
 * Tests for Stage 1 — Deep Comprehension prompt builder.
 */

import { describe, it, expect } from 'vitest';
import {
  buildComprehensionPrompt,
  PROMPT_VERSION,
  type ComprehensionPromptVars,
} from './comprehensionPrompt';

const FIXTURE_VARS: ComprehensionPromptVars = {
  rawContent: 'The user authentication service handles OAuth2 login flows. It integrates with the session manager and the PostgreSQL database for token storage.',
  title: 'User Authentication Epic',
  complexityLevel: 'moderate',
  wordTarget: 1500,
};

describe('comprehensionPrompt', () => {
  describe('PROMPT_VERSION', () => {
    it('exports a semver version string', () => {
      expect(PROMPT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('buildComprehensionPrompt', () => {
    it('interpolates the title into the prompt', () => {
      const result = buildComprehensionPrompt(FIXTURE_VARS);
      expect(result).toContain('User Authentication Epic');
    });

    it('interpolates the raw content into the prompt', () => {
      const result = buildComprehensionPrompt(FIXTURE_VARS);
      expect(result).toContain('OAuth2 login flows');
      expect(result).toContain('PostgreSQL database');
    });

    it('interpolates the word target', () => {
      const result = buildComprehensionPrompt(FIXTURE_VARS);
      expect(result).toContain('1500');
    });

    it('includes complexity-specific instructions for simple', () => {
      const result = buildComprehensionPrompt({ ...FIXTURE_VARS, complexityLevel: 'simple' });
      expect(result).toContain('SIMPLE');
      expect(result).toContain('up to 8');
      expect(result).toContain('brevity');
    });

    it('includes complexity-specific instructions for moderate', () => {
      const result = buildComprehensionPrompt(FIXTURE_VARS);
      expect(result).toContain('MODERATE');
      expect(result).toContain('8–15');
    });

    it('includes complexity-specific instructions for complex', () => {
      const result = buildComprehensionPrompt({ ...FIXTURE_VARS, complexityLevel: 'complex' });
      expect(result).toContain('COMPLEX');
      expect(result).toContain('exhaustive');
      expect(result).toContain('15+');
    });

    it('references all ComprehensionOutput fields in the output schema', () => {
      const result = buildComprehensionPrompt(FIXTURE_VARS);
      const requiredFields = [
        'keyEntities',
        'detectedGaps',
        'implicitRisks',
        'semanticSections',
        'extractedRequirements',
        'gapAnalysis',
      ];
      for (const field of requiredFields) {
        expect(result).toContain(`"${field}"`);
      }
    });

    it('references all EntityRelationship fields', () => {
      const result = buildComprehensionPrompt(FIXTURE_VARS);
      expect(result).toContain('"name"');
      expect(result).toContain('"type"');
      expect(result).toContain('"relationships"');
    });

    it('references all ExtractedRequirement fields', () => {
      const result = buildComprehensionPrompt(FIXTURE_VARS);
      expect(result).toContain('"id"');
      expect(result).toContain('"description"');
      expect(result).toContain('"priority"');
      expect(result).toContain('"source"');
    });

    it('references all RequirementGap fields', () => {
      const result = buildComprehensionPrompt(FIXTURE_VARS);
      expect(result).toContain('"requirementId"');
      expect(result).toContain('"gapType"');
      expect(result).toContain('"severity"');
      expect(result).toContain('"suggestion"');
    });

    it('references all SemanticSection fields', () => {
      const result = buildComprehensionPrompt(FIXTURE_VARS);
      // id, title, content already checked via other fields
      expect(result).toContain('"purpose"');
    });

    it('does not contain unresolved template variables', () => {
      const result = buildComprehensionPrompt(FIXTURE_VARS);
      // Check no JS template interpolation produced the literal string "undefined"
      // by verifying all dynamic sections resolved to their expected values
      expect(result).toContain(FIXTURE_VARS.title);
      expect(result).toContain(FIXTURE_VARS.rawContent);
      expect(result).toContain(String(FIXTURE_VARS.wordTarget));
      expect(result).toContain('MODERATE');
      // No unresolved ${...} template expressions
      expect(result).not.toMatch(/\$\{/);
    });

    it('includes system identity section', () => {
      const result = buildComprehensionPrompt(FIXTURE_VARS);
      expect(result).toContain('<system>');
      expect(result).toContain('expert technical analyst');
    });

    it('wraps input in XML tags', () => {
      const result = buildComprehensionPrompt(FIXTURE_VARS);
      expect(result).toContain('<input_document');
      expect(result).toContain('</input_document>');
    });

    it('includes JSON output format specification', () => {
      const result = buildComprehensionPrompt(FIXTURE_VARS);
      expect(result).toContain('<output_format>');
      expect(result).toContain('```json');
    });

    it('renders between 80 and 250 lines', () => {
      const result = buildComprehensionPrompt(FIXTURE_VARS);
      const lineCount = result.split('\n').length;
      expect(lineCount).toBeGreaterThanOrEqual(80);
      expect(lineCount).toBeLessThanOrEqual(250);
    });

    it('includes example_output block when fewShotExample is provided', () => {
      const result = buildComprehensionPrompt({
        ...FIXTURE_VARS,
        fewShotExample: '{"keyEntities":[]}',
      });
      expect(result).toContain('<example_output>');
      expect(result).toContain('HIGH QUALITY output');
      expect(result).toContain('{"keyEntities":[]}');
      expect(result).toContain('</example_output>');
    });

    it('does NOT include example_output block when fewShotExample is omitted', () => {
      const result = buildComprehensionPrompt(FIXTURE_VARS);
      expect(result).not.toContain('<example_output>');
      expect(result).not.toContain('</example_output>');
    });

    it('snapshot test — detects unintended prompt changes', () => {
      const fixedVars: ComprehensionPromptVars = {
        rawContent: 'Fixed content for snapshot stability.',
        title: 'Snapshot Test Epic',
        complexityLevel: 'simple',
        wordTarget: 800,
      };
      const result = buildComprehensionPrompt(fixedVars);
      expect(result).toMatchSnapshot();
    });
  });
});
