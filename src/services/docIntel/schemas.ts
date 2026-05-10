/**
 * DocIntel JSON Schemas — strict structured output schemas for Azure OpenAI.
 *
 * Word budgets in descriptions are CEILINGS. The nano pre-classifier injects
 * specific targets into <final_instructions>. Schema ceiling + instruction target
 * = no contradiction for GPT-5.5's literal instruction following.
 */

// ─── Classifier Schema ────────────────────────────────────

export const CLASSIFIER_SCHEMA = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'doc_intel_classifier_v1',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['complexity_tier', 'recommended_lens', 'recommended_summary_words', 'recommended_insight_count', 'recommended_diagram_count'],
      properties: {
        complexity_tier: {
          type: 'string',
          enum: ['trivial', 'low', 'medium', 'high', 'very_high'],
          description: 'Document complexity based on length, domain density, and structural depth.',
        },
        recommended_lens: {
          type: 'string',
          enum: ['executive', 'technical', 'legal', 'financial', 'operational', 'risk', 'summary'],
          description: 'Best-fit analysis lens based on document domain. executive for business/strategy docs, technical for engineering/architecture, legal for contracts/compliance, financial for budgets/reports, operational for processes/runbooks, risk for assessments/audits, summary for general/mixed.',
        },
        recommended_summary_words: {
          type: 'number',
          description: 'Target word count for executive_summary. 50 for trivial, 75 for low, 90 for medium, 120 for high, 150 for very_high.',
        },
        recommended_insight_count: {
          type: 'number',
          description: 'Number of key insights to extract. 3 for trivial, 5 for low, 7 for medium, 9 for high, 12 for very_high.',
        },
        recommended_diagram_count: {
          type: 'number',
          description: 'Number of Mermaid diagrams to generate. 1 for trivial/low, 2 for medium/high, 3 for very_high.',
        },
      },
    },
  },
};

// ─── Summary Schema ────────────────────────────────────────

export const SUMMARY_SCHEMA = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'doc_intel_summary_v1',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'one_line_summary', 'executive_summary', 'audience_brief'],
      properties: {
        title: {
          type: 'string',
          description: 'Concise document title, 5-10 words. No "Analysis of..." preamble.',
        },
        one_line_summary: {
          type: 'string',
          description: 'One sentence capturing the core message. At most 25 words. Active voice.',
        },
        executive_summary: {
          type: 'string',
          description: 'At most 150 words. Markdown. Open with primary business outcome or risk. Never with "This document...". Active voice. Use $ and % notation; spell out acronyms on first use. One factual claim per sentence.',
        },
        audience_brief: {
          type: 'string',
          description: 'At most 200 words. Markdown rewrite tuned to the analysis lens audience. Different structure and vocabulary from executive_summary — not a rehash.',
        },
      },
    },
  },
};

// ─── Insights Schema ───────────────────────────────────────

export const INSIGHTS_SCHEMA = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'doc_intel_insights_v1',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['key_insights', 'simplified_explanations', 'risks'],
      properties: {
        key_insights: {
          type: 'array',
          description: 'Key takeaways from the document. Each insight is a discrete finding.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['heading', 'body_md', 'severity', 'evidence_quote'],
            properties: {
              heading: { type: 'string', description: 'At most 8 words. Verb-led. Active voice.' },
              body_md: { type: 'string', description: 'At most 60 words. Markdown. One factual claim per sentence.' },
              severity: { type: 'string', enum: ['high', 'medium', 'low'] },
              evidence_quote: { type: 'string', description: 'At most 12 words verbatim from document, WITHOUT quotation marks around the text. If no direct quote available, use "Not directly quoted".' },
            },
          },
        },
        simplified_explanations: {
          type: 'array',
          description: 'Plain-language rewrites of complex concepts found in the document.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['term', 'plain_md'],
            properties: {
              term: { type: 'string', description: 'The complex concept or jargon term from the document.' },
              plain_md: { type: 'string', description: 'At most 40 words. Plain-language explanation a non-specialist would understand.' },
            },
          },
        },
        risks: {
          type: 'array',
          description: 'Risks identified in or implied by the document.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['description_md', 'likelihood', 'impact'],
            properties: {
              description_md: { type: 'string', description: 'At most 50 words. Markdown. Specific and actionable.' },
              likelihood: { type: 'string', enum: ['high', 'medium', 'low'] },
              impact: { type: 'string', enum: ['high', 'medium', 'low'] },
            },
          },
        },
      },
    },
  },
};

// ─── Visuals Schema ────────────────────────────────────────

export const VISUALS_SCHEMA = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'doc_intel_visuals_v1',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['diagrams'],
      properties: {
        diagrams: {
          type: 'array',
          description: 'Mermaid diagrams visualizing key structures and flows from the document.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['title', 'kind', 'mermaid_source', 'caption'],
            properties: {
              title: { type: 'string', description: 'Descriptive diagram title, at most 8 words.' },
              kind: {
                type: 'string',
                enum: ['flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram-v2', 'erDiagram', 'gantt', 'mindmap'],
                description: 'Mermaid diagram type. Use flowchart for architecture/structure, sequenceDiagram for processes/interactions.',
              },
              mermaid_source: {
                type: 'string',
                description: 'Valid Mermaid syntax. For flowchart/graph: use classDef for semantic colors. For ALL other types: do NOT use classDef, linkStyle, or node shapes — they cause syntax errors.',
              },
              caption: { type: 'string', description: 'One sentence describing what the diagram shows. At most 20 words.' },
            },
          },
        },
      },
    },
  },
};
