/**
 * Stage 6 — Validation Gate prompt builder.
 *
 * Generates the prompt that instructs the AI to validate a completed epic
 * through three lenses: requirements traceability, self-audit scoring,
 * and failure pattern detection. Produces actionable feedback for the
 * retry loop if the score falls below the passing threshold.
 */

import type { ComplexityLevel } from '@/domain/types';

// ─── Prompt Version ─────────────────────────────────────────

export const PROMPT_VERSION = '1.0.0';

// ─── Input Interface ────────────────────────────────────────

export interface ValidationPromptVars {
  readonly assembledEpic: string;
  readonly originalRequirements: string;
  readonly originalEntities: string;
  readonly userStories: string;
  readonly classificationResult: string;
  readonly passingScore: number;
  readonly complexityLevel: ComplexityLevel;
  readonly iterationNumber: number;
  readonly fewShotExample?: string;
}

// ─── Complexity Scaling ─────────────────────────────────────

const COMPLEXITY_INSTRUCTIONS: Record<ComplexityLevel, string> = {
  simple: `Complexity level: SIMPLE. Passing threshold: lenient.
- Traceability: verify core requirements only. Minor gaps in low-priority requirements are acceptable.
- Audit: focus on the most critical checks. A section that covers basics adequately passes.
- Failure detection: flag only critical and major patterns. Minor issues can be noted but should not fail the validation.`,

  moderate: `Complexity level: MODERATE. Passing threshold: balanced.
- Traceability: verify all explicit requirements. Partial coverage of implied requirements is acceptable.
- Audit: apply all checks with balanced expectations. Sections need clear content with reasonable depth.
- Failure detection: flag critical, major, and significant minor patterns.`,

  complex: `Complexity level: COMPLEX. Passing threshold: strict.
- Traceability: verify ALL requirements — explicit, implicit, and inferred. Every requirement must have full or strong partial coverage.
- Audit: apply all checks with high expectations. Sections must be thorough, precise, and well-structured.
- Failure detection: flag ALL patterns regardless of severity. At this complexity, even minor issues compound.`,
};

// ─── Prompt Builder ─────────────────────────────────────────

