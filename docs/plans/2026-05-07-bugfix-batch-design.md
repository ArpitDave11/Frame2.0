# Bug Fix Batch — Design

**Date:** 2026-05-07
**Status:** Approved
**Bugs:** 1a, 1b, 2, 3, 4, 6, 7 + Mermaid (prompt, sanitize, error display)

## Fixes

| Bug | File(s) | Fix |
|---|---|---|
| 1a Labels stale closure | IssueCreationModal.tsx | Add `selectedLabels` to useCallback deps |
| 1b HALLMARK: FRAME | createIssuesAction.ts | Always include default label |
| 2 Epic link | PublishModal.tsx | Show `web_url` as clickable link after publish |
| 3 Issue link | IssueDetail.tsx, IssueRow.tsx | Render ID as `<a>` when `web_url` exists |
| 4 Custom prefix | createIssuesAction.ts | Strip `custom-*:` prefix from GitLab title |
| 6 Blank epic | LoadEpicModal.tsx | Warn + load default template on empty description |
| 7 Spinner | IssueCreationModal.tsx | Add Spinner icon during custom generation |
| Mermaid prompt | mandatoryPrompt.ts | Conditional styling by diagram type |
| Mermaid sanitize | refinePipelineAction.ts | Strip classDef/linkStyle from non-flowchart |
| Mermaid errors | DiagramRenderer.tsx | Actionable error messages |

## Constraints
- No edits to stages or orchestrator
- No edits to existing test files
