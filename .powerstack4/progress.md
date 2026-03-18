# Progress Log

## Session: 2026-03-15

### Phase 0: Foundation — Complete
### Phase 1: Domain Model — Complete (327 tests)

---

### Phase 2: State Management

#### T-2.1 Epic Store — Complete (23 tests)
#### T-2.2 Pipeline Store — Complete
- `src/stores/pipelineStore.ts` — Zustand store, 118 lines
- `src/stores/pipelineStore.test.ts` — 18 tests across 7 describe blocks

##### Store shape:
- **State:** isRunning, stages (6-stage Record), result (PipelineResult|null), error, showPanel
- **Actions:** startPipeline (guard), updateStage, completePipeline, failPipeline, setShowPanel, reset

##### Key behaviors:
- `startPipeline` resets all stages, clears result/error, shows panel, guards double-start
- `updateStage` updates single stage without affecting others
- `completePipeline` stops running, stores result
- `failPipeline` stops running, stores error (caller must updateStage first)
- `reset` creates fresh stage objects via createPendingStages()

[SIMPLIFY] No changes needed — clean minimal store
[REVIEW] Approved — Critical: 0, Important: 1 (documented: caller protocol for failPipeline), Minor: 2 (noted)

##### Verification:
- `npm run build` → exits 0
- `npx vitest run` → 368 tests passed

#### T-2.3 UI Store — Complete
- `src/stores/uiStore.ts` — Zustand store, 85 lines
- `src/stores/uiStore.test.ts` — 15 tests across 5 describe blocks

##### Store shape:
- **State:** activeTab (TabId), sidebarCollapsed (boolean), activeModal (ModalId|null), toasts (Toast[])
- **Actions:** setActiveTab, toggleSidebar, setSidebarCollapsed, openModal, closeModal, addToast, removeToast
- **Types:** TabId = 'editor'|'blueprint'|'settings', ModalId = 'publish'|'loadEpic'|'issueCreation'|'critique'

##### Key behaviors:
- 'wizard' tab removed from TabId — TypeScript rejects it at compile time
- openModal replaces any current modal (only one at a time)
- addToast uses crypto.randomUUID() for id generation
- removeToast filters by id, preserving other toasts

[SIMPLIFY] No changes needed — minimal store
[REVIEW] Approved — Critical: 0, Important: 0, Minor: 0

##### Verification:
- `npx vitest run` → 383 tests passed (368 + 15 new)

#### T-2.4 Config Store — Complete
- `src/stores/configStore.ts` — Zustand store, 131 lines
- `src/stores/configStore.test.ts` — 17 tests across 6 describe blocks

##### Store shape:
- **State:** config (AppConfig), gitlabTestStatus/azureTestStatus/openaiTestStatus (TestStatus|null)
- **Actions:** loadFromStorage, saveToStorage, updateConfig (deep-merge), set*TestStatus x3
- **Computed:** isAIEnabled(), getActiveProvider()
- **Types:** TestStatus { success, message }, DeepPartial<T> (local)

##### Key behaviors:
- localStorage key: `epic-generator-config`
- updateConfig deep-merges via structuredClone + deepMerge (no mutation)
- loadFromStorage merges onto DEFAULT_CONFIG base (handles schema evolution)
- loadFromStorage guards against non-object JSON and invalid JSON (falls back to defaults)
- isAIEnabled returns false only when provider is 'none'

[SIMPLIFY] No changes needed — minimal store
[REVIEW] Approved — Critical: 0, Important: 1 (fixed: loadFromStorage now deep-merges onto defaults), Minor: 3 (noted)

##### Verification:
- `npx vitest run` → 400 tests passed (383 + 17 new)

#### T-2.5 GitLab Store — Complete
- `src/stores/gitlabStore.ts` — Zustand store, 210 lines
- `src/stores/gitlabStore.test.ts` — 25 tests across 9 describe blocks

##### Store shape (24 state variables):
- **Epic browsing (8):** epics, loadingEpics, totalCount, searchTerm, filterState, filterLabels, page, availableLabels
- **Selected epic (3):** selectedEpic, epicChildren, loadingDetails
- **Group navigation (3):** currentGroupId, breadcrumb, groupCache
- **Publish (4):** publishLevel, publishTargetGroupId, isPublishing, publishStatus
- **Load modal (6):** loadModalOpen, loadSearchTerm, loadFilterState, loadResults, loadingResults, includeDescendants
- **Actions (13):** setSearchTerm, setFilterState, setPage, setSelectedEpic, clearSelectedEpic, navigateToGroup, navigateUp, setPublishLevel, setPublishTargetGroup, setPublishStatus, openLoadModal, closeLoadModal, reset

