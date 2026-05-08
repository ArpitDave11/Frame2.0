# Document Intelligence Tab — Design

**Date:** 2026-05-08
**Status:** Approved
**Research:** `docs/research/DocEX.md`

## Problem

Users need to upload any document (PDF, DOCX, PPTX, etc.) and get back an editable, publishable analysis — without leaving the app. This is not chat-with-document or RAG. It is a one-shot "upload -> analyze through a lens -> edit -> ship" workflow.

## Architecture

```
User Flow:
  Doc Intel Tab -> Upload file -> Pick lens + focus context -> Analyze
  -> 3 parallel callAI() -> 4 editable BlockNote sections -> Edit/Regenerate/Revert
  -> Download MD | Export DOCX/PDF | Publish to GitLab

Services:
  SPA (React :3002)
    |-> DocMining Backend (:8000) - /api/v1/documents/analyze (NEW endpoint)
    |-> Export Service (:8001) - /api/v1/export (NEW microservice)
    |-> Azure OpenAI (existing proxy) - 3 parallel callAI()
    |-> GitLab API (existing client) - commitToGitLabBranch / publishWithMergeRequest
```

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Editor | BlockNote (per-section, day one) | Notion-style UX, MIT core, JSON<->markdown |
| Diagrams | Mermaid 11 only | PlantUML rejected (license, maturity, air-gap) |
| LLM calls | 3 parallel (Summary, Insights, Visuals) | Independent sections, partial failure recovery |
| Backend extraction | New `/analyze` endpoint | Existing `/convert` untouched |
| Export | Separate microservice (`backend/export/`) | Keeps DocMining lean (~4GB), export deps are different |
| DOCX | Pandoc + `--reference-doc=ubs_template.docx` | Alpine-friendly, branded output |
| PDF | WeasyPrint (HTML->PDF) | Alpine wheels, no headless Chromium |
| Mermaid in exports | Client renders SVG -> base64 data URIs -> server | No browser on server |
| GitLab publish | Reuse existing functions | `commitToGitLabBranch`, `publishWithMergeRequest` |

## Store: `docIntelStore.ts`

```typescript
interface Section {
  id: string;
  kind: 'summary' | 'insights' | 'explanations' | 'visuals';
  markdown: string;
  mermaidSources?: string[];
  status: 'idle' | 'generating' | 'done' | 'error';
  history: string[];
  error?: string;
}

type LensType = 'executive' | 'technical' | 'legal' | 'financial' | 'operational' | 'risk' | 'summary';

interface DocIntelState {
  fileName: string | null;
  documentMarkdown: string | null;
  outline: OutlineItem[];
  tables: TableItem[];
  metadata: DocMetadata | null;
  lens: LensType | null;
  focusContext: string;
  sections: Section[];
  phase: 'empty' | 'uploaded' | 'analyzing' | 'ready' | 'error';
}
```

## Component Tree

```
DocIntelView.tsx                    <- registered in ViewRouter
+-- DocIntelEmptyState.tsx          <- lens chips + drop zone
+-- DocIntelWorkspace.tsx           <- shown after analyze
    +-- DocIntelHeader.tsx          <- dark header: filename, lens badge, re-analyze
    +-- SplitPane (reuse)
        +-- Left: DocumentOutline.tsx
        +-- Right: SectionCards.tsx
            +-- SectionCard.tsx x4  <- BlockNote editor + Regenerate + Revert
            +-- ExportBar.tsx       <- MD | DOCX | PDF | GitLab
    +-- PublishToGitLabDialog.tsx
```

## Backend: New `/analyze` Endpoint

Added to existing DocMining service. Returns enriched extraction:

```json
{
  "markdown": "...",
  "outline": [{"level": 1, "text": "Introduction", "page": 1}],
  "tables": [{"index": 0, "html": "<table>...</table>", "csv": "col1,col2\n..."}],
  "metadata": {"filename": "req.pdf", "page_count": 42, "file_sha256": "..."},
  "request_id": "...", "file_name": "...", "status": "success", "pages": 42, "duration_ms": 3200
}
```

## Backend: Export Microservice (`backend/export/`)

Separate service, separate Dockerfile (~300MB vs DocMining's ~4GB).

```
POST /api/v1/export
Body: { format: 'docx' | 'pdf', markdown: string, title: string }
Returns: StreamingResponse (file bytes)

DOCX: pandoc -f gfm -t docx --reference-doc=ubs_template.docx
PDF:  WeasyPrint(markdown -> html -> pdf)
```

Client pre-renders Mermaid to SVG data URIs before posting.

## LLM Analysis: 3 Parallel Calls

| Call | Output Schema | Purpose |
|---|---|---|
| Summary | `{ title, oneLineSummary, executiveSummaryMd, audienceBriefMd }` | Overview, lens-tuned |
| Insights | `{ keyInsights[], simplifiedExplanations[], risks[] }` | Takeaways, plain rewrites, risks |
| Visuals | `{ diagrams[]: { title, kind, mermaidSource, caption } }` | Mermaid diagrams |

7 lenses are system-prompt variants sharing the same schemas.

Per-section regenerate: fires 1 callAI() for that section only, pushes prior to history[].

Mermaid validation: `mermaid.parse()` -> if invalid, 1 retry with error in prompt -> fallback to code block.

## Publish & Export

1. **Download MD** - client-side blob, instant
2. **Export DOCX/PDF** - client renders mermaid->SVG, POSTs to export service
3. **Publish to GitLab** - form: repo URL, branch dropdown, file path, commit message, MR checkbox. Reuses existing GitLab client functions. Pre-commit conflict detection via file SHA comparison.

## Theme (verified against UBS_Theme_Instructions.docx)

- Brand red: `#E60000` (impulse line, active states, CTA)
- Font: Frutiger, Arial, Helvetica, sans-serif; weight 300 dominant
- Impulse line: 4px wide, `#E60000`, 15px top/bottom inset
- Dark header: `#1a1a1a`
- Empty state: mirrors EditorPane (dark bg, impulse line, headline, chips)

## Files Changed (existing)

- `src/stores/uiStore.ts` - add `'docIntel'` to TabId
- `src/components/layout/ViewRouter.tsx` - add DocIntelView case
- `src/components/layout/WorkspaceSidebar.tsx` - add nav item
- `vite.config.ts` - add `/api/export` proxy
- `backend/docmining/app/api/v1/documents.py` - add `/analyze` endpoint

## Files Created (new)

Frontend (~15):
- `src/stores/docIntelStore.ts`
- `src/services/docIntel/analyzeAction.ts`
- `src/services/docIntel/docIntelClient.ts`
- `src/services/docIntel/lensPrompts.ts`
- `src/services/docIntel/exportClient.ts`
- `src/components/docIntel/DocIntelView.tsx`
- `src/components/docIntel/DocIntelEmptyState.tsx`
- `src/components/docIntel/DocIntelWorkspace.tsx`
- `src/components/docIntel/DocIntelHeader.tsx`
- `src/components/docIntel/DocumentOutline.tsx`
- `src/components/docIntel/SectionCards.tsx`
- `src/components/docIntel/SectionCard.tsx`
- `src/components/docIntel/ExportBar.tsx`
- `src/components/docIntel/PublishToGitLabDialog.tsx`

Backend (~5):
- `backend/export/` (new microservice: pyproject.toml, Dockerfile, app/main.py, app/api/v1/export.py, app/core/config.py)

## Not Touched

- Pipeline stages, orchestrator (pipeline purity)
- WelcomeScreen (scope guard)
- Existing tests
- Existing `/convert` endpoint
