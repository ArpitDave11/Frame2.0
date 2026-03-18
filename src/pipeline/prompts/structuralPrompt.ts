/**
 * Stage 3 — Structural Assessment prompt builder.
 *
 * Generates the prompt that instructs the AI to score every section on
 * three dimensions (completeness, relevance, placement), plan transformations,
 * and identify missing sections by comparing against the category template.
 */

import type { ComplexityLevel } from '@/domain/types';

// ─── Prompt Version ─────────────────────────────────────────

export const PROMPT_VERSION = '1.0.0';

// ─── Input Interface ────────────────────────────────────────

export interface StructuralPromptVars {
  readonly comprehensionSummary: string;
  readonly classificationResult: string;
  readonly rawContent: string;
  readonly sectionList: readonly string[];
  readonly complexityLevel: ComplexityLevel;
  readonly categoryTemplateSections: readonly string[];
}

// ─── Complexity Scaling ─────────────────────────────────────

const COMPLEXITY_INSTRUCTIONS: Record<ComplexityLevel, string> = {
  simple: `Complexity level: SIMPLE.
- Score only required sections. Optional sections can be skipped.
- Transformation plan should favor keep and restructure — avoid splitting.
- Missing section analysis limited to required sections only.
- Scoring can be lenient: a section that covers the basics gets 6+.`,

  moderate: `Complexity level: MODERATE.
- Score all present sections, including optional ones.
- Apply balanced scoring: sections need clear content with reasonable depth.
- Transformation plan can use all 5 actions as needed.
- Identify missing sections from both required and key optional template sections.`,

  complex: `Complexity level: COMPLEX.
- Score every section rigorously. Expect high completeness and precise placement.
- Apply strict scoring: sections need thorough coverage, clear structure, and proper context.
- Actively look for split opportunities — large sections with multiple concerns should be divided.
- Identify ALL missing sections including optional ones. Every gap matters at this complexity.`,
};

// ─── Prompt Builder ─────────────────────────────────────────

