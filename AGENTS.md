# FRAME2.0

## Project
Epic generation SPA that turns raw notes into structured epics via a 6-stage AI
pipeline, with GitLab publish + issue management.

## Stack
- React 19, TypeScript strict, Vite 6, Vitest 4
- Zustand v5 (stores: epicStore, uiStore, blueprintStore, gitlabStore, settingsStore, issueStore)
- Module federation via @originjs/vite-plugin-federation (port 3002)
- MSAL (Entra ID) for auth, Mermaid 11 for diagrams
- LLM: Azure OpenAI (gpt-4.1 default, gpt-5/o-series reasoning supported)
- Backend: FastAPI DocMining service (Docling 2.90, Python 3.12)

## Run
```
npm run dev         # vite dev on :3002
npm run build       # tsc -b && vite build
npm run test:run    # vitest once
```

## Conventions
- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`). Co-author Claude when applicable.
- Never commit secrets (`.env`, `*.pem`, `credentials.json`).
- Honor `.gitignore` — do not stage ignored paths.
- Pipeline orchestrator is PURE — no store reads/writes inside pipeline/stages/.
- Category templates v7.0.0 — JSON is canonical, do not hand-edit generated files.

## Architecture
- Pipeline: 6 stages (Comprehension -> Classification -> Structural -> Refinement -> Mandatory -> Validation)
- Orchestrator is pure; action layer (refinePipelineAction.ts) bridges stores.
- Two-phase execution: linear 1-3, iterative 4->5->6 with feedback forwarding.
- Entry points: epicStore.setMarkdown(md), refinePipelineAction(), uiStore.openModal(id)
