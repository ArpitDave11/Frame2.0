# 2026-06-11 — UX hardening: data safety, pipeline control, publish/issue guardrails

Follow-up to the full Playwright UX audit of the same day. Seven fixes shipped:

1. **Data safety** — `epicStore` draft autosaves to localStorage (debounced 800ms,
   `src/services/draft/epicDraft.ts`), restores on app init with a toast; the toolbar
   Save button (previously had **no onClick at all**) now flushes the draft;
   `beforeunload` warns while a refine runs. Verified live: content survives reloads
   and Vite restarts.
2. **New button** — WorkspaceHeader "New" resets epic/pipeline/GitLab-context + draft
   without a page refresh (confirm dialog when content exists).
3. **Error surfacing** — pipeline hard-failures keep the modal open with a persistent
   error panel + "Open Settings" (previously: silent auto-close); Doc Intelligence
   upload/analyze failures render an inline alert (`docIntelStore.uploadError`);
   PublishModal's parent-epic fetch got its missing `.catch`; epic-link failures during
   issue creation are recorded and reported instead of swallowed.
4. **Publish guardrails + link** — template-only content and junk titles block Publish
   with an explanation banner (`isTemplateOnlyContent`/`isValidEpicTitle`); success
   toasts carry a clickable "Open epic #N in GitLab" link (Toast type gained `link`,
   10s duration).
5. **Pipeline control** — AbortSignal threaded through orchestrator/stages/`callAI`
   (signal rides on `AIClientConfig`, stages unchanged → purity preserved); Cancel
   button in the progress panel; per-stage + total elapsed timers; quality-gate loops
   now explain themselves ("Score 62 < 75 — re-refining (pass 2/3)") via
   `pipelineStore.statusNote` + `threshold`/`maxIterations` on the retry progress event.
6. **Refine safety** — editor locks (readOnly + pill) while refining; multi-level undo
   (`undoStack`, cap 20); post-refine review bar (Keep / Revert / View changes) with a
   unified line-diff modal (`src/domain/lineDiff.ts`, LCS).
7. **Issue creation** — done-state lists every created issue as a GitLab link;
   per-story Preview expander (title/As-a/AC/meta as it will be sent); weight/assignee/
   iteration default chips (`IssueDefaultsBar`, oc-pill pattern) applied at creation
   (`createGitLabIssue` gained `assigneeIds`; iteration via quick-action note).

Extras: Escape now closes modals (a11y); Vite ignores `*.png`/`.playwright-mcp`/
`.llm-proxy`/`exports` so artifacts no longer trigger state-wiping full reloads.

Tests: 2065 pass; the 14 remaining failures pre-exist on the branch (verified against
clean HEAD in a temp worktree — WelcomeSidebar/auth-provider, tokens count, .env
defaults). One fixture updated deliberately: PublishModal's "calls createGitLabEpic"
test used heading-only content that the new guardrail rightly blocks.
