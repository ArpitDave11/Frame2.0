# Initiative Document Upload — Design

**Date:** 2026-04-26
**Status:** Approved (brainstorm)
**Scope:** Add inline document upload to InitStep in Extreme Initiative module
**Next step:** `superpowers:writing-plans` for implementation tasks

---

## Goal

Allow users to upload a document (PDF, DOCX, PPTX, TXT) in Step 1 of the Extreme Initiative wizard. The document is extracted via the existing DocMining backend, and the extracted markdown fills the description textarea — feeding the AI epic generation in Step 2.

## Architecture Decision

**Approach 1 (chosen):** Inline upload zone in `InitStep.tsx`, reusing `convertDocument()` from `docminingClient.ts`. No new modals, no new components. ~50 lines added to InitStep.

Rejected: reusing DocUploadModal (tightly coupled to epicStore + refinePipelineAction), new modal (DRY violation).

## Data Flow

```
User drops file in InitStep upload zone
  → validate ext (ALLOWED_EXTENSIONS) + size (MAX_FILE_BYTES)
  → show "Extracting..." spinner
  → convertDocument(file) from @/services/docmining/docminingClient
  → success: initiativeStore.setDescription(outcome.data.markdown)
     → description textarea shows extracted text (user reviews/edits)
  → error: show error message inline
  → user clicks "Generate Stream Epic →" when ready (no auto-advance)
```

## What We Reuse (zero changes)

- `convertDocument()` from `src/services/docmining/docminingClient.ts`
- `ALLOWED_EXTENSIONS`, `MAX_FILE_BYTES` constants
- DocMining backend at `/api/docmining/convert`

## What We Add

In `src/components/initiative/steps/InitStep.tsx` (~50 lines):
- Dashed-border upload zone below description textarea
- Drag-and-drop handlers + hidden file input + "Browse files" button
- Upload state: `'idle' | 'extracting' | 'done' | 'error'`
- AbortController for cleanup on unmount
- On success: `setDescription(outcome.data.markdown)`

## UI

```
Description:
[textarea with extracted or manual text]

┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│  Or upload a document                 │
│  Drag & drop or click to browse       │
│  PDF, DOCX, PPTX, TXT (max 50 MB)    │
│  [Browse files]                       │
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

## Testing

One test: mock `convertDocument`, upload a file, verify `initiativeStore.setDescription()` called with extracted markdown.

## Scope Guards

- DO NOT modify `docminingClient.ts` or `DocUploadModal`
- DO NOT auto-advance to Step 2 after extraction
- DO NOT create new modals or components
