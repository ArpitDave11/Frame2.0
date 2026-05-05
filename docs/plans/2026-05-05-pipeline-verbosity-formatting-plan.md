# Pipeline Verbosity & Formatting Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce epic output verbosity by 50% and enforce GitLab-native visual hierarchy across all 10 category templates and 6 prompt builders.

**Architecture:** Cut word targets in categoryTemplates.json by 50%, rewrite complexity scaling in all prompt builders to enforce conciseness, add GFM formatting directives to Stage 4/5 prompts, add a 13th "Conciseness" audit check to Stage 6, and add a deterministic `cleanupMarkdown()` post-processor in the action layer.

**Tech Stack:** TypeScript, JSON (category templates), Vitest

---

### Task 1: Cut categoryTemplates.json word targets by 50%

**Files:**
- Modify: `src/services/templates/categoryTemplates.json`

**Step 1: Apply 50% cuts to all word targets**

For EVERY category in the JSON, halve all `target` and `max` values in `requiredSections` and `optionalSections`. Also halve `totalWordTarget.min` and `totalWordTarget.max`. Leave values that are 0 unchanged (those are format-driven sections like tables and diagrams).

Specific cuts per category:

**general:**
- totalWordTarget: 1500→750, 6000→3000
- Overview: target 200→100, max 400→200
- Goals & Non-Goals: target 200→100, max 400→200
- Requirements: target 300→150, max 600→300
- Scope & Non-Scope: target 150→75, max 300→150
- Success Metrics: target 150→75, max 300→150
- Assumptions & Constraints: target 100→50, max 200→100
- User Stories: target 400→200, max 1200→600
- Architecture Overview (optional): target 200→100
- Risks (optional): target 150→75, max 300→150
- Dependencies (optional): target 100→50, max 200→100
- Timeline (optional): target 100→50, max 200→100
- Open Questions (optional): target 100→50, max 200→100

**technical_design:**
- totalWordTarget: 2000→1000, 5000→2500
- Objective: target 150→75, max 300→150
- Context & Motivation: target 200→100, max 600→300
- Goals & Non-Goals: target 200→100, max 400→200
- Architecture Overview: target 400→200, max 800→400
- Technical Requirements: target 300→150, max 600→300
- Proposed Design: target 500→250, max 1500→750
- Alternatives Considered: target 200→100, max 800→400
- Cross-Cutting Concerns: target 200→100, max 400→200
- Implementation Plan: target 300→150, max 600→300
- User Stories: target 400→200, max 800→400
- All optional sections: halve target and max similarly

**business_requirement:**
- totalWordTarget: 1500→750, 3500→1750
- Executive Summary: target 200→100, max 400→200
- Goals & Non-Goals: target 200→100, max 400→200
- Business Context & Problem Statement: target 250→125, max 500→250
- Scope & Non-Scope: target 200→100, max 400→200
- Requirements: target 300→150, max 600→300
- Process Flow: target 200→100
- Success Metrics: target 150→75, max 300→150
- User Stories: target 300→150, max 600→300
- All optional sections: halve similarly

**feature_specification:**
- totalWordTarget: 1500→750, 3500→1750
- Problem Statement: target 150→75, max 300→150
- Goals & Non-Goals: target 200→100, max 400→200
- User Personas: target 150→75, max 300→150
- Functional Requirements: target 300→150, max 600→300
- Scope & Non-Scope: target 100→50, max 250→125
- User Flows: target 200→100
- Edge Cases & Error Handling: target 200→100, max 400→200
- Analytics & Success Metrics: target 100→50, max 200→100
- User Stories: target 400→200, max 800→400
- All optional sections: halve similarly