export function buildStructuralPrompt(vars: StructuralPromptVars): string {
  const {
    comprehensionSummary,
    classificationResult,
    rawContent,
    sectionList,
    complexityLevel,
    categoryTemplateSections,
  } = vars;

  const numberedSections = sectionList
    .map((s, i) => `${i + 1}. ${s}`)
    .join('\n');

  const templateSections = categoryTemplateSections
    .map((s, i) => `${i + 1}. ${s}`)
    .join('\n');

  return `<system>
You are an expert document structure analyst specializing in software engineering documentation. Your task is to evaluate the structural quality of an epic document by scoring each section on three dimensions and planning transformations to improve it. You understand how well-structured technical documents are organized and can identify structural weaknesses.
</system>

<task>
Perform a structural assessment of the following document. For each section, score it on three dimensions (1–10 each), assign a transformation action, and identify any missing sections by comparing against the expected category template.

${COMPLEXITY_INSTRUCTIONS[complexityLevel]}
</task>

<comprehension_context>
Stage 1 comprehension analysis:

${comprehensionSummary}
</comprehension_context>

<classification_context>
Stage 2 classification result:

${classificationResult}
</classification_context>

<input_document>
${rawContent}
</input_document>

<discovered_sections>
Sections found in the document:

${numberedSections}
</discovered_sections>

<expected_template_sections>
Expected sections for this category template (the gold standard for this document type):

${templateSections}
</expected_template_sections>

<scoring_rubric>
Score each section on three dimensions, each from 1 to 10:

### Completeness (1–10)
How thoroughly does the section cover its topic?

| Score | Meaning | Example |
|-------|---------|---------|
| 1–3   | **Stub or placeholder** — a heading with one sentence, no actionable detail, or just a TODO marker. | "Architecture: We will use microservices." (no diagrams, no component list, no rationale) |
| 4–6   | **Partial coverage** — covers the main idea but misses important sub-topics, edge cases, or supporting detail. | An auth section that explains login flow but omits token refresh, session expiry, and error handling. |
| 7–8   | **Solid coverage** — addresses the topic thoroughly with some minor gaps. A reviewer would have few questions. | A data model section with entity descriptions, relationships, and constraints — but missing index strategy. |
| 9–10  | **Comprehensive** — exhaustive coverage that anticipates questions. A reader could implement from this section alone. | An API section with every endpoint, request/response schemas, error codes, rate limits, auth requirements, and versioning strategy. |

### Relevance (1–10)
How well does the section's content match its stated purpose and the document's category?

| Score | Meaning | Example |
|-------|---------|---------|
| 1–3   | **Off-topic or misplaced** — content doesn't belong in this section or this document type. | A "Performance Requirements" section that only discusses team meeting schedules. |
| 4–6   | **Partially relevant** — some content is on-topic but mixed with tangential material. | A "Security" section that starts with auth design (relevant) but drifts into general coding best practices (tangential). |
| 7–8   | **Mostly relevant** — content clearly belongs here with minor tangential elements. | A deployment section that covers CI/CD, environments, and rollback — with one paragraph about developer onboarding that belongs elsewhere. |
| 9–10  | **Precisely focused** — every paragraph directly serves the section's purpose. No filler, no drift. | An "Error Handling" section that covers error taxonomy, retry strategies, circuit breakers, user-facing messages, and logging — nothing else. |

### Placement (1–10)
Is the section in the right position relative to other sections? Does it appear where a reader would expect it?

| Score | Meaning | Example |
|-------|---------|---------|
| 1–3   | **Severely misplaced** — the section appears before its prerequisites or after sections that depend on it. | "Implementation Plan" appearing before "Requirements" and "Architecture". |
| 4–6   | **Awkwardly placed** — understandable but not where a reader would naturally look for it. | "Testing Strategy" appearing between "Data Model" and "API Design" instead of after implementation sections. |
| 7–8   | **Well placed** — follows a logical reading order with minor position improvements possible. | "Monitoring" appearing just before "Deployment" — works, but "Deployment" → "Monitoring" is more conventional. |
| 9–10  | **Optimal position** — the section appears exactly where a reader would expect it in the document flow. | "Overview" → "Requirements" → "Architecture" → "Design" → "Implementation" → "Testing" → "Deployment" — textbook order. |
</scoring_rubric>

<transformation_actions>
For each section, assign exactly one transformation action:

- **keep**: Section is well-structured. Score >= 7 on all dimensions. No changes needed.
- **restructure**: Section has the right content but poor organization. Reorder paragraphs, improve headings, add sub-sections.
- **merge**: Section overlaps significantly with another section. Combine them to eliminate redundancy. Specify which sections to merge.
- **split**: Section covers multiple distinct topics that deserve separate treatment. Specify the proposed sub-sections.
- **add**: A required section is missing entirely. Specify what content it should contain.

Note: "add" is used in the transformationPlan for sections that exist but need significant new content. Missing sections that don't exist at all go in the missingSections array.
</transformation_actions>

<output_format>
Respond with a single JSON object matching this exact schema. Do not include any text outside the JSON.

\`\`\`json
{
  "sectionScores": [
    {
      "sectionId": "string — identifier matching the section title or a generated slug",
      "completeness": 7,
      "relevance": 8,
      "placement": 9,
      "overall": 8
    }
  ],
  "transformationPlan": [
    {
      "sectionId": "string — same identifier as in sectionScores",
      "action": "keep | restructure | merge | split | add",
      "details": "string — specific description of what transformation to apply and why"
    }
  ],
  "missingSections": [
    "string — title of a section expected by the category template but not found in the document"
  ]
}
\`\`\`

### Field requirements:

**sectionScores**: One entry per discovered section. The \`overall\` score is the weighted average: completeness (40%) + relevance (30%) + placement (30%), rounded to the nearest integer.

**transformationPlan**: One entry per discovered section, plus entries with action "add" for sections that exist as stubs and need content. Every sectionId in sectionScores must have a corresponding entry in transformationPlan.

**missingSections**: Section titles from the expected template that have NO corresponding section in the document. Do not include sections that exist but scored low — those go in transformationPlan with "restructure" or "add".
</output_format>

<instructions>
Follow these instructions precisely:

### Scoring Process
1. Read each section carefully. Compare its content against what a comprehensive version of that section would contain.
2. Score completeness first — this is the most important dimension.
3. Score relevance — check if the content matches the section's title and the document's category.
4. Score placement — evaluate position relative to other sections and reading flow.
5. Calculate overall: round(completeness × 0.4 + relevance × 0.3 + placement × 0.3).

### Transformation Planning
1. For each section, choose the single best transformation action.
2. If overall score >= 7 and no significant issues, use "keep".
3. If content is good but poorly organized, use "restructure".
4. If two sections cover the same topic, use "merge" on one and note the merge target.
5. If a section covers 3+ distinct topics, use "split" and name the proposed sub-sections.
6. If a section exists as a stub (completeness <= 3), use "add" to indicate it needs substantial content.

### Missing Section Detection
1. Compare the expected template sections against the discovered sections.
2. Use fuzzy matching — "Auth Design" matches "Authentication Design", "Architecture Overview" matches "System Architecture".
3. Only list sections as missing if there is NO corresponding section, even under a different name.
4. Order missing sections by importance (required sections first, optional sections last).

### Quality Criteria
- Every discovered section must appear in both sectionScores and transformationPlan.
- The overall score must be mathematically consistent with the dimension scores.
- Transformation details must be specific and actionable, not generic.
- Missing sections must reference actual template section titles.
</instructions>`;
}
