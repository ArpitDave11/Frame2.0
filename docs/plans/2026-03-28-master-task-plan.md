# MASTER TASK PLAN — All Pending Work (29 Tasks, 7 Categories)

**Date:** 2026-03-28
**Status:** Planning complete. Ready for execution.
**Test baseline:** 1245/1246 passing (1 pre-existing env config failure)

---

## CATEGORY A: Issue Creation Enhancements (Epic Planner)

### A1: Labels Typeahead — Search + Multi-Select

**Goal:** User can search GitLab labels by keyword, select multiple, apply to all created issues.

**Files to change:**
- `src/services/gitlab/gitlabClient.ts` — add `fetchGroupLabels` with search param
- `src/services/gitlab/types.ts` — add `GitLabLabelSearchResult` if needed (may reuse existing `GitLabLabelResult`)
- `src/components/issues/IssueCreationModal.tsx` — add label search input + chips UI
- `src/actions/createIssuesAction.ts` — pass selected labels to `createGitLabIssue`

**Atomic steps:**
1. In `gitlabClient.ts`: Add `fetchLabelsWithSearch(config, groupId, query)` → `GET /groups/:id/labels?search=<query>&per_page=20`
2. In `IssueCreationModal.tsx`: Add state: `selectedLabels: string[]`, `labelSearch: string`, `labelSuggestions: GitLabLabel[]`, `loadingLabels: boolean`
3. Add `useEffect` debounced (300ms) on `labelSearch` → calls `fetchLabelsWithSearch`
4. Add UI: text input above the "Create Issues" button, below project picker. On type → dropdown suggestions appear. Click suggestion → adds to `selectedLabels` as chip. Click chip X → removes.
5. In `createIssuesAction.ts`: Accept `labels?: string[]` param. Pass to `createGitLabIssue` params: `labels: [...storyLabels, ...userSelectedLabels]`
6. In `gitlabClient.ts` `createGitLabIssue`: Already accepts `labels` in params — verify it joins correctly.

**API:** `GET /groups/:id/labels?search=<query>` — substring match, case-insensitive. Auto-creates missing labels.

---

### A2: Weight from Story Points

**Goal:** Each created issue gets `weight` = story point value (1, 2, 3, 5).

**Files to change:**
- `src/services/gitlab/types.ts` — add `weight?: number` to create issue params
- `src/services/gitlab/gitlabClient.ts` — pass `weight` in body
- `src/actions/createIssuesAction.ts` — read `story.storyPoints`, pass as weight

**Atomic steps:**
1. In `types.ts`: Find the `createGitLabIssue` params object in the function signature. Add `weight?: number` alongside `title`, `description`, `labels`.
2. In `gitlabClient.ts` `createGitLabIssue`: Add `if (params.weight != null) body.weight = params.weight;`
3. In `createIssuesAction.ts`: In the loop where `createGitLabIssue` is called, add `weight: story.storyPoints ?? undefined` to the params object.

**API:** `POST /projects/:id/issues` — `weight` field, integer ≥ 0. Premium/Ultimate only.

---

### A3: Test Cases in Issue Description

**Goal:** Each issue description includes the story's test cases as a formatted section.

**Files to change:**
- `src/services/ai/generateIssueDescription.ts` — add test cases to the generated description

