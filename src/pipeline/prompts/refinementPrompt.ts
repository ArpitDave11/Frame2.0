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
  readonly maxWords?: number;
  readonly previousFeedback?: string;
  readonly iterationNumber: number;
  readonly documentContext?: string;
  readonly fewShotExample?: string;
  readonly hint?: string;
  readonly globalAntiPatterns?: string;
}

// ─── Complexity Scaling ─────────────────────────────────────

const COMPLEXITY_INSTRUCTIONS: Record<ComplexityLevel, string> = {
  simple: `Complexity level: SIMPLE.
- Keep concise and focused on essentials. Every word must justify its existence.
- Use straightforward language; no jargon unless domain-essential.
- Aim for the LOWER end of the word target. Cut any sentence a reader would skip.`,

  moderate: `Complexity level: MODERATE.
- Balance thoroughness with brevity. No redundant points. If two bullets say the same thing, merge them.
- Include relevant details and context only where they change the reader's understanding.
- Aim for the MIDDLE of the word target range.`,

  complex: `Complexity level: COMPLEX.
- Be exhaustive in coverage but not in words. Say each thing once, precisely.
- Use tables and lists over prose paragraphs wherever structured data fits.
- Address edge cases and failure modes with specific values, not vague statements.
- Aim for the LOWER end of the word target. Density over length.`,
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

  // #10: Feedback moved to user prompt for recency bias (see refineSingleSection)
  // System prompt no longer contains iteration feedback
  const feedbackSection = '';

  return `<system>
You are an expert technical writer specializing in ${categoryName} documentation. Your task is to refine a single section of an epic document, producing polished, professional content that follows the specified format and category conventions.

You write with precision and clarity, adapting your tone and depth to the document category and complexity level.

BREVITY RULES (non-negotiable):
- No preamble. No postamble. No "Certainly", "Of course", "Sure", "Great".
- No "It is important to note that...", "This section outlines...", "In order to...".
- Lead with the answer. Every sentence must add information the previous one didn't.
- Prefer active voice. Cut filler adjectives ("robust", "comprehensive", "seamless", "cutting-edge").
- If a bullet point exceeds 15 words, split or shorten it.
</system>

<task>
Refine the section titled "${sectionTitle}" for a ${categoryName} document.

${COMPLEXITY_INSTRUCTIONS[complexityLevel]}

Word target: approximately ${wordTarget} words${vars.maxWords && vars.maxWords > 0 ? ` (hard maximum: ${vars.maxWords} words)` : ''}.
${vars.maxWords && vars.maxWords > 0 ? `- Aim for ${wordTarget} words. NEVER exceed ${vars.maxWords} words.\n` : ''}- If this section contains a Mermaid diagram or flowchart, there is NO word limit — focus on diagram completeness.
${isRetry ? `\nThis is retry iteration ${iterationNumber}. Pay special attention to the feedback from the previous attempt.` : 'This is the first attempt.'}
</task>

<transformation_action>
${ACTION_INSTRUCTIONS[transformationAction]}
</transformation_action>

<format_instruction>
Apply the following format when writing the section content:

${formatInstruction}
</format_instruction>
<gfm_formatting>
GITLAB MARKDOWN FORMATTING (mandatory for all sections):
- First line of every section: a **bold one-sentence TL;DR** summarizing the key point.
- Acceptance criteria use task-list syntax: - [ ] Criterion here
- Use **bold** for key terms, metrics, and system names on first mention.
- Use > blockquotes for important callouts, constraints, or warnings.
- Tables over prose for structured data (dependencies, risks, metrics, comparisons).
- Max 3 sentences per paragraph before a visual break (list, table, heading, or blank line).
- No walls of text. If a paragraph exceeds 3 sentences, refactor into a list or add sub-headings.
${complexityLevel === 'complex' ? '- For detailed content: wrap in <details><summary><strong>Section Name</strong></summary>\\n\\n[content]\\n\\n</details>' : ''}
</gfm_formatting>
${vars.hint ? `\n<section_hint>\n${vars.hint}\n</section_hint>` : ''}${vars.globalAntiPatterns ? `\n<anti_patterns>\n${vars.globalAntiPatterns}\n</anti_patterns>` : ''}
<current_section title="${sectionTitle}">
${sectionContent}
</current_section>${feedbackSection}
${vars.documentContext ? `
<document_context>
Below is the user's original input document. When generating or refining this section,
derive content from this document. Do not invent information not present or clearly
implied in this context.

${vars.documentContext}
</document_context>` : ''}

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