**api_specification:**
- totalWordTarget: 2000→1000, 5000→2500
- Objective: target 100→50, max 200→100
- Overview & Authentication: target 200→100, max 400→200
- Goals & Non-Goals: target 150→75, max 300→150
- Endpoints: target 500→250, max 1500→750
- Pagination & Rate Limiting: target 150→75, max 350→175
- User Stories: target 300→150, max 600→300
- Webhooks & Events: target 200→100, max 500→250
- Idempotency: target 100→50, max 200→100
- Versioning & Deprecation: target 100→50, max 200→100
- All optional sections: halve similarly

**infrastructure_design:**
- totalWordTarget: 2000→1000, 5000→2500
- Objective: target 100→50, max 200→100
- Goals & Non-Goals: target 200→100, max 400→200
- Compute & Storage: target 250→125, max 500→250
- Networking & Security: target 200→100, max 400→200
- Monitoring & Alerting: target 200→100, max 400→200
- Disaster Recovery: target 200→100, max 400→200
- User Stories: target 300→150, max 600→300
- All optional sections: halve similarly

**migration_plan:**
- totalWordTarget: 2000→1000, 4000→2000
- Objective: target 150→75, max 300→150
- Goals & Non-Goals: target 200→100, max 400→200
- Current State: target 200→100, max 400→200
- Target State: target 200→100, max 400→200
- Migration Strategy: target 100→50, max 300→150
- Scope & Non-Scope: target 100→50, max 200→100
- Cutover Plan: target 200→100, max 600→300
- Rollback Plan: target 150→75, max 400→200
- Validation Criteria: target 150→75, max 300→150
- User Stories: target 300→150, max 600→300
- All optional sections: halve similarly

**integration_spec:**
- totalWordTarget: 1800→900, 4000→2000
- Objective: target 100→50, max 200→100
- Goals & Non-Goals: target 150→75, max 300→150
- Integration Overview: target 200→100
- Integration Flows: target 200→100
- Error Handling & Recovery: target 200→100, max 400→200
- User Stories: target 300→150, max 600→300
- Security & Data Privacy: target 150→75, max 300→150
- All optional sections: halve similarly

**architecture_decision_record:**
- totalWordTarget: 500→250, 1500→750
- Context: target 150→75, max 300→150
- Decision Drivers: target 100→50, max 200→100
- Goals & Non-Goals: target 100→50, max 200→100
- Considered Options: target 200→100, max 400→200
- Decision Outcome: target 100→50, max 200→100
- Consequences: target 100→50, max 200→100
- Related Decisions: max 100→50

**lightweight_rfc:**
- totalWordTarget: 500→250, 1500→750
- Problem Statement: target 100→50, max 200→100
- Goals & Non-Goals: target 100→50, max 200→100
- Proposed Solution: target 200→100, max 400→200
- Impact & Scope: target 100→50, max 200→100

**Step 2: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/services/templates/categoryTemplates.json','utf8')); console.log('JSON valid')"`
Expected: `JSON valid`

**Step 3: Run existing template tests**

Run: `npx vitest run --reporter=verbose src/services/templates/ src/domain/complexity.test.ts 2>&1 | tail -20`
Expected: All existing tests pass. The complexity.test.ts tests use hardcoded multipliers (0.5/1.0/1.5) applied to base values — those won't change. Template tests may assert specific word counts from the JSON — if any fail, update the expected values in the tests to match the new 50% targets.

**Step 4: Commit**

```bash
git add src/services/templates/categoryTemplates.json
git commit -m "feat(pipeline): cut word targets 50% across all 10 category templates

Halves target, max, and totalWordTarget values for every category to reduce
epic output verbosity. Format-driven sections (target/max 0) unchanged.

Refs docs/plans/2026-05-05-pipeline-verbosity-formatting-design.md"
```

---

### Task 2: Add brevity rules to comprehensionPrompt.ts

**Files:**
- Modify: `src/pipeline/prompts/comprehensionPrompt.ts:27-49` (COMPLEXITY_INSTRUCTIONS)
- Modify: `src/pipeline/prompts/comprehensionPrompt.ts:57-65` (system prompt)

**Step 1: Update the system prompt**

