/**
 * Stage 2 — Category Classification prompt builder.
 *
 * Generates the prompt that instructs the AI to classify an epic into
 * one of 7 categories with a confidence score and reasoning. Builds
 * on Stage 1 comprehension output for informed classification.
 */

import type { ComplexityLevel, EpicCategory } from '@/domain/types';

// ─── Prompt Version ─────────────────────────────────────────

export const PROMPT_VERSION = '1.0.0';

// ─── Input Interface ────────────────────────────────────────

export interface ClassificationPromptVars {
  readonly comprehensionSummary: string;
  readonly rawContent: string;
  readonly availableCategories: readonly EpicCategory[];
  readonly complexityLevel: ComplexityLevel;
  readonly fewShotExample?: string;
}

// ─── Category Descriptions ──────────────────────────────────

const CATEGORY_DESCRIPTIONS: Record<EpicCategory, string> = {
  general:
    'General-purpose documents that do not fit a specific category. The AI pipeline will analyze the content and apply the most appropriate structure.',
  business_requirement:
    'Business requirement documents for stakeholders — objectives, KPIs, process flows, and RACI matrices. Tone: professional and business-oriented.',
  technical_design:
    'Technical design documents for engineering teams — architecture, APIs, data models, and implementation plans. Tone: precise and technical.',
  feature_specification:
    'Feature specification documents — detailed feature design with UX flows, edge cases, and acceptance criteria. Tone: clear and detail-oriented.',
  api_specification:
    'API specification documents — endpoints, schemas, authentication, rate limits, and versioning. Tone: precise and specification-driven.',
  infrastructure_design:
    'Infrastructure design documents — cloud architecture, networking, CI/CD, monitoring, and disaster recovery. Tone: operational and infrastructure-focused.',
  migration_plan:
    'Migration plan documents — data migration, system migration, cutover planning, and rollback strategies. Tone: methodical and risk-aware.',
  integration_spec:
    'Integration specification documents — system integration points, data flows, protocols, and SLAs. Tone: integration-focused and contract-driven.',
};

// ─── Complexity Scaling ─────────────────────────────────────

const COMPLEXITY_INSTRUCTIONS: Record<ComplexityLevel, string> = {
  simple: `Complexity level: SIMPLE.
- Focus on the single most obvious category match.
- Keep reasoning brief (2–3 sentences).
- categoryConfig can be minimal — include only the most relevant template parameters.`,

  moderate: `Complexity level: MODERATE.
- Consider the top 2–3 candidate categories before deciding.
- Provide clear reasoning (3–5 sentences) explaining why the chosen category fits best and why alternatives were rejected.
- categoryConfig should include key template parameters: tone, primary section types, and any category-specific settings.`,

  complex: `Complexity level: COMPLEX.
- Evaluate all 7 categories systematically before deciding.
- Provide thorough reasoning (5–8 sentences) covering: primary match indicators, secondary category overlaps, and why the chosen category is the strongest fit.
- categoryConfig should be comprehensive: tone, section types, format preferences, diagram types, and any cross-category considerations.`,
};

// ─── Prompt Builder ─────────────────────────────────────────

