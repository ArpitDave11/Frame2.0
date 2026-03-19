/**
 * Tests for Stage 2 — Category Classification prompt builder.
 */

import { describe, it, expect } from 'vitest';
import {
  buildClassificationPrompt,
  PROMPT_VERSION,
  type ClassificationPromptVars,
} from './classificationPrompt';
import type { EpicCategory } from '@/domain/types';

const ALL_CATEGORIES: EpicCategory[] = [
  'business_requirement',
  'technical_design',
  'feature_specification',
  'api_specification',
  'infrastructure_design',
  'migration_plan',
  'integration_spec',
];

const FIXTURE_VARS: ClassificationPromptVars = {
  comprehensionSummary: '{"keyEntities":[{"name":"AuthService","type":"service","relationships":["Database"]}],"detectedGaps":["No rollback plan"],"implicitRisks":["Vendor lock-in"],"semanticSections":[{"id":"sec-1","title":"Overview","content":"Auth overview","purpose":"Introduce scope"}],"extractedRequirements":[{"id":"REQ-001","description":"OAuth2 support","priority":"high","source":"Section 1"}],"gapAnalysis":[]}',
  rawContent: 'The authentication service provides OAuth2 login with token refresh. It exposes REST endpoints for session management and integrates with the PostgreSQL user store.',
  availableCategories: ALL_CATEGORIES,
  complexityLevel: 'moderate',
};

describe('classificationPrompt', () => {
  describe('PROMPT_VERSION', () => {
    it('exports a semver version string', () => {
      expect(PROMPT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('buildClassificationPrompt', () => {
    it('contains all 7 EpicCategory values', () => {
      const result = buildClassificationPrompt(FIXTURE_VARS);
      for (const category of ALL_CATEGORIES) {
        expect(result).toContain(category);
      }
    });

    it('interpolates the comprehension summary', () => {
      const result = buildClassificationPrompt(FIXTURE_VARS);
      expect(result).toContain('AuthService');
      expect(result).toContain('No rollback plan');
    });

    it('interpolates the raw content', () => {
      const result = buildClassificationPrompt(FIXTURE_VARS);
      expect(result).toContain('OAuth2 login with token refresh');
      expect(result).toContain('PostgreSQL user store');
    });

    it('references ClassificationOutput fields in the output schema', () => {
      const result = buildClassificationPrompt(FIXTURE_VARS);
      const requiredFields = [
        'primaryCategory',
        'confidence',
        'categoryConfig',
        'reasoning',
      ];
      for (const field of requiredFields) {
        expect(result).toContain(`"${field}"`);
      }
    });

    it('includes confidence scoring instructions with numeric ranges', () => {
      const result = buildClassificationPrompt(FIXTURE_VARS);
      expect(result).toContain('0.9');
      expect(result).toContain('0.6');
      expect(result).toContain('between 0 and 1');
    });

    it('handles low-confidence edge case (below 0.6)', () => {
      const result = buildClassificationPrompt(FIXTURE_VARS);
      expect(result).toContain('below 0.6');
      expect(result).toContain('best-fit category');
      expect(result).toContain('uncertainty');
    });

    it('includes complexity-specific instructions for simple', () => {
      const result = buildClassificationPrompt({ ...FIXTURE_VARS, complexityLevel: 'simple' });
      expect(result).toContain('SIMPLE');
      expect(result).toContain('single most obvious');
    });

    it('includes complexity-specific instructions for moderate', () => {
      const result = buildClassificationPrompt(FIXTURE_VARS);
      expect(result).toContain('MODERATE');
      expect(result).toContain('top 2–3 candidate');
    });

    it('includes complexity-specific instructions for complex', () => {
      const result = buildClassificationPrompt({ ...FIXTURE_VARS, complexityLevel: 'complex' });
      expect(result).toContain('COMPLEX');
      expect(result).toContain('all 7 categories systematically');
    });

    it('includes category descriptions for each category', () => {
      const result = buildClassificationPrompt(FIXTURE_VARS);
      expect(result).toContain('stakeholders');           // business_requirement
      expect(result).toContain('architecture');            // technical_design
      expect(result).toContain('UX flows');                // feature_specification
      expect(result).toContain('endpoints, schemas');      // api_specification
      expect(result).toContain('cloud architecture');      // infrastructure_design
      expect(result).toContain('cutover planning');        // migration_plan
      expect(result).toContain('integration points');      // integration_spec
    });

    it('does not contain unresolved template variables', () => {
      const result = buildClassificationPrompt(FIXTURE_VARS);
      // Verify all dynamic sections resolved correctly
      expect(result).toContain(FIXTURE_VARS.rawContent);
      expect(result).toContain('AuthService');
      expect(result).toContain('MODERATE');
      // No unresolved ${...} expressions
      expect(result).not.toMatch(/\$\{/);
    });

    it('wraps comprehension in XML tags', () => {
      const result = buildClassificationPrompt(FIXTURE_VARS);
      expect(result).toContain('<comprehension_context>');
      expect(result).toContain('</comprehension_context>');
    });

    it('includes system identity section', () => {
      const result = buildClassificationPrompt(FIXTURE_VARS);
      expect(result).toContain('<system>');
      expect(result).toContain('expert document classifier');
    });

    it('includes JSON output format specification', () => {
      const result = buildClassificationPrompt(FIXTURE_VARS);
      expect(result).toContain('<output_format>');
      expect(result).toContain('```json');
    });

    it('includes classification signals for each category', () => {
      const result = buildClassificationPrompt(FIXTURE_VARS);
      expect(result).toContain('KPIs');                   // business_requirement signals
      expect(result).toContain('HTTP methods');            // api_specification signals
      expect(result).toContain('CI/CD pipelines');         // infrastructure_design signals
      expect(result).toContain('rollback plans');          // migration_plan signals
      expect(result).toContain('message queues');          // integration_spec signals
    });

    it('includes example_output block when fewShotExample is provided', () => {
      const result = buildClassificationPrompt({
        ...FIXTURE_VARS,
        fewShotExample: '{"primaryCategory":"technical_design"}',
      });
      expect(result).toContain('<example_output>');
      expect(result).toContain('HIGH QUALITY output');
      expect(result).toContain('{"primaryCategory":"technical_design"}');
      expect(result).toContain('</example_output>');
    });

    it('does NOT include example_output block when fewShotExample is omitted', () => {
      const result = buildClassificationPrompt(FIXTURE_VARS);
      expect(result).not.toContain('<example_output>');
      expect(result).not.toContain('</example_output>');
    });

    it('snapshot test — detects unintended prompt changes', () => {
      const fixedVars: ClassificationPromptVars = {
        comprehensionSummary: '{"keyEntities":[],"detectedGaps":[],"implicitRisks":[],"semanticSections":[],"extractedRequirements":[],"gapAnalysis":[]}',
        rawContent: 'Fixed content for snapshot stability.',
        availableCategories: ALL_CATEGORIES,
        complexityLevel: 'simple',
      };
      const result = buildClassificationPrompt(fixedVars);
      expect(result).toMatchSnapshot();
    });
  });
});
