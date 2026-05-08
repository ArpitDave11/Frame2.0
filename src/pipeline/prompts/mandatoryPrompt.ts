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
  readonly sla?: number;
  readonly includeStoryPoints: boolean;
  readonly diagramPrimaryType?: string;
  readonly diagramPrimaryPurpose?: string;
  readonly diagramSecondaryType?: string;
  readonly diagramSecondaryPurpose?: string;
  readonly categoryName?: string;
}

// ─── Complexity Scaling ─────────────────────────────────────

const COMPLEXITY_INSTRUCTIONS: Record<ComplexityLevel, string> = {
  simple: `Complexity level: SIMPLE.
- Architecture diagram: single flowchart, main components only. STRICT LIMIT: 4–6 nodes. Do NOT exceed 6.
- User stories: core user-facing functionality only. 2–3 acceptance criteria per story, each ≤20 words.
- Epic assembly: required sections only. No filler metadata.`,

  moderate: `Complexity level: MODERATE.
- Architecture diagram: components, data stores, external integrations, primary data flows. STRICT LIMIT: 6–8 nodes. Do NOT exceed 8.
- User stories: user-facing and key technical stories. 3–4 acceptance criteria per story, each ≤20 words.
- Epic assembly: required and key optional sections. Terse metadata.`,

  complex: `Complexity level: COMPLEX.
- Architecture diagram: comprehensive multi-layer showing all components, services, flows, dependencies. STRICT LIMIT: 8–12 nodes. Do NOT exceed 12.
- User stories: exhaustive coverage including edge cases and non-functional requirements. 4–5 acceptance criteria per story, each ≤20 words.
- Epic assembly: all sections. Dense metadata, no padding.`,
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
    sla,
    includeStoryPoints,
    diagramPrimaryType,
    diagramPrimaryPurpose,
    diagramSecondaryType,
    diagramSecondaryPurpose,
    categoryName,
  } = vars;

  const slaInstructions = sla ? `
### Story Point Allocation (SLA Override Active)
An SLA of ${sla} business days has been specified. This means:
- The total story point capacity for this epic is ${sla} points.
- Assign each story a point value using the Fibonacci scale: 1, 2, 3, or 5.
- The maximum story point value for any single story is 5.
- The SUM of all story points across all stories MUST equal exactly ${sla}.
- Distribute stories and points so that the total matches the SLA capacity.
- Larger, more complex stories should receive higher points (3 or 5).
- Smaller, well-defined stories should receive lower points (1 or 2).
` : includeStoryPoints ? `
### Story Point Estimation
Assign each story a point value using the Fibonacci scale: 1, 2, 3, or 5.
- The maximum story point value for any single story is 5.
- Larger, more complex stories should receive higher points (3 or 5).
- Smaller, well-defined stories should receive lower points (1 or 2).
` : '';

  const testCaseInstructions = `
### Test Case Generation
For EVERY user story, generate 2–5 functional test cases in the "testCases" array.
Each test case must:
- Be a specific, executable test scenario (Given/When/Then or action/expected-result format)
- Cover the primary functionality described in the story
- Include at least one positive case and one edge case or negative case
- Be independent and self-contained (no dependency on other test cases)
- Map to at least one acceptance criterion from the story
`;

  const entityList = existingEntities
    .map((e, i) => `${i + 1}. ${e}`)
    .join('\n');

  // ─── Conditional Diagram Styling ──────────────────────────
  const isFlowchartPrimary = !diagramPrimaryType || diagramPrimaryType.startsWith('flowchart') || diagramPrimaryType.startsWith('graph');
  const isFlowchartSecondary = !diagramSecondaryType || diagramSecondaryType.startsWith('flowchart') || diagramSecondaryType.startsWith('graph');

  const flowchartStylingBlock = `### Diagram Styling (Required for flowchart/graph diagrams)

#### Node Shapes by Component Type
Use different Mermaid node shapes to convey meaning:
- Services/APIs: \`ID["Label"]\` (rectangle)
- Databases/Storage: \`ID[("Label")]\` (cylinder)
- External/3rd-Party: \`ID{{"Label"}}\` (hexagon)
- Events/Triggers: \`ID(("Label"))\` (circle)
- Processes: \`ID("Label")\` (rounded rectangle)

#### Semantic Colors via classDef (Paul Tol Light — WCAG AA, colorblind-safe)
Define these classDef classes at the top of every flowchart/graph diagram, then apply them:

\`\`\`
classDef service fill:#77AADD,stroke:#4477AA,stroke-width:2px,color:#1A1A2E
classDef database fill:#DDCC77,stroke:#AA9944,stroke-width:2px,color:#1A1A2E
classDef external fill:#B3B3B3,stroke:#888888,stroke-width:1.5px,color:#1A1A2E
classDef queue fill:#EE8866,stroke:#C56040,stroke-width:1.5px,color:#1A1A2E
classDef cache fill:#44BB99,stroke:#228877,stroke-width:1.5px,color:#1A1A2E
classDef security fill:#FFAABB,stroke:#CC7799,stroke-width:1.5px,color:#1A1A2E
classDef infra fill:#8DA0CB,stroke:#6070A8,stroke-width:1.5px,color:#1A1A2E
\`\`\`

Apply classes using the \`:::\` shorthand: \`API["API Gateway"]:::service\`

These same classDef definitions also serve as the process flow palette. Map roles consistently:
- Primary services/components: \`:::service\` (steel blue)
- Supporting services/APIs: \`:::infra\` (lavender)
- Databases/caches/storage: \`:::database\` (sand)
- Decision diamonds: \`:::cache\` (mint green)
- Error/failure paths: \`:::queue\` (coral)

#### Arrow Styling via linkStyle
After ALL connections, add linkStyle commands for colored arrows. Index is 0-based, counting arrows in order of appearance:
- User/client flows: \`linkStyle 0 stroke:#4477AA,stroke-width:2.5px\`
- Service-to-service: \`linkStyle 1 stroke:#6070A8,stroke-width:2px\`
- Database calls: \`linkStyle 2 stroke:#AA9944,stroke-width:2px\`
- Async/events: \`linkStyle 3 stroke:#228877,stroke-width:2px,stroke-dasharray:5\`
- External calls: \`linkStyle 4 stroke:#CC7799,stroke-width:2px\`

Apply the appropriate color based on what each arrow represents. You do not need to style every arrow — focus on the most important 5-10 connections.

**IMPORTANT:** All text inside nodes MUST be dark (#1A1A2E). Never use \`color:#fff\` or \`color:#ffffff\` — all fills are medium-lightness pastels designed for dark text.`;

  const nonFlowchartStylingBlock = (diagramType: string) =>
    `### Diagram Styling
For ${diagramType} diagrams: Do NOT use classDef, linkStyle, or node shape syntax (rectangles, cylinders, hexagons).
These are flowchart-only features and will cause "Syntax error in text" rendering failures.
Use participant/state/note syntax as appropriate for ${diagramType}.
Theming is applied automatically by the system.`;

  let diagramStylingSection: string;
  if (isFlowchartPrimary && isFlowchartSecondary) {
    diagramStylingSection = flowchartStylingBlock;
  } else if (!isFlowchartPrimary && !isFlowchartSecondary) {
    diagramStylingSection = nonFlowchartStylingBlock(diagramPrimaryType ?? 'non-flowchart');
  } else {
    // Mixed: one flowchart, one not — include flowchart styling with a warning for the non-flowchart diagram
    const parts: string[] = [flowchartStylingBlock];
    if (!isFlowchartPrimary) {
      parts.push(`\n\n**Primary diagram (${diagramPrimaryType}):** ` + nonFlowchartStylingBlock(diagramPrimaryType!));
    }
    if (!isFlowchartSecondary) {
      parts.push(`\n\n**Secondary diagram (${diagramSecondaryType}):** ` + nonFlowchartStylingBlock(diagramSecondaryType!));
    }
    diagramStylingSection = parts.join('');
  }

  return `<system>
You are an expert software architect and requirements engineer. Your task is to generate mandatory epic components: an architecture diagram in Mermaid syntax, a set of user stories with acceptance criteria, and an assembled epic document. You combine deep technical knowledge with clear, stakeholder-friendly writing.

BREVITY RULES (non-negotiable):
- No preamble. No postamble. No acknowledgments.
- Every sentence must add information the previous one didn't.
- Acceptance criteria: each must be ≤20 words and testable.
- User story titles: ≤10 words.
- Cut filler adjectives ("robust", "comprehensive", "seamless").
</system>

<task>
Generate the mandatory sections for this epic document. You must produce four outputs:
1. A primary architecture diagram in valid Mermaid syntax
2. A secondary process/behavioral diagram in valid Mermaid syntax
3. ${storyCountMin}–${storyCountMax} user stories with acceptance criteria
4. An assembled epic combining all refined sections with the generated content

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
  "architectureDiagram": "string — primary diagram in valid Mermaid syntax using ${diagramPrimaryType ?? 'flowchart LR'}",
  "processFlowDiagram": "string — secondary diagram in valid Mermaid syntax using ${diagramSecondaryType ?? 'flowchart TD'}",
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
      "priority": "high | medium | low",
      "storyPoints": "number — Fibonacci estimate (1, 2, 3, or 5). Required when SLA is specified or story points are enabled.",
      "testCases": [
        "string — a specific, executable test case for this story"
      ]
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

**processFlowDiagram**: Must be valid Mermaid syntax. This is a SEPARATE behavioral/process diagram. Start with a diagram type declaration. If you cannot generate a meaningful secondary diagram, return an empty string "".

**userStories**: Generate exactly ${storyCountMin}–${storyCountMax} stories. Each story must:
- Have a unique sequential ID (US-001, US-002, ...)
- Follow the format: As a [role], I want [capability], So that [benefit]
- Include 3–5 testable acceptance criteria
- Be assigned a priority (high/medium/low)
- Trace back to at least one extracted requirement from the comprehension stage

**assembledEpic**: Generate ONLY the architecture diagram and user stories sections. Do NOT repeat or include sections that were already refined in earlier stages.
</output_format>

<instructions>
Follow these instructions precisely:

### Diagram Generation${categoryName ? ` (Category: ${categoryName})` : ''}

**Primary Diagram → goes into the "architectureDiagram" JSON field:**
This diagram will be displayed under the heading "Deployment Architecture — Component and Flow Diagram".
Generate a \`${diagramPrimaryType ?? 'flowchart LR'}\` diagram.
Purpose: ${diagramPrimaryPurpose ?? 'System architecture showing main components and connections'}
- This MUST be a STRUCTURAL / ARCHITECTURE diagram — components, services, data stores, connections.
- Include ALL known entities from the comprehension analysis.
- Do NOT put a process flow or workflow here — that goes in processFlowDiagram.

**Secondary Diagram → goes into the "processFlowDiagram" JSON field:**
This diagram will be displayed under the heading "Process Flow".
Generate a \`${diagramSecondaryType ?? 'flowchart TD'}\` diagram.
Purpose: ${diagramSecondaryPurpose ?? 'Primary workflow with decision points'}
- This MUST be a BEHAVIORAL / PROCESS diagram — steps, decisions, outcomes, sequences.
- Do NOT put architecture or component layout here — that goes in architectureDiagram.
- This is a SEPARATE diagram — do NOT merge it with the primary diagram.

**Rules for BOTH diagrams:**
1. Review the known entities and their relationships from the comprehension analysis.
2. Include ALL known entities as nodes in the diagram.
3. Show relationships and data flows between entities using labeled edges.
4. Use Mermaid subgraphs to group related components (e.g., "Frontend", "Backend", "External Services").
5. Ensure the diagram is syntactically valid:
   - Node IDs must not contain spaces (use camelCase or underscores)
   - Edge labels MUST use pipe syntax: \`A -->|"label text"| B\` — NEVER colon syntax \`A --> B: label\`
   - Arrow types: \`-->\` (solid), \`-.->>\` (dashed), \`==>>\` (thick)
   - Wrap node labels in square brackets: \`A[Service Name]\`
   - Subgraph IDs must be safe identifiers (no spaces or special chars): \`subgraph safeId["Display Name With & Symbols"]\`
   - NEVER use unicode arrows (→, ←, ↔) inside node or edge labels — use plain text "to", "from"
   - Edge labels MUST use ONLY pipe syntax: \`-->|"text"|\`. NEVER use \`--"text"-->\` or \`A --> B: text\`.
   - Do NOT include \`%%{init:}\` theme blocks — theming is applied automatically by the system.
   - CRITICAL: If a node label contains parentheses, slashes, ampersands, colons, or any other special characters, you MUST wrap the label text in double quotes inside the brackets. This prevents Mermaid syntax errors.

     CORRECT:
       soc["SOC 2 / ISO 27001"]
       e3["E3 (Epic Management)"]
       api["REST API: v2"]
       ci["CI/CD Pipeline"]
       api -->|"REST/JSON"| db[("Database")]
       subgraph authLayer["Auth & Security"]

     WRONG (will break rendering):
       soc[SOC 2 / ISO 27001]
       e3[E3 (Epic Management)]
       api[REST API: v2]
       api --> db: REST/JSON
       api --"REST/JSON"--> db
       subgraph Auth & Security

${diagramStylingSection}

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
${slaInstructions}${testCaseInstructions}
### Epic Assembly

**Title Generation**: If the input title is empty or not provided, generate a concise, professional title for this epic (5–10 words maximum). The title should capture the core purpose of the project in a way suitable for a GitLab epic title. Do NOT use the first sentence of the content as the title — synthesize a proper short title.

1. Generate only the architecture diagram and user stories content. Do NOT repeat or include sections that were already refined by earlier pipeline stages.
2. The "assembledEpic.sections" field in your JSON output should be empty ([]). The system will merge refined sections automatically.
3. Focus entirely on producing a high-quality "architectureDiagram" and "userStories" in the output.
4. Populate metadata: totalSections (0 is fine), totalStories, diagramType, generatedAt.

### Epic Assembly Formatting (mandatory)
When generating the assembledEpic sections array or any markdown content:
- H1 (#) for epic title only — one per document.
- H2 (##) with emoji prefix for each major section:
  ## 🎯 Overview, ## ✅ Acceptance Criteria, ## 📦 Scope & Non-Scope,
  ## ⚠️ Risks, ## 🔗 Dependencies, ## 🏁 Definition of Done,
  ## 📋 Requirements, ## 🏗️ Architecture, ## 👤 User Stories,
  ## 📊 Success Metrics, ## 🔄 Process Flow
- H3 (###) for user stories: ### US-001: Title
- Never skip heading levels (no ## → ####).
- Separate major sections with --- horizontal rules.
- Place architecture diagram immediately after Overview, before detailed sections.

### Quality Criteria
- The Mermaid diagram must be syntactically valid and renderable.
- Every user story must have a unique ID and 3–5 acceptance criteria.
- Story count must be within the specified range (${storyCountMin}–${storyCountMax}).
- Every extracted requirement should be covered by at least one story.
- The assembled epic must NOT duplicate sections already present in the refined content.
- Metadata must be accurate (correct counts, correct diagram type).
- Every user story must include 2–5 test cases in the "testCases" array.
${sla ? `- Total story points must equal exactly ${sla}.` : ''}
${includeStoryPoints || sla ? '- Every story must have a storyPoints value (1, 2, 3, or 5).' : ''}
${vars.fewShotExample ? `
<example_output>
The following is an example of HIGH QUALITY output for a different document. Use it as a reference for the level of detail and structure expected.

${vars.fewShotExample}
</example_output>` : ''}
</instructions>`;
}
