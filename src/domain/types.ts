/**
 * Core Epic domain types — Phase 1.
 *
 * These types represent the fundamental data structures for epics,
 * sections, categories, and complexity levels. They contain NO
 * pipeline types (Phase 4), NO GitLab types (Phase 14), and NO
 * wizard types (removed in v5).
 */

// ─── Complexity ─────────────────────────────────────────────

/** Tri-level complexity selector (BRD FR-5) */
export type ComplexityLevel = 'simple' | 'moderate' | 'complex';

// ─── Categories ─────────────────────────────────────────────

/** The 7 epic category templates (BRD FR-4). Underscore convention matches
 *  categoryTemplates.json keys and pipeline Stage 2 classification output. */
export type EpicCategory =
  | 'business_requirement'
  | 'technical_design'
  | 'feature_specification'
  | 'api_specification'
  | 'infrastructure_design'
  | 'migration_plan'
  | 'integration_spec';

// ─── Section Formats ────────────────────────────────────────

/** How a section's content should be rendered/structured.
 *  All 17 formats from v4 categoryTemplates.json are preserved. */
export type SectionFormat =
  | 'prose'
  | 'bullet-list'
  | 'numbered-list'
  | 'table'
  | 'code-block'
  | 'mermaid'
  | 'mermaid-sequence'
  | 'raci-table'
  | 'risk-heat-map'
  | 'slo-table'
  | 'comparison-table-and-prose'
  | 'phase-table'
  | 'endpoint-blocks'
  | 'error-table'
  | 'schema-table'
  | 'numbered-procedure'
  | 'mapping-table'
  | 'mixed';

// ─── Epic Section ───────────────────────────────────────────

/** A single section within an epic document */
export interface EpicSection {
  title: string;
  content: string;
  format?: SectionFormat;
  wordCount: number;
  isRequired: boolean;
}

// ─── Epic Metadata ──────────────────────────────────────────

/** Metadata attached to an epic document */
export interface EpicMetadata {
  createdAt: number;
  lastRefined: number | null;
  qualityScore?: number;
  gitlabEpicId?: number;
  gitlabEpicIid?: number;
  complexity: ComplexityLevel;
}

// ─── Epic Document ──────────────────────────────────────────

/** The top-level epic document structure */
export interface EpicDocument {
  title: string;
  category?: EpicCategory;
  sections: EpicSection[];
  metadata: EpicMetadata;
}
