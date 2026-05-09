/**
 * DocIntelView — Document Intelligence tab.
 *
 * Two-pane layout: left = input (lens grid + file upload + context + analyze button),
 * right = analysis results (section cards + export toolbar).
 * Merges the best of both designs: their layout/UX + our functionality
 * (BlockNote editing, MermaidPreview, regenerate/revert, DOCX/PDF export, GitLab publish).
 */

import { useEffect, useRef, useState } from 'react';
import {
  FileText, FilePdf, Sparkle, ArrowsClockwise, X, Spinner,
} from '@phosphor-icons/react';
import { useDocIntelStore } from '@/stores/docIntelStore';
import type { LensType } from '@/stores/docIntelStore';
import { ALLOWED_UPLOAD_EXTENSIONS, MAX_UPLOAD_MB } from '@/services/docmining/docminingClient';
import { runDocIntelAnalysis, warmSchemas } from '@/services/docIntel/analyzeAction';
import { SectionCard } from './SectionCard';
import { ExportBar } from './ExportBar';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

// ─── Lens Config ───────────────────────────────────────────

interface LensItem {
  id: LensType;
  label: string;
  key: string;
}

const LENSES: LensItem[] = [
  { id: 'executive', label: 'Executive Brief', key: 'E' },
  { id: 'technical', label: 'Technical Breakdown', key: 'T' },
  { id: 'legal', label: 'Legal Review', key: 'L' },
  { id: 'financial', label: 'Financial Digest', key: 'F' },
  { id: 'operational', label: 'Operational Guide', key: 'O' },
  { id: 'risk', label: 'Risk Assessment', key: 'R' },
  { id: 'summary', label: 'Summary Only', key: 'S' },
];

const LENS_LABELS: Record<string, string> = Object.fromEntries(
  LENSES.map((l) => [l.id, l.label]),
);

// ─── Component ─────────────────────────────────────────────

