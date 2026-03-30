# Context-Aware Update Generation — Design

**Goal:** When a user opens an issue in sprint view and types a quick update, the AI generates a structured update that reflects the full project narrative — not an isolated comment.

**Architecture:** On issue click, eagerly fetch the parent Epic + last 10 activity notes in parallel. Cache both in component state. When the user hits Generate, the AI prompt includes Epic context + full activity history + user input, producing a continuity-aware update.

---

## Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Fetch timing | Eager — on issue click | Zero latency at generate time |
| Epic depth | Epic description only | Lightweight; sibling issues not needed |
| Activity depth | Last 10 notes per issue | Covers multi-week context without bloating prompt |
| Epic source | Auto-fetch from GitLab API | User may have many issues across different epics in a sprint |
| Epic scope | Current issue's parent epic only | No sprint-level aggregation |
| No-epic fallback | Degrade gracefully | Generate with issue context only, don't block the user |

---

## Data Flow

```
Issue click → parallel fetch:
  1. GET parent Epic (via issue's epic link)
  2. GET last 10 notes (existing fetchIssueNotes, bumped from 5→10)
     ↓
Cache in IssueDetail component state
     ↓
User types quick update → hits Generate
     ↓
AI prompt = Epic description + issue details + 10 notes + activity type guidance + user input
     ↓
Structured update preview → user posts to GitLab
```

---

## API Changes

### New: `fetchParentEpic(gitlabConfig, issueIid, projectId)`

- Location: `src/services/gitlab/gitlabClient.ts`
- Endpoint: `GET /projects/:id/issues/:iid/related_epics` (or issue endpoint with epic linkage)
- Returns: Epic title + description (markdown body)
- Cached per issue ID for the session

### Existing: `fetchIssueNotes`

- Bump default limit from 5 to 10

---

## IssueDetail Changes

- **On mount:** fire `fetchParentEpic` + `fetchIssueNotes(10)` in parallel
- **State:** `epicContext: { title: string; description: string } | null`, `notes: IssueNote[]`
- **Loading:** spinner near AI input area, not blocking the issue panel
- **No-epic:** `epicContext = null`, proceed without it

---

## AI Prompt Structure

```
CONTEXT:
Epic: {epicTitle}
{epicDescription — first 2000 chars}

ISSUE: {issueTitle}
{issueDescription}
Story Points: {weight} | Status: {state}

ACTIVITY LOG (recent → oldest):
- {author} ({date}): {note body — truncated to 300 chars each}
- ...

ACTIVITY TYPE: {update | question | blocker | clarification}
{activity type guidance}

USER INPUT:
{user's quick update text}

Generate a structured update that maintains continuity with the activity log
and aligns with the Epic's objectives. Do not repeat previous updates.
```

### No-Epic Fallback

When `epicContext` is null, the prompt simply omits the Epic section. Everything else works the same — issue details + 10 notes + user input.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/services/gitlab/gitlabClient.ts` | Add `fetchParentEpic` function |
| `src/services/gitlab/types.ts` | Add epic response type if needed |
| `src/components/issues/IssueDetail.tsx` | Eager fetch on mount, enrich AI prompt with epic + 10 notes |
| `src/services/ai/aiClient.ts` | No changes (existing `callAI` is sufficient) |