**Atomic steps:**
1. In `generateIssueDescription.ts`: The function receives a `ParsedUserStory` which has `testCases?: readonly string[]`.
2. In the `buildFallbackDescription` function: After the Acceptance Criteria section, add:
   ```
   ${story.testCases && story.testCases.length > 0 ? `\n## Test Cases\n${story.testCases.map((tc, i) => `${i + 1}. ${tc}`).join('\n')}` : ''}
   ```
3. In the AI system prompt: Add instruction "Include a ## Test Cases section with the story's test cases formatted as a numbered list."
4. Pass `story.testCases` into the user prompt so the AI has them.

---

## CATEGORY B: Issue Manager — Left Panel Overhaul

### B1: New API — `fetchCurrentIteration()`

**Goal:** Get the current sprint/iteration ID for the group.

**Files to change:**
- `src/services/gitlab/gitlabClient.ts` — add function
- `src/services/gitlab/types.ts` — add `GitLabIteration` type + result type

**Atomic steps:**
1. In `types.ts`: Add:
   ```typescript
   export interface GitLabIteration {
     id: number;
     iid: number;
     group_id: number;
     title: string | null;
     state: number; // 1=opened/upcoming, 2=current/closed
     start_date: string;
     due_date: string;
     web_url: string;
   }
   export interface GitLabIterationResult {
     success: boolean;
     data?: GitLabIteration[];
     error?: string;
   }
   ```
2. In `gitlabClient.ts`: Add:
   ```typescript
   export async function fetchCurrentIteration(
     config: GitLabConfig, groupId: string
   ): Promise<GitLabIterationResult> {
     const result = await gitlabGet<GitLabIteration[]>(
       config, `/groups/${groupId}/iterations?state=current&per_page=1`
     );
     if (!result.ok) return { success: false, error: result.error };
     return { success: true, data: result.data };
   }
   ```

**API:** `GET /groups/:id/iterations?state=current` — Premium/Ultimate only. Returns iterations whose date range covers today.

---

### B2: New API — `fetchGroupIssues()`

**Goal:** Fetch issues for a specific user in a specific iteration across the group.

**Files to change:**
- `src/services/gitlab/gitlabClient.ts` — add function

**Atomic steps:**
1. In `gitlabClient.ts`: Add:
   ```typescript
   export async function fetchGroupIssues(
     config: GitLabConfig,
     groupId: string,
     params: { assignee_username?: string; iteration_id?: number; per_page?: number; state?: string }
   ): Promise<{ success: boolean; data?: GitLabIssue[]; error?: string }> {
     const searchParams = new URLSearchParams();
     if (params.assignee_username) searchParams.set('assignee_username', params.assignee_username);
     if (params.iteration_id) searchParams.set('iteration_id', String(params.iteration_id));
     if (params.per_page) searchParams.set('per_page', String(params.per_page));
     if (params.state) searchParams.set('state', params.state);
     const qs = searchParams.toString();
     const result = await gitlabGet<GitLabIssue[]>(config, `/groups/${groupId}/issues${qs ? `?${qs}` : ''}`);
     if (!result.ok) return { success: false, error: result.error };
     return { success: true, data: result.data };
   }
   ```

**API:** `GET /groups/:id/issues?assignee_username=X&iteration_id=Y&per_page=100`

---

### B3: New API — `searchGroupMembers()`

**Goal:** Autocomplete user search within the group.

**Files to change:**
- `src/services/gitlab/gitlabClient.ts` — add function
- `src/services/gitlab/types.ts` — add `GitLabMember` type

**Atomic steps:**
1. In `types.ts`: Add:
   ```typescript
   export interface GitLabMember {
     id: number;
     username: string;
     name: string;
     state: string;
     avatar_url: string | null;
     web_url: string;
     access_level: number;
   }
   ```
2. In `gitlabClient.ts`: Add:
   ```typescript
   export async function searchGroupMembers(
     config: GitLabConfig, groupId: string, query: string
   ): Promise<{ success: boolean; data?: GitLabMember[]; error?: string }> {
     const result = await gitlabGet<GitLabMember[]>(
       config, `/groups/${groupId}/members/all?query=${encodeURIComponent(query)}&per_page=10`
     );
     if (!result.ok) return { success: false, error: result.error };
     return { success: true, data: result.data };
   }
   ```

**API:** `GET /groups/:id/members/all?query=<partial>` — searches name, email, username. No admin needed. Includes inherited members.

---

### B4: Default View — Logged-in User's Issues for Current Iteration

**Goal:** On load, Issue Manager shows MY issues for the current sprint.

**Files to change:**
- `src/components/issues/IssueManagerView.tsx` — replace epic-scoped fetch with user-scoped fetch

**Atomic steps:**
1. Remove the `useEffect` that calls `fetchIssuesAction()` (epic-scoped).
2. Add new `useEffect` on mount:
   - Call `fetchCurrentIteration(config.gitlab, config.gitlab.rootGroupId)`
   - If iteration found, call `fetchGroupIssues(config.gitlab, rootGroupId, { assignee_username: currentUser, iteration_id: iteration.id, per_page: 100 })`
   - Store results in local state (or add to gitlabStore)
3. For `currentUser`: Read from auth context (MockAuthProvider gives a username) or from configStore.
4. Map `GitLabIssue[]` to `MockIssue[]` using existing `mapGitLabIssueToMock`.
5. Keep the mock fallback when GitLab isn't configured.

**Dependencies:** B1 (fetchCurrentIteration), B2 (fetchGroupIssues)

---

### B5: Unified Search Bar — User Chip + Autocomplete

**Goal:** Single search bar with current user as removable chip. Type to search other users.

**Files to change:**
- `src/components/issues/IssueManagerView.tsx` — replace search input
- `src/components/issues/IssueList.tsx` — may need props change

**Atomic steps:**
1. Add state: `viewingUser: { username: string; name: string } | null` (null = all issues, populated = filtered by user)
2. Add state: `userSearch: string`, `userSuggestions: GitLabMember[]`, `loadingUsers: boolean`
3. Default `viewingUser` to current logged-in user on mount.
4. Render: chip showing `viewingUser.name` with X button. When X clicked → `viewingUser = null` → show all issues.
5. When text typed in search bar → debounce 300ms → `searchGroupMembers(config.gitlab, rootGroupId, query)` → show autocomplete dropdown.
6. When suggestion clicked → `viewingUser = { username, name }` → re-fetch issues for that user via B2.
7. Keep existing issue search (title/ID filter) as a separate input below the user bar, or combine into one unified bar with "user:" prefix detection.

**Dependencies:** B3 (searchGroupMembers), B4 (default view logic)

---

### B6: Issue Card Health Signals

**Goal:** Show overdue badge, time progress, comment count on each issue card. Zero new API calls.

**Files to change:**
- `src/components/issues/types.ts` — add optional fields to MockIssue
- `src/components/issues/IssueManagerView.tsx` — pass new fields in mapper
- `src/components/issues/IssueRow.tsx` — render badges

**Atomic steps:**
1. In `types.ts` MockIssue: Add `due_date?: string`, `time_estimate?: number`, `time_spent?: number`, `notes_count?: number`.
2. In `IssueManagerView.tsx` `mapGitLabIssueToMock`: Map from GitLab response fields (these are already in the API response, no new calls).
3. In `IssueRow.tsx`: After the existing status/priority display:
   - If `due_date` exists and is past today → red "Overdue" badge
   - If `time_estimate > 0` → small progress bar (time_spent / time_estimate)
   - If `notes_count > 0` → gray "💬 N" indicator
4. Style with UBS theme (Frutiger, `--col-*` vars, subtle badges).

**Dependencies:** None (uses existing API response data)

---

## CATEGORY C: Issue Manager — Right Panel (AI Narration Upgrade)

### C1: Replace Dropdown — Activity Type Instead of Tone

**Goal:** Dropdown = Update / Question / Blocker / Clarification.

**Files to change:**
- `src/components/issues/IssueDetail.tsx`

**Atomic steps:**
1. Change type: `const [aiTone, setAiTone] = useState<'professional' | 'casual' | 'technical'>('professional')` → `const [activityType, setActivityType] = useState<'update' | 'question' | 'blocker' | 'clarification'>('update')`
2. Update the `<select>` options from Professional/Casual/Technical → Update/Question/Blocker/Clarification.
3. Update `data-testid` from `ai-tone-select` to `ai-activity-type`.

---

### C2: Enrich AI Prompt — Context-Aware Narration

**Goal:** AI reads issue description + recent notes + activity type to generate contextual narration.

**Files to change:**
- `src/components/issues/IssueDetail.tsx` — update `handleGenerateAI`

**Atomic steps:**
1. In `handleGenerateAI`: Build richer context:
   ```typescript
   const recentNotesContext = realNotes.slice(-5).map(n => `[${n.author.name}]: ${n.body.slice(0, 200)}`).join('\n');
   const issueContext = issue?.description ? issue.description.slice(0, 500) : '';
   ```
2. Replace the `toneGuide` with `activityGuide`:
   ```typescript
   const activityGuide = {
     update: 'Generate a status update report. State what is done, what is in progress.',
     question: 'Generate a question for the team. End with a clear question that needs an answer.',
     blocker: 'Generate a blocker report. Use urgent language. Identify what is blocking and the impact.',
     clarification: 'Generate a clarification request. Ask for more details on a specific technical point.',
   }[activityType];
   ```
3. Update the AI prompt:
   ```typescript
   systemPrompt: `You generate GitLab issue activity updates. ${activityGuide} Keep concise (2-4 sentences). Reference the issue context naturally.`,
   userPrompt: `Issue: "${issue?.title}"\nDescription: ${issueContext}\nRecent activity:\n${recentNotesContext}\n\nUser's input: "${aiInput}"\n\nGenerate a ${activityType} for this issue.`,
   ```

**Dependencies:** C1 (activity type state)

---

### C3: New API — `fetchIssueLinks()`

**Goal:** Get linked/blocking issues for AI context enrichment.

**Files to change:**
- `src/services/gitlab/gitlabClient.ts` — add function
- `src/services/gitlab/types.ts` — add `GitLabIssueLink` type

**Atomic steps:**
1. In `types.ts`: Add:
   ```typescript
   export interface GitLabIssueLink {
     id: number;
     iid: number;
     title: string;
     state: string;
     link_type: 'relates_to' | 'blocks' | 'is_blocked_by';
     web_url: string;
   }
   ```
2. In `gitlabClient.ts`: Add:
   ```typescript
   export async function fetchIssueLinks(
     config: GitLabConfig, projectId: number, issueIid: number
   ): Promise<{ success: boolean; data?: GitLabIssueLink[]; error?: string }> {
     const result = await gitlabGet<GitLabIssueLink[]>(
       config, `/projects/${projectId}/issues/${issueIid}/links`
     );
     if (!result.ok) return { success: false, error: result.error };
     return { success: true, data: result.data };
   }
   ```

**API:** `GET /projects/:id/issues/:issue_iid/links` — returns related/blocking issues with `link_type`.

---

### C4: AI Includes Blocker/Link Context

**Goal:** When activity type = "Blocker", AI mentions which issues are blocked and impact.

**Files to change:**
- `src/components/issues/IssueDetail.tsx`

**Atomic steps:**
1. Add state: `issueLinks: GitLabIssueLink[]`
2. Add `useEffect` when `isRealIssue` changes: fetch links via `fetchIssueLinks(gitlabConfig, issue.project_id, issue.iid)`.
3. In `handleGenerateAI`: When `activityType === 'blocker'`, add link context to prompt:
   ```typescript
   const blockerContext = issueLinks
     .filter(l => l.link_type === 'blocks' || l.link_type === 'is_blocked_by')
     .map(l => `${l.link_type}: #${l.iid} "${l.title}" (${l.state})`)
     .join('\n');
   ```
4. Append to userPrompt: `\nBlocking relationships:\n${blockerContext}`
5. Also include `issue.weight` in prompt if available: `\nStory points: ${issue.weight ?? 'unset'}`

**Dependencies:** C3 (fetchIssueLinks), C2 (enriched prompt)

---

### C5: Quick Actions Passthrough

**Goal:** GitLab quick actions in note body pass through to API without AI rewriting them.

**Files to change:**
- `src/components/issues/IssueDetail.tsx`

**Atomic steps:**
1. In `handleGenerateAI`: Before sending to AI, extract quick actions from input:
   ```typescript
   const quickActionLines = aiInput.split('\n').filter(l => l.trim().startsWith('/'));
   const textLines = aiInput.split('\n').filter(l => !l.trim().startsWith('/'));
   ```
2. Send only `textLines.join('\n')` to the AI for narration.
3. After AI returns, prepend the quick action lines back:
   ```typescript
   const finalText = [...quickActionLines, aiPreviewText].join('\n');
   ```
4. In `handlePostAI`: Post the combined text (quick actions + AI narration) as the note body.
5. Add hint text below input: "Tip: Quick actions like `/assign @user`, `/weight 3`, `/label ~bug` are passed through to GitLab."

---

## CATEGORY D: Blueprint Diagram — 2-Stage Pipeline + Embed

### D1: Stage 1 — `interpretDiagramFeedback()`

**Goal:** Cheap AI call that explains planned changes before executing them.

**Files to change:**
- `src/actions/regenerateBlueprintAction.ts` — add interpret function

**Atomic steps:**
1. Add exported function:
   ```typescript
   export async function interpretDiagramFeedback(
     feedback: string, currentDiagram: string, epicContext: string
   ): Promise<{ interpretation: string; changeItems: string[]; confidence: 'high' | 'medium' | 'low' }>
   ```
2. AI prompt: "You are a diagram architect. The user wants to modify this Mermaid diagram. Describe what changes you would make. Return JSON: { interpretation, changeItems, confidence }. Do NOT generate Mermaid code yet."
3. Include `currentDiagram` (first 3000 chars) and `epicContext` (first 2000 chars) in prompt.
4. Parse JSON response. Fallback on parse failure: `{ interpretation: feedback, changeItems: [feedback], confidence: 'low' }`.

---

### D2: Confirmation Card UI

**Goal:** "Yes, apply" / "Not quite" / "Let me clarify" buttons with confidence indicator.

**Files to change:**
- `src/components/blueprint/BlueprintView.tsx`
- `src/stores/blueprintStore.ts` — add refinement state

**Atomic steps:**
1. In `blueprintStore.ts`: Add state:
   ```typescript
   diagramFeedback: string;
   diagramInterpretation: { interpretation: string; changeItems: string[]; confidence: string } | null;
   diagramRefineState: 'idle' | 'interpreting' | 'confirming' | 'refining';
   ```
2. Add actions: `setDiagramFeedback`, `setDiagramInterpretation`, `setDiagramRefineState`, `clearRefinement`.
3. In `BlueprintView.tsx`: Below the diagram, render based on `diagramRefineState`:
   - `idle`: textarea + "Submit" button
   - `interpreting`: spinner "Understanding your feedback..."
   - `confirming`: card with interpretation text, change items as bullets, confidence emoji (💡/🤔/❓), three buttons
   - `refining`: spinner "Applying changes..."
4. "Yes, apply" → calls Stage 2 (D3). "Not quite" → clears, re-focuses input. "Let me clarify" → pre-fills input with interpretation.

**Dependencies:** D1 (interpret function)

---

### D3: Stage 2 — `refineDiagramWithInstructions()`

**Goal:** Modify existing diagram based on confirmed instructions, preserving unmodified structure.

**Files to change:**
- `src/actions/regenerateBlueprintAction.ts` — the existing `regenerateBlueprintAction` with `instruction` param already does this partially. Enhance it.

**Atomic steps:**
1. The existing `regenerateBlueprintAction(instruction?)` already sends the instruction + current diagram to AI. Verify the prompt says "PRESERVE existing structure, only modify what's specified."
2. After successful generation, update `diagramRefineState` back to `idle`.
3. Version is automatically saved (blueprintStore.setCode already pushes to versions array from Fix 5a).

**Dependencies:** D1 (interpret), D2 (confirmation)

---

### D4: Chat Input Below Diagram

**Goal:** Textarea for natural language diagram feedback.

**Files to change:**
- `src/components/blueprint/BlueprintView.tsx`

**Atomic steps:**
1. Add between diagram area and DiagramControls:
   ```
   ┌──────────────────────────────────────┐
   │ What would you like to change?  [Send]│
   └──────────────────────────────────────┘
   ```
2. Textarea: value = `blueprintStore.diagramFeedback`, onChange updates store.
3. Enter = submit (calls interpretDiagramFeedback), Shift+Enter = new line.
4. "Send" button: disabled when empty or `diagramRefineState !== 'idle'`.
5. Hint text: "⏎ Enter to submit · ⇧⏎ New line · Or use quick actions above"

**Dependencies:** D2 (confirmation card renders based on state)

---

### D5: "Use This Diagram" Button — Embed into Epic

**Goal:** One-click replaces the architecture diagram section in the epic markdown.

**Files to change:**
- `src/components/blueprint/BlueprintView.tsx` — add button
- `src/stores/epicStore.ts` — add `replaceArchitectureSection` action
- `src/domain/epicSerializer.ts` — add section replacement helper if needed

**Atomic steps:**
1. In `epicStore.ts`: Add action `replaceArchitectureSection(mermaidCode: string)`:
   - Read current `markdown`
   - Find the architecture diagram section (regex: `/## .*(?:Architecture|Deployment Architecture|Blueprint).*\n[\s\S]*?(?=\n## |\n# |$)/i`)
   - Replace its content with `` ```mermaid\n${mermaidCode}\n``` ``
   - If no section found, append as new `## Architecture Diagram` section
   - Call `setMarkdown(newMarkdown)`
