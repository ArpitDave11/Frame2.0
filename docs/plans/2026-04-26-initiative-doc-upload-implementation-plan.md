# Initiative Document Upload — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an inline document upload zone to InitStep that extracts text via DocMining and fills the description textarea, feeding the AI epic generation in Step 2.

**Architecture:** Reuse `convertDocument()` from `docminingClient.ts` inline in `InitStep.tsx`. No new components, no new modals. ~50 lines added to one file.

**Tech Stack:** React 19, TypeScript, existing `convertDocument()` from `src/services/docmining/docminingClient.ts`, Vitest.

---

## Task 1: Write the failing test for document upload in InitStep

**Files:**
- Create: `src/components/initiative/steps/InitStep.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/initiative/steps/InitStep.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useInitiativeStore } from '@/stores/initiativeStore';

// Mock the docmining client
vi.mock('@/services/docmining/docminingClient', () => ({
  convertDocument: vi.fn().mockResolvedValue({
    ok: true,
    data: { markdown: '# Extracted Content\n\nSome initiative description from the PDF.', fileName: 'test.pdf', pages: 3, durationMs: 1200 },
  }),
  ALLOWED_UPLOAD_EXTENSIONS: ['.pdf', '.docx', '.pptx', '.txt'],
  MAX_UPLOAD_MB: 50,
}));

// Mock the gitlab service (InitStep fetches tree on mount)
vi.mock('@/services/gitlab/initiativeService', () => ({
  fetchStreamTree: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      stream: { id: 1, name: 'Test Stream', fullPath: 'test/stream' },
      crews: [
        { id: 10, name: 'Crew A', fullPath: 'test/stream/a' },
        { id: 20, name: 'Crew B', fullPath: 'test/stream/b' },
      ],
      tree: { id: 1, name: 'Test Stream', fullPath: 'test/stream', children: [] },
    },
  }),
}));

// Mock configStore to have streamGroupId set
vi.mock('@/stores/configStore', () => ({
  useConfigStore: vi.fn((selector) => {
    const config = {
      gitlab: { enabled: true, rootGroupId: '1', streamGroupId: '123', accessToken: 'tok', authMode: 'pat' },
      endpoints: { azureEndpoint: '' },
    };
    return selector({ config });
  }),
}));

describe('InitStep document upload', () => {
  beforeEach(() => {
    useInitiativeStore.getState().reset();
  });

  it('renders the upload zone', async () => {
    const { InitStep } = await import('./InitStep');
    render(<InitStep />);
    await waitFor(() => {
      expect(screen.getByText(/upload a document/i)).toBeTruthy();
    });
  });

  it('calls convertDocument on file drop and fills description', async () => {
    const { convertDocument } = await import('@/services/docmining/docminingClient');
    const { InitStep } = await import('./InitStep');
    render(<InitStep />);

    await waitFor(() => screen.getByText(/upload a document/i));

    const dropZone = screen.getByTestId('init-upload-zone');
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file], types: ['Files'] },
    });

    await waitFor(() => {
      expect(convertDocument).toHaveBeenCalledWith(file, expect.any(Object));
    });

    await waitFor(() => {
      expect(useInitiativeStore.getState().description).toContain('Extracted Content');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/initiative/steps/InitStep.test.tsx`
