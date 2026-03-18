/**
 * Template Loader — Phase 3 (T-3.6).
 *
 * Loads category templates and provides querying, format instructions,
 * and complexity-scaled template generation. Critical for downstream pipeline.
 */

import type { EpicCategory, SectionFormat, ComplexityLevel } from '@/domain/types';
import { getScaledWordTarget } from '@/domain/complexity';
import { COMPLEXITY_CONFIGS } from '@/domain/complexity';
import templateData from './categoryTemplates.json';

// ─── Types ─────────────────────────────────────────────────

export type MermaidDiagramType = 'flowchart' | 'sequence' | 'classDiagram' | 'stateDiagram' | 'erDiagram' | 'gantt';

export interface ProgressiveDisclosure {
  summary: string[];
  detail: string[];
  advanced: string[];
}

export interface RichSectionConfig {
  target?: number;
  max?: number;
  wordLimit?: number;
  format?: SectionFormat;
  columns?: string[];
  hint?: string;
  diagram?: MermaidDiagramType;
  subsections?: Record<string, RichSectionConfig>;
  collapsible?: boolean;
  conditional?: string;
  template?: string;
  count?: { min: number; max: number };
  fields?: string[];
}

export interface RichCategoryTemplate {
  requiredSections: Record<string, RichSectionConfig>;
  optionalSections: Record<string, RichSectionConfig>;
  tone: string;
  storyStyle: string;
  architectureFocus: string;
  expertRole: string;
  description: string;
  totalWordTarget?: { min: number; max: number };
  progressiveDisclosure?: ProgressiveDisclosure;
}

export interface GlobalTemplateDefaults {
  statusEmoji: Record<string, string>;
  markdownFeatures: Record<string, boolean>;
  maxTitleLength: number;
  defaultPerPage: number;
}

export interface RichTemplateData {
  _meta: { version: string; globalDefaults: GlobalTemplateDefaults };
  [key: string]: RichCategoryTemplate | RichTemplateData['_meta'] | unknown;
}

// ─── Data Access ────────────────────────────────────────────

const data = templateData as unknown as RichTemplateData;

export function loadCategoryTemplate(category: EpicCategory): RichCategoryTemplate {
  const template = data[category] as RichCategoryTemplate | undefined;
  if (template?.requiredSections) return template;
  return data['technical_design'] as RichCategoryTemplate;
}

export function getGlobalDefaults(): GlobalTemplateDefaults {
  return data._meta.globalDefaults;
}

// ─── Section Querying ───────────────────────────────────────

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function findSectionConfig(
  sectionTitle: string,
  template: RichCategoryTemplate,
): RichSectionConfig | undefined {
  const normalized = normalizeTitle(sectionTitle);

  for (const [key, config] of Object.entries(template.requiredSections)) {
    if (normalizeTitle(key) === normalized) return config;
    if (config.subsections) {
      for (const [subKey, subConfig] of Object.entries(config.subsections)) {
        if (normalizeTitle(subKey) === normalized) return subConfig;
      }
    }
  }

  for (const [key, config] of Object.entries(template.optionalSections)) {
    if (normalizeTitle(key) === normalized) return config;
    if (config.subsections) {
      for (const [subKey, subConfig] of Object.entries(config.subsections)) {
        if (normalizeTitle(subKey) === normalized) return subConfig;
      }
    }
  }

  return undefined;
}

export function getSectionWordLimits(
  sectionTitle: string,
  template: RichCategoryTemplate,
): { target: number; max: number } {
  const config = findSectionConfig(sectionTitle, template);
  return { target: config?.target ?? 200, max: config?.max ?? 400 };
}

export function getSectionFormat(
  sectionTitle: string,
  template: RichCategoryTemplate,
): SectionFormat | undefined {
  return findSectionConfig(sectionTitle, template)?.format;
}

export function getProgressiveDisclosure(
  template: RichCategoryTemplate,
): ProgressiveDisclosure | undefined {
  return template.progressiveDisclosure;
}

// ─── Format Instructions ────────────────────────────────────