2. In `BlueprintView.tsx`: Add "Use This Diagram" button in the header bar, next to the diagram type badge.
   - Styled as UBS brand red button
   - On click: `useEpicStore.getState().replaceArchitectureSection(blueprintStore.code)`
   - Toast: "Diagram embedded in epic"
   - Disabled when no diagram code exists

---

### D6: Draft/Finalized Labeling

**Goal:** Badge on diagram header showing draft vs finalized status.

**Files to change:**
- `src/stores/blueprintStore.ts` — add `isDraft: boolean`
- `src/components/blueprint/BlueprintView.tsx` — render badge

**Atomic steps:**
1. In `blueprintStore.ts`: Add `isDraft: boolean` to state (default `true`). Add `finalize()` action that sets `isDraft: false`. In `setCode`, reset `isDraft: true`.
2. In `BlueprintView.tsx` header: After the diagram type badge, add:
   - If `isDraft`: amber badge "📝 Draft" — clickable, calls `finalize()`
   - If `!isDraft`: green badge "✅ Final"

---

## CATEGORY E: Template Fixes

### E1: Add `general` Template to categoryTemplates.json

**Goal:** Pipeline doesn't fall back to wrong template for General category.

**Files to change:**
- `src/services/templates/categoryTemplates.json`

**Atomic steps:**
1. Add after `_meta` section, before `technical_design`:
   ```json
   "general": {
     "description": "General-purpose epics — the AI pipeline will classify and structure the content automatically",
     "tone": "adaptive based on content",
     "storyStyle": "context-dependent",
     "architectureFocus": "determined by content classification",
     "expertRole": "senior technical writer",
     "totalWordTarget": { "min": 1500, "max": 4000 },
     "requiredSections": {
       "Overview": { "target": 200, "max": 400, "format": "prose", "hint": "High-level summary of the epic" },
       "Objectives": { "target": 200, "max": 400, "format": "bullet-list", "hint": "Key goals and success criteria" },
       "Requirements": { "target": 300, "max": 600, "format": "numbered-list", "hint": "Core requirements" },
       "Scope": { "target": 150, "max": 300, "format": "bullet-list", "hint": "In-scope and out-of-scope" },
       "User Stories": { "target": 400, "max": 800, "format": "mixed", "hint": "User stories with acceptance criteria", "count": { "min": 5, "max": 15 }, "fields": ["title", "description", "acceptance_criteria"] }
     },
     "optionalSections": {
       "Architecture Overview": { "target": 200, "max": 400, "format": "mermaid", "diagram": "flowchart", "hint": "System design if applicable" },
       "Dependencies": { "target": 100, "max": 200, "format": "bullet-list", "hint": "External dependencies" },
       "Timeline": { "target": 100, "max": 200, "format": "phase-table", "hint": "Key milestones" }
     }
   },
   ```