##### Key behaviors:
- State-only — no API calls (Phase 3 service layer)
- Placeholder GitLab types defined locally (GitLabEpic, GitLabEpicChild, GitLabLabel, GroupCacheEntry)
- navigateToGroup accumulates breadcrumb; navigateUp pops last entry (no-op when empty)
- clearSelectedEpic also resets epicChildren and loadingDetails
- closeLoadModal resets all load modal state (search, filter, results, includeDescendants)

[SIMPLIFY] No changes needed — large but minimal store
[REVIEW] Approved — Critical: 0, Important: 1 (fixed: closeLoadModal now resets loadFilterState + includeDescendants), Minor: 3 (noted)

##### Verification:
- `npx vitest run` → 425 tests passed (400 + 25 new)

#### T-2.6 Chat Store — Complete
- `src/stores/chatStore.ts` — Zustand store, 92 lines
- `src/stores/chatStore.test.ts` — 17 tests across 7 describe blocks

##### Store shape:
- **State (6):** messages (ChatMessage[]), isOpen, isProcessing, pendingSection?, pendingFeedback?, input
- **Actions (8):** toggleOpen, setOpen, setInput, addMessage, setProcessing, setPending, clearPending, clearMessages
- **Types:** ChatMessage { id, role: 'user'|'assistant'|'system', content, timestamp }

##### Key behaviors:
- addMessage auto-generates id (crypto.randomUUID()) and timestamp (Date.now())
- setPending accepts optional section and feedback params
- clearPending resets both to undefined

[SIMPLIFY] No changes needed — minimal store
[REVIEW] Approved — Critical: 0, Important: 0, Minor: 2 (noted)

##### Verification:
- `npx vitest run` → 442 tests passed (425 + 17 new)

#### T-2.7 Blueprint Store — Complete
- `src/stores/blueprintStore.ts` — Zustand store, 83 lines
- `src/stores/blueprintStore.test.ts` — 18 tests across 8 describe blocks

##### Store shape:
- **State (8):** code, diagramType, reasoning, svgContent, zoom (default 100), isFullscreen, isGenerating, error
- **Actions (7):** setCode (with optional type/reasoning), setSvg, setZoom, toggleFullscreen, setGenerating, setError, reset

##### Key behaviors:
- setCode defaults optional type/reasoning to '' (resets stale values on code-only updates)
- zoom has no clamping (UI layer responsibility)

[SIMPLIFY] No changes needed — minimal store
[REVIEW] Approved — Critical: 0, Important: 0, Minor: 2 (noted: zoom bounds, setCode reset behavior)

##### Verification:
- `npx vitest run` → 460 tests passed (442 + 18 new)

#### T-2.8 Issue Store — Complete
- `src/stores/issueStore.ts` — Zustand store, 116 lines
- `src/stores/issueStore.test.ts` — 17 tests across 8 describe blocks

##### Store shape:
- **State (6):** parsedStories, selectedStoryIds, existingIssues, isAnalyzing, isCreating, creationProgress
- **Actions (9):** setParsedStories, toggleStorySelection, selectAll, deselectAll, setExistingIssues, setAnalyzing, setCreating, updateCreationProgress, reset
- **Types:** ParsedUserStory, ExistingIssue, CreationProgress

##### Key behaviors:
- toggleStorySelection is a true toggle (add/remove)
- selectAll filters out isDuplicate stories
- creationProgress tracks {current, total, currentTitle}

[SIMPLIFY] No changes needed — minimal store
[REVIEW] Approved — Critical: 0, Important: 0, Minor: 3 (noted)

##### Verification:
- `npx vitest run` → 477 tests passed (460 + 17 new)

---

### Phase 3: Service Layer

#### T-3.1 AI Service Types & Unified Client Interface — Complete
- `src/services/ai/types.ts` — 37 lines (AIRequest, AIResponse, AIClientConfig)
- `src/services/ai/aiClient.ts` — 108 lines (callAI, isAIEnabled, getActiveAIProvider, detectModelFamily, getSafeModelParams)
- `src/services/ai/aiClient.test.ts` — 22 tests across 5 describe blocks

