/**
 * Tests for Stage 6 — Validation Gate prompt builder.
 */

import { describe, it, expect } from 'vitest';
import {
  buildValidationPrompt,
  PROMPT_VERSION,
  type ValidationPromptVars,
} from './validationPrompt';

const FIXTURE_VARS: ValidationPromptVars = {
  assembledEpic: '# User Authentication Epic\n\n## Overview\nThe auth service handles OAuth2 login.\n\n## Architecture\nMicroservices pattern with gateway.',
  originalRequirements: '[{"id":"REQ-001","description":"OAuth2 support","priority":"high","source":"Section 1"},{"id":"REQ-002","description":"Token refresh","priority":"medium","source":"Section 2"}]',
  originalEntities: '["AuthService", "Database", "APIGateway"]',
  userStories: '[{"id":"US-001","title":"User Login","asA":"user","iWant":"to log in","soThat":"I can access my dashboard"}]',
  classificationResult: '{"primaryCategory":"technical_design","confidence":0.91}',
  passingScore: 80,
  complexityLevel: 'moderate',
  iterationNumber: 0,
};

describe('validationPrompt', () => {
  describe('PROMPT_VERSION', () => {
    it('exports a semver version string', () => {
      expect(PROMPT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('buildValidationPrompt', () => {
    it('includes the passing score threshold', () => {
      const result = buildValidationPrompt(FIXTURE_VARS);
      expect(result).toContain('80');
      expect(result).toContain(`passing score threshold is **${FIXTURE_VARS.passingScore}**`);
    });

    it('passing score changes with different inputs', () => {
      const strict = buildValidationPrompt({ ...FIXTURE_VARS, passingScore: 85 });
      expect(strict).toContain('**85**');
      const lenient = buildValidationPrompt({ ...FIXTURE_VARS, passingScore: 70 });
      expect(lenient).toContain('**70**');
    });

    it('includes traceability instructions referencing requirement IDs', () => {
      const result = buildValidationPrompt(FIXTURE_VARS);
      expect(result).toContain('requirementId');
      expect(result).toContain('REQ-001');
      expect(result).toContain('coveredBy');
      expect(result).toContain('coverage');
      expect(result).toContain('full');
      expect(result).toContain('partial');
      expect(result).toContain('missing');
    });

    it('includes all three validation modes', () => {
      const result = buildValidationPrompt(FIXTURE_VARS);
      // Traceability
      expect(result).toContain('Requirements traceability');
      expect(result).toContain('"traceabilityMatrix"');
      // Self-audit
      expect(result).toContain('Self-audit');
      expect(result).toContain('"auditChecks"');
      // Failure detection
      expect(result).toContain('Failure pattern detection');
      expect(result).toContain('"detectedFailures"');
    });

    it('includes all 12 audit check names', () => {
      const result = buildValidationPrompt(FIXTURE_VARS);
      const checks = [
        'Section Completeness',
        'Requirements Coverage',
        'Internal Consistency',
        'Specificity',
        'Actionability',
        'Technical Accuracy',
        'User Story Quality',
        'Architecture Diagram Quality',
        'Risk Coverage',
        'Edge Case Coverage',
        'Stakeholder Clarity',
        'Format Compliance',
      ];
      for (const check of checks) {
        expect(result).toContain(check);
      }
    });

    it('includes failure pattern examples', () => {
      const result = buildValidationPrompt(FIXTURE_VARS);
      expect(result).toContain('Orphan Requirements');
      expect(result).toContain('Missing Error Handling');
      expect(result).toContain('Vague Acceptance Criteria');
      expect(result).toContain('Scope Creep');
      expect(result).toContain('Circular Dependencies');
      expect(result).toContain('Inconsistent Terminology');
    });

    it('includes actionable feedback instructions with good/bad examples', () => {
      const result = buildValidationPrompt(FIXTURE_VARS);
      // Good examples are specific
      expect(result).toContain('payment timeout case');
      expect(result).toContain('response time < 500ms');
      expect(result).toContain('REQ-007');
      // Bad examples are flagged
      expect(result).toContain('DO NOT produce these');
      expect(result).toContain('Improve the quality');
    });

    it('references ValidationOutput fields in the output schema', () => {
      const result = buildValidationPrompt(FIXTURE_VARS);
      expect(result).toContain('"traceabilityMatrix"');
      expect(result).toContain('"auditChecks"');
      expect(result).toContain('"overallScore"');
      expect(result).toContain('"passed"');
      expect(result).toContain('"detectedFailures"');
      expect(result).toContain('"feedback"');
    });

    it('references TraceabilityRow fields', () => {
      const result = buildValidationPrompt(FIXTURE_VARS);
      expect(result).toContain('"requirementId"');
      expect(result).toContain('"coveredBy"');
      expect(result).toContain('"coverage"');
    });

    it('references AuditCheckItem fields', () => {
      const result = buildValidationPrompt(FIXTURE_VARS);
      expect(result).toContain('"checkName"');
      expect(result).toContain('"passed"');
      expect(result).toContain('"score"');
      expect(result).toContain('"details"');
    });

    it('references DetectedFailure fields', () => {
      const result = buildValidationPrompt(FIXTURE_VARS);
      expect(result).toContain('"pattern"');
      expect(result).toContain('"severity"');
      expect(result).toContain('"recommendation"');
    });

    it('interpolates the assembled epic', () => {
      const result = buildValidationPrompt(FIXTURE_VARS);
      expect(result).toContain('OAuth2 login');
      expect(result).toContain('Microservices pattern');
    });

    it('interpolates the original requirements', () => {
      const result = buildValidationPrompt(FIXTURE_VARS);
      expect(result).toContain('REQ-001');
      expect(result).toContain('REQ-002');
      expect(result).toContain('Token refresh');
    });

    it('interpolates the user stories', () => {
      const result = buildValidationPrompt(FIXTURE_VARS);
      expect(result).toContain('US-001');
      expect(result).toContain('User Login');
    });

    it('first attempt does not mention retry', () => {
      const result = buildValidationPrompt(FIXTURE_VARS);
      expect(result).toContain('first validation pass');
      expect(result).not.toContain('Previous iterations');
    });

    it('retry iteration mentions prior attempts', () => {
      const result = buildValidationPrompt({ ...FIXTURE_VARS, iterationNumber: 2 });
      expect(result).toContain('iteration 2');
      expect(result).toContain('Previous iterations did not meet');
    });

    it('includes complexity-specific instructions for simple', () => {
      const result = buildValidationPrompt({ ...FIXTURE_VARS, complexityLevel: 'simple' });
      expect(result).toContain('SIMPLE');
      expect(result).toContain('lenient');
    });

    it('includes complexity-specific instructions for moderate', () => {
      const result = buildValidationPrompt(FIXTURE_VARS);
      expect(result).toContain('MODERATE');
      expect(result).toContain('balanced');
    });

    it('includes complexity-specific instructions for complex', () => {
      const result = buildValidationPrompt({ ...FIXTURE_VARS, complexityLevel: 'complex' });
      expect(result).toContain('COMPLEX');
      expect(result).toContain('strict');
    });

    it('does not contain unresolved template variables', () => {
      const result = buildValidationPrompt(FIXTURE_VARS);
      expect(result).toContain(FIXTURE_VARS.assembledEpic.slice(0, 20));
      expect(result).toContain('REQ-001');
      expect(result).toContain('MODERATE');
      expect(result).not.toMatch(/\$\{/);
    });

    it('includes system identity section', () => {
      const result = buildValidationPrompt(FIXTURE_VARS);
      expect(result).toContain('<system>');
      expect(result).toContain('quality assurance analyst');
    });

    it('includes JSON output format specification', () => {
      const result = buildValidationPrompt(FIXTURE_VARS);
      expect(result).toContain('<output_format>');
      expect(result).toContain('```json');
    });

    it('includes example_output block when fewShotExample is provided', () => {
      const result = buildValidationPrompt({
        ...FIXTURE_VARS,
        fewShotExample: '{"overallScore":85,"passed":true}',
      });
      expect(result).toContain('<example_output>');
      expect(result).toContain('HIGH QUALITY output');
      expect(result).toContain('{"overallScore":85,"passed":true}');
      expect(result).toContain('</example_output>');
    });

    it('does NOT include example_output block when fewShotExample is omitted', () => {
      const result = buildValidationPrompt(FIXTURE_VARS);
      expect(result).not.toContain('<example_output>');
      expect(result).not.toContain('</example_output>');
    });

    it('snapshot test — detects unintended prompt changes', () => {
      const fixedVars: ValidationPromptVars = {
        assembledEpic: 'Fixed epic content.',
        originalRequirements: '[]',
        originalEntities: '[]',
        userStories: '[]',
        classificationResult: '{}',
        passingScore: 70,
        complexityLevel: 'simple',
        iterationNumber: 0,
      };
      expect(buildValidationPrompt(fixedVars)).toMatchSnapshot();
    });
  });
});
