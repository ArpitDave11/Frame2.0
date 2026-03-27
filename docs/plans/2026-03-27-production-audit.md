# Production Audit: Epic Generator V5 — Feature Compliance Report

**Date:** 2026-03-27
**Auditor:** Claude Opus 4.6 (automated code audit)
**Scope:** 12 features (F01-F12) audited against codebase at `/Users/arpit/Desktop/FRAME2.0/src`

---

## Summary

| Feature | Status | Severity |
|---------|--------|----------|
| F01: GitLab Epic Publishing | PARTIALLY IMPLEMENTED | HIGH |
| F02: Epic Level Switching | NOT IMPLEMENTED | HIGH |
| F03: Epic Loading & Browsing | IMPLEMENTED | LOW |
| F04: Issue Creation from User Stories | PARTIALLY IMPLEMENTED | HIGH |
| F05: Quick Comment on Epic Issues | PARTIALLY IMPLEMENTED | MEDIUM |
| F06: AI Title Generation & Sanitization | PARTIALLY IMPLEMENTED | MEDIUM |
| F07: Architecture Diagram (Blueprint) | PARTIALLY IMPLEMENTED | HIGH |
| F08: Output Verbosity Control | NOT IMPLEMENTED | BLOCKER |
| F09: Issue Modal Responsiveness | NOT IMPLEMENTED | MEDIUM |
| F10: Requirement Tag Management | NOT IMPLEMENTED | BLOCKER |
| F11: GitLab Identifier Safety | PARTIALLY IMPLEMENTED | HIGH |
| F12: Group Cache Management | IMPLEMENTED | LOW |

**Implemented:** 2/12 | **Partial:** 6/12 | **Missing:** 4/12 | **Blockers:** 2

---

## F01: GitLab Epic Publishing
### Status: PARTIALLY IMPLEMENTED
### What works:
- Create via `POST /groups/:id/epics` -- `createGitLabEpic()` in `src/services/gitlab/gitlabClient.ts:170-184`
- Update via `PUT /groups/:id/epics/:epic_iid` -- `updateGitLabEpic()` in `src/services/gitlab/gitlabClient.ts:186-200`
- Cache invalidation after create/update -- `invalidateGroupCache()` called at `src/components/gitlab/PublishModal.tsx:77` and `:99`
- Publish modal properly detects update vs create mode via `loadedEpicIid`/`loadedGroupId`

### What's missing or broken:
- **parent_id support for child epics**: `GitLabCreateEpicParams` (`src/services/gitlab/types.ts:166-171`) has NO `parent_id` field. The `createGitLabEpic` body construction (`gitlabClient.ts:177-179`) never passes `parent_id`. Child epics cannot be created under a parent.
- **Parent epic dropdown in Publish modal**: `PublishModal.tsx` has NO parent epic selector. There is no UI to choose a parent epic before publishing. The modal only has title input and target group selector.
- **stripRequirementTags on output boundaries**: `stripRequirementTags` function does NOT EXIST anywhere in the codebase. Zero search results. Raw requirement tags (e.g., `[REQ-001]`) will leak into GitLab epic descriptions when publishing.

### Severity: HIGH
### Fix needed:
1. Add `parent_id?: number` to `GitLabCreateEpicParams` in `src/services/gitlab/types.ts`
2. Pass `parent_id` in `createGitLabEpic` body when provided (`gitlabClient.ts:177`)
3. Add parent epic dropdown to `PublishModal.tsx` -- fetch epics for selected group, let user pick parent
4. Implement `stripRequirementTags()` utility and call it in `handlePublish()` before sending `markdown` to GitLab

---

## F02: Epic Level Switching (Pod/Crew)
### Status: NOT IMPLEMENTED
### What works:
- Store has `publishLevel: 'crew' | 'pod'` state field (`src/stores/gitlabStore.ts:54`)
- Store has `setPublishLevel` action (`src/stores/gitlabStore.ts:308-309`)
- Store has `publishTargetGroupId` field (`src/stores/gitlabStore.ts:55`)