---

### E2: Promote Security to Required

**Goal:** Security is REQUIRED in technical_design and infrastructure_design (UBS is a bank).

**Files to change:**
- `src/services/templates/categoryTemplates.json`

**Atomic steps:**
1. In `technical_design`: Move `"Non-Functional Requirements"` from `optionalSections` to `requiredSections`. Rename to `"Security & Non-Functional Requirements"`.
2. In `infrastructure_design`: Move `"Security"` from `optionalSections` to `requiredSections`. Set `"target": 200, "max": 400`.

---

### E3: Align Word Limits

**Goal:** enforceWordLimit default matches template max values.

**Files to change:**
- `src/pipeline/stages/runStage4Refinement.ts` — make word limit dynamic per section

**Atomic steps:**
1. Currently hardcoded: `enforceWordLimit(s.content, 500)`.
2. Change to read from template config: look up the section's `max` value from the template for the current category.
3. If no template config found, fallback to 500.
4. This requires passing category + template to the word limit call, or computing a map before the batch.

---

## CATEGORY F: Wire V4 Functions into Pipeline

### F1: Wire `buildIterationFeedback()` into Orchestrator

**Files:** `src/pipeline/pipelineOrchestrator.ts`

**Steps:**
1. Import `buildIterationFeedback` from epicScorer.
2. At line 196 where `previousFeedback = validation;` — also build structured feedback:
   ```typescript
   const structured = buildIterationFeedback(validation.feedback, validation.overallScore, validation.detectedFailures);
   ```
