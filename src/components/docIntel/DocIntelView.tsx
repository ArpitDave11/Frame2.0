/**
 * DocIntelView — Document Intelligence tab.
 *
 * Single-page flow: full-width upload page → full-width results page.
 * No lens picker — AI auto-detects the lens via nano pre-classifier.
 * Upload → Analyze → Results with section cards + pinned export bar.
 */

import { useEffect, useRef, useState } from 'react';
import { FilePdf, Sparkle, ArrowsClockwise, X, Spinner } from '@phosphor-icons/react';
import { useDocIntelStore } from '@/stores/docIntelStore';
import { ALLOWED_UPLOAD_EXTENSIONS, MAX_UPLOAD_MB } from '@/services/docmining/docminingClient';
import { runDocIntelAnalysis, warmSchemas } from '@/services/docIntel/analyzeAction';
import { SectionCard } from './SectionCard';
import { ExportBar } from './ExportBar';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

const LENS_LABELS: Record<string, string> = {
  executive: 'Executive Brief', technical: 'Technical', legal: 'Legal',
  financial: 'Financial', operational: 'Operational', risk: 'Risk', summary: 'Summary',
};

// ─── Component ─────────────────────────────────────────────

export default function DocIntelView() {
  const phase = useDocIntelStore((s) => s.phase);
  const lens = useDocIntelStore((s) => s.lens);
  const focusContext = useDocIntelStore((s) => s.focusContext);
  const setFocusContext = useDocIntelStore((s) => s.setFocusContext);
  const fileName = useDocIntelStore((s) => s.fileName);
  const sections = useDocIntelStore((s) => s.sections);
  const reset = useDocIntelStore((s) => s.reset);

  // Warm schema cache on first mount
  const warmedRef = useRef(false);
  useEffect(() => {
    if (!warmedRef.current) {
      warmedRef.current = true;
      warmSchemas().catch(() => {});
    }
  }, []);

  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const pendingFileRef = useRef<File | null>(null);

  const hasFile = uploadedFile !== null;
  const showResults = sections.length > 0 || phase === 'analyzing';

  const handleFileUpload = (file: File) => {
    setUploadedFile({ name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB` });
    pendingFileRef.current = file;
  };

  const startNewAnalysis = () => {
    setUploadedFile(null);
    pendingFileRef.current = null;
    setIsRunning(false);
    reset();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const runAnalysis = async () => {
    const file = pendingFileRef.current;
    if (!file) return;
    setIsRunning(true);
    await runDocIntelAnalysis(file);
    setIsRunning(false);
  };

  return (
    <div
      style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
    >
      {!showResults ? (
        /* ═══ UPLOAD PAGE (Full Width) ═══ */
        <>
          {/* Dark Header */}
          <div style={{
            height: 48, background: '#1a1a1a', borderBottom: '1px solid #2a2a2a',
            display: 'flex', alignItems: 'center', padding: '0 20px', flexShrink: 0,
          }}>
            <span style={{ fontSize: 13, fontWeight: 300, color: '#ccc', fontFamily: F }}>
              Document Intelligence
            </span>
          </div>

          {/* Full-width Upload Area */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--col-background-ui-10)', padding: 40, position: 'relative',
          }}>
            {/* Drag overlay */}
            {isDragging && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(230, 0, 0, 0.05)',
                border: '2px dashed var(--col-background-brand)', borderRadius: 6, margin: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
                pointerEvents: 'none',
              }}>
                <span style={{ fontSize: 16, fontWeight: 400, color: 'var(--col-background-brand)', fontFamily: F }}>
                  Drop file to upload
                </span>
              </div>
            )}

            <div style={{ maxWidth: 580, width: '100%' }}>
              {/* Red vertical rule */}
              <div style={{ width: 3, height: 60, background: 'var(--col-background-brand)', marginBottom: 24 }} />

              <h2 style={{
                fontSize: 28, fontWeight: 500, color: 'var(--col-text-primary)',
                margin: '0 0 12px 0', fontFamily: F,
              }}>
                Analyze your document
              </h2>
              <p style={{
                fontSize: 14, fontWeight: 300, color: 'var(--col-text-subtle)',
                margin: '0 0 24px 0', fontFamily: F, lineHeight: 1.6,
              }}>
                Upload a file, add context, then click{' '}
                <span style={{ color: 'var(--col-background-brand)', fontWeight: 400 }}>Analyze</span>{' '}
                for AI-powered insights. The lens is auto-detected.
              </p>

              {/* Horizontal accent */}
              <div style={{ width: 60, height: 2, background: 'var(--col-background-brand)', marginBottom: 32 }} />

              {/* File Upload / File Chip */}
              {!hasFile ? (
                <label style={{
                  display: 'block', padding: '48px 32px',
                  border: '2px dashed var(--col-border-illustrative)', borderRadius: 6,
                  textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s', marginBottom: 24,
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--col-background-brand)';
                    e.currentTarget.style.background = 'rgba(230, 0, 0, 0.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--col-border-illustrative)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <input type="file" accept={ALLOWED_UPLOAD_EXTENSIONS.join(',')}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                    style={{ display: 'none' }}
                  />
                  <FilePdf size={48} weight="duotone" color="var(--col-text-subtle)" />
                  <p style={{
                    fontSize: 14, fontWeight: 400, color: 'var(--col-text-primary)',
                    margin: '16px 0 4px 0', fontFamily: F,
                  }}>
                    Drop file here or click to browse
                  </p>
                  <p style={{
                    fontSize: 12, fontWeight: 300, color: 'var(--col-text-subtle)',
                    margin: 0, fontFamily: F,
                  }}>
                    PDF, DOCX, PPTX, XLSX, HTML, images — up to {MAX_UPLOAD_MB} MB
                  </p>
                </label>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', background: 'var(--col-background-ui-10)',
                  border: '1px solid var(--col-border-illustrative)', borderRadius: 6, marginBottom: 24,
                }}>
                  <FilePdf size={20} weight="fill" color="var(--col-background-brand)" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--col-text-primary)', fontFamily: F, marginBottom: 2 }}>
                      {uploadedFile.name}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 300, color: 'var(--col-text-subtle)', fontFamily: F }}>
                      {uploadedFile.size}
                    </div>
                  </div>
                  <button onClick={() => setUploadedFile(null)} style={{
                    background: 'transparent', border: 'none', cursor: 'pointer', padding: 4,
                    display: 'flex', color: 'var(--col-text-subtle)',
                  }}>
                    <X size={16} weight="bold" />
                  </button>
                </div>
              )}

              {/* Context textarea (always visible) */}
              <div style={{ marginBottom: 24 }}>
                <label style={{
                  display: 'block', fontSize: 13, fontWeight: 400,
                  color: 'var(--col-text-subtle)', marginBottom: 8, fontFamily: F,
                }}>
                  What should we focus on? (optional)
                </label>
                <textarea
                  value={focusContext}
                  onChange={(e) => setFocusContext(e.target.value)}
                  placeholder="Pull out compliance clauses, summarize for a non-technical exec, extract all financial metrics..."
                  style={{
                    width: '100%', minHeight: 100, padding: '12px 14px',
                    fontFamily: F, fontSize: 13, fontWeight: 300,
                    border: '1px solid var(--col-border-illustrative)', borderRadius: 6,
                    background: 'var(--col-background-ui-10)', color: 'var(--col-text-primary)',
                    resize: 'vertical', outline: 'none', lineHeight: 1.6,
                  }}
                />
              </div>

              {/* Analyze button */}
              <button onClick={runAnalysis} disabled={!hasFile || isRunning}
                style={{
                  padding: '12px 32px', border: 'none', borderRadius: 6,
                  background: hasFile && !isRunning ? 'var(--col-background-brand)' : 'var(--col-border-illustrative)',
                  color: '#fff', fontSize: 14, fontWeight: 500,
                  cursor: hasFile && !isRunning ? 'pointer' : 'not-allowed',
                  fontFamily: F, display: 'flex', alignItems: 'center', gap: 10,
                }}>
                {isRunning ? (
                  <><Spinner size={16} className="animate-spin" /> Analyzing...</>
                ) : (
                  <><Sparkle size={18} weight="fill" /> Analyze</>
                )}
              </button>
            </div>
          </div>
        </>
      ) : (
        /* ═══ RESULTS PAGE (Full Width) ═══ */
        <>
          {/* Dark Header with File Info + Auto-detected Lens + New Analysis */}
          <div style={{
            height: 48, background: '#1a1a1a', borderBottom: '1px solid #2a2a2a',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 20px', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <FilePdf size={16} weight="fill" color="#999" />
              <span style={{ fontSize: 13, fontWeight: 300, color: '#ccc', fontFamily: F }}>
                {fileName ?? uploadedFile?.name ?? 'Document'}
              </span>
              {lens && (
                <div style={{
                  padding: '3px 10px', background: '#2a2a2a', borderRadius: 3,
                  fontSize: 10, fontWeight: 500, color: '#999', fontFamily: F, letterSpacing: '0.5px',
                }}>
                  {LENS_LABELS[lens] ?? lens}
                </div>
              )}
            </div>
            <button onClick={startNewAnalysis} style={{
              padding: '6px 14px', border: '1px solid #3a3a3a', borderRadius: 6,
              background: '#2a2a2a', color: '#ccc', fontSize: 12, fontWeight: 400,
              cursor: 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <ArrowsClockwise size={14} /> New Analysis
            </button>
          </div>

          {/* Results Content (full width, centered max-width) */}
          <div style={{
            flex: 1, overflow: 'auto', background: 'var(--col-background-ui-10)',
            padding: '32px 40px 120px 40px',
          }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              {/* Preview tab header */}
              <div style={{
                marginBottom: 24, paddingBottom: 8,
                borderBottom: '2px solid var(--col-background-brand)', display: 'inline-block',
              }}>
                <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--col-text-primary)', fontFamily: F }}>
                  Preview
                </span>
              </div>

              {/* Section cards */}
              {sections.map((sec) => (
                <SectionCard key={sec.id} section={sec} />
              ))}
            </div>
          </div>

          {/* Pinned Export Bar at Bottom */}
          {phase === 'ready' && (
            <div style={{
              padding: '12px 40px', borderTop: '1px solid var(--col-border-illustrative)',
              background: 'var(--col-background-ui-10)', flexShrink: 0,
              display: 'flex', justifyContent: 'flex-end',
            }}>
              <ExportBar />
            </div>
          )}
        </>
      )}
    </div>
  );
}
