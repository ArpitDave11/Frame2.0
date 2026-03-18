# Epic Generator v5 — Master Task Plan

**Document Type**: Implementation Task Plan  
**Purpose**: Every task in this document is the smallest atomic unit of work that can be implemented, tested, validated, and locked before moving to the next.  
**Methodology**: Write → Test → Human Feedback → Validate → Lock  
**Executor**: Claude Code (or equivalent implementation agent)  
**Reviewer**: Human stakeholder  

---

## How to Read This Document

Each task follows this format:

```
### T-{phase}.{sequence}: {Task Name}
- **Depends on**: Which tasks must be LOCKED before this starts
- **Input**: What files/context the implementer needs to read
- **Output**: Exact files to create or modify
- **Spec**: What the code must do (the contract)
- **Tests**: What must be proven (minimum test cases)
- **Acceptance**: How the human validates it
- **Lock criteria**: When this task is considered done
```

**Rules**:
1. Never skip a task. Never combine tasks.
2. Every task must pass its tests before human review.
3. Human must explicitly approve ("Lock") before the next task starts.
4. If a task reveals a design flaw, stop and revise the plan — don't hack around it.
5. If a task takes more than 200 lines of new code, it should have been split further.

---

## Dependency Graph (Phases)

```
Phase 0: Foundation (project setup, tokens, base types)
    ↓
Phase 1: Domain Model (Epic, Section, Complexity types)
    ↓
Phase 2: State Management (Zustand stores)
    ↓
Phase 3: Service Layer (AI client, GitLab client, template loader)
    ↓
Phase 4: Pipeline Engine (6 stages, extracted from skills.ts)
    ↓
Phase 5: UI Shell (App layout, sidebar, tabs, routing)
    ↓
Phase 6: Feature — Epic Editor (FR-1)
    ↓
Phase 7: Feature — Settings & Config (FR-10)
    ↓
Phase 8: Feature — Toast Notifications (FR-11)
    ↓
Phase 9: Feature — Refine Pipeline UI (FR-2)
    ↓
Phase 10: Feature — Quality Scoring (FR-3)
    ↓
Phase 11: Feature — Category Templates (FR-4)
    ↓
Phase 12: Feature — Complexity Level (FR-5)
    ↓
Phase 13: Feature — Chat Feedback (FR-6)
    ↓
Phase 14: Feature — GitLab Integration (FR-7)
    ↓
Phase 15: Feature — Issue Creation (FR-8)
    ↓
Phase 16: Feature — Blueprint/Diagram (FR-9)
    ↓
Phase 17: Feature — Authentication (FR-12)
    ↓
Phase 18: Integration & End-to-End Testing
    ↓
Phase 19: Migration & Cleanup
```

---

## Phase 0: Foundation

The absolute base layer. No application logic — just project structure, tooling, and the design token system that every component will import.

---

### T-0.1: Project Scaffolding

