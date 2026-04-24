# FRAME v5 — Knowledge Base

File-by-file knowledge of the codebase. Start with [`OVERVIEW.md`](./OVERVIEW.md) for the narrative walkthrough, or [`SYSTEM.md`](./SYSTEM.md) for cross-file data-flow diagrams.

Each linked doc follows the same template: **Purpose → Exports/Props → Behavior → Dependencies → Consumers → Assumptions & edge cases**.

---

## Entry points

- [`App.md`](./App.md) — layout shell, routes `WelcomeLayout` vs `WorkspaceLayout` on `uiStore.activeView`.
- [`main.md`](./main.md) — Vite entry; hydrates config from `localStorage` **before** first render, wraps in `<AuthProvider>`.

## Domain (`domain/`)

- [`types.md`](./domain/types.md) — core interfaces: `EpicDocument`, `Section`, `CategoryId`, `Complexity`.
- [`categoryConstants.md`](./domain/categoryConstants.md) — 8 categories + display order, emoji, color.
- [`complexity.md`](./domain/complexity.md) — Simple/Moderate/Complex → word-count targets per section.
- [`configTypes.md`](./domain/configTypes.md) — `AppConfig` shape: `{ ai, gitlab, endpoints }`.
- [`epicSerializer.md`](./domain/epicSerializer.md) — markdown ↔ `EpicDocument`; `stripRequirementTags` used before GitLab publish.
- [`gitlabIdentifiers.md`](./domain/gitlabIdentifiers.md) — requirement-id tagging for traceability.
- [`sectionDiscovery.md`](./domain/sectionDiscovery.md) — H2/H3 section walker.

## Theme (`theme/`)

- [`tokens.md`](./theme/tokens.md) — CSS custom properties (UBS red, subtle, muted, etc.) injected at root.

## Stores (`stores/` — Zustand)

- [`epicStore.md`](./stores/epicStore.md) — raw markdown, parsed doc, category, SLA, complexity, template outline.
- [`pipelineStore.md`](./stores/pipelineStore.md) — stage progress, `lastValidation`, errors.
- [`blueprintStore.md`](./stores/blueprintStore.md) — mermaid code, SVG, zoom, versions, D1/D2 refinement state.
- [`chatStore.md`](./stores/chatStore.md) — chat messages, input, `isProcessing`.
- [`configStore.md`](./stores/configStore.md) — `config` + `loadFromStorage` / `persist`.
- [`uiStore.md`](./stores/uiStore.md) — `activeView`, `activeTab`, modal, toasts, split width.
- [`gitlabStore.md`](./stores/gitlabStore.md) — browse cache, search, `loadedEpicContext`, issues, publish level.
- [`issueStore.md`](./stores/issueStore.md) — local draft state for issue creation.

## Services (`services/`)

### AI (`services/ai/`)

- [`aiClient.md`](./services/ai/aiClient.md) — provider-routed `callAI`.
- [`azureClient.md`](./services/ai/azureClient.md) — Azure OpenAI adapter; resolves endpoint from `config.endpoints.azureEndpoint`.
- [`openaiClient.md`](./services/ai/openaiClient.md) — direct OpenAI adapter + GPT-5 reasoning-model branch.
- [`throttler.md`](./services/ai/throttler.md) — token-bucket limiter.
- [`types.md`](./services/ai/types.md) — `AIClientConfig`, response shapes.
- [`analyzeStoryDuplicates.md`](./services/ai/analyzeStoryDuplicates.md) — AI dedup of parsed stories vs existing issues.
- [`generateCustomStories.md`](./services/ai/generateCustomStories.md) — AI story generator from plain-text intent.
- [`generateIssueDescription.md`](./services/ai/generateIssueDescription.md) — AI body generator for created issues.

### GitLab (`services/gitlab/`)

- [`gitlabClient.md`](./services/gitlab/gitlabClient.md) — REST wrapper: groups, epics, issues, notes, labels, iterations.
- [`types.md`](./services/gitlab/types.md) — `GitLabEpic`, `GitLabIssue`, `GitLabNote`, etc.

### Templates (`services/templates/`)

- [`templateLoader.md`](./services/templates/templateLoader.md) — loads v7 category JSON, produces section outlines.

### DocMining (`services/docmining/`)

- [`docminingClient.md`](./services/docmining/docminingClient.md) — POST file → markdown via FastAPI backend; `{ ok, data | error }` envelope.

## Pipeline (`pipeline/`)