In `buildComprehensionPrompt()`, after the existing system prompt expertise list (line 64), append the brevity block:

```typescript
// In the system prompt, after "- Document structure and semantic analysis":
`
BREVITY RULES (non-negotiable):
- No preamble. No postamble. No acknowledgments.
- Every sentence must add information the previous one didn't.
- Prefer active voice. Cut filler adjectives.
- If a bullet point exceeds 15 words, split or shorten it.`
```

**Step 2: Rewrite COMPLEXITY_INSTRUCTIONS**

Replace lines 27-49:

```typescript
const COMPLEXITY_INSTRUCTIONS: Record<ComplexityLevel, string> = {
  simple: `Complexity level: SIMPLE.
- Extract only the most prominent entities (up to 8).
- Identify 3–5 core requirements; skip minor or implied ones.
- Flag only critical gaps and high-severity risks.
- Keep semantic sections broad (3–6 sections).
- Ruthlessly brief. Every word must justify its existence. Cut any sentence a reader would skip.`,

  moderate: `Complexity level: MODERATE.
- Extract a thorough set of entities (8–15) with their relationships.
- Identify all explicit requirements and key implicit ones (8–15 total).
- Perform a balanced gap analysis — cover missing acceptance criteria, unclear scope, and integration risks.
- Discover 5–10 semantic sections with clear purpose annotations.
- Concise but complete. No redundant points. If two bullets say the same thing, merge them.`,

  complex: `Complexity level: COMPLEX.
- Extract an exhaustive entity map (15+) including indirect dependencies and cross-cutting concerns.
- Identify all requirements — explicit, implicit, and inferred from context (15+).
- Perform deep gap analysis covering: missing non-functional requirements, security considerations, scalability gaps, compliance gaps, and edge cases.
- Identify both obvious and subtle risks including third-party dependencies, data migration risks, and organizational risks.
- Discover fine-grained semantic sections (8–15) with detailed purpose and content summaries.
- Dense, not long. Cover all dimensions but say each thing once, precisely. Aim for the LOWER end of the word target.`,
};
```

**Step 3: Run tests**

Run: `npx vitest run --reporter=verbose src/pipeline/prompts/ 2>&1 | tail -20`
Expected: PASS (prompt tests typically verify structure, not exact text)

**Step 4: Commit**

```bash
git add src/pipeline/prompts/comprehensionPrompt.ts
git commit -m "feat(pipeline): add brevity rules to comprehension prompt

Appends non-negotiable brevity block to system prompt and rewrites
complexity scaling: Simple='ruthlessly brief', Complex='dense not long,
aim for LOWER end of word target'."
```

---

### Task 3: Add brevity rules to classificationPrompt.ts

**Files:**
- Modify: `src/pipeline/prompts/classificationPrompt.ts:52-67` (COMPLEXITY_INSTRUCTIONS)
- Modify: `src/pipeline/prompts/classificationPrompt.ts:79-81` (system prompt)

**Step 1: Update the system prompt**

After line 80 ("...what distinguishes them."), append:

```
\n\nBREVITY RULES (non-negotiable):
- No preamble. No postamble. No acknowledgments.
- Keep reasoning dense. Every sentence must add information the previous one didn't.
- Cut filler adjectives ("robust", "comprehensive", "seamless").
```

**Step 2: Rewrite COMPLEXITY_INSTRUCTIONS**

Replace lines 52-67:

```typescript
const COMPLEXITY_INSTRUCTIONS: Record<ComplexityLevel, string> = {
  simple: `Complexity level: SIMPLE.
- Focus on the single most obvious category match.
- Keep reasoning to 1–2 sentences. No filler.
- categoryConfig can be minimal.`,

  moderate: `Complexity level: MODERATE.
- Consider the top 2–3 candidate categories before deciding.
- Reasoning: 2–3 sentences explaining match and why alternatives were rejected. No redundancy.
- categoryConfig should include key template parameters.`,

  complex: `Complexity level: COMPLEX.