export function buildValidationPrompt(vars: ValidationPromptVars): string {
  const {
    assembledEpic,
    originalRequirements,
    originalEntities,
    userStories,
    classificationResult,
    passingScore,
    complexityLevel,
    iterationNumber,
  } = vars;

  const isRetry = iterationNumber > 0;

  return `<system>
You are an expert quality assurance analyst specializing in software engineering documentation. Your task is to validate a completed epic document against its original requirements, perform a comprehensive self-audit, and detect common failure patterns. You are rigorous, specific, and constructive — your feedback drives automated improvement cycles.
</system>

<task>
Validate the following epic document. Perform three types of analysis:
1. **Requirements traceability** — does the epic cover every extracted requirement?
2. **Self-audit scoring** — rate the epic on 12 quality dimensions, producing an overall 0–100 score
3. **Failure pattern detection** — identify specific structural or content problems

The passing score threshold is **${passingScore}**. If the overall score is below ${passingScore}, you MUST produce actionable feedback that the refinement stage can use to fix the issues.

${COMPLEXITY_INSTRUCTIONS[complexityLevel]}

${isRetry ? `This is validation iteration ${iterationNumber}. Previous iterations did not meet the passing threshold. Be especially thorough in checking whether prior feedback was addressed.` : 'This is the first validation pass.'}
</task>

<epic_document>
${assembledEpic}
</epic_document>

<original_requirements>
Extracted requirements from Stage 1 comprehension (each has an ID like REQ-001):

${originalRequirements}
</original_requirements>

<original_entities>
Entities discovered during comprehension:

${originalEntities}
</original_entities>

<user_stories>
Generated user stories:

${userStories}
</user_stories>

<classification_context>
Document classification:

${classificationResult}
</classification_context>

<output_format>
Respond with a single JSON object matching this exact schema. Do not include any text outside the JSON.

\`\`\`json
{
  "traceabilityMatrix": [
    {
      "requirementId": "string — the requirement ID (e.g., 'REQ-001')",
      "coveredBy": ["string — section IDs or story IDs that address this requirement"],
      "coverage": "full | partial | missing"
    }
  ],
  "auditChecks": [
    {
      "checkName": "string — name of the quality check",
      "passed": true,
      "score": 8,
      "details": "string — specific explanation of what was found"
    }
  ],
  "overallScore": 85,
  "passed": true,
  "detectedFailures": [
    {
      "pattern": "string — name of the failure pattern detected",
      "severity": "critical | major | minor",
      "recommendation": "string — specific, actionable fix (not vague advice)"
    }
  ],
  "feedback": [
    "string — specific, actionable improvement instruction for the refinement stage"
  ]
}
\`\`\`

### Field requirements:

**traceabilityMatrix**: One entry per extracted requirement. Map each requirement ID to the section(s) and/or story ID(s) that address it. Coverage levels:
- \`full\`: requirement is completely addressed with clear acceptance criteria or implementation details
- \`partial\`: requirement is mentioned but lacks depth, specificity, or complete coverage
- \`missing\`: requirement has no corresponding coverage in the epic

**auditChecks**: Run ALL 12 quality checks listed below. Each check is scored 0–10 and marked pass/fail (pass = score >= 7).

**overallScore**: Weighted average of all audit check scores, normalized to 0–100. Formula: (sum of all check scores / (12 × 10)) × 100, rounded to nearest integer.

**passed**: \`true\` if overallScore >= ${passingScore}, \`false\` otherwise.

**detectedFailures**: List of specific failure patterns found. Empty array only if genuinely no patterns detected.

**feedback**: If \`passed\` is \`false\`, this array MUST contain specific, actionable instructions. If \`passed\` is \`true\`, this array should be empty or contain optional improvement suggestions.
</output_format>

<audit_checks>
Perform ALL 12 of the following quality checks. Score each 0–10.

### 1. Section Completeness
Are all required sections present and substantive? Score 0 if critical sections are missing, 10 if every section is thorough.

### 2. Requirements Coverage
What percentage of extracted requirements are addressed? Score = (covered requirements / total requirements) × 10.

### 3. Internal Consistency
Do sections contradict each other? Are terms used consistently? Score 10 if fully consistent, deduct for each contradiction found.

### 4. Specificity
Does the epic use specific, measurable language? Score 0 for vague generalities ("improve performance"), 10 for precise specifications ("response time < 200ms at p99").

### 5. Actionability
Could a development team implement from this epic without additional clarification? Score based on how many questions a team would need to ask.

### 6. Technical Accuracy
Are technical details correct? Are architecture patterns appropriate? Are technology choices justified? Score 0 for fundamental errors, 10 for technically sound content.

### 7. User Story Quality
Do stories follow the As a/I want/So that format? Are acceptance criteria testable and specific? Score based on story completeness and quality.

### 8. Architecture Diagram Quality
Is the Mermaid diagram valid, comprehensive, and aligned with the described architecture? Score 0 if missing or broken, 10 if thorough and correct.

### 9. Risk Coverage
Are risks identified and mitigation strategies provided? Score based on risk identification completeness.

### 10. Edge Case Coverage
Are error handling, failure modes, and boundary conditions addressed? Score based on how many edge cases are covered.

### 11. Stakeholder Clarity
Is the document accessible to its intended audience? Technical docs should be precise; business docs should be clear to non-engineers.

### 12. Format Compliance
Does the document follow the category template format? Are sections in the expected order? Are format instructions followed?
</audit_checks>

<failure_patterns>
Check for these specific failure patterns:

### Critical Patterns
- **Orphan Requirements**: Requirements from Stage 1 that have zero coverage in the epic or user stories.
- **Missing Error Handling**: Sections that describe functionality but omit error cases, timeouts, retry logic, or failure recovery.
- **Undefined Dependencies**: References to external systems, APIs, or services that are mentioned but never specified.

### Major Patterns
- **Vague Acceptance Criteria**: User story acceptance criteria that cannot be objectively tested (e.g., "system should be fast" instead of "response time < 200ms").
- **Scope Creep**: Content that goes beyond the original requirements without justification.
- **Circular Dependencies**: Components or stories that depend on each other in a cycle.
- **Missing Non-Functional Requirements**: No mention of performance, security, scalability, or observability requirements.

### Minor Patterns
- **Inconsistent Terminology**: Same concept referred to by different names in different sections.
- **Orphan Sections**: Sections that don't connect to any requirement or user story.
- **Missing Cross-References**: Sections that reference "see above" or "as mentioned" without specific section references.
- **Placeholder Content**: TODO markers, placeholder text, or stub sections with minimal content.
</failure_patterns>

<feedback_instructions>
If the overall score is below the passing threshold of ${passingScore}, you MUST generate actionable feedback.

### Feedback Quality Requirements
Each feedback item must be:
1. **Specific**: Reference a specific section, story, or requirement by ID or title.
2. **Actionable**: Describe exactly what to change, add, or remove.
3. **Prioritized**: Address the highest-impact issues first.

### Examples of GOOD feedback:
- "Section 'Architecture Overview' (sec-arch) lacks error handling for the payment timeout case — add a failure recovery flow diagram showing retry logic and dead letter queue handling."
- "User story US-003 acceptance criteria #2 says 'system responds quickly' — replace with a measurable criterion like 'API response time < 500ms at p95 under 1000 concurrent requests'."
- "REQ-007 (audit logging) has zero coverage — add a dedicated 'Audit & Compliance' section covering log format, retention policy, and access controls."
- "The Mermaid diagram is missing the NotificationService node — add it with edges to the EventBus and UserService."

### Examples of BAD feedback (DO NOT produce these):
- "Improve the quality of the document." (not specific)
- "Add more detail." (not actionable)
- "The epic needs work." (not useful)
- "Consider improving error handling." (not specific enough — which section? which error case?)
</feedback_instructions>

<instructions>
Follow these instructions precisely:

### Validation Process
1. Read the full epic document carefully.
2. Perform requirements traceability: match each requirement ID to covering sections/stories.
3. Run all 12 audit checks, scoring each 0–10.
4. Scan for failure patterns in the content.
5. Calculate the overall score.
6. If score < ${passingScore}: generate specific, actionable feedback targeting the weakest areas.
7. If score >= ${passingScore}: set passed to true, feedback array can be empty.

### Quality Criteria
- Every requirement ID must appear in the traceability matrix.
- All 12 audit checks must be present in the output.
- The overall score must be mathematically consistent with individual check scores.
- Detected failures must cite specific locations in the document.
- Feedback must be actionable — see examples above.
- Do not inflate scores to pass the threshold. Be honest and rigorous.
${vars.fewShotExample ? `
<example_output>
The following is an example of HIGH QUALITY output for a different document. Use it as a reference for the level of detail and structure expected.

${vars.fewShotExample}
</example_output>` : ''}
</instructions>`;
}