export function buildClassificationPrompt(vars: ClassificationPromptVars): string {
  const { comprehensionSummary, rawContent, availableCategories, complexityLevel } = vars;
  const complexityInstructions = COMPLEXITY_INSTRUCTIONS[complexityLevel];

  const categoryList = availableCategories
    .map((cat) => `- **${cat}**: ${CATEGORY_DESCRIPTIONS[cat]}`)
    .join('\n');

  return `<system>
You are an expert document classifier specializing in software engineering documentation. Your task is to classify an epic document into exactly one of the provided categories based on its content, structure, and intent. You have deep knowledge of how different types of technical documents are structured and what distinguishes them.
</system>

<task>
Classify the following document into exactly one category. Your classification determines which template, tone, and section structure will be applied in downstream pipeline stages, so accuracy is critical.

${complexityInstructions}
</task>

<comprehension_context>
The following is the Stage 1 comprehension analysis of this document. Use it to inform your classification — the extracted entities, requirements, and semantic sections provide strong signals about document type.

${comprehensionSummary}
</comprehension_context>

<input_document>
${rawContent}
</input_document>

<available_categories>
Choose exactly ONE of the following categories:

${categoryList}
</available_categories>

<output_format>
Respond with a single JSON object matching this exact schema. Do not include any text outside the JSON.

\`\`\`json
{
  "primaryCategory": "string — one of the category keys listed above (e.g., 'technical_design')",
  "confidence": 0.85,
  "categoryConfig": {
    "tone": "string — the recommended tone for this category",
    "primarySectionTypes": ["string — key section types expected for this category"],
    "formatPreferences": ["string — preferred content formats (prose, tables, diagrams, etc.)"]
  },
  "reasoning": "string — explanation of why this category was chosen, including what signals in the document pointed to this classification and why alternative categories were rejected"
}
\`\`\`

### Field requirements:

**primaryCategory**: Must be exactly one of the provided category keys. Use underscore_case as shown.

**confidence**: A number between 0 and 1 representing classification certainty.
- 0.9–1.0: Document is an unambiguous match for this category.
- 0.7–0.89: Strong match with minor overlap to another category.
- 0.6–0.69: Moderate match — document has characteristics of multiple categories.
- Below 0.6: If your confidence would be below 0.6, you MUST still pick the best-fit category but explicitly note the uncertainty in your reasoning. Explain which other categories were considered and why the chosen one is the least-bad fit.

**categoryConfig**: An object containing category-specific configuration that downstream stages will use. At minimum include: tone (string), primarySectionTypes (string array), and formatPreferences (string array). You may include additional keys relevant to the chosen category.

**reasoning**: A clear explanation of the classification decision. Must address:
1. What content signals pointed to the chosen category (e.g., presence of API endpoints → api_specification).
2. Which alternative categories were considered and why they were rejected.
3. If confidence < 0.7, explain the ambiguity and what additional information would increase confidence.
</output_format>

<instructions>
Follow these instructions precisely:

### Classification Signals
Use these signals to identify each category:

- **business_requirement**: Mentions of KPIs, ROI, stakeholders, business processes, RACI, strategic objectives, budget, timelines.
- **technical_design**: Architecture diagrams, component interactions, data models, technology stack decisions, system design patterns.
- **feature_specification**: User stories, UX flows, wireframes, acceptance criteria, feature flags, A/B testing, user personas.
- **api_specification**: HTTP methods, endpoints, request/response schemas, authentication flows, rate limits, API versioning, OpenAPI references.
- **infrastructure_design**: Cloud providers, networking (VPC, subnets), CI/CD pipelines, monitoring/alerting, autoscaling, disaster recovery, IaC references.
- **migration_plan**: Source/target system mapping, data transformation rules, cutover procedures, rollback plans, migration phases, data validation.
- **integration_spec**: System integration points, message queues, event-driven architecture, data synchronization, SLAs, protocol specifications.

### Decision Process
1. Review the comprehension analysis — entities, requirements, and semantic sections are the strongest classification signals.
2. Map document characteristics to category signals above.
3. If multiple categories match, choose the one that best describes the document's PRIMARY purpose (not secondary concerns).
4. A technical design that includes API details is still a technical_design if the overall purpose is system architecture.
5. When in doubt between two categories, prefer the more specific one (e.g., api_specification over technical_design if the document is primarily about API contracts).

### Quality Criteria
- The chosen category must appear in the available_categories list.
- Confidence must be a number between 0 and 1, not a percentage.
- Reasoning must reference specific content from the document, not generic statements.
- categoryConfig must be internally consistent with the chosen category.
${vars.fewShotExample ? `
<example_output>
The following is an example of HIGH QUALITY output for a different document. Use it as a reference for the level of detail and structure expected.

${vars.fewShotExample}
</example_output>` : ''}
</instructions>`;
}