- [`pipelineOrchestrator.md`](./pipeline/pipelineOrchestrator.md) — **pure** state machine; owns stage sequencing + iterative 4→5→6 loop.
- [`refinePipelineAction.md`](./pipeline/refinePipelineAction.md) — thin boundary between UI and orchestrator; wires store writes.
- [`pipelineTypes.md`](./pipeline/pipelineTypes.md) — stage IO shapes, `ValidationOutput`.
- [`epicScorer.md`](./pipeline/epicScorer.md) — V4-parity quality scorer (RAKE, graph, fuzzy match, Pareto, adaptive convergence).
- [`fixtures/samplePipelineData.md`](./pipeline/fixtures/samplePipelineData.md) — test fixtures.

### Stages

- [`stages/runStage1Comprehension.md`](./pipeline/stages/runStage1Comprehension.md)
- [`stages/runStage2Classification.md`](./pipeline/stages/runStage2Classification.md)
- [`stages/runStage3Structural.md`](./pipeline/stages/runStage3Structural.md)
- [`stages/runStage4Refinement.md`](./pipeline/stages/runStage4Refinement.md) — also emits mermaid into `blueprintStore`.
- [`stages/runStage4bCoherence.md`](./pipeline/stages/runStage4bCoherence.md) — hidden stage; no UI progress.
- [`stages/runStage5Mandatory.md`](./pipeline/stages/runStage5Mandatory.md)
- [`stages/runStage6Validation.md`](./pipeline/stages/runStage6Validation.md)

### Prompts (`pipeline/prompts/` + `examples/`)

- Builder files: [`comprehensionPrompt`](./pipeline/prompts/comprehensionPrompt.md), [`classificationPrompt`](./pipeline/prompts/classificationPrompt.md), [`structuralPrompt`](./pipeline/prompts/structuralPrompt.md), [`refinementPrompt`](./pipeline/prompts/refinementPrompt.md), [`coherencePrompt`](./pipeline/prompts/coherencePrompt.md), [`mandatoryPrompt`](./pipeline/prompts/mandatoryPrompt.md), [`validationPrompt`](./pipeline/prompts/validationPrompt.md).
- Examples: [`comprehensionExample`](./pipeline/prompts/examples/comprehensionExample.md), [`classificationExample`](./pipeline/prompts/examples/classificationExample.md), [`structuralExample`](./pipeline/prompts/examples/structuralExample.md), [`refinementExample`](./pipeline/prompts/examples/refinementExample.md), [`mandatoryExample`](./pipeline/prompts/examples/mandatoryExample.md), [`validationExample`](./pipeline/prompts/examples/validationExample.md).

### Utils

- [`utils/diagramTheme.md`](./pipeline/utils/diagramTheme.md) — Paul Tol palette.
- [`utils/parseUserStories.md`](./pipeline/utils/parseUserStories.md) — extracts `ParsedUserStory` from markdown.

## Actions (`actions/`, `chat/`)

- [`actions/createIssuesAction.md`](./actions/createIssuesAction.md) — bulk issue creation with progress callback.
- [`actions/fetchIssuesAction.md`](./actions/fetchIssuesAction.md) — refreshes epic's linked issues into `gitlabStore`.
- [`actions/regenerateBlueprintAction.md`](./actions/regenerateBlueprintAction.md) — D1 (`interpretDiagramFeedback`) + D2 (`regenerateBlueprintAction`).
- [`chat/chatAction.md`](./chat/chatAction.md) — handles chat message submit, includes epic context.

## Components (`components/`)

### Auth (`auth/`)

- [`AuthContext`](./components/auth/AuthContext.md), [`AuthProvider`](./components/auth/AuthProvider.md), [`MockAuthProvider`](./components/auth/MockAuthProvider.md), [`AuthGuard`](./components/auth/AuthGuard.md), [`UserMenu`](./components/auth/UserMenu.md), [`index`](./components/auth/index.md).

### Layout (`layout/`)

- [`ViewRouter`](./components/layout/ViewRouter.md) — tab switch with `ErrorBoundary` per view.
- [`WorkspaceSidebar`](./components/layout/WorkspaceSidebar.md), [`WelcomeSidebar`](./components/layout/WelcomeSidebar.md).
- [`ModalHost`](./components/layout/ModalHost.md) — `uiStore.activeModal` fan-out.
- [`ErrorBoundary`](./components/layout/ErrorBoundary.md), [`SplitPane`](./components/layout/SplitPane.md), [`PlaceholderView`](./components/layout/PlaceholderView.md).

