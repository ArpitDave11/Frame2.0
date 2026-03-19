/**
 * Tests for Stage 4 — Content Refinement prompt builder.
 */

import { describe, it, expect } from 'vitest';
import {
  buildRefinementPrompt,
  PROMPT_VERSION,
  type RefinementPromptVars,
} from './refinementPrompt';

const FIRST_ATTEMPT_VARS: RefinementPromptVars = {
  sectionTitle: 'Architecture Overview',
  sectionContent: 'The system uses a microservices architecture with three main services: auth, payments, and notifications.',
  transformationAction: 'restructure',
  categoryName: 'technical_design',
  formatInstruction: 'Write in prose format with clear paragraph breaks. Use sub-headings for distinct topics.',
  complexityLevel: 'moderate',
  wordTarget: 500,
  iterationNumber: 0,
};

const RETRY_VARS: RefinementPromptVars = {
  ...FIRST_ATTEMPT_VARS,
  previousFeedback: 'Missing: component interaction diagram description. Insufficient: no mention of data flow between services. Fix: add inter-service communication patterns.',
  iterationNumber: 2,
};

describe('refinementPrompt', () => {
  describe('PROMPT_VERSION', () => {
    it('exports a semver version string', () => {
      expect(PROMPT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('buildRefinementPrompt — first attempt', () => {
    it('produces a clean prompt without feedback section', () => {
      const result = buildRefinementPrompt(FIRST_ATTEMPT_VARS);
      expect(result).not.toContain('<previous_attempt_feedback>');
      expect(result).toContain('first attempt');
    });

    it('interpolates the section title', () => {
      const result = buildRefinementPrompt(FIRST_ATTEMPT_VARS);
      expect(result).toContain('Architecture Overview');
    });

    it('interpolates the section content', () => {
      const result = buildRefinementPrompt(FIRST_ATTEMPT_VARS);
      expect(result).toContain('microservices architecture');
    });

    it('interpolates the category name', () => {
      const result = buildRefinementPrompt(FIRST_ATTEMPT_VARS);
      expect(result).toContain('technical_design');
    });

    it('interpolates the format instruction', () => {
      const result = buildRefinementPrompt(FIRST_ATTEMPT_VARS);
      expect(result).toContain('prose format with clear paragraph breaks');
    });

    it('interpolates the word target', () => {
      const result = buildRefinementPrompt(FIRST_ATTEMPT_VARS);
      expect(result).toContain('500');
    });

    it('includes word target range (±20%)', () => {
      const result = buildRefinementPrompt(FIRST_ATTEMPT_VARS);
      expect(result).toContain('400');  // 500 * 0.8
      expect(result).toContain('600');  // 500 * 1.2
    });
  });

  describe('buildRefinementPrompt — retry with feedback', () => {
    it('includes the previous attempt feedback section', () => {
      const result = buildRefinementPrompt(RETRY_VARS);
      expect(result).toContain('<previous_attempt_feedback>');
      expect(result).toContain('</previous_attempt_feedback>');
    });

    it('includes the actual feedback content', () => {
      const result = buildRefinementPrompt(RETRY_VARS);
      expect(result).toContain('component interaction diagram');
      expect(result).toContain('inter-service communication patterns');
    });

    it('shows the iteration number', () => {
      const result = buildRefinementPrompt(RETRY_VARS);
      expect(result).toContain('iteration 2');
    });

    it('instructs to address feedback specifically', () => {
      const result = buildRefinementPrompt(RETRY_VARS);
      expect(result).toContain('MUST address');
      expect(result).toContain('Do NOT simply rephrase');
    });

    it('does not say first attempt', () => {
      const result = buildRefinementPrompt(RETRY_VARS);
      expect(result).not.toContain('This is the first attempt.');
    });
  });

  describe('buildRefinementPrompt — transformation actions', () => {
    const actions = ['keep', 'restructure', 'merge', 'split', 'add'] as const;

    for (const action of actions) {
      it(`produces appropriate instructions for "${action}" action`, () => {
        const result = buildRefinementPrompt({
          ...FIRST_ATTEMPT_VARS,
          transformationAction: action,
        });
        expect(result).toContain(`**Action: ${action.toUpperCase()}**`);
      });
    }

    it('keep action instructs to polish without adding content', () => {
      const result = buildRefinementPrompt({ ...FIRST_ATTEMPT_VARS, transformationAction: 'keep' });
      expect(result).toContain('Do NOT add new content');
    });

    it('restructure action instructs to reorganize', () => {
      const result = buildRefinementPrompt({ ...FIRST_ATTEMPT_VARS, transformationAction: 'restructure' });
      expect(result).toContain('Reorder paragraphs');
    });

    it('add action instructs to write substantial new content', () => {
      const result = buildRefinementPrompt({ ...FIRST_ATTEMPT_VARS, transformationAction: 'add' });
      expect(result).toContain('Generate comprehensive content');
    });
  });

  describe('buildRefinementPrompt — complexity scaling', () => {
    it('includes simple complexity instructions', () => {
      const result = buildRefinementPrompt({ ...FIRST_ATTEMPT_VARS, complexityLevel: 'simple' });
      expect(result).toContain('SIMPLE');
      expect(result).toContain('concise');
    });

    it('includes moderate complexity instructions', () => {
      const result = buildRefinementPrompt(FIRST_ATTEMPT_VARS);
      expect(result).toContain('MODERATE');
      expect(result).toContain('Balance thoroughness');
    });

    it('includes complex complexity instructions', () => {
      const result = buildRefinementPrompt({ ...FIRST_ATTEMPT_VARS, complexityLevel: 'complex' });
      expect(result).toContain('COMPLEX');
      expect(result).toContain('exhaustive');
    });
  });

  describe('buildRefinementPrompt — output schema', () => {
    it('references PipelineRefinedSection fields', () => {
      const result = buildRefinementPrompt(FIRST_ATTEMPT_VARS);
      expect(result).toContain('"sectionId"');
      expect(result).toContain('"title"');
      expect(result).toContain('"content"');
      expect(result).toContain('"formatUsed"');
    });

    it('includes JSON output format specification', () => {
      const result = buildRefinementPrompt(FIRST_ATTEMPT_VARS);
      expect(result).toContain('<output_format>');
      expect(result).toContain('```json');
    });
  });

  describe('buildRefinementPrompt — general', () => {
    it('does not contain unresolved template variables', () => {
      const result = buildRefinementPrompt(FIRST_ATTEMPT_VARS);
      expect(result).toContain(FIRST_ATTEMPT_VARS.sectionTitle);
      expect(result).toContain(FIRST_ATTEMPT_VARS.formatInstruction);
      expect(result).not.toMatch(/\$\{/);
    });

    it('includes system identity section', () => {
      const result = buildRefinementPrompt(FIRST_ATTEMPT_VARS);
      expect(result).toContain('<system>');
      expect(result).toContain('expert technical writer');
    });

    it('wraps section content in XML tags', () => {
      const result = buildRefinementPrompt(FIRST_ATTEMPT_VARS);
      expect(result).toContain('<current_section');
      expect(result).toContain('</current_section>');
    });

    it('includes example_output block when fewShotExample is provided', () => {
      const result = buildRefinementPrompt({
        ...FIRST_ATTEMPT_VARS,
        fewShotExample: '{"sectionId":"error-handling"}',
      });
      expect(result).toContain('<example_output>');
      expect(result).toContain('HIGH QUALITY output');
      expect(result).toContain('{"sectionId":"error-handling"}');
      expect(result).toContain('</example_output>');
    });

    it('does NOT include example_output block when fewShotExample is omitted', () => {
      const result = buildRefinementPrompt(FIRST_ATTEMPT_VARS);
      expect(result).not.toContain('<example_output>');
      expect(result).not.toContain('</example_output>');
    });

    it('snapshot test — first attempt', () => {
      const fixedVars: RefinementPromptVars = {
        sectionTitle: 'Snapshot Section',
        sectionContent: 'Fixed content.',
        transformationAction: 'keep',
        categoryName: 'technical_design',
        formatInstruction: 'Use prose format.',
        complexityLevel: 'simple',
        wordTarget: 200,
        iterationNumber: 0,
      };
      expect(buildRefinementPrompt(fixedVars)).toMatchSnapshot();
    });

    it('snapshot test — retry attempt', () => {
      const fixedVars: RefinementPromptVars = {
        sectionTitle: 'Snapshot Section',
        sectionContent: 'Fixed content.',
        transformationAction: 'restructure',
        categoryName: 'technical_design',
        formatInstruction: 'Use prose format.',
        complexityLevel: 'simple',
        wordTarget: 200,
        previousFeedback: 'Missing detail on error handling.',
        iterationNumber: 1,
      };
      expect(buildRefinementPrompt(fixedVars)).toMatchSnapshot();
    });
  });
});