##### Architecture:
- **callAI** routes to Azure/OpenAI via fetch, throws on 'none'
- **buildAzureRequest/buildOpenAIRequest** private helpers build provider-specific URL + headers
- Azure: api-key header, deployment-based URL. OpenAI: Bearer token, model in body
- All functions receive config as param — no global state
- Response maps snake_case → camelCase (prompt_tokens → promptTokens)

##### Key behaviors:
- detectModelFamily checks gpt-4o-mini before gpt-4o (substring ordering)
- OpenAI baseUrl falls back to endpoints.openaiBaseUrl
- getSafeModelParams resolves model per provider, returns MODEL_LIMITS entry
- Trailing slashes stripped from endpoints

[SIMPLIFY] No changes needed — clean minimal service
[REVIEW] Approved — Critical: 0, Important: 1 (fixed: model field in OpenAI request body), Minor: 4 (noted)

##### Verification:
- `npx vitest run` → 499 tests passed (477 + 22 new)

#### T-3.2 Azure OpenAI Client — Complete
- `src/services/ai/azureClient.ts` — 109 lines
- `src/services/ai/azureClient.test.ts` — 17 tests across 6 describe blocks

##### Architecture:
- **callAzure(config, endpoint, request)** — Azure-specific URL construction, api-key header, rich error handling
- **testAzure(config, endpoint)** — connection test with minimal token request, returns {success, error?}
- **buildAzureError** — status-specific messages: 401 auth, 404 deployment, 429 rate limit + Retry-After, 500+ server
- **parseAzureResponse** — snake_case → camelCase, graceful handling of missing usage/choices

[SIMPLIFY] No changes needed — clean service
[REVIEW] Approved — Critical: 0, Important: 1 (fixed: removed non-null assertion, fixed "unknowns" grammar), Minor: 3 (noted)

##### Verification:
- `npx vitest run` → 516 tests passed (499 + 17 new)

#### T-3.3 OpenAI Direct Client — Complete
- `src/services/ai/openaiClient.ts` — 107 lines
- `src/services/ai/openaiClient.test.ts` — 17 tests across 7 describe blocks

##### Architecture:
- **callOpenAI(config, baseUrl, request)** — Bearer token auth, model in body, custom baseUrl support
- **testOpenAI(config, baseUrl)** — returns {success, error?, model?} (includes model name on success)
- **buildOpenAIError** — 401/429+Retry-After/500+ handling (no 404 branch — no deployment concept)
- **parseOpenAIResponse** — identical structure to parseAzureResponse (self-contained)

[SIMPLIFY] No changes needed
[REVIEW] Approved — Critical: 0, Important: 0, Minor: 0

##### Verification:
- `npx vitest run` → 533 tests passed (516 + 17 new)

#### T-3.4 Request Throttler (AIMD Rate Limiter) — Complete
- `src/services/ai/throttler.ts` — 158 lines
- `src/services/ai/throttler.test.ts` — 17 tests across 2 describe blocks, stable across 3 runs

##### Architecture:
- **RequestThrottler class**: semaphore-based concurrency control + minimum delay enforcement
- **AIMD backoff**: on429 halves concurrent (min 1) + doubles delay; onSuccess recovers 0.9x delay + +1 concurrent
- **withRetry**: exponential backoff (baseDelay * 2^attempt), 7 retryable error patterns, label in messages
- **apiThrottler**: default instance (2 concurrent, 500ms delay)

##### Key implementation:
- `_acquireSlot` atomically increments activeRequests (prevents race on concurrent calls)
- Queue-based waiting: `_queue` stores resolve callbacks, released in `finally` block
- Retry logging: `console.warn` on each retry attempt with label, attempt count, and delay

[SIMPLIFY] No changes needed — clean module
[REVIEW] Approved — Critical: 0, Important: 1 (fixed: added console.warn retry logging), Minor: 3 (noted)

##### Verification:
- `npx vitest run` → 550 tests passed (533 + 17 new)

#### T-3.5 GitLab Client — Core API Functions — Complete
- `src/services/gitlab/types.ts` — ~140 lines (8 entity types, 9 result types, 3 param types)
- `src/services/gitlab/gitlabClient.ts` — ~400 lines (20 exported API functions + 3 utils)
- `src/services/gitlab/gitlabClient.test.ts` — 31 tests across 12 describe blocks

##### Architecture:
- **Internal helpers**: gitlabGet, gitlabMutate (shared POST/PUT), requireAuth
- **Auth**: PAT (PRIVATE-TOKEN) / OAuth (Bearer) / empty
- **Base URL**: /gitlab-api (Vite proxy)
- **Pattern**: never throws, always { success, data?, error? }

