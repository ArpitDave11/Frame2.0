# FRAME v5 — Architecture Guide

## Overview

FRAME (Full Requirement Automation & Management Engine) is a React + TypeScript application that transforms rough epic ideas into structured, AI-scored documents using a 6-stage AI pipeline. Built for UBS internal teams.

**Stack**: React 18 + Vite + TypeScript + Zustand + Vitest

## Component Tree

```
App.tsx
├── AuthGuard (auth context gate)
│   ├── WelcomeLayout (activeView === 'welcome')
│   │   ├── WelcomeSidebar (5 nav sections, collapsible)
│   │   └── WelcomeScreen (hero, templates, lifecycle, CTA)
│   │
│   └── WorkspaceLayout (activeView === 'workspace')
│       ├── WorkspaceSidebar (5 tabs + settings + user menu)
│       ├── ViewRouter
│       │   ├── PlannerView (activeTab === 'planner')
│       │   │   ├── WorkspaceHeader (toolbar: load, category, complexity, refine, publish)
│       │   │   └── SplitPane
│       │   │       ├── EditorPane (dark textarea + empty state)
│       │   │       └── PreviewPane (live markdown rendering)
│       │   │
│       │   ├── IssueManagerView (activeTab === 'issues')
│       │   │   ├── IssueList (search, filter tabs, issue rows)
│       │   │   └── IssueDetail (timeline, description, actions)
│       │   │
│       │   ├── BlueprintView (activeTab === 'blueprint')
│       │   │   ├── DiagramRenderer (mermaid → SVG)
│       │   │   └── DiagramControls (zoom, fullscreen, export)
│       │   │
│       │   └── AnalyticsPanel (activeTab === 'analytics')
│       │
│       ├── ChatPanel (floating bottom-right)
│       ├── ModalHost (settings, pipeline, critique, load, publish)
│       └── ToastContainer (bottom-left notifications)
```

## State Management (Zustand Stores)

| Store | Purpose | Key State |
|-------|---------|-----------|
| `epicStore` | Epic document, markdown, complexity, undo | `markdown`, `document`, `complexity`, `previousMarkdown` |
| `uiStore` | UI state: tabs, views, modals, toasts | `activeTab`, `activeView`, `activeModal`, `toasts` |
| `pipelineStore` | Pipeline execution state | `isRunning`, `stages`, `result`, `lastValidation` |
| `configStore` | App config with localStorage persistence | `config` (AI provider, GitLab, endpoints) |
| `blueprintStore` | Mermaid diagram state | `code`, `svgContent`, `zoom`, `isFullscreen` |
| `chatStore` | Chat messages and input | `messages`, `isOpen`, `isProcessing` |
| `gitlabStore` | GitLab browsing state | `epics`, `issues`, `selectedIssueId` |
| `issueStore` | Pipeline-generated stories for issue creation | `parsedStories`, `selectedStoryIds` |

**Pattern**: All stores use `create()` from Zustand. No providers needed — stores are imported directly. Actions are co-located with state. `getState()` used in action functions (non-component code).

## Service Layer

```
src/services/
├── ai/
│   ├── aiClient.ts      — callAI() routes to Azure/OpenAI
│   ├── azureClient.ts   — Azure OpenAI specific (callAzure, testAzure)
│   ├── openaiClient.ts  — OpenAI direct (callOpenAI, testOpenAI)
│   ├── throttler.ts     — RequestThrottler + withRetry()
│   └── types.ts         — AIRequest, AIResponse, AIClientConfig
├── gitlab/
│   ├── gitlabClient.ts  — 20+ API functions (epics, groups, issues, files)
│   └── types.ts         — GitLab entity types
└── templates/
    ├── categoryTemplates.json  — 7 category template definitions
    └── templateLoader.ts       — loadCategoryTemplate, getScaledTemplate, getFormatInstruction
```

## Pipeline Architecture