### What's missing or broken:
- **Pod/Crew toggle in Publish modal**: `PublishModal.tsx` does NOT import or reference `publishLevel`, `setPublishLevel`, or any crew/pod toggle UI. The store field exists but is completely unwired.
- **State reset on level switch**: `setPublishLevel` action (`gitlabStore.ts:308-309`) only does `set({ publishLevel: level })`. It does NOT reset `publishTargetGroupId` to `null`. There is no `publishParentEpicId` field in the store at all.
- **Level labels applied to published epics**: `createGitLabEpic` call in `PublishModal.tsx:85-88` does not pass any level-specific labels. The `labels` field is not populated based on `publishLevel`.

### Severity: HIGH
### Fix needed:
1. Add Pod/Crew toggle button group to `PublishModal.tsx`
2. Wire `setPublishLevel` from store to toggle
3. Modify `setPublishLevel` action to also reset `publishTargetGroupId: null` (and future `publishParentEpicId: null`)
4. When publishing, append level label (e.g., `epic::pod` or `epic::crew`) to the labels array

---

## F03: Epic Loading & Browsing
### Status: IMPLEMENTED
### What works:
- `includeDescendantEpics` flag -- `include_descendant_groups` param passed in `fetchGroupEpics` (`gitlabClient.ts:130`), toggle checkbox in `LoadEpicModal.tsx:185-193`
- Group name alongside epics -- `resolveGroupName()` function at `gitlabStore.ts:200-217`, rendered via `EpicCard` groupName prop at `LoadEpicModal.tsx:290`
- `resolveGroupName` -- works correctly: checks cache, falls back to `web_url` parsing, then `group_id` string
- Breadcrumb navigation -- fully implemented with `buildBreadcrumb()` at `gitlabStore.ts:164-194`, rendered at `LoadEpicModal.tsx:117-147`
- Full metadata on load -- `fetchEpicDetails` fetches full epic details before loading (`LoadEpicModal.tsx:86`)
- Server-side search with `searchEpics()` action (`gitlabStore.ts:344-369`)
- State filter (opened/closed/all) at `LoadEpicModal.tsx:199-213`
- Count display ("X of Y epics") at `LoadEpicModal.tsx:262-269`

### What's missing or broken:
- Nothing material -- all F03 requirements are met.

### Severity: LOW
### Fix needed:
- None

---

## F04: Issue Creation from User Stories
### Status: PARTIALLY IMPLEMENTED
### What works:
- Parse stories from epic content -- `parseUserStories()` called at `IssueCreationModal.tsx:55`
- Resolve target PROJECT (not group) -- `createGitLabIssue` correctly uses `projectId` at `gitlabClient.ts:260` with path `/projects/${projectId}/issues`
- Disable button when conditions not met -- button disabled when `selectedCount === 0 || !isGitLabConfigured || !projectId.trim()` at `IssueCreationModal.tsx:391`
- Link issues to epic -- `linkIssueToEpic()` called after creation at `createIssuesAction.ts:72-73`
- AI-powered duplicate detection -- `analyzeStoryDuplicates()` called at `IssueCreationModal.tsx:90`
- Progress tracking with real-time UI updates

### What's missing or broken:
- **Project picker when group has multiple projects**: There is NO `fetchGroupProjects` function anywhere. The user must manually type a project ID into a raw text input (`IssueCreationModal.tsx:271-288`). There is no API call to list projects in a group, no dropdown, no autocomplete. This is a terrible UX for users who don't know their project ID.
- **Disable button when no epic published (no IID)**: The create button is NOT disabled based on whether an epic has been published. It checks `isGitLabConfigured` and `projectId`, but not `loadedEpicIid`. A user could try to create issues without an epic context, and the issues would just not be linked (silent failure, no error -- `createIssuesAction.ts:72` silently skips linking if `loadedEpicIid` is falsy).
- **Sync new issues into epicChildren**: After creating issues, the action does NOT call `setIssues()` or otherwise update the `epicChildren` or `issues` arrays in `gitlabStore`. The newly created issues are invisible in the Issue Manager until the user manually refreshes.

### Severity: HIGH
### Fix needed:
1. Add `fetchGroupProjects()` to `gitlabClient.ts` (GET `/groups/:id/projects`)
2. Replace the raw text input with a project dropdown in `IssueCreationModal.tsx`
3. Either disable the Issues button when `loadedEpicIid === null` (already done in WorkspaceHeader for opening modal) OR add explicit warning in the modal
4. After `createIssuesAction` completes, call `fetchIssuesAction()` to refresh the issues list, or manually append created issues to `gitlabStore.issues`