- Evaluate all categories systematically before deciding.
- Reasoning: 3–5 sentences covering primary match, overlaps, and final decision. Dense, not long.
- categoryConfig should be comprehensive but terse.`,
};
```

**Step 3: Run tests**

Run: `npx vitest run --reporter=verbose src/pipeline/prompts/ 2>&1 | tail -20`
Expected: PASS

**Step 4: Commit**

```bash
git add src/pipeline/prompts/classificationPrompt.ts
git commit -m "feat(pipeline): add brevity rules to classification prompt

Tighter reasoning lengths: Simple 1-2 sentences, Complex 3-5 sentences.
Brevity block appended to system prompt."
```

---

### Task 4: Rewrite refinementPrompt.ts with brevity + GFM formatting

**Files:**
- Modify: `src/pipeline/prompts/refinementPrompt.ts:37-55` (COMPLEXITY_INSTRUCTIONS)
- Modify: `src/pipeline/prompts/refinementPrompt.ts:112-116` (system prompt)
- Modify: `src/pipeline/prompts/refinementPrompt.ts:132-136` (format_instruction section)

**Step 1: Update the system prompt**

After line 115 ("...complexity level."), append the brevity block:

```
\n\nBREVITY RULES (non-negotiable):
- No preamble. No postamble. No "Certainly", "Of course", "Sure", "Great".
- No "It is important to note that...", "This section outlines...", "In order to...".
- Lead with the answer. Every sentence must add information the previous one didn't.
- Prefer active voice. Cut filler adjectives ("robust", "comprehensive", "seamless", "cutting-edge").
- If a bullet point exceeds 15 words, split or shorten it.
```

**Step 2: Rewrite COMPLEXITY_INSTRUCTIONS**

Replace lines 37-55:

```typescript
const COMPLEXITY_INSTRUCTIONS: Record<ComplexityLevel, string> = {
  simple: `Complexity level: SIMPLE.
- Ruthlessly brief. Every word must justify its existence. Cut any sentence a reader would skip.
- Use straightforward language; no jargon unless domain-essential.
- Aim for the LOWER end of the word target.`,

  moderate: `Complexity level: MODERATE.
- Concise but complete. No redundant points. If two bullets say the same thing, merge them.
- Include relevant details and context only where they change the reader's understanding.
- Aim for the MIDDLE of the word target range.`,

  complex: `Complexity level: COMPLEX.
- Dense, not long. Cover all dimensions but say each thing once, precisely.
- Use tables and lists over prose paragraphs wherever structured data fits.
- Address edge cases and failure modes with specific values, not vague statements.
- Aim for the LOWER end of the word target. Density over length.`,
};
```

**Step 3: Add GFM formatting directives to the format_instruction section**

After the existing `<format_instruction>` block (line 136), add a new `<gfm_formatting>` section:

```typescript
// Add after </format_instruction> (before the hint/antiPatterns section at line 137)
`
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
</gfm_formatting>`
```

**Step 4: Run tests**

Run: `npx vitest run --reporter=verbose src/pipeline/prompts/ 2>&1 | tail -20`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pipeline/prompts/refinementPrompt.ts
git commit -m "feat(pipeline): add brevity + GFM formatting to refinement prompt