- **Depends on**: Nothing (first task)
- **Input**: BRD document, existing v4 package.json for reference
- **Output**:
  - `package.json` (dependencies: react, react-dom, zustand, react-markdown, remark-gfm, mermaid, vitest, typescript)
  - `tsconfig.json` (strict mode, path aliases)
  - `vite.config.ts` (proxy for /gitlab-api/*)
  - `vitest.config.ts`
  - `index.html`
  - `src/main.tsx` (minimal: renders `<div id="root">`)
  - `.env.example` (all env vars documented)
- **Spec**: 
  - Project builds with `npm run build` (zero errors)
  - `npm test` runs vitest (zero tests, zero errors)
  - `npm run dev` starts dev server
  - Path alias `@/` resolves to `src/`
  - GitLab proxy configured: `/gitlab-api/*` → `devcloud.ubs.net/api/v4/*`
- **Tests**:
  - `npm run build` exits 0
  - `npm test` exits 0
  - TypeScript strict mode is enabled (verify tsconfig)
  - Vite proxy rule exists for gitlab-api
- **Acceptance**: Human runs `npm run dev`, sees blank page, no console errors
- **Lock criteria**: Build, test, and dev server all work

---

### T-0.2: Design Tokens — Single Source of Truth

- **Depends on**: T-0.1
- **Input**: UBS Brand Theme Style Guide colors from existing App.tsx (lines 9-37), Sidebar.tsx (line 59), styles.css (lines 8-70)
- **Output**:
  - `src/theme/tokens.ts`
- **Spec**:
  - Exports: `color` (11 brand colors), `semantic` (8 mapped colors), `focus`, `spacing` (8px grid), `radius` (5 stops), `font`, `fontSize`, `fontWeight`, `shadow` (6 levels), `glass` (morphism tokens), `chart` (7 viz colors)
  - All values `as const` for TypeScript literal types
  - Type exports: `UBSColor`, `SemanticColor`, `Spacing`, `Radius`, `Shadow`
  - Zero runtime dependencies — pure constants
- **Tests** (minimum 50 assertions):
  - Every brand hex matches UBS style guide exactly
  - Semantic colors map only to valid brand colors
  - No green/yellow/blue in semantic (UBS constraint)
  - Spacing values are all multiples of 4px
  - Font stack starts with Frutiger
  - No font weight exceeds 600
  - Completeness: every hex from old App.tsx, Sidebar.tsx, styles.css is present
  - Chart colors are all valid brand colors
  - `tokens` aggregate export includes all 11 groups
- **Acceptance**: Human reviews hex values against UBS Brand Theme Style Guide
- **Lock criteria**: All 50+ tests pass, human confirms color accuracy

---

### T-0.3: Global CSS Variables & Base Styles

- **Depends on**: T-0.2
- **Input**: `src/theme/tokens.ts`, existing `styles.css` (lines 1-200 for CSS vars, animation keyframes)
- **Output**:
  - `src/styles/global.css`
- **Spec**:
  - `:root` variables generated from tokens (colors, shadows, spacing, radii)
  - CSS variable names follow convention: `--ubs-color-{name}`, `--ubs-spacing-{n}`, `--ubs-radius-{name}`, `--ubs-shadow-{name}`
  - Body/html base styles: font-family from tokens, background gradient, box-sizing border-box
  - Animation keyframes extracted from existing styles.css: `spin`, `fadeIn`, `slideIn`, `progressShrink`, `skeleton`
  - Scrollbar customization (existing styles.css pattern)
  - NO component-specific styles — only global foundation
  - Comment at top: "Generated from src/theme/tokens.ts — do not add colors directly"
- **Tests**:
  - Every CSS variable name follows naming convention
  - Every CSS variable value matches corresponding token
  - No hardcoded hex values outside of :root declaration
  - All 5 animation keyframes present
  - File contains no component-specific selectors (no `.button`, `.card`, etc.)
- **Acceptance**: Human inspects CSS variables in browser devtools, confirms they match tokens
- **Lock criteria**: Tests pass, CSS loads without errors, human confirms

---

### T-0.4: Test Utilities & Helpers

- **Depends on**: T-0.1
- **Output**:
  - `src/test/setup.ts` (vitest setup: globals, environment config)
  - `src/test/helpers.ts` (shared test utilities)
- **Spec**:
  - `setup.ts`: Configure vitest globals, any polyfills needed
  - `helpers.ts`: 
    - `createMockEpicContent(sections?: number): string` — generates valid epic markdown with N sections
    - `createMockConfig(overrides?: Partial<AppConfig>): AppConfig` — returns valid config with defaults
    - `createMockPipelineResult(): PipelineResult` — returns valid pipeline output
    - `waitFor(condition, timeout): Promise<void>` — async test helper
  - All helpers are type-safe and documented with JSDoc
- **Tests**:
  - `createMockEpicContent()` returns valid markdown with expected section count
  - `createMockEpicContent(5)` returns exactly 5 sections
  - `createMockConfig()` returns a valid AppConfig with all required fields
  - `createMockConfig({ ai: { provider: 'azure' } })` merges overrides correctly
- **Acceptance**: Human reviews helper API for completeness
- **Lock criteria**: Tests pass, helpers cover the common test patterns

---

## Phase 1: Domain Model

The types and data structures that represent what the application works with. No UI, no state management, no side effects — pure TypeScript types and functions.

---

### T-1.1: Core Epic Types (Clean Slate)

- **Depends on**: T-0.1
- **Input**: Existing `src/types.ts` for reference (what to keep vs. remove), BRD FR-1
- **Output**:
  - `src/domain/types.ts`
- **Spec**:
  - `EpicSection` interface: `{ title: string; content: string; format?: SectionFormat; wordCount: number; isRequired: boolean }`
  - `EpicDocument` interface: `{ title: string; category?: EpicCategory; sections: EpicSection[]; metadata: EpicMetadata }`
  - `EpicMetadata` interface: `{ createdAt: number; lastRefined: number | null; qualityScore?: number; gitlabEpicId?: number; gitlabEpicIid?: number; complexity: ComplexityLevel }`
  - `ComplexityLevel` type: `'simple' | 'moderate' | 'complex'`
  - `EpicCategory` type: the 7 categories (carry over from existing types.ts)
  - `SectionFormat` type: carry over from existing types.ts
  - NO wizard types (Stage, StageField, RefinedData, EpicState) — these are dead
  - NO pipeline types here — those go in Phase 4
  - NO GitLab types here — those go in Phase 14
- **Tests**:
  - Type compilation test: create a valid EpicDocument, TypeScript compiles
  - Type compilation test: missing required fields → TypeScript error
  - ComplexityLevel only accepts 3 values
  - EpicCategory only accepts 7 values
  - No import from any wizard-related module
- **Acceptance**: Human reviews type definitions against BRD
- **Lock criteria**: Types compile, tests pass, no wizard remnants

---

### T-1.2: Complexity Scaling Configuration

- **Depends on**: T-1.1
- **Input**: BRD FR-5 (scaling matrix), existing `categoryTemplates.json` for word target ranges
- **Output**:
  - `src/domain/complexity.ts`
- **Spec**:
  - `ComplexityConfig` interface defining scaling factors per level:
    ```
    {
      sectionInclusion: 'required-only' | 'required-plus-key-optional' | 'all';
      wordTargetMultiplier: number;        // 0.5, 1.0, or upper-bound
      storyCountRange: { min: number; max: number };
      acceptanceCriteriaPerStory: { min: number; max: number };
      includeStoryPoints: boolean;
      diagramComplexity: 'single' | 'standard' | 'multiple';
      validationThreshold: number;         // 70, 80, or 85
      maxPipelineIterations: number;       // 2, 3, or 5
      formatComplexity: 'simplified' | 'standard' | 'full';
    }
    ```
  - `COMPLEXITY_CONFIGS: Record<ComplexityLevel, ComplexityConfig>` — the 3 configs
  - `getComplexityConfig(level: ComplexityLevel): ComplexityConfig` — getter
  - `getScaledWordTarget(baseTarget: number, level: ComplexityLevel): number` — applies multiplier
  - `getScaledStoryCount(level: ComplexityLevel): { min: number; max: number }` — returns range
- **Tests**:
  - `getComplexityConfig('simple')` returns correct multiplier (0.5)
  - `getComplexityConfig('moderate')` returns multiplier 1.0
  - `getComplexityConfig('complex')` returns upper-bound multiplier
  - `getScaledWordTarget(200, 'simple')` returns ~100
  - `getScaledWordTarget(200, 'moderate')` returns 200
  - `getScaledWordTarget(200, 'complex')` returns >= 200
  - Simple story count range is 5-8
  - Complex story count range is 15-25
  - Simple validation threshold is 70
  - Complex validation threshold is 85
  - Simple max iterations is 2
  - Complex max iterations is 5
  - All 3 levels return valid configs (no undefined fields)
- **Acceptance**: Human reviews scaling numbers against BRD FR-5 table
- **Lock criteria**: All tests pass, scaling factors match BRD exactly

---

### T-1.3: Epic Markdown Serializer

- **Depends on**: T-1.1
- **Input**: Existing `parseEpicToStageData()` in skills.ts (line 3018) for markdown parsing patterns, `EPIC_SECTIONS` constant for section header format
- **Output**:
  - `src/domain/epicSerializer.ts`
- **Spec**:
  - `epicToMarkdown(epic: EpicDocument): string` — serializes structured epic to markdown
    - Title as `# {title}`
    - Each section as `## {n}. {title}\n\n{content}`
    - Section numbers sequential starting from 1
    - Empty sections omitted
  - `markdownToEpic(markdown: string): EpicDocument` — parses markdown into structured epic
    - Extracts title from first `# ` heading
    - Splits on `## ` headings to find sections
    - Counts words per section
    - Handles edge cases: no title, no sections, extra whitespace, nested headings (`###`)
  - `extractSectionContent(markdown: string, sectionTitle: string): string` — extracts one section's content
  - `replaceSectionContent(markdown: string, sectionTitle: string, newContent: string): string` — replaces one section
- **Tests**:
  - Round-trip: `markdownToEpic(epicToMarkdown(epic))` preserves all sections
  - Empty input: `markdownToEpic('')` returns epic with empty title and 0 sections
  - Single paragraph: `markdownToEpic('Just some text')` puts it all in title area
  - Full 17-section epic parses correctly (use fixture from existing test data)
  - Section extraction finds correct content
  - Section replacement changes only the targeted section
  - Word count is accurate per section
  - Nested headings (###) don't create false section boundaries
  - Section numbers are parsed correctly even if non-sequential in source
  - Unicode content preserved (CJK characters, emoji)
  - Mermaid code blocks inside sections are preserved (not split on `##` inside code fences)
- **Acceptance**: Human provides a real epic markdown from GitLab, runs parse → serialize, confirms output matches
- **Lock criteria**: All tests pass including round-trip and edge cases

---

### T-1.4: Section Discovery & Matching

- **Depends on**: T-1.1, T-1.3
- **Input**: Existing `discoverSections()` in skills.ts (line 4004), `matchSectionToTemplate()` (line 4067), `findMissingRequiredSections()` (line 4105)
- **Output**:
  - `src/domain/sectionDiscovery.ts`
- **Spec**:
  - `discoverSections(markdown: string): DiscoveredSection[]` — find all sections in a markdown document
    - Returns title, normalized title, content, line numbers, word count, hasSubsections
  - `matchSectionToTemplate(sectionTitle: string, template: RichCategoryTemplate): SectionMatchResult`
    - Returns: `{ isRequired: boolean; matchedTemplateName: string | null; wordTarget: number; format?: SectionFormat }`
    - Fuzzy matching: "High-Level Architecture" matches "Architecture Overview"
  - `findMissingRequiredSections(discovered: DiscoveredSection[], template: RichCategoryTemplate): string[]`
    - Returns list of required section names not found in discovered sections
  - Carry over the existing `DiscoveredSection` interface from types.ts
- **Tests**:
  - Discovers correct count of sections from a 17-section epic
  - Discovers 0 sections from empty string
  - Word counts are accurate
  - `hasSubsections` is true when section contains `###` headings
  - Fuzzy matching: "Architecture Overview" matches template's "Proposed Design"
  - Exact matching: "Objective" matches "Objective"
  - No false matches: "Random Title" returns `matchedTemplateName: null`
  - Missing sections correctly identifies what's absent
  - Line numbers are accurate (can extract back to original position)
- **Acceptance**: Human reviews fuzzy matching logic for correctness
- **Lock criteria**: Tests pass, section discovery handles real-world epic markdown

---

### T-1.5: App Configuration Types

- **Depends on**: T-0.1
- **Input**: Existing `config.ts` interfaces (AppConfig, OpenAIConfig, AzureOpenAIConfig, GitLabConfig), BRD FR-10
- **Output**:
  - `src/domain/configTypes.ts`
- **Spec**:
  - Carry over from existing config.ts (these are stable and well-defined):
    - `AIProvider` type
    - `OpenAIConfig` interface
    - `AzureOpenAIConfig` interface
    - `GitLabConfig` interface (with `GitLabAuthMode`)
    - `AppConfig` interface
    - `DEFAULT_CONFIG` constant
    - `ModelFamily` type
    - `MODEL_LIMITS` constant
    - `OPENAI_MODELS` constant
    - `AZURE_API_VERSIONS` constant
  - NO functions here — only types and constants
  - NO GitLab API functions — those go in service layer
- **Tests**:
  - `DEFAULT_CONFIG` has all required fields
  - `DEFAULT_CONFIG.ai.provider` is 'none'
  - `DEFAULT_CONFIG.gitlab.enabled` is false
  - All model families have defined limits
  - OPENAI_MODELS is non-empty array
  - AZURE_API_VERSIONS is non-empty array
  - Type compilation: creating a valid AppConfig compiles
  - Type compilation: missing required config fields → TypeScript error
- **Acceptance**: Human compares types against existing config.ts, confirms nothing needed is missing
- **Lock criteria**: Types compile, constants are accurate, tests pass

---

## Phase 2: State Management

Zustand stores that replace the 65+ useState hooks. Each store owns one domain and is independently testable.

---

### T-2.1: Epic Store

- **Depends on**: T-1.1, T-1.3
- **Input**: BRD FR-1, epic-related useState hooks from App.tsx (editableEpic, previousEpicForUndo)
- **Output**:
  - `src/stores/epicStore.ts`
- **Spec**:
  - Zustand store with:
    ```
    State:
      document: EpicDocument | null
      markdown: string                  // derived: epicToMarkdown(document) or raw input
      isDirty: boolean
      previousMarkdown: string | null   // for undo
      complexity: ComplexityLevel       // default: 'moderate'
    
    Actions:
      setMarkdown(md: string): void           // updates markdown + parses to document
      setDocument(doc: EpicDocument): void     // updates document + serializes to markdown
      setComplexity(level: ComplexityLevel): void
      updateSection(title: string, content: string): void
      applyRefinedEpic(md: string): void      // stores current as previous, sets new
      undo(): void                            // restores previousMarkdown
      reset(): void
    ```
  - `setMarkdown` calls `markdownToEpic` to keep document in sync
  - `setDocument` calls `epicToMarkdown` to keep markdown in sync
  - `applyRefinedEpic` saves current markdown to `previousMarkdown` before overwriting
  - `undo` restores `previousMarkdown` and clears it
- **Tests**:
  - Initial state: document is null, markdown is empty, complexity is 'moderate'
  - `setMarkdown('# Test')` → document.title is 'Test'
  - `setDocument(mockDoc)` → markdown contains all sections
  - `setComplexity('complex')` → complexity is 'complex'
  - `applyRefinedEpic(newMd)` → markdown is newMd, previousMarkdown is old value
  - `undo()` → markdown reverts to previous, previousMarkdown becomes null
  - `undo()` when previousMarkdown is null → no-op
  - `updateSection('Objective', 'new content')` → only that section changes
  - `isDirty` is false after initial load, true after any edit
  - `reset()` clears everything back to initial state
- **Acceptance**: Human reviews store shape against BRD FR-1
- **Lock criteria**: All tests pass, undo works correctly

---

### T-2.2: Pipeline Store

- **Depends on**: T-0.1
- **Input**: Pipeline-related useState hooks from App.tsx (isPipelineRunning, pipelineStages, pipelineResult, showPipelinePanel)
- **Output**:
  - `src/stores/pipelineStore.ts`
- **Spec**:
  - Zustand store with:
    ```
    State:
      isRunning: boolean
      stages: Record<1|2|3|4|5|6, { status: StageStatus; message: string }>
      result: PipelineResult | null
      error: string | null
      showPanel: boolean
    
    Actions:
      startPipeline(): void                 // resets state, sets isRunning
      updateStage(stage, status, message): void
      completePipeline(result: PipelineResult): void
      failPipeline(error: string): void
      setShowPanel(show: boolean): void
      reset(): void
    ```
  - Import pipeline types from domain (to be created in Phase 4, use placeholder for now)
- **Tests**:
  - Initial state: isRunning false, all stages pending, result null
  - `startPipeline()` → isRunning true, showPanel true, all stages reset to pending
  - `updateStage(1, 'running', 'Analyzing...')` → stage 1 has correct status
  - `completePipeline(result)` → isRunning false, result is set
  - `failPipeline('Network error')` → isRunning false, error is set
  - Cannot `startPipeline()` while already running (guard)
  - `reset()` clears everything
- **Acceptance**: Human reviews store shape
- **Lock criteria**: Tests pass

---

### T-2.3: UI Store

- **Depends on**: T-0.1
- **Input**: UI-related useState hooks (activeTab, sidebarCollapsed, modal states)
- **Output**:
  - `src/stores/uiStore.ts`
- **Spec**:
  - Zustand store with:
    ```
    State:
      activeTab: 'editor' | 'blueprint' | 'settings'
      sidebarCollapsed: boolean
      activeModal: 'publish' | 'loadEpic' | 'issueCreation' | 'critique' | null
      toasts: Toast[]
    
    Actions:
      setActiveTab(tab): void
      toggleSidebar(): void
      setSidebarCollapsed(collapsed: boolean): void
      openModal(modal): void
      closeModal(): void
      addToast(toast: Omit<Toast, 'id'>): void
      removeToast(id: string): void
    ```
  - Toast gets auto-generated UUID `id` on add
  - Only one modal open at a time (openModal closes any current)
  - Note: 'wizard' tab is NOT in the type — it's removed
- **Tests**:
  - Initial state: activeTab is 'editor', no modal, no toasts
  - `setActiveTab('blueprint')` → activeTab is 'blueprint'
  - `setActiveTab('wizard' as any)` → TypeScript error (verify type)
  - `openModal('publish')` → activeModal is 'publish'
  - `openModal('loadEpic')` while publish is open → activeModal is 'loadEpic' (replaces)
  - `closeModal()` → activeModal is null
  - `addToast({ type: 'success', title: 'Done' })` → toast has generated id
  - `removeToast(id)` → toast is removed
  - `toggleSidebar()` → flips collapsed state
- **Acceptance**: Human reviews store shape, confirms wizard tab is gone
- **Lock criteria**: Tests pass, TypeScript rejects invalid tab values

---

### T-2.4: Config Store

- **Depends on**: T-1.5
- **Input**: Config-related useState hooks, existing loadConfig/saveConfig from config.ts
- **Output**:
  - `src/stores/configStore.ts`
- **Spec**:
  - Zustand store with:
    ```
    State:
      config: AppConfig
      gitlabTestStatus: TestStatus | null
      azureTestStatus: TestStatus | null
      openaiTestStatus: TestStatus | null
    
    Actions:
      loadFromStorage(): void          // reads from localStorage
      saveToStorage(): void            // writes to localStorage
      updateConfig(partial: DeepPartial<AppConfig>): void
      setGitlabTestStatus(status): void
      setAzureTestStatus(status): void
      setOpenaiTestStatus(status): void
      isAIEnabled(): boolean           // computed
      getActiveProvider(): string      // computed
    ```
  - `loadFromStorage` reads `epic-generator-config` key from localStorage
  - `saveToStorage` writes to same key
  - `updateConfig` deep-merges partial updates
- **Tests**:
  - Initial state uses DEFAULT_CONFIG
  - `updateConfig({ ai: { provider: 'azure' } })` → config.ai.provider is 'azure'
  - `updateConfig` does not lose other config values (deep merge, not replace)
  - `isAIEnabled()` returns false when provider is 'none'
  - `isAIEnabled()` returns true when provider is 'azure' with valid config
  - `loadFromStorage` with valid JSON → config is loaded
  - `loadFromStorage` with invalid JSON → falls back to DEFAULT_CONFIG
  - `saveToStorage` → can be loaded back correctly (round-trip)
- **Acceptance**: Human reviews localStorage key compatibility with v4
- **Lock criteria**: Tests pass, localStorage round-trip works

---

### T-2.5: GitLab Store

- **Depends on**: T-1.5
- **Input**: GitLab-related useState hooks (33 state variables!), BRD FR-7
- **Output**:
  - `src/stores/gitlabStore.ts`
- **Spec**:
  - Zustand store with:
    ```
    State:
      // Epic browsing
      epics: GitLabEpic[]
      loadingEpics: boolean
      totalCount: number
      searchTerm: string
      filterState: 'opened' | 'closed' | 'all'
      filterLabels: string[]
      page: number
      availableLabels: GitLabLabel[]
      
      // Selected epic
      selectedEpic: GitLabEpic | null
      epicChildren: { epics: GitLabEpicChild[]; issues: GitLabEpicChild[] }
      loadingDetails: boolean
      
      // Group navigation
      currentGroupId: string
      breadcrumb: { id: string; name: string }[]
      groupCache: Record<string, GroupCacheEntry>
      
      // Publish
      publishLevel: 'crew' | 'pod'
      publishTargetGroupId: string | null
      isPublishing: boolean
      publishStatus: { type: 'success' | 'error'; message: string } | null
      
      // Load modal
      loadModalOpen: boolean
      loadSearchTerm: string
      loadFilterState: 'opened' | 'closed' | 'all'
      loadResults: GitLabEpic[]
      loadingResults: boolean
      includeDescendants: boolean
    
    Actions:
      setSearchTerm(term): void
      setFilterState(state): void
      setPage(page): void
      setSelectedEpic(epic): void
      clearSelectedEpic(): void
      navigateToGroup(groupId, groupName): void
      navigateUp(): void
      setPublishLevel(level): void
      setPublishTargetGroup(groupId): void
      setPublishStatus(status): void
      openLoadModal(): void
      closeLoadModal(): void
      reset(): void
    ```
  - This is state-only — no API calls. API calls live in the service layer (Phase 3).
  - Actions that trigger API calls will be handled by action functions outside the store.
- **Tests**:
  - Initial state: no epics, no selected, page 1, filter 'opened'
  - `setSearchTerm('auth')` → searchTerm is 'auth'
  - `setSelectedEpic(mockEpic)` → selectedEpic is set
  - `clearSelectedEpic()` → selectedEpic null, children empty
  - `navigateToGroup('123', 'Platform')` → breadcrumb has entry, currentGroupId updated
  - `navigateUp()` → pops last breadcrumb entry
  - `navigateUp()` on empty breadcrumb → no-op
  - `reset()` → everything back to initial
  - `openLoadModal()` / `closeLoadModal()` toggle correctly
- **Acceptance**: Human reviews that all 33 state variables are accounted for
- **Lock criteria**: Tests pass, every existing GitLab state var is mapped

---

### T-2.6: Chat Store

- **Depends on**: T-0.1
- **Input**: Chat-related useState hooks, ChatState/ChatMessage types from existing types.ts
- **Output**:
  - `src/stores/chatStore.ts`
- **Spec**:
  - Zustand store with:
    ```
    State:
      messages: ChatMessage[]
      isOpen: boolean
      isProcessing: boolean
      pendingSection?: number
      pendingFeedback?: string
      input: string
    
    Actions:
      toggleOpen(): void
      setOpen(open: boolean): void
      setInput(input: string): void
      addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): void
      setProcessing(processing: boolean): void
      setPending(section?: number, feedback?: string): void
      clearPending(): void
      clearMessages(): void
    ```
  - `addMessage` auto-generates id and timestamp
- **Tests**:
  - Initial: closed, no messages, not processing
  - `addMessage({ role: 'user', content: 'Fix section 3' })` → message has id and timestamp
  - `toggleOpen()` → isOpen true, toggle again → false
  - `setProcessing(true)` → isProcessing true
  - `setPending(3, 'Fix the scope')` → pendingSection is 3, pendingFeedback set
  - `clearPending()` → both undefined
  - `clearMessages()` → empty array
- **Acceptance**: Human reviews store shape against chat panel requirements
- **Lock criteria**: Tests pass

---

### T-2.7: Blueprint Store

- **Depends on**: T-0.1
- **Input**: Blueprint-related useState hooks (8 vars)
- **Output**:
  - `src/stores/blueprintStore.ts`
- **Spec**:
  - Zustand store with:
    ```
    State:
      code: string              // Mermaid source
      diagramType: string       // flowchart, sequence, etc.
      reasoning: string
      svgContent: string        // rendered SVG for export
      zoom: number              // percentage, default 100
      isFullscreen: boolean
      isGenerating: boolean
      error: string | null
    
    Actions:
      setCode(code: string, type?: string, reasoning?: string): void
      setSvg(svg: string): void
      setZoom(zoom: number): void
      toggleFullscreen(): void
      setGenerating(generating: boolean): void
      setError(error: string | null): void
      reset(): void
    ```
- **Tests**:
  - Initial: empty code, zoom 100, not fullscreen
  - `setCode('graph LR; A-->B', 'flowchart')` → code and type set
  - `setZoom(150)` → zoom is 150
  - `toggleFullscreen()` → isFullscreen true
  - `reset()` → back to defaults
- **Acceptance**: Human reviews completeness
- **Lock criteria**: Tests pass

---

### T-2.8: Issue Store

- **Depends on**: T-0.1
- **Input**: Issue-related useState hooks (8 vars), ParsedUserStory type from existing types.ts
- **Output**:
  - `src/stores/issueStore.ts`
- **Spec**:
  - Zustand store with:
    ```
    State:
      parsedStories: ParsedUserStory[]
      selectedStoryIds: string[]
      existingIssues: Array<{ id: number; iid: number; title: string; state: string; web_url: string }>
      isAnalyzing: boolean
      isCreating: boolean
      creationProgress: { current: number; total: number; currentTitle: string }
    
    Actions:
      setParsedStories(stories: ParsedUserStory[]): void
      toggleStorySelection(id: string): void
      selectAll(): void
      deselectAll(): void
      setExistingIssues(issues): void
      setAnalyzing(analyzing: boolean): void
      setCreating(creating: boolean): void
      updateCreationProgress(progress): void
      reset(): void
    ```
- **Tests**:
  - `toggleStorySelection` adds then removes on second call
  - `selectAll` selects all non-duplicate stories
  - `deselectAll` empties selection
  - `reset` clears everything
  - Progress updates correctly
- **Acceptance**: Human reviews against BRD FR-8
- **Lock criteria**: Tests pass

---

*[Document continues in Phase 3 through Phase 19 — see next sessions]*

---

## Task Count Summary (Phase 0-2)

| Phase | Tasks | Est. Total Tests |
|-------|-------|-----------------|
| Phase 0: Foundation | 4 tasks (T-0.1 through T-0.4) | ~80 |
| Phase 1: Domain Model | 5 tasks (T-1.1 through T-1.5) | ~90 |
| Phase 2: State Management | 8 tasks (T-2.1 through T-2.8) | ~100 |
| **Total Phase 0-2** | **17 tasks** | **~270 tests** |

## What Comes Next (Preview)

| Phase | Focus | Est. Tasks |
|-------|-------|-----------|
| Phase 3 | Service Layer (AI client, GitLab client, template loader) | ~8 |
| Phase 4 | Pipeline Engine (6 stages, scoring, prompts) | ~15 |
| Phase 5 | UI Shell (App layout, sidebar, tabs) | ~5 |
| Phase 6 | Epic Editor (FR-1) | ~8 |
| Phase 7 | Settings (FR-10) | ~5 |
| Phase 8 | Toast Notifications (FR-11) | ~2 |
| Phase 9 | Refine Pipeline UI (FR-2) | ~6 |
| Phase 10 | Quality Scoring (FR-3) | ~5 |
| Phase 11 | Category Templates (FR-4) | ~4 |
| Phase 12 | Complexity Level (FR-5) | ~4 |
| Phase 13 | Chat Feedback (FR-6) | ~6 |
| Phase 14 | GitLab Integration (FR-7) | ~10 |
| Phase 15 | Issue Creation (FR-8) | ~6 |
| Phase 16 | Blueprint (FR-9) | ~5 |
| Phase 17 | Authentication (FR-12) | ~4 |
| Phase 18 | Integration Testing | ~8 |
| Phase 19 | Migration & Cleanup | ~4 |
| **Estimated Total** | | **~120 tasks** |

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-03-15 | Phase 0-2 drafted (17 tasks, ~270 tests) |
| | | Phases 3-19 previewed, to be drafted in follow-up sessions |