export function getFormatInstruction(format: SectionFormat | undefined, columns?: string[]): string {
  if (!format) return '';

  switch (format) {
    case 'prose':
      return 'Write in clear, well-structured paragraphs.';
    case 'bullet-list':
      return 'Use a bullet-point list with concise items.';
    case 'numbered-list':
      return 'Use a numbered list for sequential or prioritized items.';
    case 'table':
      return columns
        ? `Use a markdown table with columns: ${columns.join(', ')}.`
        : 'Use a markdown table with appropriate columns.';
    case 'code-block':
      return 'Use fenced code blocks with language identifiers.';
    case 'mermaid':
      return 'Include a Mermaid flowchart diagram in a ```mermaid code block.';
    case 'mermaid-sequence':
      return 'Include a Mermaid sequence diagram in a ```mermaid code block.';
    case 'raci-table':
      return `Use a RACI matrix table with columns: ${(columns ?? ['Role', 'Responsible', 'Accountable', 'Consulted', 'Informed']).join(', ')}.`;
    case 'risk-heat-map':
      return 'Use a risk heat map table with columns: Risk, Probability (Low/Med/High), Impact (Low/Med/High), Mitigation.';
    case 'slo-table':
      return 'Use an SLO table with columns: Metric, Target, Current, Measurement Method.';
    case 'comparison-table-and-prose':
      return 'Use a comparison table followed by prose analysis of the recommended approach.';
    case 'phase-table':
      return 'Use a phase/milestone table with columns: Phase, Description, Duration, Deliverables.';
    case 'endpoint-blocks':
      return 'Document each endpoint with: HTTP method, path, description, request body, response body, status codes.';
    case 'error-table':
      return 'Use an error table with columns: Error Code, HTTP Status, Description, Resolution.';
    case 'schema-table':
      return 'Use a schema table with columns: Field, Type, Required, Description.';
    case 'numbered-procedure':
      return 'Use numbered steps for a sequential procedure. Each step should be actionable.';
    case 'mapping-table':
      return 'Use a mapping table with columns: Source Field, Target Field, Transformation, Notes.';
    case 'mixed':
      return 'Use a combination of prose and structured elements as appropriate.';
    default:
      return '';
  }
}

// ─── Complexity Scaling ─────────────────────────────────────

function scaleSectionConfig(config: RichSectionConfig, level: ComplexityLevel): RichSectionConfig {
  const scaled = { ...config };
  if (scaled.target) scaled.target = getScaledWordTarget(scaled.target, level);
  if (scaled.max) scaled.max = getScaledWordTarget(scaled.max, level);
  if (scaled.count) {
    scaled.count = {
      min: Math.max(1, getScaledWordTarget(scaled.count.min, level)),
      max: getScaledWordTarget(scaled.count.max, level),
    };
  }
  return scaled;
}

function scaleAllSections(
  sections: Record<string, RichSectionConfig>,
  level: ComplexityLevel,
): Record<string, RichSectionConfig> {
  const result: Record<string, RichSectionConfig> = {};
  for (const [key, config] of Object.entries(sections)) {
    result[key] = scaleSectionConfig(config, level);
  }
  return result;
}

export function getScaledTemplate(
  category: EpicCategory,
  complexity: ComplexityLevel,
): RichCategoryTemplate {
  const original = loadCategoryTemplate(category);
  const complexityConfig = COMPLEXITY_CONFIGS[complexity];

  const scaled: RichCategoryTemplate = {
    ...original,
    requiredSections: scaleAllSections(original.requiredSections, complexity),
    optionalSections: {},
  };

  if (scaled.totalWordTarget) {
    scaled.totalWordTarget = {
      min: getScaledWordTarget(original.totalWordTarget!.min, complexity),
      max: getScaledWordTarget(original.totalWordTarget!.max, complexity),
    };
  }

  switch (complexityConfig.sectionInclusion) {
    case 'required-only':
      // No optional sections
      break;
    case 'required-plus-key-optional': {
      // Include first half of optional sections (by JSON key order — template authors control priority)
      const entries = Object.entries(original.optionalSections);
      const keyCount = Math.ceil(entries.length / 2);
      for (const [key, config] of entries.slice(0, keyCount)) {
        scaled.optionalSections[key] = scaleSectionConfig(config, complexity);
      }
      break;
    }
    case 'all':
      scaled.optionalSections = scaleAllSections(original.optionalSections, complexity);
      break;
  }

  return scaled;
}