---

## F05: Quick Comment on Epic Issues
### Status: PARTIALLY IMPLEMENTED
### What works:
- Fetch notes for selected issue -- `fetchIssueNotes()` at `IssueDetail.tsx:42` uses `projectId` (not group_id) correctly
- Post comment via `/projects/:project_id/issues/:issue_iid/notes` -- `addIssueNote()` at `gitlabClient.ts:298-306` uses project_id correctly
- Never uses group_id for Notes API -- confirmed, both `fetchIssueNotes` and `addIssueNote` take `projectId: number` parameter
- Real notes displayed as timeline entries at `IssueDetail.tsx:117-123`
- Comment input with post button at `IssueDetail.tsx:261-313`

### What's missing or broken:
- **resolveProjectIdFromIssueUrl**: This function does NOT EXIST. The `IssueDetail` component relies on `issue.project_id` being present on the `MockIssue` type (`types.ts:23`), which is populated by `mapGitLabIssueToMock` in `IssueManagerView.tsx:25` from `GitLabIssue.project_id`. This works for real GitLab issues BUT only if the API returns `project_id` in the epic issues response. If `project_id` is missing from the API response, comments silently fail. There is no fallback resolution from `web_url`.
- **AI-powered comment generation with tone selector**: The "AI Generate" feature in `IssueDetail.tsx:66-72` is a HARDCODED TEMPLATE that just concatenates the input into a canned string: `"Completed ${aiInput}. Implementation follows best practices. All tests passing and ready for review."` This is NOT an AI call -- it's a fake placeholder. There is no actual AI integration (no `callAI` invocation). There is NO tone selector dropdown anywhere.
- **"Post Update" for AI comments does nothing real**: `handlePostAI` at line 74-76 just clears the preview state. It does NOT call `addIssueNote()` to actually post the generated comment to GitLab. The AI comment is generated (fakely) and displayed, but never persisted.

### Severity: MEDIUM
### Fix needed:
1. Implement `resolveProjectIdFromIssueUrl()` as fallback when `project_id` is missing
2. Replace hardcoded template in `handleGenerateAI` with actual `callAI()` call using a comment generation prompt
3. Add tone selector dropdown (professional, casual, technical, etc.) that modifies the AI prompt
4. Wire `handlePostAI` to call `addIssueNote()` with the AI-generated text

---

## F06: AI Title Generation & Sanitization
### Status: PARTIALLY IMPLEMENTED
### What works:
- AI generation for long titles -- `titleNeedsGeneration` at `refinePipelineAction.ts:62` triggers when `rawTitle.length > 80 || rawTitle.length === 0`
- Fast path for short titles -- when `titleNeedsGeneration` is false, the existing title is passed through (`refinePipelineAction.ts:63`)
- Title generation delegated to Stage 5 via the `mandatoryPrompt.ts:275-278` instructions ("If the input title is empty or not provided, generate a concise, professional title")

### What's missing or broken:
- **DANGLING_WORDS set for safe truncation**: Does NOT EXIST. No `DANGLING_WORDS` constant, no safe-truncation logic anywhere in the codebase. Long AI-generated titles could be truncated mid-word by the GitLab API without graceful handling.
- **sanitizeProjectName function**: Does NOT EXIST. No `sanitizeProjectName` function anywhere. Project/group names are used raw from the API without sanitization.
- **All read sites prefer .refined over .original**: There is NO `.refined`/`.original` title pattern in the codebase. Title fields are simple strings, not objects with refined/original variants. This requirement appears to be unimplemented or the architecture diverged from the spec.

### Severity: MEDIUM
### Fix needed:
1. Implement `DANGLING_WORDS` set (e.g., `['a', 'an', 'the', 'of', 'in', 'for', 'and', 'or', 'to', 'with']`) and a `safeTruncate(title, maxLen)` function that avoids cutting at dangling words
2. Implement `sanitizeProjectName()` to handle special characters, length limits, and reserved words
3. Either implement `.refined`/`.original` title object pattern OR document the deliberate architectural deviation

---

