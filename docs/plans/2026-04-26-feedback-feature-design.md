# Feedback Feature — Design

**Date:** 2026-04-26
**Status:** Approved (brainstorm)
**Next step:** `superpowers:writing-plans` for implementation tasks

---

## Goal

Add a "Feedback" option accessible from the sidebar. Opens a modal where users submit feedback (category + message). Feedback is committed as an individual markdown file to a hardcoded GitLab project via the Repository Files API. User info auto-captured from MSAL.

## Architecture Decision

**Approach 1 (chosen):** GitLab Repository Files API commit. One `POST /projects/:id/repository/files/:path` per submission. Hardcoded project ID. No backend changes.

Rejected: GitLab Issues API (not folder-based), DocMining backend endpoint (over-engineering).

## Modal UI

```
┌─────────────────────────────────────────────┐
│  Share Feedback                          [×] │
│                                              │
│  From: Arpit Dave (arpit.dave@ubs.com)       │
│        (auto-captured from MSAL, read-only)  │
│                                              │
│  Category:  [Bug ▾]                          │
│             Bug / Feature Request / General   │
│                                              │
│  Your feedback:                              │
│  ┌──────────────────────────────────────┐    │
│  │                                      │    │
│  │                                      │    │
│  └──────────────────────────────────────┘    │
│                                              │
│                        [Cancel]  [Submit →]  │
└─────────────────────────────────────────────┘
```

## Data Flow

```
User clicks "Feedback" in sidebar
  → uiStore.openModal('feedback')
  → FeedbackModal reads MSAL account: { name, email }
  → User picks category + types message
  → Submit:
     POST /gitlab-api/projects/{PROJECT_ID}/repository/files/{path}
       path: feedback/YYYY-MM-DD-{username-slug}-{short-id}.md
       content: base64-encoded markdown (YAML frontmatter + message)
       commit_message: "feedback: {category} from {name}"
       branch: main
  → Success: toast + close modal
  → Error: inline error, modal stays open
```

## File Format (committed to GitLab)

```markdown
---
date: 2026-04-26T08:30:00Z
user: Arpit Dave
email: arpit.dave@ubs.com
category: bug
---

The upload button doesn't work when I drag a PPTX file.
```

## Files

**New:**
- `src/services/gitlab/feedbackService.ts` — `submitFeedback()` function (~30 lines)
- `src/services/gitlab/feedbackService.test.ts` — mock API, verify file path + content
- `src/components/settings/FeedbackModal.tsx` — modal component (~80 lines)

**Modified:**
- `src/stores/uiStore.ts` — add `'feedback'` to `ModalId`
- `src/components/layout/ModalHost.tsx` — add feedback case
- `src/components/layout/WorkspaceSidebar.tsx` — add "Feedback" nav item

**Constants (hardcoded in feedbackService.ts):**
- `FEEDBACK_PROJECT_ID` — GitLab project ID (user provides)
- `FEEDBACK_FOLDER` — `'feedback'`
- `FEEDBACK_BRANCH` — `'main'`

## What We Reuse

- `getGitLabAuthHeaders()` + `getBaseUrl()` from `gitlabClient.ts`
- `/gitlab-api` Vite proxy
- MSAL account from existing auth context
- Modal pattern (ModalHost switch on ModalId)
- Toast via `uiStore.addToast()`

## Scope Guards

- No new backend endpoint
- No settings fields for feedback config (hardcoded project ID)
- No feedback history/listing UI
- No attachments/screenshots
- No connection to rootGroupId or streamGroupId

---

**Status:** Design approved. Next step: `superpowers:writing-plans`.
