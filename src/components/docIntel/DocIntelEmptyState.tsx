/**
 * DocIntelEmptyState — lens chips + focus textarea + drop zone.
 * Mirrors EditorPane empty state: impulse line, headline, chips.
 */

import { useRef, useState } from 'react';
import { Upload } from '@phosphor-icons/react';
import { useDocIntelStore } from '@/stores/docIntelStore';
import type { LensType } from '@/stores/docIntelStore';
import { ALLOWED_UPLOAD_EXTENSIONS, MAX_UPLOAD_MB } from '@/services/docmining/docminingClient';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

const LENSES: { id: LensType; label: string }[] = [
  { id: 'executive', label: 'Executive Brief' },
  { id: 'technical', label: 'Technical Breakdown' },
  { id: 'legal', label: 'Legal Review' },
  { id: 'financial', label: 'Financial Digest' },
  { id: 'operational', label: 'Operational Guide' },
  { id: 'risk', label: 'Risk Assessment' },
  { id: 'summary', label: 'Summary Only' },
];

interface Props {
  onFileSelected: (file: File) => void;
}

export function DocIntelEmptyState({ onFileSelected }: Props) {
  const lens = useDocIntelStore((s) => s.lens);
  const setLens = useDocIntelStore((s) => s.setLens);
  const focusContext = useDocIntelStore((s) => s.focusContext);
  const setFocusContext = useDocIntelStore((s) => s.setFocusContext);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFileSelected(f);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', padding: 48,
      fontFamily: F, animation: 'ubsFade .4s ease',
    }}>
      {/* Impulse line + headline */}
      <div style={{
        borderLeft: '4px solid var(--col-background-brand)',
        paddingLeft: 20, marginBottom: 32,
      }}>
        <div style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--col-text-primary)', lineHeight: 1.3 }}>
          Analyze your document
        </div>
        <p style={{ fontSize: 14, color: 'var(--col-text-subtle)', fontWeight: 300, lineHeight: 1.6, maxWidth: 400, marginTop: 8 }}>
          Upload a document, choose an analysis lens, and get an editable breakdown in seconds.
        </p>
      </div>

      {/* Lens chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 24 }}>
        {LENSES.map((l) => (
          <button key={l.id} onClick={() => setLens(l.id)}
            style={{
              padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontFamily: F, fontSize: 13, fontWeight: 500,
              border: lens === l.id ? '2px solid var(--col-background-brand)' : '1px solid var(--col-border-illustrative)',
              background: lens === l.id ? '#FEF2F2' : '#fff',
              color: lens === l.id ? 'var(--col-background-brand)' : 'var(--col-text-primary)',
              transition: 'all 0.15s',
            }}>
            {l.label}
          </button>
        ))}
      </div>

      {/* Focus context textarea */}
      <textarea
        value={focusContext}
        onChange={(e) => setFocusContext(e.target.value)}
        placeholder="What should we focus on? (optional)"
        rows={2}
        style={{
          width: '100%', maxWidth: 480, padding: 12, borderRadius: 6, fontFamily: F, fontSize: 13,
          border: '1px solid var(--col-border-illustrative)', resize: 'vertical', marginBottom: 24,
        }}
      />

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragOver ? '#E60000' : '#d1d5db'}`,
          borderRadius: 8, padding: 40, textAlign: 'center', cursor: 'pointer',
          backgroundColor: dragOver ? '#fef2f2' : '#fafafa', transition: 'all 0.15s',
          width: '100%', maxWidth: 480,
        }}
      >
        <Upload size={40} color="#6b7280" />
        <div style={{ marginTop: 12, fontSize: 14, color: '#374151' }}>Click or drag a file here</div>
        <div style={{ marginTop: 4, fontSize: 12, color: '#9ca3af' }}>
          PDF, DOCX, PPTX, XLSX, HTML, images — up to {MAX_UPLOAD_MB} MB
        </div>
        <input ref={inputRef} type="file" accept={ALLOWED_UPLOAD_EXTENSIONS.join(',')}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelected(f); }}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}
