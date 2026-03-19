/**
 * Stage 1 — Deep Comprehension prompt builder.
 *
 * Generates the prompt that instructs the AI to analyze raw epic content
 * and produce a structured ComprehensionOutput (entities, requirements,
 * gaps, risks, semantic sections).
 */

import type { ComplexityLevel } from '@/domain/types';

// ─── Prompt Version ─────────────────────────────────────────

export const PROMPT_VERSION = '1.0.0';

// ─── Input Interface ────────────────────────────────────────

export interface ComprehensionPromptVars {
  readonly rawContent: string;
  readonly title: string;
  readonly complexityLevel: ComplexityLevel;
  readonly wordTarget: number;
  readonly fewShotExample?: string;
}

// ─── Complexity Scaling ─────────────────────────────────────

const COMPLEXITY_INSTRUCTIONS: Record<ComplexityLevel, string> = {
  simple: `Complexity level: SIMPLE.
- Extract only the most prominent entities (up to 8).
- Identify 3–5 core requirements; skip minor or implied ones.
- Flag only critical gaps and high-severity risks.
- Keep semantic sections broad (3–6 sections).
- Be concise — favor brevity over exhaustiveness.`,

  moderate: `Complexity level: MODERATE.
- Extract a thorough set of entities (8–15) with their relationships.
- Identify all explicit requirements and key implicit ones (8–15 total).
- Perform a balanced gap analysis — cover missing acceptance criteria, unclear scope, and integration risks.
- Discover 5–10 semantic sections with clear purpose annotations.
- Balance depth with clarity.`,

  complex: `Complexity level: COMPLEX.
- Extract an exhaustive entity map (15+) including indirect dependencies and cross-cutting concerns.
- Identify all requirements — explicit, implicit, and inferred from context (15+).
- Perform deep gap analysis covering: missing non-functional requirements, security considerations, scalability gaps, compliance gaps, and edge cases.
- Identify both obvious and subtle risks including third-party dependencies, data migration risks, and organizational risks.
- Discover fine-grained semantic sections (8–15) with detailed purpose and content summaries.
- Be thorough — completeness is more important than brevity.`,
};

// ─── Prompt Builder ─────────────────────────────────────────

export function buildComprehensionPrompt(vars: ComprehensionPromptVars): string {
  const { rawContent, title, complexityLevel, wordTarget } = vars;
  const complexityInstructions = COMPLEXITY_INSTRUCTIONS[complexityLevel];

  return `<system>
You are an expert technical analyst specializing in software engineering documentation. Your task is to perform deep comprehension analysis on a document, extracting structured data that downstream pipeline stages will use to classify, restructure, and refine an epic specification.

You have extensive experience with:
- Requirements engineering and gap analysis
- Entity-relationship modeling for software systems
- Risk identification in technical specifications
- Document structure and semantic analysis
</system>

<task>
Analyze the following document titled "${title}" and produce a comprehensive comprehension output. Your analysis will be consumed by automated pipeline stages, so precision and completeness are critical.

Target analysis depth: approximately ${wordTarget} words of analytical output.

${complexityInstructions}
</task>

<input_document title="${title}">
${rawContent}
</input_document>

<output_format>
Respond with a single JSON object matching this exact schema. Do not include any text outside the JSON.

\`\`\`json
{
  "keyEntities": [
    {
      "name": "string — entity name (system, service, component, role, concept)",
      "type": "string — one of: system, service, component, module, role, concept, external_dependency, data_store",
      "relationships": ["string — names of other entities this entity relates to"]
    }
  ],
  "detectedGaps": [
    "string — a specific gap found in the document (e.g., 'No rollback strategy defined', 'Missing performance requirements')"
  ],
  "implicitRisks": [
    "string — a risk not explicitly stated but implied by the content (e.g., 'Third-party API rate limits not addressed', 'No failover strategy for single points of failure')"
  ],
  "semanticSections": [
    {
      "id": "string — unique section identifier (e.g., 'sec-overview', 'sec-auth-flow')",
      "title": "string — descriptive section title",
      "content": "string — summary of what this section contains",
      "purpose": "string — why this section exists and what role it plays in the document"
    }
  ],
  "extractedRequirements": [
    {
      "id": "string — unique requirement identifier (e.g., 'REQ-001')",
      "description": "string — clear, testable requirement statement",
      "priority": "high | medium | low",
      "source": "string — where in the document this requirement was found or inferred from"
    }
  ],
  "gapAnalysis": [
    {
      "requirementId": "string — the requirement ID this gap relates to, or 'GENERAL' for document-level gaps",
      "gapType": "string — one of: missing-acceptance-criteria, unclear-scope, missing-nfr, missing-dependency, missing-error-handling, missing-security, missing-migration-plan, incomplete-specification",
      "severity": "critical | major | minor",
      "suggestion": "string — actionable recommendation to address this gap"
    }
  ]
}
\`\`\`
</output_format>

<instructions>
Follow these instructions precisely:

### Entity Extraction
- Identify all significant entities: systems, services, components, modules, roles, concepts, external dependencies, and data stores.
- For each entity, map its relationships to other entities mentioned in the document.
- Use consistent naming — if the document refers to "the auth service" and "authentication module", unify under one name.
- Include both explicitly named entities and those implied by the architecture.

### Requirement Extraction
- Extract both explicit requirements ("the system shall...") and implicit ones (capabilities assumed by the design).
- Assign a unique sequential ID to each requirement (REQ-001, REQ-002, ...).
- Prioritize based on: high = core functionality or blocking dependency, medium = important but not blocking, low = nice-to-have or enhancement.
- Record the source section or paragraph where each requirement was found.

### Gap Analysis
- For each extracted requirement, check: Does it have clear acceptance criteria? Is the scope well-defined? Are edge cases addressed?
- Look for missing non-functional requirements: performance, security, scalability, observability, disaster recovery.
- Identify requirements that reference undefined entities or external systems without integration details.
- Assign severity: critical = blocks implementation, major = causes significant rework if discovered late, minor = should be addressed but won't block.

### Risk Identification
- Look for implicit risks: single points of failure, unaddressed scaling concerns, missing error handling strategies, vendor lock-in, data consistency issues.
- Consider organizational risks: unclear ownership, missing stakeholder alignment, timeline assumptions.
- Do NOT repeat gaps as risks — risks are about what could go wrong, gaps are about what's missing from the specification.

### Semantic Section Discovery
- Divide the document into logical semantic sections based on topic boundaries.
- Each section should have a clear, distinct purpose. Avoid overly granular splits.
- Assign a kebab-case ID (e.g., "sec-overview", "sec-data-model", "sec-deployment-strategy").
- Summarize both the content and the purpose of each section.

### Quality Criteria
- Every field in the output schema must be populated — no empty arrays unless genuinely nothing was found.
- Entity names must be consistent across all output fields.
- Requirement IDs must be unique and sequential.
- Gap analysis must reference valid requirement IDs or use "GENERAL".
- Risks must not duplicate gaps — they address different concerns.
${vars.fewShotExample ? `
<example_output>
The following is an example of HIGH QUALITY output for a different document. Use it as a reference for the level of detail and structure expected.

${vars.fewShotExample}
</example_output>` : ''}
</instructions>`;
}