Flips Complex from 'upper end of word target' to 'LOWER end, density over
length'. Adds mandatory GFM formatting: bold TL;DR per section, task-list
ACs, bold key terms, blockquote callouts, max 3 sentences per paragraph.
Complex tier gets <details> collapsibles."
```

---

### Task 5: Add brevity + assembly formatting to mandatoryPrompt.ts

**Files:**
- Modify: `src/pipeline/prompts/mandatoryPrompt.ts:38-53` (COMPLEXITY_INSTRUCTIONS)
- Modify: `src/pipeline/prompts/mandatoryPrompt.ts:108-110` (system prompt)
- Modify: `src/pipeline/prompts/mandatoryPrompt.ts:319-326` (Epic Assembly section)

**Step 1: Update the system prompt**

After line 109 ("...stakeholder-friendly writing."), append:

```
\n\nBREVITY RULES (non-negotiable):
- No preamble. No postamble. No acknowledgments.
- Every sentence must add information the previous one didn't.
- Acceptance criteria: each must be ≤20 words and testable.
- User story titles: ≤10 words.
- Cut filler adjectives ("robust", "comprehensive", "seamless").
```

**Step 2: Rewrite COMPLEXITY_INSTRUCTIONS**

Replace lines 38-53:

```typescript
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
```

**Step 3: Add epic assembly formatting directives**

In the `### Epic Assembly` section (around line 319), append formatting instructions after the existing assembly rules:

```
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
```

**Step 4: Run tests**

Run: `npx vitest run --reporter=verbose src/pipeline/prompts/ 2>&1 | tail -20`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pipeline/prompts/mandatoryPrompt.ts
git commit -m "feat(pipeline): add brevity + GFM assembly rules to mandatory prompt

AC word limit ≤20 words. Story titles ≤10 words. Epic assembly formatting:
emoji H2 headings, H3 for stories, --- separators between sections,
architecture diagram after Overview."
```

---

### Task 6: Add 13th audit check + verbosity patterns to validationPrompt.ts

**Files:**
- Modify: `src/pipeline/prompts/validationPrompt.ts:65-67` (system prompt)
- Modify: `src/pipeline/prompts/validationPrompt.ts:71-73` (task description — change "12" to "13")
- Modify: `src/pipeline/prompts/validationPrompt.ts:152-154` (audit checks count references)
- Modify: `src/pipeline/prompts/validationPrompt.ts:163-201` (add 13th check)
- Modify: `src/pipeline/prompts/validationPrompt.ts:203-222` (add verbosity patterns)

**Step 1: Update system prompt with brevity block**

After line 66 ("...your feedback drives automated improvement cycles."), append:

```
\n\nBREVITY RULES (non-negotiable):
- No preamble. No postamble. No acknowledgments.
- Feedback must be specific and actionable. No vague advice.
- Cut filler adjectives in your own output.
```

**Step 2: Update all "12" references to "13"**

Change "12 quality dimensions" → "13 quality dimensions" (line 72).
Change "ALL 12 of the following" → "ALL 13 of the following" (line 164).
Change `(sum of all check scores / (12 × 10)) × 100` → `(sum of all check scores / (13 × 10)) × 100` (line 154).
Change `(12 × 10)` → `(13 × 10)` (wherever referenced).

**Step 3: Add 13th audit check after check 12 (line ~201)**

After "### 12. Format Compliance", add:

```
### 13. Conciseness & Density
Is every sentence information-dense with no filler? Score 0 if padded with phrases like "it is important to note", "comprehensive solution", "robust and seamless", or if sections restate what prior sections already said. Score 10 if every sentence adds unique, actionable information. Deduct 2 points per section that exceeds its word target. Deduct 1 point for each instance of: marketing adjectives ("robust", "seamless", "cutting-edge", "comprehensive", "state-of-the-art"), preamble phrases ("This section outlines...", "In order to...", "It should be noted that..."), or redundant restatements.
```

**Step 4: Add verbosity failure patterns**

After "### Minor Patterns" section (around line 222), add:

```
### Verbosity Patterns (Major)
- **Verbose Padding**: Sections contain filler phrases, restatements of prior sections, or marketing language ("robust", "seamless", "comprehensive", "cutting-edge", "state-of-the-art"). Each instance is a separate finding.
- **Wall of Text**: Any section with >3 consecutive prose paragraphs without a visual break (list, table, sub-heading, blockquote, or horizontal rule).

