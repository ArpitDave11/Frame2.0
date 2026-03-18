import { describe, it, expect } from 'vitest';
import type {
  ComplexityLevel,
  EpicCategory,
  SectionFormat,
  EpicSection,
  EpicDocument,
  EpicMetadata,
} from './types';

// ─── Type Compilation Tests ─────────────────────────────────
// These tests verify that valid objects compile and that the types
// have the expected shape at runtime.

describe('EpicDocument — type compilation', () => {
  it('creates a valid EpicDocument with all required fields', () => {
    const doc: EpicDocument = {
      title: 'Auth Service Redesign',
      sections: [
        {
          title: 'Objective',
          content: 'Redesign the authentication service.',
          wordCount: 5,
          isRequired: true,
        },
      ],
      metadata: {
        createdAt: Date.now(),
        lastRefined: null,
        complexity: 'moderate',
      },
    };

    expect(doc.title).toBe('Auth Service Redesign');
    expect(doc.sections).toHaveLength(1);
    expect(doc.metadata.complexity).toBe('moderate');
  });

  it('allows optional category on EpicDocument', () => {
    const doc: EpicDocument = {
      title: 'Test',
      category: 'technical_design',
      sections: [],
      metadata: {
        createdAt: 0,
        lastRefined: null,
        complexity: 'simple',
      },
    };

    expect(doc.category).toBe('technical_design');
  });

  it('allows optional fields on EpicMetadata', () => {
    const meta: EpicMetadata = {
      createdAt: Date.now(),
      lastRefined: Date.now(),
      qualityScore: 8.5,
      gitlabEpicId: 123,
      gitlabEpicIid: 45,
      complexity: 'complex',
    };

    expect(meta.qualityScore).toBe(8.5);
    expect(meta.gitlabEpicId).toBe(123);
    expect(meta.gitlabEpicIid).toBe(45);
  });

  it('allows optional format on EpicSection', () => {
    const section: EpicSection = {
      title: 'Architecture',
      content: 'Mermaid diagram here.',
      format: 'mermaid',
      wordCount: 3,
      isRequired: true,
    };

    expect(section.format).toBe('mermaid');
  });

  it('creates an EpicSection without optional format', () => {
    const section: EpicSection = {
      title: 'Summary',
      content: 'Brief summary.',
      wordCount: 2,
      isRequired: false,
    };

    expect(section.format).toBeUndefined();
  });
});

// ─── ComplexityLevel ────────────────────────────────────────

describe('ComplexityLevel', () => {
  it('accepts exactly 3 valid values', () => {
    const valid: ComplexityLevel[] = ['simple', 'moderate', 'complex'];
    expect(valid).toHaveLength(3);

    // Each value can be assigned to the type
    const a: ComplexityLevel = 'simple';
    const b: ComplexityLevel = 'moderate';
    const c: ComplexityLevel = 'complex';
    expect([a, b, c]).toEqual(['simple', 'moderate', 'complex']);
  });

  it('rejects invalid values at runtime via type guard', () => {
    const valid = new Set<string>(['simple', 'moderate', 'complex']);
    expect(valid.has('easy')).toBe(false);
    expect(valid.has('hard')).toBe(false);
    expect(valid.has('')).toBe(false);
  });
});

// ─── EpicCategory ───────────────────────────────────────────

describe('EpicCategory', () => {
  const ALL_CATEGORIES: EpicCategory[] = [
    'business_requirement',
    'technical_design',
    'feature_specification',
    'api_specification',
    'infrastructure_design',
    'migration_plan',
    'integration_spec',
  ];

  it('has exactly 7 valid categories', () => {
    expect(ALL_CATEGORIES).toHaveLength(7);
  });

  it('each category is a valid string', () => {
    ALL_CATEGORIES.forEach((cat) => {
      expect(typeof cat).toBe('string');
      expect(cat.length).toBeGreaterThan(0);
    });
  });

  it('categories use snake_case (matches categoryTemplates.json keys)', () => {
    ALL_CATEGORIES.forEach((cat) => {
      expect(cat).toMatch(/^[a-z]+(_[a-z]+)*$/);
    });
  });

  it('rejects invalid category values', () => {
    const valid = new Set<string>(ALL_CATEGORIES);
    expect(valid.has('wizard-flow')).toBe(false);
    expect(valid.has('general')).toBe(false);
    expect(valid.has('')).toBe(false);
  });
});

// ─── SectionFormat ──────────────────────────────────────────

describe('SectionFormat', () => {
  it('includes all 18 format types from v4 categoryTemplates.json', () => {
    const formats: SectionFormat[] = [
      'prose',
      'bullet-list',
      'numbered-list',
      'table',
      'code-block',
      'mermaid',
      'mermaid-sequence',
      'raci-table',
      'risk-heat-map',
      'slo-table',
      'comparison-table-and-prose',
      'phase-table',
      'endpoint-blocks',
      'error-table',
      'schema-table',
      'numbered-procedure',
      'mapping-table',
      'mixed',
    ];
    expect(formats).toHaveLength(18);
  });
});

// ─── No Wizard Types ────────────────────────────────────────

describe('no wizard types', () => {
  it('module does not export Stage, StageField, RefinedData, or EpicState', async () => {
    const mod = await import('./types');
    const exports = Object.keys(mod);

    expect(exports).not.toContain('Stage');
    expect(exports).not.toContain('StageField');
    expect(exports).not.toContain('RefinedData');
    expect(exports).not.toContain('EpicState');
  });

  it('module does not export pipeline types', async () => {
    const mod = await import('./types');
    const exports = Object.keys(mod);

    expect(exports).not.toContain('PipelineResult');
    expect(exports).not.toContain('PipelineStage');
  });

  it('module does not export GitLab types', async () => {
    const mod = await import('./types');
    const exports = Object.keys(mod);

    expect(exports).not.toContain('GitLabEpic');
    expect(exports).not.toContain('GitLabGroup');
  });
});

// ─── EpicDocument Full Construction ─────────────────────────

describe('EpicDocument — full construction', () => {
  it('creates a complete document with all 7 category types', () => {
    const categories: EpicCategory[] = [
      'business_requirement',
      'technical_design',
      'feature_specification',
      'api_specification',
      'infrastructure_design',
      'migration_plan',
      'integration_spec',
    ];

    categories.forEach((cat) => {
      const doc: EpicDocument = {
        title: `Epic for ${cat}`,
        category: cat,
        sections: [],
        metadata: {
          createdAt: Date.now(),
          lastRefined: null,
          complexity: 'moderate',
        },
      };
      expect(doc.category).toBe(cat);
    });
  });

  it('supports multiple sections with different formats', () => {
    const doc: EpicDocument = {
      title: 'Multi-format Epic',
      sections: [
        { title: 'Intro', content: 'Text', wordCount: 1, isRequired: true },
        { title: 'Risks', content: '| risk |', format: 'risk-heat-map', wordCount: 2, isRequired: false },
        { title: 'Arch', content: 'graph LR', format: 'mermaid', wordCount: 2, isRequired: true },
      ],
      metadata: {
        createdAt: 0,
        lastRefined: null,
        complexity: 'complex',
      },
    };

    expect(doc.sections).toHaveLength(3);
    expect(doc.sections[0]!.format).toBeUndefined();
    expect(doc.sections[1]!.format).toBe('risk-heat-map');
    expect(doc.sections[2]!.format).toBe('mermaid');
  });
});