##### Functions by domain:
- **Epics (5)**: fetchGroupEpics, fetchEpicDetails, fetchEpicChildren, createGitLabEpic, updateGitLabEpic
- **Groups (4)**: fetchGitLabSubgroups, fetchGroupMetadata, fetchGitLabSubgroupsWithMetadata (placeholder), fetchGroupEpicsForHierarchy
- **Labels (1)**: fetchGroupLabels
- **Issues (3)**: createGitLabIssue, linkIssueToEpic, fetchEpicIssues
- **Files (3)**: fetchGitLabRepositoryTree, fetchGitLabFileContent, fetchGitLabBranches
- **Publish (3)**: commitToGitLabBranch, createGitLabMergeRequest, publishWithMergeRequest
- **Connection (1)**: testGitLabConnection

[SIMPLIFY] gitlabClient.ts — extracted gitlabMutate from duplicate gitlabPost/gitlabPut
[REVIEW] Approved — Critical: 0, Important: 3 (fixed: no-op wrapper documented, empty web_url fixed, 5 critical tests added), Minor: 3 (noted)

##### Verification:
- `npx vitest run` → 581 tests passed (550 + 31 new)

#### T-3.6 Category Template Loader — Complete
- `src/services/templates/categoryTemplates.json` — ~260 lines (7 categories + _meta)
- `src/services/templates/templateLoader.ts` — 246 lines (8 exported functions + 6 types)
- `src/services/templates/templateLoader.test.ts` — 29 tests across 9 describe blocks

##### Architecture:
- **Data**: categoryTemplates.json — 7 category templates (underscore keys), _meta with globalDefaults
- **Types**: RichSectionConfig, RichCategoryTemplate, GlobalTemplateDefaults, RichTemplateData, MermaidDiagramType, ProgressiveDisclosure
- **Querying**: loadCategoryTemplate (fallback to technical_design), findSectionConfig (normalized fuzzy match), getSectionWordLimits, getSectionFormat
- **Format Instructions**: getFormatInstruction covers all 18 SectionFormat values
- **Complexity Scaling**: getScaledTemplate applies COMPLEXITY_CONFIGS multipliers, controls section inclusion

##### Key complexity scaling behavior:
- Simple (0.5x): required sections only, halved word targets
- Moderate (1.0x): required + key optional (first half by JSON order), standard targets
- Complex (1.5x): all sections, 1.5x word targets
- Returns NEW object — original template immutable

[SIMPLIFY] No changes needed — inherent domain complexity
[REVIEW] Approved — Critical: 0, Important: 2 (latent: shallow copy risk, loose index sig), Minor: 3 (noted)

##### Verification:
- `npx vitest run` → 610 tests passed (581 + 29 new)
- All 21 category×complexity combinations validated

---

### Phase 4: Pipeline

#### T-4.1 Pipeline Types and Interfaces — Complete
- `src/pipeline/pipelineTypes.ts` — 30 exported types (231 lines)
- `src/pipeline/fixtures/samplePipelineData.ts` — valid instances of all 30 types (271 lines)
- `src/pipeline/pipelineTypes.test.ts` — 4 tests (export count, exhaustiveness, compilation, well-formedness)

##### Types defined:
- **Supporting (13):** EntityRelationship, SemanticSection, ExtractedRequirement, RequirementGap, SectionScore, TransformationAction, PipelineRefinedSection, PipelineUserStory, AssembledEpic, TraceabilityRow, AuditCheckItem, DetectedFailure
- **Stage outputs (6):** ComprehensionOutput, ClassificationOutput, StructuralOutput, RefinementOutput, MandatoryOutput, ValidationOutput
- **Pipeline-level (5):** StageResult<T>, StageMetadata, PipelineConfig, PipelineProgress, PipelineProgressCallback, PipelineResult, StageFunction<TInput,TOutput>
- **Stage inputs (6):** ComprehensionInput, ClassificationInput, StructuralInput, RefinementInput, MandatoryInput, ValidationInput

[SIMPLIFY] No changes needed — pure type-definition file
[REVIEW] Approved — Critical: 0, Important: 1 (Record<string, unknown> tech debt), Minor: 3 (noted)

##### Verification:
- `npx tsc --noEmit` → zero errors in pipeline files
- `npx vitest run src/pipeline/pipelineTypes.test.ts` → 4 tests passed

