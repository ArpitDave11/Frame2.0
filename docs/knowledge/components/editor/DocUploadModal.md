# src/components/editor/DocUploadModal.tsx

## Purpose
Upload modal that converts a requirement document (PDF/DOCX/PPTX/XLSX/HTML/images/text) into markdown via the DocMining backend, populates the editor, and auto-kicks the 6-stage refine pipeline. Content-only component: wrapped by the shared `<Modal>` in `ModalHost` (case `'docUpload'`).

## Exports
- `DocUploadModal()` — no props.

## Store reads / writes
- `uiStore` — `closeModal`, `openModal` (to transition `docUpload → pipeline`).
- `epicStore` — `setMarkdown` (writes extracted markdown).
- Does **not** read/write `gitlabStore` or `pipelineStore` directly; the pipeline modal observes `pipelineStore.isRunning`.

## Local state
- `file: File | null` — currently selected upload.
- `phase: 'idle' | 'uploading' | 'error'`.
- `error: string | null` — last validation / backend error message.
- `dragOver: boolean` — visual state for drag-drop.
- `inputRef: RefObject<HTMLInputElement>` — hidden `<input type="file">` for click-to-select.
- `abortRef: RefObject<AbortController | null>` — abort in-flight fetch on unmount.
- `isMountedRef: RefObject<boolean>` — guards post-resolve state/store writes if the modal unmounted during upload.

## Behavior
1. User drops a file OR clicks the drop zone (opens native file picker).
2. `validate(f)` checks extension against `ALLOWED_UPLOAD_EXTENSIONS` and size against `MAX_UPLOAD_MB`; bad files → `phase='error'`, file not staged.
3. Clicking **Extract & Refine** calls `convertDocument(file)`:
   - `{ ok: false }` → `phase='error'`, message rendered in red panel.
   - `{ ok: true }` → `setMarkdown(data.markdown)` → `closeModal()` → `openModal('pipeline')` → `refinePipelineAction()` (fire-and-forget, matches Refine button convention in `WorkspaceHeader`).
4. Cancel button calls `closeModal()`; disabled while uploading.
5. On unmount, the `useEffect` cleanup aborts the in-flight `AbortController` and sets `isMountedRef.current = false`. If the fetch later resolves, the `onSubmit` guard bails before touching `epicStore`, `uiStore`, or `refinePipelineAction` — prevents state corruption when the user closes the modal mid-upload (B-10 review C2).

## Testids
- `doc-upload-modal` (root), `doc-upload-dropzone`, `doc-upload-input`, `doc-upload-status`, `doc-upload-error`, `doc-upload-cancel`, `doc-upload-submit`.

## Dependencies
- `@/services/docmining/docminingClient` (`convertDocument`, `ALLOWED_UPLOAD_EXTENSIONS`, `MAX_UPLOAD_MB`).
- `@/stores/{uiStore,epicStore}`.
- `@/pipeline/refinePipelineAction`.
- `@phosphor-icons/react` — `UploadSimple`, `Warning`, `Spinner`.

## Consumers
- `src/components/layout/ModalHost.tsx` — case `'docUpload'` renders this inside `<Modal title="Upload Requirement Document" width={560}>`.
- Triggered from `WorkspaceHeader`'s Upload button via `openModal('docUpload')`.

## Assumptions & edge cases
- **Auto-refine is intentional** (Decision #3 in the DocMining design): no intermediate preview of the extracted markdown. The pipeline modal provides the "wait" UX. To preview before refine, the user can cancel in the pipeline modal while stage 1 is still running.
- **No progress stream**: the status line just says "Extracting text… this can take up to 60 s". Backend conversion is synchronous with a 180 s timeout (`DOCMINING_CONVERT_TIMEOUT_S`).
- **Browser timeout risk**: PDFs that approach the backend's 180 s cap may hit the browser's fetch timeout first (~60-300 s depending on browser) — surfaced as a generic network error. The modal stays in `error` state; user must retry.
- **Category is NOT auto-set**: extracted markdown goes into `epicStore.markdown`; the user picks category in `WorkspaceHeader` (or Stage 2 classifies). First-time users may be confused if the editor appears empty-of-template — the refine pipeline fills in structure anyway.
- **No drag-drop multi-file**: only the first file from `dataTransfer.files` / `input.files` is used.
- **Font const is local**: `F = "Frutiger, 'Helvetica Neue', ..."` duplicated locally per the convention in `SYSTEM.md` §11.
- **No test coverage yet**: Phase B is manual E2E only. A Vitest with `vi.mock('@/services/docmining/docminingClient')` is a Phase C candidate.