### Shared (`shared/`)

- [`Modal`](./components/shared/Modal.md), [`Toast`](./components/shared/Toast.md), [`ToastContainer`](./components/shared/ToastContainer.md), [`ImpulseLine`](./components/shared/ImpulseLine.md).

### Editor (`editor/`)

- [`EditorPane`](./components/editor/EditorPane.md) — empty-state category picker / raw markdown textarea.
- [`PreviewPane`](./components/editor/PreviewPane.md) — react-markdown + inline mermaid blocks.
- [`WorkspaceHeader`](./components/editor/WorkspaceHeader.md) — toolbar: Load, Category, Complexity, SLA, Refine, Issues, Publish, Score, Settings.
- [`ComplexitySelector`](./components/editor/ComplexitySelector.md), [`SectionHints`](./components/editor/SectionHints.md), [`TemplateSectionOutline`](./components/editor/TemplateSectionOutline.md).
- [`DocUploadModal`](./components/editor/DocUploadModal.md) — upload requirement doc → markdown → auto-refine.

### Blueprint (`blueprint/`)

- [`BlueprintView`](./components/blueprint/BlueprintView.md) — viewer, version history, D1/D2 refinement, embed-back-to-epic.
- [`DiagramControls`](./components/blueprint/DiagramControls.md) — zoom, quick actions, SVG/PNG export.
- [`DiagramRenderer`](./components/blueprint/DiagramRenderer.md) — **sole** `mermaid.initialize` call site.

### Chat (`chat/`)

- [`ChatPanel`](./components/chat/ChatPanel.md), [`ChatMessage`](./components/chat/ChatMessage.md), [`ChatInput`](./components/chat/ChatInput.md).

### Critique (`critique/`)

- [`CritiqueReport`](./components/critique/CritiqueReport.md) — score ring + audits + failures + suggestions.
- [`SectionFeedbackCard`](./components/critique/SectionFeedbackCard.md) — per-section 5-dimension card (not wired by default).

### GitLab (`gitlab/`)

- [`EpicCard`](./components/gitlab/EpicCard.md), [`LoadEpicModal`](./components/gitlab/LoadEpicModal.md), [`PublishModal`](./components/gitlab/PublishModal.md).

### Issues (`issues/`)

- [`IssueManagerView`](./components/issues/IssueManagerView.md) — sprint + linked-issues tabs.
- [`IssueList`](./components/issues/IssueList.md), [`IssueRow`](./components/issues/IssueRow.md).
- [`IssueDetail`](./components/issues/IssueDetail.md) — AI update composer, comments, timeline, epic context.
- [`IssueTimeline`](./components/issues/IssueTimeline.md), [`StatusIcon`](./components/issues/StatusIcon.md).
- [`IssueCreationModal`](./components/issues/IssueCreationModal.md) — parse → dedup → bulk create.
- [`types`](./components/issues/types.md) — shared `MockIssue`, `TimelineEntry`, status/priority helpers.

### Pipeline UI (`pipeline/`)

- [`PipelineModal`](./components/pipeline/PipelineModal.md) — auto-closes 600ms after success.
- [`PipelineProgressPanel`](./components/pipeline/PipelineProgressPanel.md) — 6 stages; Stage 4b is hidden.

### Settings (`settings/`)

- [`SettingsPanel`](./components/settings/SettingsPanel.md) — `ai | gitlab` tabs.
- [`AIProviderConfig`](./components/settings/AIProviderConfig.md) — writes `config.endpoints.azureEndpoint`.
- [`GitLabConfig`](./components/settings/GitLabConfig.md) — PAT / OAUTH stub.
- [`ConnectionTestButton`](./components/settings/ConnectionTestButton.md).

### Views (`views/`)

- [`WelcomeScreen`](./components/views/WelcomeScreen.md) — hero + template cards + CTA.
- [`AnalyticsPanel`](./components/views/AnalyticsPanel.md) — mock analytics dashboard.

---

## Conventions

- `var(--col-*)` CSS variables come from [`theme/tokens.md`](./theme/tokens.md); UBS red is `#E60000`.
- Every interactive element carries a `data-testid` for E2E tests.
- GitLab clients return `{ success, data?, error? }` discriminated unions — never throw.
- Stores never import other stores; cross-store coordination lives in actions.
- The pipeline orchestrator is pure; all store writes flow through `refinePipelineAction`.
- Mermaid is initialized exactly once, in `DiagramRenderer`.