#### T-4.2 Stage 1 Prompt: Deep Comprehension — Complete
- `src/pipeline/prompts/comprehensionPrompt.ts` — 164 lines (prompt builder + PROMPT_VERSION)
- `src/pipeline/prompts/comprehensionPrompt.test.ts` — 18 tests (interpolation, field refs, snapshot, line count, complexity scaling)

##### Architecture:
- **buildComprehensionPrompt(vars)** — returns single template literal prompt string
- **PROMPT_VERSION** — semver '1.0.0' for tracking
- **ComprehensionPromptVars** — {rawContent, title, complexityLevel, wordTarget}
- **COMPLEXITY_INSTRUCTIONS** — Record<ComplexityLevel, string> with scaling for simple/moderate/complex
- Prompt sections: system identity, task+complexity, input document (XML), JSON output schema, detailed instructions, quality criteria
- Rendered output: 112 lines (within 80–250 range)

[SIMPLIFY] No changes needed — single template literal function
[REVIEW] Approved — Critical: 0, Important: 0, Minor: 2 (title quoting, SemanticSection test overlap)

##### Verification:
- `npx tsc --noEmit` → zero errors in prompt files
- `npx vitest run src/pipeline/prompts/comprehensionPrompt.test.ts` → 18 tests passed
- All ComprehensionOutput fields present in prompt: ✅
- Complexity-aware instructions for all 3 levels: ✅
- Line count 112 (in [80,250]): ✅

#### T-4.3 Stage 2 Prompt: Category Classification — Complete
- `src/pipeline/prompts/classificationPrompt.ts` — 160 lines (prompt builder + PROMPT_VERSION)
- `src/pipeline/prompts/classificationPrompt.test.ts` — 17 tests

##### Architecture:
- **buildClassificationPrompt(vars)** — returns template literal prompt string
- **PROMPT_VERSION** — semver '1.0.0'
- **ClassificationPromptVars** — {comprehensionSummary, rawContent, availableCategories, complexityLevel}
- **CATEGORY_DESCRIPTIONS** — Record<EpicCategory, string> with descriptions from categoryTemplates.json + tone
- **COMPLEXITY_INSTRUCTIONS** — Record<ComplexityLevel, string> scaling for simple/moderate/complex
- Prompt sections: system identity, task+complexity, comprehension context (XML), input document, category list, JSON output schema, confidence ranges, classification signals, decision process, quality criteria
- Confidence ranges: 0.9-1.0 (unambiguous), 0.7-0.89 (strong), 0.6-0.69 (moderate), <0.6 (must still pick + note uncertainty)

[SIMPLIFY] No changes needed — single template literal function
[REVIEW] Approved — Critical: 0, Important: 0, Minor: 2 (category description drift risk, subset category test)

##### Verification:
- `npx tsc --noEmit` → zero errors
- `npx vitest run src/pipeline/prompts/classificationPrompt.test.ts` → 17 tests passed
- All 7 EpicCategory values present: ✅
- All ClassificationOutput fields (primaryCategory, confidence, categoryConfig, reasoning): ✅
- Confidence scoring instructions present: ✅

#### T-4.4 Stage 3 Prompt: Structural Assessment — Complete
- `src/pipeline/prompts/structuralPrompt.ts` — 219 lines (prompt builder + PROMPT_VERSION)
- `src/pipeline/prompts/structuralPrompt.test.ts` — 20 tests

##### Architecture:
- **buildStructuralPrompt(vars)** — returns template literal prompt string
- **PROMPT_VERSION** — semver '1.0.0'
- **StructuralPromptVars** — {comprehensionSummary, classificationResult, rawContent, sectionList, complexityLevel, categoryTemplateSections}
- Scoring rubric with calibration examples: 4 bands (1-3, 4-6, 7-8, 9-10) × 3 dimensions
- Weighted overall formula: completeness 40% + relevance 30% + placement 30%
- All 5 transformation actions: keep, restructure, merge, split, add
- Missing section detection with fuzzy matching instruction
- Output JSON matches StructuralOutput (sectionScores, transformationPlan, missingSections)

[SIMPLIFY] No changes needed — single template literal function
[REVIEW] Approved — Critical: 0, Important: 0, Minor: 2 (empty sectionList edge case, weight constants extraction)

##### Verification:
- `npx tsc --noEmit` → zero errors
- `npx vitest run src/pipeline/prompts/structuralPrompt.test.ts` → 20 tests passed
- Scoring rubric with calibration examples: ✅
- All 5 transformation actions: ✅
- All StructuralOutput fields: ✅

