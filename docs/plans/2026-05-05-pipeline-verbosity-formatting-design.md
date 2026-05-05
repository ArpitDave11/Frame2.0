# Pipeline Verbosity & Formatting Fix — Design

**Date:** 2026-05-05
**Status:** Approved
**Branch:** `feature/phase-a-docmining`

## Problem

Epic pipeline output has two compounding issues:
1. **Verbosity** — sections are padded with filler ("It is important to note...", restatements, marketing adjectives). The Complex complexity level explicitly tells the LLM "be thorough — completeness > brevity," fighting against conciseness.
2. **Poor formatting** — output renders as flat walls of text in GitLab without visual hierarchy, emphasis, or scannability. No emoji section markers, no task-list ACs, no collapsibles, no bold key terms.

## Constraints

- **Pipeline purity:** Cannot edit `src/pipeline/stages/**` or `src/pipeline/pipelineOrchestrator.ts`.
- **No test edits:** Fix implementation, not tests.
- **GitLab UI** is the primary rendering surface.

## Solution: Prompt Rewrite + GFM Template System

### 1. Word Target Cuts (50%)

All `target`, `max`, and `totalWordTarget` values in `categoryTemplates.json` cut by 50%. Sections with target/max of 0 (tables, diagrams) unchanged.

| Category | Current totalWordTarget | New totalWordTarget |
|---|---|---|
| general | 1500–6000 | 750–3000 |
| technical_design | 2000–5000 | 1000–2500 |
| business_requirement | 1500–3500 | 750–1750 |
| feature_specification | 1500–3500 | 750–1750 |
| api_specification | 2000–5000 | 1000–2500 |
| infrastructure_design | 2000–5000 | 1000–2500 |
| migration_plan | 2000–4000 | 1000–2000 |
| integration_spec | 1800–4000 | 900–2000 |
| architecture_decision_record | 500–1500 | 250–750 |
| lightweight_rfc | 500–1500 | 250–750 |

Per-section targets also halved (e.g., Overview: 200→100 target, 400→200 max).

### 2. Prompt Anti-Verbosity Directives

**Brevity rules block** (appended to every prompt's system message):
```
BREVITY RULES (non-negotiable):
- No preamble. No postamble. No "Certainly", "Of course", "Sure", "Great".
- No "It is important to note that...", "This section outlines...", "In order to...".
- Lead with the answer. Every sentence must add information the previous one didn't.
- Prefer active voice. Cut filler adjectives ("robust", "comprehensive", "seamless").
- If a bullet point exceeds 15 words, split or shorten it.
```

**Complexity scaling rewrites:**

| Level | Current | New |
|---|---|---|
| Simple | "Keep concise, focused on essentials" | "Ruthlessly brief. Every word must justify its existence. Cut any sentence a reader would skip." |
| Moderate | "Balance thoroughness with readability" | "Concise but complete. No redundant points. If two bullets say the same thing, merge them." |
| Complex | "Provide exhaustive coverage... depth matters" | "Dense, not long. Cover all dimensions but say each thing once, precisely. Use tables and lists over prose. Aim for the LOWER end of the word target." |

### 3. GFM Formatting Instructions

**Refinement prompt (Stage 4) additions:**
```
GITLAB MARKDOWN FORMATTING (mandatory):
- Section headings use ## with emoji prefix: ## 🎯 Overview, ## ✅ Acceptance Criteria,
  ## 📦 Scope, ## ⚠️ Risks, ## 🔗 Dependencies, ## 🏁 Definition of Done
- First line of every section is a **bold one-sentence TL;DR**
- Acceptance criteria use task-list syntax: - [ ] Criterion here
- Use **bold** for key terms, metrics, system names on first mention
- Use > blockquotes for important callouts or constraints
- For Complex tier: wrap detailed content in <details><summary>...</summary>...</details>
- Tables over prose for structured data
- Max 3 sentences per paragraph before a visual break
```

**Mandatory prompt (Stage 5) additions:**
```
EPIC ASSEMBLY FORMATTING:
- H1 for epic title only
- H2 with emoji prefix for major sections
- H3 for user stories
- Never skip heading levels
- --- horizontal rules between sections
- Architecture diagram immediately after Overview
```

### 4. Validation Verbosity Check

**13th audit check added to Stage 6:**
```
13. Conciseness & Density: Is every sentence information-dense? Score 0 if padded
    with filler. Score 10 if every sentence adds unique information. Deduct 2 points
    per section exceeding its word target.
```

**New failure patterns:**
- Major: "Verbose Padding" — filler phrases, restatements, marketing language
- Major: "Wall of Text" — >3 consecutive prose paragraphs without visual break
- Minor: "Missing Visual Hierarchy" — sections without bold/task lists/structured data

### 5. Post-Processing in Action Layer

`cleanupMarkdown()` in `refinePipelineAction.ts`:
1. Ensures single H1 (strips duplicates)
2. Adds `---` between H2 sections if missing
3. Normalizes heading hierarchy (no skipped levels)
4. Trims trailing whitespace per line

## Files Changed

| File | Change |
|---|---|
| `src/services/templates/categoryTemplates.json` | 50% word target cuts |
| `src/pipeline/prompts/comprehensionPrompt.ts` | Brevity rules + complexity scaling |
| `src/pipeline/prompts/classificationPrompt.ts` | Brevity rules |
| `src/pipeline/prompts/refinementPrompt.ts` | Brevity rules + GFM formatting + complexity flip |
| `src/pipeline/prompts/mandatoryPrompt.ts` | Brevity rules + assembly formatting + AC limits |
| `src/pipeline/prompts/validationPrompt.ts` | 13th check + verbosity patterns + feedback template |
| `src/pipeline/prompts/coherencePrompt.ts` | Brevity rules |
| `src/pipeline/refinePipelineAction.ts` | `cleanupMarkdown()` post-processor |

## Files NOT Changed

- `src/pipeline/pipelineOrchestrator.ts` — pipeline purity
- `src/pipeline/stages/**` — pipeline purity
- Any existing test files

## Expected Impact

- ~50% reduction in output word count
- Consistent GitLab-native visual hierarchy
- Feedback loop catches remaining verbosity via Stage 6→4 retry
- Reading time for Simple general epic: ~1.5 min → ~45 sec