export default function DocIntelView() {
  const phase = useDocIntelStore((s) => s.phase);
  const lens = useDocIntelStore((s) => s.lens);
  const setLens = useDocIntelStore((s) => s.setLens);
  const focusContext = useDocIntelStore((s) => s.focusContext);
  const setFocusContext = useDocIntelStore((s) => s.setFocusContext);
  const fileName = useDocIntelStore((s) => s.fileName);
  const sections = useDocIntelStore((s) => s.sections);
  const reset = useDocIntelStore((s) => s.reset);

  // Warm schema cache on first mount (eliminates 2-60s cold-start penalty)
  const warmedRef = useRef(false);
  useEffect(() => {
    if (!warmedRef.current) {
      warmedRef.current = true;
      warmSchemas().catch(() => {}); // fire-and-forget
    }
  }, []);

  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingFileRef = useRef<File | null>(null);

  const hasFile = uploadedFile !== null;
  const canAnalyze = hasFile && lens;
  const hasResults = phase === 'ready' || phase === 'analyzing' || (sections.length > 0);

  // ─── Handlers ──────────────────────────────────────────

  const handleFileUpload = (file: File) => {
    setUploadedFile({
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    });
    pendingFileRef.current = file;
  };

  const clearFile = () => {
    setUploadedFile(null);
    pendingFileRef.current = null;
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

  // ─── Render ────────────────────────────────────────────

  return (
    <div
      style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
    >
      {/* Dark header bar */}
      <div style={{
        height: 48, background: '#1a1a1a', borderBottom: '1px solid #2a2a2a',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FileText size={16} weight="regular" color="#999" />
          <span style={{ fontSize: 13, fontWeight: 300, color: '#ccc', fontFamily: F }}>
            Document
          </span>
          <div style={{
            padding: '2px 8px', background: '#2a2a2a', borderRadius: 3,
            fontSize: 10, fontWeight: 500, color: '#999', fontFamily: F, letterSpacing: '0.5px',
          }}>
            DOC INTEL
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 300, color: '#999', fontFamily: F }}>
            {fileName ? `${fileName} · ${lens ? LENS_LABELS[lens] : ''}` : 'No file'}
          </span>
          {fileName && (
            <button onClick={clearFile} style={{
              padding: '4px 10px', borderRadius: 3, border: '1px solid #555',
              background: 'transparent', color: '#aaa', cursor: 'pointer',
              fontFamily: F, fontSize: 11,
            }}>
              New
            </button>
          )}
        </div>
      </div>

      {/* Two-pane layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ─── Left Pane: Input ─────────────────────────── */}
        <div style={{
          width: '45%', minWidth: 360, display: 'flex', flexDirection: 'column',
          background: 'var(--col-background-ui-10)', overflow: 'auto', position: 'relative',
        }}>
          {/* Drag overlay */}
          {isDragging && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(230, 0, 0, 0.05)',
              border: '2px dashed var(--col-background-brand)', borderRadius: 6, margin: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
              pointerEvents: 'none',
            }}>
              <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--col-background-brand)', fontFamily: F }}>
                Drop file to upload
              </span>
            </div>
          )}

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <div style={{ maxWidth: 480, width: '100%' }}>
              {/* Red vertical rule */}
              <div style={{
                width: 3, height: 60, background: 'var(--col-background-brand)', marginBottom: 24,
              }} />

              <h2 style={{
                fontSize: 28, fontWeight: 300, color: 'var(--col-text-primary)',
                margin: '0 0 12px 0', fontFamily: F,
              }}>
                Analyze your document
              </h2>
              <p style={{
                fontSize: 14, fontWeight: 300, color: 'var(--col-text-subtle)',
                margin: '0 0 24px 0', fontFamily: F, lineHeight: 1.6,
              }}>
                Pick a lens, upload a file, add context, then click{' '}
                <span style={{ color: 'var(--col-background-brand)', fontWeight: 400 }}>Analyze</span>{' '}
                for AI-powered insights.
              </p>

              {/* Horizontal accent */}
              <div style={{
                width: 60, height: 2, background: 'var(--col-background-brand)', marginBottom: 28,
              }} />

              {/* Lens Grid — 2 columns with keyboard shortcuts */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                {LENSES.map((l) => (
                  <button key={l.id} onClick={() => setLens(l.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: F,
                      border: lens === l.id
                        ? '2px solid var(--col-background-brand)'
                        : '1px solid var(--col-border-illustrative)',
                      background: lens === l.id ? 'rgba(230, 0, 0, 0.04)' : 'var(--col-background-ui-10)',
                      transition: 'all 0.15s',
                    }}>
                    <kbd style={{
                      padding: '3px 7px', background: 'var(--col-border-illustrative)', borderRadius: 4,
                      fontSize: 11, fontWeight: 500, color: 'var(--col-text-subtle)', fontFamily: F,
                    }}>
                      {l.key}
                    </kbd>
                    <span style={{
                      fontSize: 13, fontWeight: lens === l.id ? 500 : 300,
                      color: lens === l.id ? 'var(--col-background-brand)' : 'var(--col-text-primary)',
                    }}>
                      {l.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* File upload area */}
              {!hasFile ? (
                <label style={{
                  display: 'block', padding: '28px 20px',
                  border: '2px dashed var(--col-border-illustrative)', borderRadius: 6,
                  textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s', marginBottom: 20,
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
                  <input ref={inputRef} type="file" accept={ALLOWED_UPLOAD_EXTENSIONS.join(',')}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                    style={{ display: 'none' }}
                  />
                  <FilePdf size={28} weight="duotone" color="var(--col-text-subtle)" />
                  <p style={{
                    fontSize: 12, fontWeight: 300, color: 'var(--col-text-subtle)',
                    margin: '10px 0 0 0', fontFamily: F,
                  }}>
                    Drop file anywhere — PDF, DOCX, PPTX, XLSX, HTML, images — up to {MAX_UPLOAD_MB} MB
                  </p>
                </label>
              ) : (
                /* File chip */
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', background: 'var(--col-background-ui-10)',
                  border: '1px solid var(--col-border-illustrative)', borderRadius: 6, marginBottom: 12,
                }}>
                  <FilePdf size={16} weight="fill" color="var(--col-background-brand)" />
                  <span style={{
                    flex: 1, fontSize: 13, fontWeight: 400,
                    color: 'var(--col-text-primary)', fontFamily: F,
                  }}>
                    {uploadedFile.name} · {uploadedFile.size}
                  </span>
                  <button onClick={clearFile} style={{
                    background: 'transparent', border: 'none', cursor: 'pointer', padding: 4,
                    display: 'flex', color: 'var(--col-text-subtle)',
                  }}>
                    <X size={14} weight="bold" />
                  </button>
                </div>
              )}

              {/* Lens badge (after file selected) */}
              {hasFile && lens && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', background: 'var(--col-background-brand)', borderRadius: 6,
                  marginBottom: 16,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: '#fff', fontFamily: F }}>
                    {LENS_LABELS[lens]}
                  </span>
                </div>
              )}

              {/* Context textarea */}
              {hasFile && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{
                    display: 'block', fontSize: 12, fontWeight: 400,
                    color: 'var(--col-text-subtle)', marginBottom: 8, fontFamily: F,
                  }}>
                    What should we focus on?
                  </label>
                  <textarea
                    value={focusContext}
                    onChange={(e) => setFocusContext(e.target.value)}
                    placeholder="Summarize for a non-technical exec, extract compliance clauses, pull out all financial metrics..."
                    style={{
                      width: '100%', minHeight: 100, padding: '12px 14px',
                      fontFamily: F, fontSize: 13, fontWeight: 300,
                      border: '1px solid var(--col-border-illustrative)', borderRadius: 6,
                      background: 'var(--col-background-ui-10)', color: 'var(--col-text-primary)',
                      resize: 'vertical', outline: 'none', lineHeight: 1.6,
                    }}
                  />
                </div>
              )}

              {/* Analyze button */}
              {hasFile && (
                <button onClick={runAnalysis} disabled={!canAnalyze || isRunning}
                  style={{
                    padding: '10px 28px', border: 'none', borderRadius: 6,
                    background: canAnalyze && !isRunning
                      ? 'var(--col-background-brand)' : 'var(--col-border-illustrative)',
                    color: '#fff', fontSize: 13, fontWeight: 500,
                    cursor: canAnalyze && !isRunning ? 'pointer' : 'not-allowed',
                    fontFamily: F, display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                  {isRunning ? (
                    <><Spinner size={16} className="animate-spin" /> Analyzing...</>
                  ) : hasResults ? (
                    <><ArrowsClockwise size={16} weight="bold" /> Re-analyze</>
                  ) : (
                    <><Sparkle size={16} weight="fill" /> Analyze</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── Right Pane: Results ──────────────────────── */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          background: 'var(--col-background-ui-10)',
          borderLeft: '1px solid var(--col-border-illustrative)', overflow: 'hidden',
        }}>
          {/* Preview tab header */}
          {hasResults && (
            <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--col-border-illustrative)' }}>
              <div style={{
                padding: '6px 16px', borderBottom: '2px solid var(--col-background-brand)',
                display: 'inline-block', color: 'var(--col-text-primary)',
                fontSize: 12, fontWeight: 400, fontFamily: F,
              }}>
                Preview
              </div>
            </div>
          )}

          {/* Results content */}
          <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
            {sections.length === 0 ? (
              /* Empty right pane */
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100%', gap: 12,
              }}>
                <Sparkle size={28} weight="regular" color="var(--col-text-subtle)" />
                <span style={{ fontSize: 12, fontWeight: 300, fontFamily: F, color: 'var(--col-text-subtle)' }}>
                  Analysis renders here
                </span>
              </div>
            ) : (
              /* Section cards */
              <div>
                {sections.map((sec) => (
                  <SectionCard key={sec.id} section={sec} />
                ))}
              </div>
            )}
          </div>

          {/* Pinned export toolbar */}
          {phase === 'ready' && (
            <div style={{
              padding: '12px 20px', borderTop: '1px solid var(--col-border-illustrative)',
              flexShrink: 0,
            }}>
              <ExportBar />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
