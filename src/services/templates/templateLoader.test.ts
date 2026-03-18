import { describe, it, expect } from 'vitest';
import {
  loadCategoryTemplate,
  findSectionConfig,
  getSectionWordLimits,
  getSectionFormat,
  getFormatInstruction,
  getGlobalDefaults,
  getProgressiveDisclosure,
  getScaledTemplate,
} from './templateLoader';
import type { EpicCategory, ComplexityLevel } from '@/domain/types';

// ─── All 7 categories ──────────────────────────────────────

const ALL_CATEGORIES: EpicCategory[] = [
  'technical_design',
  'business_requirement',
  'feature_specification',
  'api_specification',
  'infrastructure_design',
  'migration_plan',
  'integration_spec',
];

const ALL_COMPLEXITIES: ComplexityLevel[] = ['simple', 'moderate', 'complex'];

// ─── loadCategoryTemplate ───────────────────────────────────

describe('loadCategoryTemplate', () => {
  it('technical_design has requiredSections and optionalSections', () => {
    const tpl = loadCategoryTemplate('technical_design');
    expect(tpl.requiredSections).toBeDefined();
    expect(tpl.optionalSections).toBeDefined();
    expect(Object.keys(tpl.requiredSections).length).toBeGreaterThan(0);
  });

  it('business_requirement returns different template from technical_design', () => {
    const tech = loadCategoryTemplate('technical_design');
    const biz = loadCategoryTemplate('business_requirement');
    expect(biz.description).not.toBe(tech.description);
    expect(biz.expertRole).not.toBe(tech.expertRole);
  });

  it('all 7 categories load without error', () => {
    for (const category of ALL_CATEGORIES) {
      const tpl = loadCategoryTemplate(category);
      expect(tpl.requiredSections).toBeDefined();
      expect(tpl.tone).toBeDefined();
      expect(tpl.expertRole).toBeDefined();
      expect(tpl.description).toBeTruthy();
    }
  });

  it('unknown category falls back to technical_design', () => {
    const fallback = loadCategoryTemplate('nonexistent' as EpicCategory);
    const techDesign = loadCategoryTemplate('technical_design');
    expect(fallback.description).toBe(techDesign.description);
  });
});

// ─── findSectionConfig ──────────────────────────────────────

describe('findSectionConfig', () => {
  const template = loadCategoryTemplate('technical_design');

  it('finds section by exact title', () => {
    const config = findSectionConfig('Objective', template);
    expect(config).toBeDefined();
    expect(config?.format).toBe('prose');
  });

  it('finds section case-insensitively', () => {
    const config = findSectionConfig('OBJECTIVE', template);
    expect(config).toBeDefined();
    expect(config?.format).toBe('prose');
  });

  it('returns undefined for non-existent section', () => {
    expect(findSectionConfig('Random Gibberish', template)).toBeUndefined();
  });

  it('finds optional sections too', () => {
    const config = findSectionConfig('Testing Strategy', template);
    expect(config).toBeDefined();
  });
});

// ─── getSectionWordLimits ───────────────────────────────────

describe('getSectionWordLimits', () => {
  it('returns { target, max } with positive numbers', () => {
    const template = loadCategoryTemplate('technical_design');
    const limits = getSectionWordLimits('Objective', template);
    expect(limits.target).toBeGreaterThan(0);
    expect(limits.max).toBeGreaterThan(0);
    expect(limits.max).toBeGreaterThanOrEqual(limits.target);
  });

  it('returns defaults for unknown section', () => {
    const template = loadCategoryTemplate('technical_design');
    const limits = getSectionWordLimits('Unknown Section', template);
    expect(limits.target).toBe(200);
    expect(limits.max).toBe(400);
  });
});

// ─── getSectionFormat ───────────────────────────────────────

describe('getSectionFormat', () => {
  it('returns format for known section', () => {
    const template = loadCategoryTemplate('business_requirement');
    expect(getSectionFormat('Stakeholder Analysis', template)).toBe('raci-table');
  });

  it('returns undefined for unknown section', () => {
    const template = loadCategoryTemplate('technical_design');
    expect(getSectionFormat('Nonexistent', template)).toBeUndefined();
  });
});

// ─── getFormatInstruction ───────────────────────────────────

describe('getFormatInstruction', () => {
  it('returns non-empty instruction for raci-table', () => {
    const instruction = getFormatInstruction('raci-table');
    expect(instruction.length).toBeGreaterThan(0);
    expect(instruction).toContain('RACI');
  });

  it('returns empty string for undefined', () => {
    expect(getFormatInstruction(undefined)).toBe('');
  });

  it('risk-heat-map contains "heat map"', () => {
    const instruction = getFormatInstruction('risk-heat-map');
    expect(instruction.toLowerCase()).toContain('heat map');
  });

  it('returns instruction for all known formats', () => {
    const formats = [
      'prose', 'bullet-list', 'numbered-list', 'table', 'code-block',
      'mermaid', 'mermaid-sequence', 'raci-table', 'risk-heat-map',
      'slo-table', 'comparison-table-and-prose', 'phase-table',
      'endpoint-blocks', 'error-table', 'schema-table',
      'numbered-procedure', 'mapping-table', 'mixed',
    ] as const;
    for (const fmt of formats) {
      const instruction = getFormatInstruction(fmt);
      expect(instruction.length, `Format '${fmt}' should have instruction`).toBeGreaterThan(0);
    }
  });

  it('table format uses custom columns when provided', () => {
    const instruction = getFormatInstruction('table', ['Name', 'Value', 'Unit']);
    expect(instruction).toContain('Name');
    expect(instruction).toContain('Value');
  });
});

