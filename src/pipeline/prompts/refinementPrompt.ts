/**
 * Stage 4 — Content Refinement prompt builder.
 *
 * Generates per-section prompts that instruct the AI to rewrite a single
 * section using category-specific templates and format instructions.
 * Handles retry iterations by including previous validation feedback.
 */

import type { ComplexityLevel } from '@/domain/types';
import type { TransformationAction } from '@/pipeline/pipelineTypes';

// ─── Prompt Version ─────────────────────────────────────────

export const PROMPT_VERSION = '1.0.0';

// ─── Input Interface ────────────────────────────────────────

export interface RefinementPromptVars {
  readonly sectionTitle: string;
  readonly sectionContent: string;
  readonly transformationAction: TransformationAction['action'];
  readonly categoryName: string;
  readonly formatInstruction: string;
  readonly complexityLevel: ComplexityLevel;
  readonly wordTarget: number;
  readonly previousFeedback?: string;
  readonly iterationNumber: number;
  readonly fewShotExample?: string;
}

// ─── Complexity Scaling ─────────────────────────────────────

const COMPLEXITY_INSTRUCTIONS: Record<ComplexityLevel, string> = {
  simple: `Complexity level: SIMPLE.
- Keep the rewrite concise and focused on essentials.
- Use straightforward language; avoid unnecessary jargon.
- Prioritize clarity over comprehensiveness.
- Aim for the lower end of the word target.`,

  moderate: `Complexity level: MODERATE.
- Balance thoroughness with readability.
- Include relevant details, examples, and context where helpful.
- Address edge cases for critical functionality.
- Aim for the middle of the word target range.`,

  complex: `Complexity level: COMPLEX.
- Provide exhaustive coverage of the topic.
- Include detailed examples, rationale for decisions, and cross-references to other sections.
- Address edge cases, failure modes, and alternative approaches.
- Aim for the upper end of the word target — depth matters.`,
};

// ─── Transformation Action Instructions ─────────────────────

const ACTION_INSTRUCTIONS: Record<TransformationAction['action'], string> = {
  keep: `**Action: KEEP** — This section scored well in structural assessment. Your task is to polish it:
- Preserve the existing structure and content.
- Improve clarity, grammar, and flow without changing meaning.
- Ensure formatting matches the specified format instruction.
- Do NOT add new content or remove existing points.`,

  restructure: `**Action: RESTRUCTURE** — This section has good content but poor organization. Your task is to reorganize it:
- Reorder paragraphs and points into a logical flow.
- Add sub-headings where they improve scannability.
- Group related ideas together; separate distinct topics.
- Preserve all existing content — do not remove points, only reorganize them.`,

  merge: `**Action: MERGE** — This section overlaps with another section. Your task is to consolidate:
- Combine overlapping content into a single coherent narrative.
- Remove redundant statements while preserving all unique points.
- Create a clear structure that covers the combined scope.
- Ensure no information is lost in the merge.`,

  split: `**Action: SPLIT** — This section covers multiple distinct topics. Your task is to write one focused sub-section:
- Focus ONLY on the content relevant to the section title provided.
- Remove content that belongs in sibling sections.
- Ensure the extracted content stands alone as a complete, coherent section.
- Maintain clear boundaries — do not bleed into adjacent topics.`,

  add: `**Action: ADD** — This section is a stub or missing critical content. Your task is to write substantial new content:
- Generate comprehensive content appropriate for this section's purpose.
- Follow the category conventions and format instruction.
- Ensure the new content integrates naturally with the document's existing tone.
- Cover the topic thoroughly based on the complexity level.`,
};

// ─── Prompt Builder ─────────────────────────────────────────