## F07: Architecture Diagram (Blueprint)
### Status: PARTIALLY IMPLEMENTED
### What works:
- One-click generation -- `regenerateBlueprintAction()` at `src/actions/regenerateBlueprintAction.ts:40-120`, triggered from DiagramControls regenerate button
- Mermaid rendering with error handling -- `DiagramRenderer.tsx` renders code via `mermaid.render()` with error fallback
- Zoom, fullscreen, SVG/PNG export -- `DiagramControls.tsx` provides full control bar
- Diagram theming with colorblind-safe palette -- `applyDiagramTheme()` in both `runStage5Mandatory.ts:378-402` and `regenerateBlueprintAction.ts:16-37`
- Safe fallback on failure -- `validateMermaidSyntax()` returns a simple placeholder diagram when original is invalid (`runStage5Mandatory.ts:159-168`)

### What's missing or broken:
- **Restrict to 6 stable Mermaid types**: `VALID_MERMAID_DIRECTIVES` at `runStage5Mandatory.ts:27-30` lists **9** types: `graph, flowchart, sequenceDiagram, classDiagram, stateDiagram, erDiagram, gantt, pie, journey`. The spec says 6 stable types. Three types (`pie`, `journey`, `gantt`) are not mentioned as "stable" and may produce unreliable renders. Additionally, the `regenerateBlueprintAction.ts:67-69` prompt only mentions 3 types (flowchart, sequenceDiagram, stateDiagram-v2) -- inconsistency between generation and validation.
- **Chat-based refinement with 2-stage pipeline (interpret then apply)**: Does NOT EXIST. There is no chat panel connected to the blueprint. No interpret/apply pipeline. No way for users to type natural language requests to modify the diagram. The only interaction is the regenerate button which creates an entirely new diagram from scratch.
- **Quick-action buttons (Simplify, Add Detail, etc.)**: Do NOT EXIST. `DiagramControls.tsx` only has zoom, fit, fullscreen, export, and regenerate buttons. No Simplify, Add Detail, Change Layout, or any other semantic quick-action buttons.
- **Version history with pills [v1] [v2]**: Does NOT EXIST. `blueprintStore.ts` has no version history array, no `versions` field, no mechanism to store previous diagram versions. Each `setCode()` call overwrites the previous diagram with no history. No version pills in the UI.

### Severity: HIGH
### Fix needed:
1. Restrict `VALID_MERMAID_DIRECTIVES` to the 6 stable types (remove `gantt`, `pie`, `journey` or verify they are intentionally supported)
2. Implement chat-based refinement: add a chat input to `BlueprintView`, create an interpret+apply two-stage pipeline that takes user's NL request, interprets intent, then modifies the existing Mermaid code
3. Add quick-action buttons to `DiagramControls.tsx`: Simplify, Add Detail, Change Layout, Highlight Critical Path, etc.
4. Add `versions: Array<{code: string, timestamp: number}>` to `blueprintStore.ts`, push on each `setCode()`, render version pills in the UI

---

## F08: Output Verbosity Control
### Status: NOT IMPLEMENTED
### What works:
- Nothing. Zero implementation.

### What's missing or broken:
- **enforceWordLimit(text, targetWords, maxWords) function**: Does NOT EXIST. Zero search results in the entire codebase.
- **Runs after EVERY AI response**: There is no post-processing hook after AI calls. `callAI()` returns raw content that is used directly.
- **Sentence-boundary truncation**: Not implemented.
- **Condensation re-prompt for 2x+ over limit**: Not implemented.

### Severity: BLOCKER
AI responses can be arbitrarily long. Without verbosity control, epic sections may be bloated with unnecessary content, significantly degrading quality and readability. This directly affects the core value proposition of the tool.

### Fix needed:
1. Implement `enforceWordLimit(text: string, targetWords: number, maxWords: number): string` utility
2. Add sentence-boundary-aware truncation logic
3. Add condensation re-prompt: when AI output exceeds `2 * targetWords`, send a condensation prompt asking the AI to shorten it
4. Call `enforceWordLimit()` after every `callAI()` response in the pipeline stages (particularly Stage 4 Refinement and Stage 5 Mandatory)
5. Make `targetWords` and `maxWords` configurable per complexity level in `PipelineConfig`

---

## F09: Issue Modal Responsiveness
### Status: NOT IMPLEMENTED
### What works:
- The IssueCreationModal renders a scrollable story list with `maxHeight: 500` on the root container.

