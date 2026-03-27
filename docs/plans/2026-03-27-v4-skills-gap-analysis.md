# V4 skills.ts Gap Analysis — What V5 Has vs Doesn't

**Date:** 2026-03-27
**Source:** V4 skills.ts 18-issue document vs V5 codebase audit

---

## STRONG — V5 Has These (Full or Equivalent)

| V4 Issue | V5 Implementation | Notes |
|----------|-------------------|-------|
| **#1 Deterministic Scoring** | `epicScorer.ts` — BM25 saturation, 5-dimension weighted scoring, filler detection | V5 has this. Different dimensions (completeness/clarity/specificity/actionability/technicalDepth vs V4's coverage/quality/stories/diagrams/structure) but same principle. AI score demoted. |
| **#5 BM25 Saturation** | `epicScorer.ts:saturate()` with k1=1.2 | Implemented. Same BM25 formula `tf/(tf+k)`. |
| **#7 Filler Detection** | `epicScorer.ts:detectFiller()` — 5 categories, 60+ patterns (hedging, emptyPhrases, aiFluff, redundantModifiers, vagueLanguage) | Implemented. Categories differ slightly from V4 (V4 had weighted tiers 2.0/1.5/1.0; V5 treats all equally). Missing: lexical diversity metric, sentence length variance. |
| **#9 Story Point Ceiling** | `runStage5Mandatory.ts:normalizeStory()` — snaps to [1,2,3,5] | Implemented but uses `Math.min(5, Math.max(1, Math.round()))` not ceiling specifically. Close enough for practical purposes. |
| **#13 AIMD Throttler** | `throttler.ts:withRetry()` — AIMD-style with window, backoff, recovery | Implemented. Has concurrency window, multiplicative decrease on 429, additive increase on success. |
| **#3 Missing Details Diagrams** | `mandatoryPrompt.ts` — prompt says "Only include components explicitly described" | Addressed via prompt instruction. No "Missing Details" nodes. |

---

## PARTIAL — V5 Has Parts But Missing Key Elements

| V4 Issue | What V5 Has | What's Missing | Severity |
|----------|-------------|----------------|----------|
| **#2 Targeted Feedback Loop** | `previousFeedback` passed from Stage 6 → Stage 4 refinement; `refinementPrompt.ts` includes feedback in prompt | Missing: `buildIterationFeedback()` structured XML format, positive framing, per-stage routing (scope_smoothing → Stage 4, partial_story_coverage → Stage 5). V5 passes raw `ValidationOutput` object — less structured than V4's XML tags. | **HIGH** |
| **#10 Feedback Placement** | Feedback goes into system prompt (via `refinementPrompt.ts`) | V4 placed feedback at END of user prompt (exploiting recency bias). V5 puts it in system prompt where attention is weaker. | **MEDIUM** |
| **#7 Filler Detection (advanced)** | Has pattern matching but flat weighting | Missing: weighted tiers (2.0x for "in today's rapidly evolving landscape", 1.5x for hedging), lexical diversity (unique/total words), sentence length variance detection | **LOW** |

---

## MISSING — V5 Does Not Have These At All

| V4 Issue | What V5 Lacks | Impact | Severity |
|----------|---------------|--------|----------|
| **#4 Fuzzy Title Matching** | No `jaroWinkler()`, `diceCoefficient()`, `matchTitleToKeys()`. V5 uses `discoverSections()` with regex heading detection + `normalizedTitle` but no fuzzy matching for non-standard titles. | Sections with non-standard titles may be mismatched or get generic keys. Less critical in V5 because Stage 3 builds transformation plan from AI analysis, not static title mapping. | **LOW** |
| **#6 RAKE Key Term Extraction** | No `rakeExtract()`, no bigram extraction, no CamelCase splitting. V5's `epicScorer.ts` uses basic word tokenization for BM25. | Key term extraction is simpler — misses multi-word phrases like "user authentication". Coverage scoring less precise. | **MEDIUM** |
| **#8 Graph-Theoretic Mermaid Analysis** | No `analyzeMermaidGraph()`. V5 has `validateMermaidSyntax()` (syntax-only) + `fixMermaidWithAI()`. No graph structure analysis (disconnected nodes, weak connectivity, duplicate edges, label quality). | Diagram quality scoring is weaker. Diagrams may have structural issues not caught by syntax validation alone. | **MEDIUM** |
| **#11 Adaptive Convergence** | No `shouldStopConvergence()`. V5 uses fixed `maxIterations` from complexity config (simple=2, moderate=3, complex=3). No headroom-based stopping, no per-dimension regression detection. | May waste iterations when converged, or stop too early. Fixed iterations are safe but not optimal. | **LOW** |
| **#12 Pareto-Aware Selection** | No `computeAdjustedScore()`, no `paretoDominates()`. V5 uses `validation.overallScore` directly for pass/fail. | Goodhart's Law risk — model can produce outputs that score well on composite but poorly on individual dimensions. V5 mitigates this partially via the deterministic scorer's per-dimension minimum gate. | **LOW** |
| **#14 BM25-RAKE Hybrid Scoring** | No hybrid scoring for multi-word phrases. V5's BM25 is single-token only. | Multi-word technical terms scored as individual words. "user authentication" counts if either word appears, not requiring both. | **MEDIUM** |
| **#15 Story Points vs Count Separation** | V5 has `storyCountRange` from complexity but no budget-aware XML prompt, no separate numbering for source vs AI stories. | Less control over story generation volume. SLA feature partially addresses this with point budgets. | **LOW** |
| **#16 BM25 Threshold Consistency** | Not applicable — V5 doesn't have the dual-threshold pattern | N/A | **N/A** |
| **#17 RAKE Deduplication** | No RAKE = no dedup needed | N/A | **N/A** |
| **#18 mapThrottled Parallel** | V5's `withRetry` is per-call, not batch. Stage 2 and 4 use `Promise.all` for parallelism directly. | Working differently but achieving same goal. | **N/A** |

---

## Summary Scorecard

| Category | Count | Details |
|----------|-------|---------|
| **STRONG (fully implemented)** | 6 of 18 | #1, #3, #5, #7-basic, #9, #13 |
| **PARTIAL (has parts)** | 3 of 18 | #2, #7-advanced, #10 |
| **MISSING** | 6 of 18 | #4, #6, #8, #11, #12, #14 |
| **NOT APPLICABLE** | 3 of 18 | #16, #17, #18 |

## Priority Recommendations (if you want to close these gaps)

### HIGH priority (directly affects output quality):
1. **#2 Structured Feedback** — Implement `buildIterationFeedback()` with XML format + positive framing + stage routing. Currently V5 passes raw validation output which is less structured.
2. **#6 RAKE Key Terms** — Add multi-word phrase extraction to improve coverage scoring precision.
3. **#8 Graph-Theoretic Mermaid** — Add structural analysis to catch disconnected nodes, fragmented graphs.

### MEDIUM priority (improves scoring accuracy):
4. **#14 BM25-RAKE Hybrid** — Handle multi-word phrases in saturation scoring.
5. **#10 Feedback Placement** — Move iteration feedback from system prompt to end of user prompt.

### LOW priority (nice-to-have optimizations):
6. **#4 Fuzzy Title Matching** — Less critical in V5's AI-driven transformation plan.
7. **#11 Adaptive Convergence** — Fixed iterations work, adaptive is an optimization.
8. **#12 Pareto Selection** — V5's per-dimension minimum gate partially mitigates.