#### T-4.5 Stage 4 Prompt: Content Refinement — Complete
- `src/pipeline/prompts/refinementPrompt.ts` — 193 lines (per-section prompt builder)
- `src/pipeline/prompts/refinementPrompt.test.ts` — 31 tests

##### Architecture:
- **buildRefinementPrompt(vars)** — per-section prompt (called once per section, not once per doc)
- **PROMPT_VERSION** — semver '1.0.0'
- **RefinementPromptVars** — {sectionTitle, sectionContent, transformationAction, categoryName, formatInstruction, complexityLevel, wordTarget, previousFeedback?, iterationNumber}
- Conditional feedback: `iterationNumber > 0 && previousFeedback` → includes `<previous_attempt_feedback>` XML block
- ACTION_INSTRUCTIONS: Record<TransformationAction['action'], string> with per-action rewrite guidance
- Format instruction from getFormatInstruction() interpolated into `<format_instruction>` block
- Word target with ±20% tolerance computed via Math.round
- Output JSON matches PipelineRefinedSection (sectionId, title, content, formatUsed)

[SIMPLIFY] No changes needed — clean conditional prompt builder
[REVIEW] Approved — Critical: 0, Important: 0, Minor: 3 (isRetry edge case, empty feedback doc, wordTarget guard)

##### Verification:
- `npx tsc --noEmit` → zero errors
- `npx vitest run src/pipeline/prompts/refinementPrompt.test.ts` → 31 tests passed
- First attempt (no feedback): ✅
- Retry (with feedback): ✅
- Format instruction interpolated: ✅
- Complexity scaling: ✅
- All PipelineRefinedSection fields: ✅

#### T-4.6 Stage 5 Prompt: Mandatory Sections — Complete
- `src/pipeline/prompts/mandatoryPrompt.ts` — prompt builder
- `src/pipeline/prompts/mandatoryPrompt.test.ts` — 23 tests

##### Architecture:
- **buildMandatoryPrompt(vars)** — generates Mermaid diagram + user stories + assembled epic
- Two major sub-tasks: architecture diagram (Mermaid syntax with graph/flowchart/sequence guidance) + user stories (As a/I want/So that, 3-5 AC, priority, requirement traceability)
- Story count from storyCountMin–storyCountMax (from getScaledStoryCount)
- Entities listed for diagram node generation
- Output JSON matches MandatoryOutput (architectureDiagram, userStories, assembledEpic)

[SIMPLIFY] No changes needed — single template literal function
[REVIEW] Approved — Critical: 0, Important: 0, Minor: 2 (empty entities edge case, metadata type tightening)

##### Verification:
- `npx tsc --noEmit` → zero errors
- `npx vitest run src/pipeline/prompts/mandatoryPrompt.test.ts` → 23 tests passed
- Mermaid syntax guidance: ✅
- User story template (As a/I want/So that): ✅
- Story count scales with complexity: ✅
- Requirement traceability: ✅
- All MandatoryOutput fields: ✅

#### T-4.7 Stage 6 Prompt: Validation Gate — Complete
- `src/pipeline/prompts/validationPrompt.ts` — prompt builder
- `src/pipeline/prompts/validationPrompt.test.ts` — 24 tests

##### Architecture:
- **buildValidationPrompt(vars)** — validates epic through 3 lenses
- Three validation modes: requirements traceability (REQ-xxx → section/story mapping), self-audit (12 quality checks scored 0-10, overall 0-100), failure pattern detection (11 patterns: 3 critical, 4 major, 4 minor)
- Actionable feedback with good/bad examples contrasted
- Passing score threshold interpolated from config (complexity-scaled)
- Retry iteration awareness (iterationNumber > 0)
- Output JSON matches ValidationOutput (traceabilityMatrix, auditChecks, overallScore, passed, detectedFailures, feedback)

[SIMPLIFY] No changes needed — single template literal function
[REVIEW] Approved — Critical: 0, Important: 0, Minor: 2 (entity interpolation test, iterationNumber boundary test)

##### Verification:
- `npx tsc --noEmit` → zero errors
- `npx vitest run src/pipeline/prompts/validationPrompt.test.ts` → 24 tests passed
- 3 validation modes (traceability, audit, failure detection): ✅
- Actionable feedback (specific, not generic): ✅
- Passing score threshold interpolated: ✅
- All ValidationOutput fields: ✅