### What's missing or broken:
- **Collapsible existing issues section**: The "Existing Issues" chips section at `IssueCreationModal.tsx:231-256` is NOT collapsible. It always renders fully, taking up vertical space. There is no collapse/expand toggle.
- **Auto-collapse when >5 issues**: No auto-collapse logic. When there are many existing issues, only 10 are shown (hardcoded slice at line 237) but no collapse behavior.
- **Cap expanded height at 120px**: No `maxHeight: 120px` on the existing issues section.
- **Min height 200px for stories list**: The story list div at line 303 has `flex: 1` but no `minHeight: 200px`.
- **Modal width 900px for 15+ stories**: `ModalHost.tsx:44` hardcodes the IssueCreationModal width at `700`. There is no dynamic width based on story count.

### Severity: MEDIUM
### Fix needed:
1. Wrap existing issues section in a collapsible container with expand/collapse toggle
2. Add `useEffect` to auto-collapse when `gitlabIssues.length > 5`
3. Add `maxHeight: 120px, overflowY: 'auto'` to the existing issues container when expanded
4. Add `minHeight: 200` to the story list container
5. In `ModalHost.tsx`, pass dynamic width: `width={storiesWithAnalysis.length >= 15 ? 900 : 700}` (or handle inside the modal)

---

## F10: Requirement Tag Management
### Status: NOT IMPLEMENTED
### What works:
- Nothing. The `stripRequirementTags` function does not exist.

### What's missing or broken:
- **stripRequirementTags function**: Does NOT EXIST. Zero search results across the entire codebase.
- **Applied at 4 output boundaries: publish, update, clipboard, export**: None of these boundaries call any tag-stripping function. Raw markdown with `[REQ-xxx]` tags goes directly to GitLab.
- **Tags preserved in editor state**: This is trivially true by default since no stripping exists, but the intent (strip on output, preserve in editor) is not explicitly implemented.

### Severity: BLOCKER
Internal requirement tags leaking into published GitLab epics is a data quality issue. Users and stakeholders see raw internal annotations that should be stripped. This is especially bad for epics shared externally.

### Fix needed:
1. Implement `stripRequirementTags(text: string): string` that removes patterns like `[REQ-001]`, `[REQ-XXX]`, etc.
2. Call it in `PublishModal.tsx:handlePublish()` before sending `markdown` to `createGitLabEpic`/`updateGitLabEpic`
3. Call it in any clipboard copy handler (currently no clipboard feature exists -- see F01)
4. Call it in any export handler
5. Do NOT call it when writing to `epicStore` (preserve in editor state)

---

## F11: GitLab Identifier Safety
### Status: PARTIALLY IMPLEMENTED
### What works:
- `createGitLabIssue` correctly uses `projectId` (not group_id) for issue creation -- `gitlabClient.ts:260`
- `linkIssueToEpic` correctly uses `epicIid` (not `epic_id`) for the group-scoped endpoint -- `gitlabClient.ts:265-273`
- `fetchIssueNotes` and `addIssueNote` correctly use `projectId` and `issueIid` -- `gitlabClient.ts:288-306`
- `GitLabGroupMetadata` type has `parent_id` as global ID (`types.ts:64`)

### What's missing or broken:
- **Centralized ID reference**: There is NO centralized type-safe reference document or constants file that maps which API endpoints expect IID vs global ID. The knowledge is scattered across individual function signatures. A developer could easily use the wrong identifier type.
- **Type-safe helpers**: There are no branded types or helper functions like `type EpicIid = number & { __brand: 'epicIid' }` or `type GlobalId = number & { __brand: 'globalId' }` to prevent accidental misuse. All IDs are plain `number` or `string`.
- **Never use IID for cross-group lookups**: Not enforced architecturally. Nothing prevents passing an IID where a global ID is expected.
- **parent_id uses global ID not IID**: `parent_id` field exists on `GitLabGroupMetadata` (`types.ts:64`) but is NOT on `GitLabCreateEpicParams`. Since `createGitLabEpic` never passes `parent_id`, this requirement is moot -- but the missing field means child epic creation is broken (see F01).

### Severity: HIGH
### Fix needed:
1. Create `src/domain/gitlabIdentifiers.ts` with:
   - Branded types: `type EpicIid = number & { __epicIid: true }`, `type GlobalEpicId = number & { __globalEpicId: true }`
   - Documentation comments explaining which endpoints expect which ID type
   - Helper functions: `toEpicIid(n: number): EpicIid`, `toGlobalId(n: number): GlobalEpicId`
