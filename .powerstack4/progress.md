# Progress Log

## Session: 2026-03-30 — Context-Aware Update Generation

### Implemented (8 tasks)
1. `epic` field added to `GitLabIssue` type
2. `fetchIssueEpic` API function — GET /projects/:id/issues/:iid/related_epics
3. `epic_iid`/`epic_group_id` passthrough in MockIssue + mapper
4. Eager-fetch parent Epic on issue click (useEffect with cancellation)
5. Bumped activity notes from 5→10 with dates and 300-char truncation
6. Enriched AI prompt: EPIC CONTEXT / ISSUE / ACTIVITY LOG / USER INPUT
7. Epic context loading indicator (title or "No linked epic" fallback)
8. `IssueDetail.test.tsx` — 7 integration tests

### Test Results
- 4/4 fetchIssueEpic unit tests pass
- 7/7 IssueDetail integration tests pass
- 1286/1298 full suite (12 pre-existing failures: WelcomeSidebar, App, helpers)

[SIMPLIFY] No changes needed — clean additions, no dead code or redundancy
[REVIEW] APPROVE — Critical: 0, Important: 2 (fixed), Suggestions: 3 (logged)
  - Fixed: `loadingEpic` reset in early-return path
  - Fixed: Added 7 integration tests (IssueDetail.test.tsx)

## Session: 2026-03-29 — Sidebar Restructure

### Setup
- Previous session: AI Client (complete, 2026-03-26)
- New task: Sidebar restructure — nested nav + issueSubTab
- Plan: docs/plans/2026-03-29-sidebar-restructure-plan.md (6 tasks)
- Design: docs/plans/2026-03-29-sidebar-restructure-design.md

## Session: 2026-03-30 — Pipeline Optimization

### Implemented
- Priority 1: Promise.all for stages 1+2 (orchestrator) — saves ~15s
- Priority 2: Cap maxIterations (moderate 2, complex 3) — saves 30-60s
- Priority 3: Per-stage model config gpt-5.4-nano for stages 2+6 — saves 20-30s
- Priority 4: Targeted section repair (identifyFailedSections) — saves 20-40s
- Priority 5: Streaming progress UI (sectionComplete callbacks) — perceived -60s
- Cleaned up unused OpenAI imports in AIProviderConfig

### Test Results
- 314/314 pipeline tests pass
- 98/98 affected unit/integration tests pass

[SIMPLIFY] No changes needed — all additions are clean and minimal, no dead code or redundancy
[REVIEW] PASS — Critical: 0, Important: 3 (all fixed), Minor: 3 (logged)
  - Fixed: Extracted DEFAULT_NANO_DEPLOYMENT constant
  - Fixed: Added Azure-only comment in buildStageAIConfig
  - Fixed: Added unit tests for identifyFailedSections (6 tests) and buildStageAIConfig (3 tests) + stageModelOverrides (1 test)

## Session: 2026-03-30 — Bug Fixes + Mermaid Theme Unification

### Bug Fixes Implemented (5 tasks)
1. Mermaid white-on-white text — primaryTextColor/secondaryTextColor #fff→#1F2937
2. Markdown download button — DownloadSimple icon + Blob handler in WorkspaceHeader
3. Diagram node limits — 4-6/6-8/8-12 (was 5-10/10-20/15-30+), diagramNodeRange in ComplexityConfig
4. Diagram version naming — auto-label v1, v2, v2-simplify in blueprintStore.setCode
5. Custom issue creation — generateCustomStories.ts AI function + UI in IssueCreationModal

### Mermaid Theme Unification
- Replaced Wong/Okabe-Ito dark-fill palette with Paul Tol Light (WCAG AA)
- Unified classDefs across all locations: DiagramRenderer, runStage5Mandatory, regenerateBlueprintAction, mandatoryPrompt
- All text now dark (#1A1A2E) — eliminated all color:#fff in classDefs
- Added flowchart layout config: nodeSpacing, rankSpacing, diagramPadding, htmlLabels
- fontFamily normalized to Frutiger (UBS brand)
- edgeLabelBackground: transparent → #FAFAFA

[SIMPLIFY] No changes needed — classDef duplication across skeleton templates is intentional (self-contained Mermaid diagrams)
[REVIEW] PASS — Critical: 0, Important: 2 (fixed), Minor: 2 (logged)
  - Fixed: Extracted applyDiagramTheme to shared src/pipeline/utils/diagramTheme.ts
  - Fixed: Normalized fontFamily quoting + added diagramPadding to %%{init}
  - Minor: classDef palette duplicated in 2 prompt strings (acceptable — AI prompt context)
  - Minor: identifyFailedSections fallback to all sections on vague feedback (logged)

## Session: 2026-03-30 — Resilient User Story Parser

### Investigation
- Confirmed bug is real for externally imported / hand-edited epics
- Pipeline output (### US-001:) was always fine — parser-to-pipeline mismatch only affects external content
- No changes needed to runStage5Mandatory.ts

### Implemented
- Multi-format STORY_HEADER regex: ### heading, **bold**, bullet+**bold**
- Flexible digit count (\d+ instead of \d{3})
- ID normalization to 3-digit padding (normalizeId)
- Unified extraction pipeline (no separate fallback)
- Fixed bold-aware regexes for AC, Priority, Story Points, Test Cases
- 13 new tests covering all formats + edge cases

[SIMPLIFY] No changes needed — 116 lines, clean single-responsibility module
[REVIEW] PASS — Critical: 0, Important: 1 (fixed), Minor: 0, Suggestions: 4
  - Fixed: Added STORY_HEADER.lastIndex = 0 reset before exec loop (global regex state safety)
  - Added sequential-call test to verify no lastIndex leakage (14 tests total)

## Session: 2026-03-30 — categoryTemplates v6.0.0

### Implemented (13 tasks)
- _meta: Added globalAntiPatterns, version bump 5.0.0 → 6.0.0
- All 8 existing categories: Rewrote every hint with four-part formula (Imperative + Specifics + Example + Anti-pattern)
- All 10 categories: Added "Goals & Non-Goals" as required section
- All 10 categories: Expanded expertRole (added expertise + target audience) and tone (added actionable guidance)
- Structured formats: Added explicit columns arrays to raci-table, risk-heat-map, slo-table, error-table, mapping-table, schema-table, phase-table, comparison-table
- New: architecture_decision_record template (6 required, 2 optional sections)
- New: lightweight_rfc template (4 required, 2 optional sections)
- Fixed: classificationPrompt.ts — added 2 new categories to Record<EpicCategory, string>
- Fixed: types.test.ts (7→9), WelcomeScreen.test.tsx (7→9), WorkspaceHeader.test.tsx (8→10)

### Test Results
- 75/75 affected tests pass (templateLoader, types, WelcomeScreen, WorkspaceHeader)
- 1274/1287 full suite (13 pre-existing failures: WelcomeSidebar, App, helpers)

[SIMPLIFY-SKIP] JSON data file + type additions (<10 lines code) — no simplification needed