3. Pass `structured.xml` as a separate field in the RefinementInput, or modify the existing `previousFeedback` to carry the XML string.

---

### F2: Wire `extractKeyTerms()` into Scoring

**Files:** `src/pipeline/epicScorer.ts` — internal wiring within `scoreDocument`

**Steps:**
1. In `scoreDocument()`: Replace basic word tokenization with `extractKeyTerms()` for key term extraction.
2. Use extracted terms for BM25 scoring via `saturatedTermCoverageHybrid()` instead of basic `saturate()`.

---

### F3: Wire `analyzeMermaidGraph()` into Diagram Scoring

**Files:** `src/pipeline/stages/runStage6Validation.ts` or `epicScorer.ts`

**Steps:**
1. When scoring the assembled epic, extract Mermaid code blocks.
2. Run `analyzeMermaidGraph()` on each code block.
3. Include the graph quality score in the overall diagram dimension.

---

### F4: Wire `shouldStopConvergence()` into Orchestrator Loop

**Files:** `src/pipeline/pipelineOrchestrator.ts`

**Steps:**
1. Import `shouldStopConvergence` from epicScorer.
2. After validation score is computed (line ~163), check:
   ```typescript
   if (iterations > 1 && shouldStopConvergence(validation.overallScore, previousScore)) {
     // Early exit — converged
     break;
   }
   ```