2. Update function signatures in `gitlabClient.ts` to use branded types
3. Add `parent_id` (global ID type) to `GitLabCreateEpicParams`

---

## F12: Group Cache Management
### Status: IMPLEMENTED
### What works:
- TTL 5 minutes -- `CACHE_TTL = 5 * 60 * 1000` at `gitlabStore.ts:16`
- Targeted invalidation -- `invalidateGroupCache(groupId)` at `gitlabStore.ts:301-305` deletes specific group from cache
- Cache-then-fetch pattern -- `navigateToGroup` checks cache freshness at `gitlabStore.ts:248-253`, returns instantly if fresh, fetches if stale
- Cache stores full group context (metadata, subgroups, epics) in `GroupCacheEntry`
- Cache invalidation called after publish/update in `PublishModal.tsx`
- Toggling `includeDescendants` invalidates current group cache and re-fetches (`gitlabStore.ts:289-299`)

### What's missing or broken:
- Nothing material. All F12 requirements are met.

### Severity: LOW
### Fix needed:
- None

---

## Critical Path: Recommended Fix Order

### Phase 1: Blockers (must fix before any release)
1. **F10: stripRequirementTags** -- 1-2 hours. Simple regex function + 4 call sites.
2. **F08: enforceWordLimit** -- 4-6 hours. Utility function + pipeline integration + condensation prompt.

### Phase 2: High Priority (next sprint)
3. **F01: parent_id + parent epic dropdown** -- 4 hours. Type change + API body change + UI dropdown.
4. **F02: Pod/Crew toggle** -- 3 hours. UI toggle + state reset + label application.
5. **F04: Project picker + issue sync** -- 6 hours. New API function + dropdown UI + post-create refresh.
6. **F07: Chat refinement + quick actions + version history** -- 16-24 hours. Largest missing feature.
7. **F11: Branded types** -- 4 hours. Type system changes + refactoring.

### Phase 3: Medium Priority (following sprint)
8. **F05: Real AI comments + tone selector** -- 6 hours. AI integration + UI.
9. **F06: DANGLING_WORDS + sanitizeProjectName** -- 2 hours. Pure utility functions.
10. **F09: Responsive issue modal** -- 3 hours. CSS/layout changes.

---

## Files Audited

| File | Lines | Features Covered |
|------|-------|-----------------|
| `src/services/gitlab/gitlabClient.ts` | 428 | F01, F03, F04, F05, F11, F12 |
| `src/services/gitlab/types.ts` | 178 | F01, F04, F11 |
| `src/stores/gitlabStore.ts` | 394 | F01, F02, F03, F04, F12 |
| `src/stores/epicStore.ts` | 157 | F06 |
| `src/stores/blueprintStore.ts` | 81 | F07 |
| `src/components/gitlab/PublishModal.tsx` | 253 | F01, F02, F10 |
| `src/components/gitlab/LoadEpicModal.tsx` | 307 | F03 |
| `src/components/issues/IssueCreationModal.tsx` | 442 | F04, F09 |
| `src/components/issues/IssueDetail.tsx` | 321 | F05 |
| `src/components/issues/IssueManagerView.tsx` | 128 | F04, F05 |
| `src/components/blueprint/BlueprintView.tsx` | 98 | F07 |
| `src/components/blueprint/DiagramControls.tsx` | 200 | F07 |
| `src/components/blueprint/DiagramRenderer.tsx` | 98 | F07 |
| `src/actions/createIssuesAction.ts` | 100 | F04, F11 |
| `src/actions/regenerateBlueprintAction.ts` | 121 | F07 |
| `src/pipeline/refinePipelineAction.ts` | 199 | F06, F08 |
| `src/pipeline/pipelineOrchestrator.ts` | 281 | F06, F08 |
| `src/pipeline/stages/runStage5Mandatory.ts` | 413 | F06, F07 |
| `src/pipeline/prompts/mandatoryPrompt.ts` | 300 | F06, F07 |
| `src/domain/types.ts` | 85 | F06, F11 |
| `src/domain/configTypes.ts` | 131 | F11, F12 |
| `src/components/layout/ModalHost.tsx` | 65 | F09 |
| `src/components/editor/WorkspaceHeader.tsx` | 415 | F01, F04 |
