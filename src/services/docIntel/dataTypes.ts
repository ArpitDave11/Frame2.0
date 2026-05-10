/**
 * DocIntel structured data types — typed AI output for dedicated renderers.
 *
 * These mirror the strict JSON schemas in schemas.ts. The AI returns these
 * objects; they're stored in section.data and consumed by dedicated section
 * renderers. section.markdown is kept only for export.
 */

// ─── Summary ───────────────────────────────────────────────

export interface SummaryData {
  title: string;
  one_line_summary: string;
  executive_summary: string;     // prose — rendered via AnalysisMarkdown
  audience_brief: string;        // prose — rendered via AnalysisMarkdown
}

// ─── Insights ──────────────────────────────────────────────

export interface InsightItem {
  heading: string;               // plain text — sub-card title
  body_md: string;               // prose — rendered via AnalysisMarkdown
  severity: 'high' | 'medium' | 'low';
  evidence_quote: string;        // plain text — collapsible quote
}

export interface ExplanationItem {
  term: string;                  // plain text — accordion trigger
  plain_md: string;              // prose — accordion body
}

export interface RiskItem {
  description_md: string;        // prose
  likelihood: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
}

export interface InsightsData {
  key_insights: InsightItem[];
  simplified_explanations: ExplanationItem[];
  risks: RiskItem[];
}

// ─── Visuals ───────────────────────────────────────────────

export interface DiagramItem {
  title: string;
  kind: string;
  mermaid_source: string;
  caption: string;
}

export interface VisualsData {
  diagrams: DiagramItem[];
}

// ─── Union ─────────────────────────────────────────────────

export type SectionData = SummaryData | InsightsData | VisualsData;
