/**
 * DocUploadModal — Upload a requirement document, convert to markdown via the
 * backend DocMining service, write to epicStore, auto-fire the 6-stage refine.
 *
 * Rendered inside the shared <Modal> wrapper by ModalHost.
 */

import { useEffect, useRef, useState } from 'react';
import { UploadSimple, Warning, Spinner } from '@phosphor-icons/react';
import { useEpicStore } from '@/stores/epicStore';
import { useUiStore } from '@/stores/uiStore';
import { refinePipelineAction } from '@/pipeline/refinePipelineAction';
import {
  convertDocument,
  ALLOWED_UPLOAD_EXTENSIONS,
  MAX_UPLOAD_MB,
} from '@/services/docmining/docminingClient';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

type Phase = 'idle' | 'uploading' | 'error';

function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

export function DocUploadModal() {
  const closeModal = useUiStore((s) => s.closeModal);
  const openModal = useUiStore((s) => s.openModal);
  const setMarkdown = useEpicStore((s) => s.setMarkdown);

  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // On unmount (modal close / nav-away), abort any in-flight upload and
  // mark the component unmounted so the resolved promise cannot write state
  // or trigger refinePipelineAction() on a modal the user already dismissed.
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const validate = (f: File): string | null => {
    const ext = extOf(f.name);
    if (!ALLOWED_UPLOAD_EXTENSIONS.includes(ext as typeof ALLOWED_UPLOAD_EXTENSIONS[number])) {
      return `Unsupported type "${ext}". Allowed: ${ALLOWED_UPLOAD_EXTENSIONS.join(', ')}`;
    }
    if (f.size > MAX_UPLOAD_MB * 1024 * 1024) {
      return `File too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_UPLOAD_MB} MB.`;
    }
    return null;
  };

  const chooseFile = (f: File) => {
    const err = validate(f);
    if (err) {
      setPhase('error');
      setError(err);
      setFile(null);
      return;
    }
    setFile(f);
    setPhase('idle');
    setError(null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) chooseFile(f);
  };

  const onSubmit = async () => {
    if (!file) return;
    setPhase('uploading');
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    const outcome = await convertDocument(file, { signal: controller.signal });

    // If the modal has unmounted during the upload, bail — do not touch store,
    // do not open pipeline modal, do not fire refine (C2 fix).
    if (!isMountedRef.current) return;

    if (!outcome.ok) {
      setPhase('error');
      setError(outcome.error);
      return;
    }

    // Zustand set is synchronous: store commit happens before openModal and
    // refinePipelineAction below read the updated markdown.
    setMarkdown(outcome.data.markdown);
    closeModal();
    openModal('pipeline');
    // Fire-and-forget refine; the pipeline modal observes pipelineStore.isRunning.
    refinePipelineAction().catch((e) => {
      // eslint-disable-next-line no-console
      console.error('[docmining] refinePipelineAction threw', e);
    });
  };

  const isBusy = phase === 'uploading';

  return (
    <div style={{ fontFamily: F, padding: 4 }} data-testid="doc-upload-modal">
      {/* Drop zone */}
      <div
        onClick={() => !isBusy && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        data-testid="doc-upload-dropzone"
        style={{
          border: `2px dashed ${dragOver ? 'var(--col-background-brand)' : 'var(--col-border-illustrative)'}`,
          borderRadius: 8,
          padding: 40,
          textAlign: 'center',
          cursor: isBusy ? 'not-allowed' : 'pointer',
          backgroundColor: dragOver ? 'rgba(230,0,0,0.04)' : 'var(--col-background-ui-20, #fafafa)',
          transition: 'all 0.15s',
        }}
      >
        <UploadSimple size={40} color="var(--col-text-subtle)" />
        <div style={{ marginTop: 12, fontSize: 14, color: 'var(--col-text-primary)' }}>
          {file ? file.name : 'Click or drag a file here'}
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--col-text-subtle)' }}>
          PDF, DOCX, PPTX, XLSX, HTML, images — up to {MAX_UPLOAD_MB} MB
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_UPLOAD_EXTENSIONS.join(',')}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) chooseFile(f);
          }}
          style={{ display: 'none' }}
          disabled={isBusy}
          data-testid="doc-upload-input"
        />
      </div>

      {/* Status */}
      {phase === 'uploading' && (
        <div
          data-testid="doc-upload-status"
          style={{
            marginTop: 16, display: 'flex', alignItems: 'center', gap: 8,
            color: 'var(--col-text-primary)', fontSize: 13,
          }}
        >
          <Spinner size={18} className="animate-spin" />
          <span>Extracting text… this can take up to 60 s for large PDFs.</span>
        </div>
      )}
      {phase === 'error' && error && (
        <div
          data-testid="doc-upload-error"
          style={{
            marginTop: 16, padding: 12, borderRadius: 6,
            backgroundColor: '#fef2f2', color: '#991b1b',
            display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13,
          }}
        >
          <Warning size={18} weight="fill" />
          <span>{error}</span>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          marginTop: 20, paddingTop: 16,
          borderTop: '1px solid var(--col-border-illustrative)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}
      >
        <button
          onClick={closeModal}
          disabled={isBusy}
          data-testid="doc-upload-cancel"
          style={{
            padding: '8px 16px', borderRadius: 6,
            border: '1px solid var(--col-border-illustrative)',
            background: 'var(--col-background-ui-10)',
            color: 'var(--col-text-primary)',
            cursor: isBusy ? 'not-allowed' : 'pointer',
            fontFamily: F, fontSize: 14,
          }}
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={!file || isBusy}
          data-testid="doc-upload-submit"
          style={{
            padding: '8px 16px', borderRadius: 6, border: 'none',
            background: (!file || isBusy)
              ? 'var(--col-border-illustrative)'
              : 'var(--col-background-brand)',
            color: (!file || isBusy) ? 'var(--col-text-subtle)' : '#fff',
            cursor: (!file || isBusy) ? 'not-allowed' : 'pointer',
            fontFamily: F, fontSize: 14, fontWeight: 500,
          }}
        >
          {isBusy ? 'Extracting…' : 'Extract & Refine'}
        </button>
      </div>
    </div>
  );
}
