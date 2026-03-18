/**
 * Tests for Stage 5 — Mandatory Sections prompt builder.
 */

import { describe, it, expect } from 'vitest';
import {
  buildMandatoryPrompt,
  PROMPT_VERSION,
  type MandatoryPromptVars,
} from './mandatoryPrompt';

const FIXTURE_VARS: MandatoryPromptVars = {
  refinedSections: '{"refinedSections":[{"sectionId":"sec-overview","title":"Overview","content":"Refined overview content.","formatUsed":"prose"}]}',
  classificationResult: '{"primaryCategory":"technical_design","confidence":0.91,"categoryConfig":{},"reasoning":"Architecture document."}',
  comprehensionSummary: '{"keyEntities":[{"name":"AuthService","type":"service","relationships":["Database"]}],"extractedRequirements":[{"id":"REQ-001","description":"OAuth2 support","priority":"high","source":"Section 1"}]}',
  storyCountMin: 10,
  storyCountMax: 15,
  complexityLevel: 'moderate',
  existingEntities: ['AuthService', 'Database', 'APIGateway', 'NotificationService'],
};

describe('mandatoryPrompt', () => {
  describe('PROMPT_VERSION', () => {
    it('exports a semver version string', () => {
      expect(PROMPT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('buildMandatoryPrompt', () => {
    it('includes story count range in the prompt', () => {
      const result = buildMandatoryPrompt(FIXTURE_VARS);
      expect(result).toContain('10');
      expect(result).toContain('15');
      expect(result).toContain(`${FIXTURE_VARS.storyCountMin}–${FIXTURE_VARS.storyCountMax}`);
    });

    it('story count range changes with different inputs', () => {
      const simple = buildMandatoryPrompt({ ...FIXTURE_VARS, storyCountMin: 5, storyCountMax: 8 });
      expect(simple).toContain('5–8');
      const complex = buildMandatoryPrompt({ ...FIXTURE_VARS, storyCountMin: 15, storyCountMax: 25 });
      expect(complex).toContain('15–25');
    });

    it('contains Mermaid references', () => {
      const result = buildMandatoryPrompt(FIXTURE_VARS);
      expect(result.toLowerCase()).toContain('mermaid');
      expect(result).toContain('graph TD');
      expect(result).toContain('flowchart');
      expect(result).toContain('sequenceDiagram');
    });

    it('includes Mermaid syntax guidance', () => {
      const result = buildMandatoryPrompt(FIXTURE_VARS);
      expect(result).toContain('-->');
      expect(result).toContain('subgraph');
      expect(result).toContain('Node IDs');
    });

    it('includes user story format template', () => {
      const result = buildMandatoryPrompt(FIXTURE_VARS);
      expect(result).toContain('As a');
      expect(result).toContain('I want');
      expect(result).toContain('So that');
    });

    it('includes acceptance criteria instructions', () => {
      const result = buildMandatoryPrompt(FIXTURE_VARS);
      expect(result).toContain('acceptance criteria');
      expect(result).toContain('3–5');
      expect(result).toContain('Testable');
    });

    it('references MandatoryOutput fields in the output schema', () => {
      const result = buildMandatoryPrompt(FIXTURE_VARS);
      expect(result).toContain('"architectureDiagram"');
      expect(result).toContain('"userStories"');
      expect(result).toContain('"assembledEpic"');
    });

    it('references PipelineUserStory fields', () => {
      const result = buildMandatoryPrompt(FIXTURE_VARS);
      expect(result).toContain('"id"');
      expect(result).toContain('"title"');
      expect(result).toContain('"asA"');
      expect(result).toContain('"iWant"');
      expect(result).toContain('"soThat"');
      expect(result).toContain('"acceptanceCriteria"');
      expect(result).toContain('"priority"');
    });

    it('references AssembledEpic fields', () => {
      const result = buildMandatoryPrompt(FIXTURE_VARS);
      expect(result).toContain('"sections"');
      expect(result).toContain('"metadata"');
    });

    it('includes requirement traceability instruction', () => {
      const result = buildMandatoryPrompt(FIXTURE_VARS);
      expect(result).toContain('trace back');
      expect(result).toContain('requirement');
    });

    it('interpolates the comprehension summary', () => {
      const result = buildMandatoryPrompt(FIXTURE_VARS);
      expect(result).toContain('AuthService');
      expect(result).toContain('REQ-001');
    });

    it('interpolates the classification result', () => {
      const result = buildMandatoryPrompt(FIXTURE_VARS);
      expect(result).toContain('technical_design');
    });

    it('interpolates the refined sections', () => {
      const result = buildMandatoryPrompt(FIXTURE_VARS);
      expect(result).toContain('Refined overview content');
    });

    it('lists existing entities with numbering', () => {
      const result = buildMandatoryPrompt(FIXTURE_VARS);
      expect(result).toContain('1. AuthService');
      expect(result).toContain('2. Database');
      expect(result).toContain('3. APIGateway');
      expect(result).toContain('4. NotificationService');
    });

    it('includes complexity-specific instructions for simple', () => {
      const result = buildMandatoryPrompt({ ...FIXTURE_VARS, complexityLevel: 'simple' });
      expect(result).toContain('SIMPLE');
      expect(result).toContain('5–10 nodes');
    });

    it('includes complexity-specific instructions for moderate', () => {
      const result = buildMandatoryPrompt(FIXTURE_VARS);
      expect(result).toContain('MODERATE');
      expect(result).toContain('10–20 nodes');
    });

    it('includes complexity-specific instructions for complex', () => {
      const result = buildMandatoryPrompt({ ...FIXTURE_VARS, complexityLevel: 'complex' });
      expect(result).toContain('COMPLEX');
      expect(result).toContain('15–30+');
    });

    it('does not contain unresolved template variables', () => {
      const result = buildMandatoryPrompt(FIXTURE_VARS);
      expect(result).toContain(FIXTURE_VARS.refinedSections.slice(0, 20));
      expect(result).toContain('AuthService');
      expect(result).toContain('MODERATE');
      expect(result).not.toMatch(/\$\{/);
    });

    it('includes system identity section', () => {
      const result = buildMandatoryPrompt(FIXTURE_VARS);
      expect(result).toContain('<system>');
      expect(result).toContain('expert software architect');
    });

    it('includes JSON output format specification', () => {
      const result = buildMandatoryPrompt(FIXTURE_VARS);
      expect(result).toContain('<output_format>');
      expect(result).toContain('```json');
    });

    it('includes story priority instructions', () => {
      const result = buildMandatoryPrompt(FIXTURE_VARS);
      expect(result).toContain('high');
      expect(result).toContain('medium');
      expect(result).toContain('low');
      expect(result).toContain('Core functionality');
    });

    it('snapshot test — detects unintended prompt changes', () => {
      const fixedVars: MandatoryPromptVars = {
        refinedSections: '{}',
        classificationResult: '{}',
        comprehensionSummary: '{}',
        storyCountMin: 5,
        storyCountMax: 8,
        complexityLevel: 'simple',
        existingEntities: ['ServiceA', 'ServiceB'],
      };
      expect(buildMandatoryPrompt(fixedVars)).toMatchSnapshot();
    });
  });
});