---

### Phase 4 Pipeline Prompts — COMPLETE
All 6 stage prompts built (T-4.2 through T-4.7): comprehension, classification, structural, refinement, mandatory, validation. Total: 133 tests across 6 prompt builders.

#### T-4.8 BM25-Based Quality Scorer — Complete
- `src/pipeline/epicScorer.ts` — 319 lines, zero AI dependency
- `src/pipeline/epicScorer.test.ts` — 42 tests

##### Architecture:
- **saturate(value, k)** — BM25 saturation primitive, pure function
- **detectFiller(text)** — 5 categories, 85 total patterns (hedging 22, emptyPhrases 17, aiFluff 20, redundantModifiers 13, vagueLanguage 13), word-boundary-safe
- **scoreSection(content, terms, config)** — 5 dimensions (completeness, clarity, specificity, actionability, technicalDepth), overall via weighted geometric mean
- **scoreDocument(sections, terms, config)** — per-dimension minimum gate, recommendations
- **getDefaultScoringConfig(complexity)** — thresholds: simple=80, moderate=85, complex=90
- Aggregation: weighted geometric mean with 0.01 floor, per-dimension minimum gate

[SIMPLIFY] No changes needed — clean deterministic module
[REVIEW] Approved — Critical: 0, Important: 1 (fixed: test assertion accuracy), Minor: 3 (noted)

##### Verification:
- `npx tsc --noEmit` → zero errors
- `npx vitest run src/pipeline/epicScorer.test.ts` → 42 tests passed
- saturate(0,1.2)=0, saturate(1,1.2)≈0.4545, saturate(100,1.2)≈0.988: ✅
- Filler detection 5 categories, 85 patterns (≥70): ✅
- 5-dimension scoring with geometric mean: ✅
- Complexity thresholds 80/85/90: ✅
- Zero AI dependency: ✅

#### T-4.9 Stage 1 Implementation: Deep Comprehension — Complete
- `src/pipeline/stages/runStage1Comprehension.ts` — 238 lines
- `src/pipeline/stages/runStage1Comprehension.test.ts` — 18 tests

##### Architecture:
- **runStage1Comprehension(input, config, aiConfig, onProgress?)** — async stage function
- Uses `buildComprehensionPrompt` (not inline template)
- Uses `withRetry` for transient API errors (max 3 retries)
- JSON parsing: direct parse → code block extraction fallback
- Validation: normalizes all fields, defaults for invalid enums (priority→medium, severity→minor)
- Progress: running → complete/failed
- Never throws: returns StageResult with success: false
- Duration via Date.now(), token usage from AI response
- **Design decision**: added `aiConfig: AIClientConfig` param (beyond StageFunction signature) — orchestrator will bind via closure

[SIMPLIFY] No changes needed — clean async stage with parsing/validation pipeline
[REVIEW] Approved — Critical: 0, Important: 2 (fixed: duplicate rawContent, fragile prompt assertion), Minor: 2 (noted)

##### Verification:
- `npx tsc --noEmit` → zero errors
- `npx vitest run src/pipeline/stages/runStage1Comprehension.test.ts` → 18 tests passed
- Valid JSON → correct ComprehensionOutput: ✅
- Code block extraction: ✅
- Malformed JSON → success: false: ✅
- Network error → graceful return: ✅
- Progress callbacks: ✅

#### T-4.10 Stage 2 Implementation: Category Classification — Complete
- `src/pipeline/stages/runStage2Classification.ts` — stage + summarizeComprehension helper
- `src/pipeline/stages/runStage2Classification.test.ts` — 22 tests

##### Architecture:
- **runStage2Classification(input, config, aiConfig, onProgress?)** — classifies into 1 of 7 categories
- **summarizeComprehension(comp)** — readable text serialization (entities, requirements, gaps, risks, sections)
- Validates primaryCategory against EpicCategory enum, defaults to 'technical_design'
- Clamps confidence 0-1, defaults non-numeric to 0.5
- Same JSON parsing + withRetry + progress pattern as Stage 1

[SIMPLIFY] No changes needed
[REVIEW] Approved — Critical: 0, Important: 0, Minor: 3 (shared JSON utils, reasoning-only test, VALID_CATEGORIES derivation)

##### Verification:
- `npx tsc --noEmit` → zero errors
- `npx vitest run src/pipeline/stages/runStage2Classification.test.ts` → 22 tests passed
- All 7 categories accepted: ✅
- Invalid category → default: ✅
- Confidence clamping: ✅
- Readable comprehension summary (not JSON): ✅