3. Track `previousScore` across iterations.

---

### F5: Wire `computeAdjustedScore()` into Pass/Fail

**Files:** `src/pipeline/stages/runStage6Validation.ts`

**Steps:**
1. Import `computeAdjustedScore` from epicScorer.
2. After computing dimension scores, compute adjusted score.
3. Use adjusted score for pass/fail instead of raw `overallScore`.

---

## CATEGORY G: Mermaid Type Restriction

### G1: Restrict to 6 Stable Types

**Files:** `src/pipeline/stages/runStage5Mandatory.ts`

**Steps:**
1. Find `VALID_MERMAID_DIRECTIVES` array (currently 9 types).
2. Remove `pie`, `journey`, `gantt` — OR verify they're intentionally supported by testing each type renders without errors in the current Mermaid version.
3. If keeping all 9, add a comment explaining the decision.

---

## EXECUTION ORDER

```
Phase 1: API Layer (B1, B2, B3, C3, A1-api) — all new gitlabClient functions
Phase 2: Issue Creation (A1-ui, A2, A3) — Epic Planner enhancements
Phase 3: Issue Manager Left Panel (B4, B5, B6) — user-scoped views
Phase 4: Issue Manager Right Panel (C1, C2, C4, C5) — AI narration
Phase 5: Blueprint Pipeline (D1, D2, D3, D4, D5, D6) — 2-stage + embed
Phase 6: Templates (E1, E2, E3)
Phase 7: Pipeline Wiring (F1, F2, F3, F4, F5)
Phase 8: Mermaid Types (G1)
Phase 9: Verify all — tests + build
```

**Estimated total: ~60-80 hours of implementation work across 29 tasks.**