### Formatting Patterns (Minor)
- **Missing Visual Hierarchy**: Sections lack bold key terms, task lists for acceptance criteria, or tables for structured data where appropriate.
- **Missing TL;DR**: Section opens with context instead of a bold one-sentence summary.
```

**Step 5: Update feedback instructions for verbosity**

In the `<feedback_instructions>` section, add an example of good verbosity feedback:

```
- "Section 'Overview' is 380 words (target: 100). Cut paragraph 2 entirely — it restates paragraph 1. Convert paragraph 3 into a 3-item bullet list. Remove 'It is important to note that' from the opening."
- "Section 'Proposed Design' uses 'robust' 4 times and 'comprehensive' 3 times — replace each with a specific measurable claim or remove entirely."
```

**Step 6: Run tests**

Run: `npx vitest run --reporter=verbose src/pipeline/prompts/ 2>&1 | tail -20`
Expected: PASS

**Step 7: Commit**

```bash
git add src/pipeline/prompts/validationPrompt.ts
git commit -m "feat(pipeline): add conciseness audit check + verbosity patterns to validation

Adds 13th audit check 'Conciseness & Density' (score 0-10, deducts for
filler phrases and word-target overruns). Adds major failure patterns:
'Verbose Padding' and 'Wall of Text'. Adds minor: 'Missing Visual
Hierarchy' and 'Missing TL;DR'. Updates score formula to 13 checks."
```

---

### Task 7: Add brevity rules to coherencePrompt.ts

**Files:**
- Modify: `src/pipeline/prompts/coherencePrompt.ts:19-26` (system prompt)

**Step 1: Update system prompt**

After line 25 ("4. **Inconsistent terminology**..."), append:

```
\n5. **Verbose padding**: Remove filler phrases ("It is important to note", "In order to", "comprehensive and robust"), marketing adjectives, and restatements of content already covered in other sections. Consolidate to one location.

BREVITY RULES (non-negotiable):
- When fixing sections, make them MORE concise, never longer.
- If consolidating redundancy, keep the shorter version.
- Cut filler adjectives ("robust", "comprehensive", "seamless") during any edit.
```

**Step 2: Run tests**

Run: `npx vitest run --reporter=verbose src/pipeline/prompts/ 2>&1 | tail -20`
Expected: PASS

**Step 3: Commit**

```bash
git add src/pipeline/prompts/coherencePrompt.ts
git commit -m "feat(pipeline): add brevity rules + verbose-padding fix to coherence prompt

Coherence stage now actively removes filler phrases and marketing
adjectives during cross-section review. Brevity rules ensure fixes
make sections shorter, not longer."
```

---

### Task 8: Add cleanupMarkdown() post-processor to refinePipelineAction.ts

**Files:**
- Modify: `src/pipeline/refinePipelineAction.ts:106-108` (wrap epicContent through cleanup)

**Step 1: Add cleanupMarkdown function**

Add the function at the top of `refinePipelineAction.ts`, after the imports (before STAGE_MAP):

```typescript
// ─── Markdown Post-Processor ───────────────────────────────

/**
 * Deterministic cleanup of assembled epic markdown.
 * Runs after pipeline completes, before writing to epicStore.
 * No AI calls — pure string transforms.
 */