#### T-4.11 Stage 3 Implementation: Structural Assessment — Complete
- `src/pipeline/stages/runStage3Structural.ts` — integrates sectionDiscovery + templateLoader
- `src/pipeline/stages/runStage3Structural.test.ts` — 11 tests
- Scores clamped 1-10, actions validated, missing sections detected, fallback local assessment

[SIMPLIFY] No changes needed
[REVIEW] Approved — Critical: 0, Important: 0 (fixed: success tracking, merge test), Minor: 4 (noted)

#### T-4.12 Stage 4 Implementation: Content Refinement — Complete
- `src/pipeline/stages/runStage4Refinement.ts` — per-section AI rewriting with 5 action types
- `src/pipeline/stages/runStage4Refinement.test.ts` — 11 tests
- All 5 actions handled (keep/restructure/merge/split/add), feedback filtering, partial failure, token aggregation

[SIMPLIFY] No changes needed
[REVIEW] Approved — Critical: 0, Important: 2 (fixed: success=false when all fail, added merge test), Minor: 3 (noted)

##### Verification:
- `npx tsc --noEmit` → zero errors
- 22 tests passed (11+11)

#### T-4.13 Stage 5 Implementation: Mandatory Sections — Complete
- `src/pipeline/stages/runStage5Mandatory.ts` — Mermaid diagram + stories + epic assembly
- `src/pipeline/stages/runStage5Mandatory.test.ts` — 12 tests
- Mermaid validation (directive check, fallback), story count truncation, story field defaults, epic assembly

[SIMPLIFY] No changes needed
[REVIEW] Approved — Critical: 0, Important: 2 (fixed: story ID counter, min count warning), Minor: 3 (noted)

#### T-4.14 Stage 6 Implementation: Validation Gate — Complete
- `src/pipeline/stages/runStage6Validation.ts` — quality gatekeeper with AI+local scoring blend
- `src/pipeline/stages/runStage6Validation.test.ts` — 17 tests
- 70/30 AI+local blend, traceability matrix, feedback quality validation, failure detection

[SIMPLIFY] No changes needed
[REVIEW] Approved — Critical: 0, Important: 0, Minor: 4 (noted)

##### Verification:
- `npx tsc --noEmit` → zero errors
- 29 tests passed (12+17)

---

### ALL 6 PIPELINE STAGES COMPLETE
Stages 1-6 implemented: Comprehension, Classification, Structural, Refinement, Mandatory, Validation.
Total stage tests: 18 + 22 + 11 + 11 + 12 + 17 = 91 tests across 6 stage implementations.

#### T-4.15 Pipeline Orchestrator — Complete
- `src/pipeline/pipelineOrchestrator.ts` — two-phase execution, pure async function
- `src/pipeline/pipelineOrchestrator.test.ts` — 13 tests
- Linear phase (1-3 abort on failure), iterative phase (4→5→6 loop with feedback forwarding)
- buildPipelineConfig from complexity, max iterations, progress events, never throws

[SIMPLIFY] No changes needed
[REVIEW] Skipped — reviewer agent hit API overload, verified via full test suite instead

#### T-4.16 Pipeline Action — Complete
- `src/pipeline/refinePipelineAction.ts` — store integration boundary
- `src/pipeline/refinePipelineAction.test.ts` — 9 tests
- Reads epicStore, writes both stores, double-run prevention, input validation, progress forwarding

[SIMPLIFY] No changes needed
[REVIEW] Skipped — reviewer agent hit API overload, verified via full test suite instead

##### Verification:
- `npx tsc --noEmit` → zero errors
- 22 tests passed (13+9)
- `npx vitest run` → **902 tests passed across 38 test files** (full suite green)

---

### PHASE 4 PIPELINE — COMPLETE
All 16 tasks (T-4.1 through T-4.16) implemented:
- T-4.1: Pipeline types (30 interfaces)
- T-4.2-4.7: 6 prompt builders (133 tests)
- T-4.8: BM25 quality scorer (42 tests)
- T-4.9-4.14: 6 stage implementations (91 tests)
- T-4.15: Pipeline orchestrator (13 tests)
- T-4.16: Pipeline action — store integration (9 tests)
Total pipeline tests: 133 + 42 + 91 + 13 + 9 + 4 (types) = 292 pipeline-specific tests
Full project test count: 902 tests across 38 files
