# src/components/editor/WorkspaceHeader.tsx

## Purpose
Planner toolbar. 56px height bar above `SplitPane`. Hosts all top-level actions: Load, Category, Complexity, SLA, Save, Download, Undo, Refine, Issues, Publish, Score badge, Settings.

## Exports
- `WorkspaceHeader()`.

## Store reads
- `epicStore` — `markdown`, `document.category`, `document.title`, `complexity`, `document.metadata.qualityScore`, `sla`, `previousMarkdown`.
- `pipelineStore` — `isRunning`.
- `gitlabStore` — `loadedEpicIid` (determines `hasGitLabContext`).

## Store writes
- `epicStore` — `setMarkdown`, `setComplexity`, `setSla`, `undo`.
- `uiStore` — `openModal`.

## Derived
- `hasContent = !!markdown.trim()`.
- `canRefine = hasContent && !isRunning`.
- `canPublish = hasContent`.
- `canUndo = previousMarkdown !== null`.

## Controls
**Left side:**
- **Load** → `openModal('loadEpic')`.
- **Upload** → `openModal('docUpload')` — opens `DocUploadModal` for file-to-markdown conversion. `data-testid="btn-upload"`.
- **Category select** — all `EPIC_CATEGORIES`. Confirms via `window.confirm` before replacing existing content.
- **ComplexitySelector** — disabled while pipeline running.
- **SLA** numeric input — clamped 1-100, null when cleared.
- **Save** — currently a stub button (no onClick handler).
- **Download** — Blob → `a.click()` with `{sanitized_title}.md`; disabled when empty.

**Right side:**
- **Undo** — `undo()`, disabled when no prior markdown.
- **Refine** — opens pipeline modal + fires `refinePipelineAction()`.
- **Issues** — `openModal('issueCreation')`, disabled without GitLab context.
- **Publish** — `openModal('publish')`; brand-red outlined when enabled.
- **Score badge** — shown only when `qualityScore !== null`. Color threshold: ≥7 green, ≥5 amber, else red. Clicking opens critique modal. Keyboard Enter/Space also opens.
- **Settings gear** — `openModal('settings')`.

## Dependencies
- Stores above; `@/domain/categoryConstants` (`EPIC_CATEGORIES`).
- `ComplexitySelector` + `refinePipelineAction`.
- `@phosphor-icons/react` (many).

## Consumers
- `ViewRouter` PlannerView.

## Assumptions & edge cases
- Save button has no handler — UI placeholder; no actual persistence (localStorage handled elsewhere).
- Refine button behavior is fire-and-forget — not awaited.
- Category change uses native `window.confirm` — works but breaks test determinism.
- Download filename regex `[^a-z0-9_-]/gi` → spaces and punctuation → `_`; first 50 chars of title only.