function cleanupMarkdown(md: string): string {
  let lines = md.split('\n');

  // 1. Ensure single H1 — keep only the first, strip duplicates
  let foundH1 = false;
  lines = lines.filter((line) => {
    if (/^# [^#]/.test(line)) {
      if (foundH1) return false;
      foundH1 = true;
    }
    return true;
  });

  // 2. Add --- between H2 sections if missing
  const result: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^## /.test(line) && i > 0) {
      // Check if previous non-empty line is already ---
      let j = result.length - 1;
      while (j >= 0 && result[j].trim() === '') j--;
      if (j >= 0 && result[j].trim() !== '---') {
        result.push('');
        result.push('---');
        result.push('');
      }
    }
    result.push(line);
  }

  // 3. Normalize heading hierarchy — no skipped levels
  // Track the last heading level seen; if we jump from 2 to 4, fix to 3
  let lastLevel = 0;
  const fixed = result.map((line) => {
    const match = line.match(/^(#{1,6})\s/);
    if (match) {
      const level = match[1].length;
      if (lastLevel > 0 && level > lastLevel + 1) {
        const fixedLevel = lastLevel + 1;
        lastLevel = fixedLevel;
        return '#'.repeat(fixedLevel) + line.slice(match[1].length);
      }
      lastLevel = level;
    }
    return line;
  });

  // 4. Trim trailing whitespace per line
  return fixed.map((line) => line.trimEnd()).join('\n');
}
```

**Step 2: Wire cleanupMarkdown into the pipeline result**

At line 108, change:
```typescript
useEpicStore.getState().applyRefinedEpic(result.epicContent);
```
to:
```typescript
useEpicStore.getState().applyRefinedEpic(cleanupMarkdown(result.epicContent));
```

Also at line 151, change:
```typescript
useEpicStore.getState().applyRefinedEpic(result.epicContent);
```
to:
```typescript
useEpicStore.getState().applyRefinedEpic(cleanupMarkdown(result.epicContent));
```

**Step 3: Run full test suite**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -30`
Expected: All tests pass. The cleanupMarkdown function is pure (no side effects), so existing tests won't break.

**Step 4: Commit**

```bash
git add src/pipeline/refinePipelineAction.ts
git commit -m "feat(pipeline): add cleanupMarkdown post-processor to action layer

Deterministic markdown cleanup after pipeline completes: ensures single H1,
adds --- separators between H2 sections, normalizes heading hierarchy (no
skipped levels), trims trailing whitespace. No AI calls — pure string
transforms in the approved action-layer boundary."
```

---

### Task 9: Run full regression + verify

**Step 1: Run full test suite**

Run: `npx vitest run 2>&1 | tail -10`
Expected: All tests pass. No regressions.

**Step 2: TypeScript type check**

Run: `npx tsc -b --noEmit 2>&1 | tail -10`
Expected: No errors.

**Step 3: Verify no protected files were touched**

Run: `git diff --name-only HEAD~8 HEAD | grep -E "(pipelineOrchestrator|src/pipeline/stages/)" | head -5`
Expected: Empty output (no stage or orchestrator files changed).

**Step 4: Verify the right files were changed**

Run: `git diff --name-only HEAD~8 HEAD | sort`
Expected output (approximately):
```
docs/plans/2026-05-05-pipeline-verbosity-formatting-design.md
docs/plans/2026-05-05-pipeline-verbosity-formatting-plan.md
src/pipeline/prompts/classificationPrompt.ts
src/pipeline/prompts/coherencePrompt.ts
src/pipeline/prompts/comprehensionPrompt.ts
src/pipeline/prompts/mandatoryPrompt.ts
src/pipeline/prompts/refinementPrompt.ts
src/pipeline/prompts/validationPrompt.ts
src/pipeline/refinePipelineAction.ts
src/services/templates/categoryTemplates.json
```

---

## Summary

| Task | File | Change |
|---|---|---|
| 1 | categoryTemplates.json | 50% word target cuts across all 10 categories |
| 2 | comprehensionPrompt.ts | Brevity rules + "dense not long" scaling |
| 3 | classificationPrompt.ts | Brevity rules + tighter reasoning lengths |
| 4 | refinementPrompt.ts | Brevity + GFM formatting + complexity flip |
| 5 | mandatoryPrompt.ts | Brevity + AC limits + assembly formatting |
| 6 | validationPrompt.ts | 13th conciseness check + verbosity patterns |
| 7 | coherencePrompt.ts | Brevity + verbose-padding removal |
| 8 | refinePipelineAction.ts | cleanupMarkdown() post-processor |
| 9 | (verification) | Full regression + protected-file check |

**Total: 9 tasks, 8 files modified, 0 stage/orchestrator files touched.**