// ─── getGlobalDefaults ──────────────────────────────────────

describe('getGlobalDefaults', () => {
  it('returns object with statusEmoji and markdownFeatures', () => {
    const defaults = getGlobalDefaults();
    expect(defaults.statusEmoji).toBeDefined();
    expect(defaults.markdownFeatures).toBeDefined();
    expect(defaults.statusEmoji.draft).toBeDefined();
    expect(defaults.markdownFeatures.mermaidDiagrams).toBe(true);
  });
});

// ─── getProgressiveDisclosure ───────────────────────────────

describe('getProgressiveDisclosure', () => {
  it('returns undefined when not set', () => {
    const template = loadCategoryTemplate('technical_design');
    expect(getProgressiveDisclosure(template)).toBeUndefined();
  });
});

// ─── Complexity Scaling ─────────────────────────────────────

describe('getScaledTemplate', () => {
  it('simple has fewer sections than complex', () => {
    const simple = getScaledTemplate('technical_design', 'simple');
    const complex = getScaledTemplate('technical_design', 'complex');

    const simpleTotal = Object.keys(simple.requiredSections).length + Object.keys(simple.optionalSections).length;
    const complexTotal = Object.keys(complex.requiredSections).length + Object.keys(complex.optionalSections).length;
    expect(simpleTotal).toBeLessThan(complexTotal);
  });

  it('simple word targets are ~50% of moderate', () => {
    const simple = getScaledTemplate('technical_design', 'simple');
    const moderate = getScaledTemplate('technical_design', 'moderate');

    const simpleTarget = simple.requiredSections['Objective']?.target ?? 0;
    const moderateTarget = moderate.requiredSections['Objective']?.target ?? 0;
    // Simple should be roughly half of moderate (0.5x vs 1.0x)
    expect(simpleTarget).toBeCloseTo(moderateTarget * 0.5, -1);
  });

  it('complex includes all optional sections', () => {
    const original = loadCategoryTemplate('technical_design');
    const complex = getScaledTemplate('technical_design', 'complex');
    expect(Object.keys(complex.optionalSections).length).toBe(
      Object.keys(original.optionalSections).length,
    );
  });

  it('moderate word targets match original template (1.0x multiplier)', () => {
    const original = loadCategoryTemplate('technical_design');
    const moderate = getScaledTemplate('technical_design', 'moderate');
    // 1.0x multiplier means targets should be identical
    expect(moderate.requiredSections['Objective']?.target).toBe(
      original.requiredSections['Objective']?.target,
    );
  });

  it('scaled template is a new object (original not mutated)', () => {
    const original = loadCategoryTemplate('technical_design');
    const originalTarget = original.requiredSections['Objective']?.target;
    getScaledTemplate('technical_design', 'simple');
    // Original should be unchanged
    expect(original.requiredSections['Objective']?.target).toBe(originalTarget);
  });

  it('all 7 categories × 3 complexity levels produce valid templates (21 combinations)', () => {
    for (const category of ALL_CATEGORIES) {
      for (const complexity of ALL_COMPLEXITIES) {
        const tpl = getScaledTemplate(category, complexity);

        expect(tpl.requiredSections, `${category}/${complexity} missing requiredSections`).toBeDefined();
        expect(tpl.optionalSections, `${category}/${complexity} missing optionalSections`).toBeDefined();
        expect(Object.keys(tpl.requiredSections).length, `${category}/${complexity} has no required sections`).toBeGreaterThan(0);
        expect(tpl.tone, `${category}/${complexity} missing tone`).toBeTruthy();

        // Verify word targets are positive
        for (const [name, config] of Object.entries(tpl.requiredSections)) {
          if (config.target) {
            expect(config.target, `${category}/${complexity}/${name} target`).toBeGreaterThan(0);
          }
          if (config.max) {
            expect(config.max, `${category}/${complexity}/${name} max`).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('simple removes optional sections entirely', () => {
    const simple = getScaledTemplate('technical_design', 'simple');
    expect(Object.keys(simple.optionalSections).length).toBe(0);
  });

  it('moderate includes some but not all optional sections', () => {
    const original = loadCategoryTemplate('technical_design');
    const moderate = getScaledTemplate('technical_design', 'moderate');
    const originalOptCount = Object.keys(original.optionalSections).length;
    const moderateOptCount = Object.keys(moderate.optionalSections).length;
    expect(moderateOptCount).toBeGreaterThan(0);
    expect(moderateOptCount).toBeLessThan(originalOptCount);
  });

  it('complex word targets are 1.5x of moderate', () => {
    const moderate = getScaledTemplate('technical_design', 'moderate');
    const complex = getScaledTemplate('technical_design', 'complex');

    const modTarget = moderate.requiredSections['Objective']?.target ?? 0;
    const compTarget = complex.requiredSections['Objective']?.target ?? 0;
    expect(compTarget).toBeCloseTo(modTarget * 1.5, -1);
  });

  it('totalWordTarget is scaled', () => {
    const simple = getScaledTemplate('technical_design', 'simple');
    const complex = getScaledTemplate('technical_design', 'complex');
    expect(simple.totalWordTarget!.min).toBeLessThan(complex.totalWordTarget!.min);
  });
});