The 6-stage AI pipeline is the core of the application:

```
Stage 1: Comprehension → entities, requirements, gaps, risks
Stage 2: Classification → 1 of 7 categories (3-vote consensus)
Stage 3: Structural     → section scores 1-10, transformation plan
Stage 4: Refinement     → per-section AI rewriting
  Stage 4b: Coherence   → cross-section contradiction fix
Stage 5: Mandatory      → Mermaid diagram + user stories
Stage 6: Validation     → traceability, audit, failure detection
```

**Two-phase execution**: Linear (stages 1-3 once) → Iterative (stages 4-6 loop until passing score or max iterations).

**Key files**:
- `src/pipeline/pipelineTypes.ts` — 30+ shared type contracts
- `src/pipeline/prompts/*.ts` — 6 prompt builders (+ coherence)
- `src/pipeline/stages/*.ts` — 6 stage implementations
- `src/pipeline/epicScorer.ts` — BM25 quality scorer (local, deterministic)
- `src/pipeline/pipelineOrchestrator.ts` — pure async orchestrator
- `src/pipeline/refinePipelineAction.ts` — store-to-orchestrator bridge

**Design decisions**:
- Orchestrator is pure (no store access) → fully testable
- Action function is the thin boundary handling store reads/writes
- API retry (withRetry) is separate from pipeline iteration
- Temperature split: generation 0.3, classification 0.5, validation 0.7
- Local scorer (30%) blended with AI score (70%) for reliable quality gates

## Authentication

- `AuthProvider` wraps entire app (in main.tsx)
- `MockAuthProvider` for development (auto-authenticates)
- Ready for Azure AD MSAL swap via environment config
- `AuthGuard` shows login screen when unauthenticated
- `UserMenu` in workspace sidebar with sign-out

## CSS Architecture

- Design tokens in `src/theme/tokens.ts` (single source of truth)
- CSS variables in `src/styles/global.css` (`:root` block)
- Prototype-compatible aliases: `--col-*` prefix for component styles
- UBS brand prefix: `--ubs-*` for token-derived variables
- Inline styles throughout (matching prototype pattern, no CSS modules)
- Font: Frutiger stack (`Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif`)

## Testing

- **1237+ tests** across 69+ test files
- Unit tests per component/module
- Integration tests in `src/test/integration/` (5 suites, 49 tests)
- Mocks: `vi.mock()` for external services, `MockAuthProvider` for auth context
- jsdom environment with polyfills in `src/test/setup.ts`

## File Structure

```
src/
├── App.tsx                    — Layout shell (2 modes: welcome/workspace)
├── main.tsx                   — Entry point (AuthProvider + App)
├── domain/                    — Core types, complexity, serializer
├── stores/                    — 8 Zustand stores
├── services/                  — AI, GitLab, template services
├── pipeline/                  — 6-stage AI pipeline engine
│   ├── prompts/               — 7 prompt builders + examples
│   ├── stages/                — 7 stage implementations
│   └── fixtures/              — Sample data for type tests
├── components/
│   ├── auth/                  — Authentication (provider, guard, menu)
│   ├── blueprint/             — Mermaid diagram viewer
│   ├── chat/                  — Floating chat panel
│   ├── critique/              — Quality report modal
│   ├── editor/                — Editor, preview, toolbar, hints
│   ├── gitlab/                — Load/publish modals, epic cards
│   ├── issues/                — Issue manager view
│   ├── layout/                — Sidebars, view router, modals, split pane
│   ├── pipeline/              — Pipeline progress panel
│   ├── settings/              — AI + GitLab config panels
│   ├── shared/                — Modal, Toast, ImpulseLine
│   └── views/                 — WelcomeScreen, AnalyticsPanel
├── chat/                      — Chat action
├── actions/                   — GitLab fetch action
├── styles/                    — Global CSS
├── theme/                     — Design tokens
└── test/                      — Setup + integration tests
```
