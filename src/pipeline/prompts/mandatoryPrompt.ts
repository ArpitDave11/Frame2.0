/**
 * Stage 5 — Mandatory Sections prompt builder.
 *
 * Generates the prompt that instructs the AI to produce:
 * 1. An architecture diagram in Mermaid syntax
 * 2. User stories with acceptance criteria (count scaled by complexity)
 * 3. The assembled final epic document
 */

import type { ComplexityLevel } from '@/domain/types';

// ─── Prompt Version ─────────────────────────────────────────

export const PROMPT_VERSION = '1.0.0';

// ─── Input Interface ────────────────────────────────────────

export interface MandatoryPromptVars {
  readonly refinedSections: string;
  readonly classificationResult: string;
  readonly comprehensionSummary: string;
  readonly storyCountMin: number;
  readonly storyCountMax: number;
  readonly complexityLevel: ComplexityLevel;
  readonly existingEntities: readonly string[];
  readonly fewShotExample?: string;
}

// ─── Complexity Scaling ─────────────────────────────────────

const COMPLEXITY_INSTRUCTIONS: Record<ComplexityLevel, string> = {
  simple: `Complexity level: SIMPLE.
- Architecture diagram: a single flowchart or graph showing main components and their connections. Keep it concise (5–10 nodes).
- User stories: focus on core user-facing functionality. Keep acceptance criteria brief (2–3 per story).
- Epic assembly: include only required sections. Minimal metadata.`,

  moderate: `Complexity level: MODERATE.
- Architecture diagram: a detailed graph showing components, data stores, external integrations, and primary data flows. Include 10–20 nodes.
- User stories: cover both user-facing and key technical stories. Include 3–4 acceptance criteria per story.
- Epic assembly: include required and key optional sections. Standard metadata.`,

  complex: `Complexity level: COMPLEX.
- Architecture diagram: a comprehensive multi-layer diagram showing all components, services, data flows, external dependencies, and cross-cutting concerns. Include 15–30+ nodes.
- User stories: exhaustive coverage including edge cases, error handling stories, and non-functional requirement stories. Include 4–5 acceptance criteria per story.
- Epic assembly: include all sections. Comprehensive metadata with cross-references.`,
};

// ─── Prompt Builder ─────────────────────────────────────────