Expected: FAIL — upload zone not found (`data-testid="init-upload-zone"` doesn't exist yet)

**Step 5: Commit**

```bash
git add src/components/initiative/steps/InitStep.test.tsx
git commit -m "test(initiative): failing test for document upload in InitStep"
```

---

## Task 2: Implement the upload zone in InitStep

**Files:**
- Modify: `src/components/initiative/steps/InitStep.tsx:1-7` (add imports)
- Modify: `src/components/initiative/steps/InitStep.tsx:29-40` (add state)
- Modify: `src/components/initiative/steps/InitStep.tsx:255-257` (add upload zone JSX)

**Step 1: Add imports** (top of InitStep.tsx)

Add to existing imports:
```typescript
import {
  convertDocument,
  ALLOWED_UPLOAD_EXTENSIONS,
  MAX_UPLOAD_MB,
} from '@/services/docmining/docminingClient';
```

**Step 2: Add upload state** (inside the `InitStep` function, near the other useState calls)

```typescript
const [uploadPhase, setUploadPhase] = useState<'idle' | 'extracting' | 'done' | 'error'>('idle');
const [uploadError, setUploadError] = useState<string | null>(null);
const [uploadFileName, setUploadFileName] = useState<string | null>(null);
const abortRef = React.useRef<AbortController | null>(null);

// Cleanup on unmount
useEffect(() => {
  return () => { abortRef.current?.abort(); };
}, []);
```

**Step 3: Add upload handler** (inside the component, after the state declarations)

```typescript
const handleFile = useCallback(async (file: File) => {
  // Validate extension
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_UPLOAD_EXTENSIONS.includes(ext as any)) {
    setUploadPhase('error');
    setUploadError(`Unsupported file type: ${ext}`);
    return;
  }
  // Validate size
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    setUploadPhase('error');
    setUploadError(`File too large (max ${MAX_UPLOAD_MB} MB)`);
    return;
  }

  setUploadPhase('extracting');
  setUploadError(null);
  setUploadFileName(file.name);

  const controller = new AbortController();
  abortRef.current = controller;

  const outcome = await convertDocument(file, { signal: controller.signal });

  if (!outcome.ok) {
    setUploadPhase('error');
    setUploadError(outcome.error);
    return;
  }

  setDescription(outcome.data.markdown);
  setUploadPhase('done');
}, [setDescription]);

const onDrop = useCallback((e: React.DragEvent) => {
  e.preventDefault();
  const f = e.dataTransfer.files?.[0];
  if (f) handleFile(f);
}, [handleFile]);

const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  const f = e.target.files?.[0];
  if (f) handleFile(f);
}, [handleFile]);
```

**Step 4: Add upload zone JSX** (insert between the description `</div>` and the crew checkboxes section — after line 255 in the current file)

```tsx
{/* Document Upload Zone */}
<div
  data-testid="init-upload-zone"
  onDrop={onDrop}
  onDragOver={(e) => e.preventDefault()}
  style={{
    border: '2px dashed #CCCABC',
    borderRadius: 8,
    padding: '16px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    background: uploadPhase === 'extracting' ? '#F5F0E1' : 'transparent',
    transition: 'background 0.2s',
  }}
  onClick={() => document.getElementById('init-upload-input')?.click()}
>
  <input
    id="init-upload-input"
    type="file"
    accept={ALLOWED_UPLOAD_EXTENSIONS.join(',')}
    style={{ display: 'none' }}
    onChange={onFileChange}
  />
  {uploadPhase === 'idle' && (
    <>
      <div style={{ fontSize: '0.875rem', fontWeight: 500, fontFamily: FONT_FAMILY }}>
        Or upload a document
      </div>
      <div style={{ fontSize: '0.8rem', color: '#8E8D83', marginTop: 4 }}>
        Drag & drop or click to browse. PDF, DOCX, PPTX, TXT (max {MAX_UPLOAD_MB} MB)
      </div>
    </>
  )}
  {uploadPhase === 'extracting' && (
    <div style={{ fontSize: '0.875rem', color: '#5A5D5C', fontFamily: FONT_FAMILY }}>
      Extracting text from {uploadFileName}...
    </div>
  )}
  {uploadPhase === 'done' && (
    <div style={{ fontSize: '0.875rem', color: '#00A651', fontFamily: FONT_FAMILY }}>
      Extracted from {uploadFileName}. Review the description above.
    </div>
  )}
  {uploadPhase === 'error' && (
    <div style={{ fontSize: '0.875rem', color: '#E60000', fontFamily: FONT_FAMILY }}>
      {uploadError}
    </div>
  )}
</div>
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/initiative/steps/InitStep.test.tsx`
Expected: PASS — upload zone renders, convertDocument called, description filled

**Step 6: Run full initiative suite for regressions**

Run: `npx vitest run src/stores/initiativeStore.test.ts src/services/gitlab/initiativeService.test.ts src/services/ai/initiative/ src/components/initiative/ src/test/integration/initiativeFlow.test.ts`
Expected: All tests pass

**Step 7: Commit**

```bash
git add src/components/initiative/steps/InitStep.tsx src/components/initiative/steps/InitStep.test.tsx
git commit -m "feat(initiative): inline document upload in InitStep via DocMining

Drag-drop + browse upload zone below description textarea.
Reuses convertDocument() from docminingClient — extracted markdown
fills initiativeStore.setDescription(). No new components.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Verification

After both tasks, run:
```bash
npx vitest run src/components/initiative/steps/InitStep.test.tsx
```
Expected: 2+ tests pass (render upload zone, file drop fills description).

Use `superpowers:verification-before-completion` before claiming done.

---

## Out of scope

- No modification to `docminingClient.ts` or `DocUploadModal`
- No auto-advance to Step 2
- No new modals or components
- No drag-and-drop visual feedback beyond background color change
