# FRAME2.0 — Claude Context

## Project
Epic generation SPA that turns raw notes → structured epics via a 6-stage AI
pipeline, with GitLab publish + issue management. React 19 + Vite, TypeScript,
Zustand v5 stores, no backend today (planned FastAPI DocMining service).

## Stack
- React 19, TypeScript strict, Vite 6, Vitest 4
- Zustand v5 (stores: `epicStore`, `uiStore`, `blueprintStore`, `gitlabStore`,
  `settingsStore`, `issueStore`, `brpStore`)
- Module federation via `@originjs/vite-plugin-federation` (shell loads
  `./App` from `/frame/remoteEntry.js`, port 3002)
- MSAL (Entra ID) for auth, Mermaid 11 for diagrams
- Recharts 3 (BRP MetricsModal)
- LLM: Azure OpenAI (gpt-4.1 default, gpt-5/o-series reasoning supported)

## Pipeline (src/pipeline/)
6 stages: Comprehension → Classification → Structural → Refinement →
Mandatory → Validation. Orchestrator is PURE (no store access). Action layer
(`refinePipelineAction.ts`) is the thin boundary that reads `epicStore.markdown`
and writes results back. Two-phase execution: linear 1-3, iterative 4→5→6
with feedback forwarding.

## Run
```
npm run dev         # vite dev on :3002
npm run build       # tsc -b && vite build
npm run test:run    # vitest once
```

## Entry Points
- Markdown input  → `epicStore.setMarkdown(md)` (src/stores/epicStore.ts:58)
- Pipeline kick   → `refinePipelineAction()` (src/pipeline/refinePipelineAction.ts:17)
- Modal control  → `uiStore.openModal(id)` (ModalId type at src/stores/uiStore.ts:16)

## Active Work
- **BRP (Breakdown & Re-groom Planning)** — capacity-driven epic-sizing tool
  shipped end-to-end on `feature/brp`. Crew → Pod → Epic hierarchy backed by
  brpStore + brpActions + AI seams (estimator, capacity assistant, variance
  interpreter, duplicate detector). Azure OpenAI swap lives in
  `services/brp/ai/estimatorProvider.ts`; falls back to deterministic simulator
  when unconfigured.
  Devlog: `docs/devlog/2026-05-26-brp-headless.md`,
          `docs/devlog/2026-05-27-brp-ui-complete.md`
  ADRs: 0003 no-derived-state, 0004 audit log, 0005 LLM swap
  Status: P1-P7 complete (B-1 → B-39); B-42 acceptance pending.

- **DocMining integration** — adding minimal FastAPI backend for file upload →
  text extraction → auto-populate editor → existing refine flow.
  Plans: `docs/plans/2026-04-23-docmining-integration-design.md`
         `docs/plans/2026-04-23-docmining-integration-ultraplan.md`
  Runbook: `docs/runbooks/docmining-execution-runbook.md`
  Status: plans committed (ad56912), no code yet. 22 atomic tasks A-0 → B-10.

## Do Not Touch (scope guards)
- WelcomeScreen — DocMining Upload button goes in WorkspaceHeader ONLY
- Pipeline orchestrator purity — no store reads/writes inside pipeline/stages/
- Category templates v7.0.0 — JSON is canonical, do not hand-edit generated
  files downstream of `templateLoader.ts`
- BRP invariants — no top-level `variance`/`delta`/`totalCapacity` STORED on
  Pod/Epic (all derived); Pod stores `CapacityInputs` only; `VarianceBand` is
  a return type, never a field. Components must derive via
  `computeVariance` / `computeDelta` / `computePodMetrics` / `computeCapacity`.
  See ADR 0003.
- BRP component purity — components in `src/components/brp/` must not call
  `useBrpStore` or `useConfigStore` directly. Compose via `brpActions`.

## Commit Style
Conventional (feat:, fix:, docs:, chore:). Co-author Claude when I contribute.
Always commit at session end (uncommitted changes across sessions cause
invisible bugs — see memory/feedback_always_commit.md).

## Tooling (installed)
- superpowers plugin (brainstorming, writing-plans, executing-plans,
  verification-before-completion, test-driven-development,
  systematic-debugging, dispatching-parallel-agents, code-reviewer agent)
- powerstack4 custom skill (continuous context offload → .powerstack4/)
- Taskmaster MCP (.taskmaster/docs/*-prd.txt → parse_prd)
- Context7 MCP for library docs
- Playwright MCP for E2E

## Standing Protocol (DocMining execution)
Per atomic task: executing-plans → implement → verification-before-completion
→ update .powerstack4/task_plan.md. At A-10 / B-10: wrap-up → deep-review
(5-agent pattern, see docs/runbooks/deep-review-a10.md).