export function buildMandatoryPrompt(vars: MandatoryPromptVars): string {
  const {
    refinedSections,
    classificationResult,
    comprehensionSummary,
    storyCountMin,
    storyCountMax,
    complexityLevel,
    existingEntities,
  } = vars;

  const entityList = existingEntities
    .map((e, i) => `${i + 1}. ${e}`)
    .join('\n');

  return `<system>
You are an expert software architect and requirements engineer. Your task is to generate mandatory epic components: an architecture diagram in Mermaid syntax, a set of user stories with acceptance criteria, and an assembled epic document. You combine deep technical knowledge with clear, stakeholder-friendly writing.
</system>

<task>
Generate the mandatory sections for this epic document. You must produce three outputs:
1. An architecture diagram in valid Mermaid syntax
2. ${storyCountMin}–${storyCountMax} user stories with acceptance criteria
3. An assembled epic combining all refined sections with the generated content

${COMPLEXITY_INSTRUCTIONS[complexityLevel]}
</task>

<comprehension_context>
Stage 1 comprehension analysis (entities, requirements, gaps, risks):

${comprehensionSummary}
</comprehension_context>

<classification_context>
Stage 2 classification result:

${classificationResult}
</classification_context>

<refined_content>
Stage 4 refined sections (the current state of the epic content):

${refinedSections}
</refined_content>

<known_entities>
Entities discovered during comprehension (use these in the architecture diagram):

${entityList}
</known_entities>

<output_format>
Respond with a single JSON object matching this exact schema. Do not include any text outside the JSON.

\`\`\`json
{
  "architectureDiagram": "string — valid Mermaid diagram syntax (graph TD, flowchart, or sequence diagram)",
  "userStories": [
    {
      "id": "string — unique story identifier (e.g., 'US-001')",
      "title": "string — concise story title",
      "asA": "string — the user role",
      "iWant": "string — the desired capability",
      "soThat": "string — the business benefit",
      "acceptanceCriteria": [
        "string — a specific, testable acceptance criterion"
      ],
      "priority": "high | medium | low"
    }
  ],
  "assembledEpic": {
    "title": "string — the epic title",
    "sections": [
      {
        "id": "string — section identifier",
        "title": "string — section title",
        "content": "string — section content (from refined sections + generated content)"
      }
    ],
    "metadata": {
      "totalSections": 0,
      "totalStories": 0,
      "diagramType": "string — the Mermaid diagram type used",
      "generatedAt": "string — ISO timestamp"
    }
  }
}
\`\`\`

### Field requirements:

**architectureDiagram**: Must be valid Mermaid syntax that renders without errors. The diagram string should start with a diagram type declaration (e.g., \`graph TD\`, \`flowchart LR\`, \`sequenceDiagram\`).

**userStories**: Generate exactly ${storyCountMin}–${storyCountMax} stories. Each story must:
- Have a unique sequential ID (US-001, US-002, ...)
- Follow the format: As a [role], I want [capability], So that [benefit]
- Include 3–5 testable acceptance criteria
- Be assigned a priority (high/medium/low)
- Trace back to at least one extracted requirement from the comprehension stage

**assembledEpic**: Combine all refined sections with the generated architecture diagram and user stories into a complete epic document. The sections array should include all refined sections in order, plus new sections for the diagram and stories.
</output_format>

<instructions>
Follow these instructions precisely:

### Architecture Diagram Generation
1. Review the known entities and their relationships from the comprehension analysis.
2. Choose the most appropriate Mermaid diagram type:
   - \`graph TD\` or \`flowchart TD\` for system architecture (top-down component view)
   - \`flowchart LR\` for data flow or process pipelines (left-to-right)
   - \`sequenceDiagram\` for interaction-heavy designs (API calls, message flows)
3. Include ALL known entities as nodes in the diagram.
4. Show relationships and data flows between entities using labeled edges.
5. Use Mermaid subgraphs to group related components (e.g., "Frontend", "Backend", "External Services").
6. Ensure the diagram is syntactically valid:
   - Node IDs must not contain spaces (use camelCase or underscores)
   - Edge labels should be concise (2–4 words)
   - Use proper Mermaid arrow syntax: \`-->\`, \`-.->>\`, \`==>>\`
   - Wrap node labels in square brackets: \`A[Service Name]\`

### User Story Generation
1. Derive stories from the extracted requirements in the comprehension analysis.
2. Each story must follow the template:
   - **As a** [specific role — not just "user", be specific: "project manager", "API consumer", "system administrator"]
   - **I want** [a specific, implementable capability]
   - **So that** [a measurable business benefit]
3. Write 3–5 acceptance criteria per story. Each criterion must be:
   - Testable (can be verified as pass/fail)
   - Specific (includes concrete values, states, or behaviors)
   - Independent (does not depend on other criteria)
4. Assign priority based on:
   - **high**: Core functionality, blocking dependencies, security requirements
   - **medium**: Important features, performance requirements, integration points
   - **low**: Nice-to-have features, cosmetic improvements, future enhancements
5. Every story must trace back to at least one requirement from the comprehension stage. If a requirement has no story, create one.
6. Generate exactly ${storyCountMin}–${storyCountMax} stories. Do not exceed or fall below this range.

### Epic Assembly
1. Collect all refined sections from the input.
2. Add the architecture diagram as a dedicated section (title: "Architecture Overview" or similar).
3. Add user stories as a dedicated section (title: "User Stories" or similar).
4. Order sections logically: overview → requirements → architecture → design → stories → testing → deployment.
5. Populate metadata: totalSections, totalStories, diagramType, generatedAt.

### Quality Criteria
- The Mermaid diagram must be syntactically valid and renderable.
- Every user story must have a unique ID and 3–5 acceptance criteria.
- Story count must be within the specified range (${storyCountMin}–${storyCountMax}).
- Every extracted requirement should be covered by at least one story.
- The assembled epic must include ALL refined sections plus the generated sections.
- Metadata must be accurate (correct counts, correct diagram type).
${vars.fewShotExample ? `
<example_output>
The following is an example of HIGH QUALITY output for a different document. Use it as a reference for the level of detail and structure expected.

${vars.fewShotExample}
</example_output>` : ''}
</instructions>`;
}