export function buildRefinementPrompt(vars: RefinementPromptVars): string {
  const {
    sectionTitle,
    sectionContent,
    transformationAction,
    categoryName,
    formatInstruction,
    complexityLevel,
    wordTarget,
    previousFeedback,
    iterationNumber,
  } = vars;

  const isRetry = iterationNumber > 0 && previousFeedback;

  const feedbackSection = isRetry
    ? `
<previous_attempt_feedback>
This is iteration ${iterationNumber} (retry). The previous version of this section failed validation. You MUST address the following issues specifically:

${previousFeedback}

Do NOT simply rephrase the previous content. Carefully read each piece of feedback and make targeted changes to resolve the identified problems. If the feedback mentions missing content, add it. If it mentions incorrect structure, fix the structure. If it mentions insufficient detail, expand with specifics.
</previous_attempt_feedback>`
    : '';

  return `<system>
You are an expert technical writer specializing in ${categoryName} documentation. Your task is to refine a single section of an epic document, producing polished, professional content that follows the specified format and category conventions.

You write with precision and clarity, adapting your tone and depth to the document category and complexity level.
</system>

<task>
Refine the section titled "${sectionTitle}" for a ${categoryName} document.

${COMPLEXITY_INSTRUCTIONS[complexityLevel]}

Word target: approximately ${wordTarget} words.
${isRetry ? `\nThis is retry iteration ${iterationNumber}. Pay special attention to the feedback from the previous attempt.` : 'This is the first attempt.'}
</task>

<transformation_action>
${ACTION_INSTRUCTIONS[transformationAction]}
</transformation_action>

<format_instruction>
Apply the following format when writing the section content:

${formatInstruction}
</format_instruction>

<current_section title="${sectionTitle}">
${sectionContent}
</current_section>${feedbackSection}

<output_format>
Respond with a single JSON object matching this exact schema. Do not include any text outside the JSON.

\`\`\`json
{
  "sectionId": "string — a kebab-case identifier derived from the section title (e.g., 'architecture-overview')",
  "title": "string — the refined section title (may be improved from the original)",
  "content": "string — the full refined section content, using the specified format",
  "formatUsed": "string — the format type applied (e.g., 'prose', 'bullet-list', 'table', 'mermaid')"
}
\`\`\`

### Field requirements:

**sectionId**: A kebab-case slug derived from the section title. Must be URL-safe and unique.

**title**: The section title. You may slightly improve it for clarity (e.g., "Auth" → "Authentication Design"), but do not radically change it.

**content**: The refined section content. Must:
- Follow the format instruction provided
- Match the word target (±20%)
- Use the tone appropriate for ${categoryName} documents
- Be complete and self-contained — a reader should understand this section without reading others

**formatUsed**: The format type you applied. Must match one of the standard section formats (prose, bullet-list, numbered-list, table, code-block, mermaid, etc.).
</output_format>

<instructions>
Follow these instructions precisely:

### Writing Process
1. Read the current section content carefully.
2. Review the transformation action — it tells you HOW to approach the rewrite.
3. Apply the format instruction — it tells you WHAT structure to use.
4. Write content at the depth specified by the complexity level.
5. ${isRetry ? 'Address EVERY point in the previous attempt feedback before anything else.' : 'Produce the best possible first draft.'}

### Category Conventions for ${categoryName}
- Use the tone and vocabulary appropriate for this document category.
- Follow conventions typical of ${categoryName} documents (e.g., business documents use stakeholder language; technical designs use engineering terminology).
- Ensure content serves the document's intended audience.

### Quality Criteria
- Content must be factually consistent with the original section (do not invent new requirements or features not implied by the source).
- All technical terms must be used correctly.
- The section must be self-contained — avoid forward references to "see below" without context.
- Word count must be within ±20% of the target (${Math.round(wordTarget * 0.8)}–${Math.round(wordTarget * 1.2)} words).
- Format must match the format instruction. If the instruction says "table", use a table. If it says "prose", write paragraphs.
${vars.fewShotExample ? `
<example_output>
The following is an example of HIGH QUALITY output for a different document. Use it as a reference for the level of detail and structure expected.

${vars.fewShotExample}
</example_output>` : ''}
</instructions>`;
}
