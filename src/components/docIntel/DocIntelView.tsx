/**
 * DocIntelView — Document Intelligence tab.
 *
 * Premium single-page flow: hero upload page → full-width results page.
 * No lens picker — AI auto-detects the lens via nano pre-classifier.
 * All wiring preserved: store, analyzeAction, SectionCard, BlockNote,
 * MermaidPreview, ExportBar, file validation, warmSchemas.
 */

import { useEffect, useRef, useState } from 'react';
import {
  FilePdf, FileText, Sparkle, ArrowsClockwise, X,
} from '@phosphor-icons/react';
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
  const [fileError, setFileError] = useState<string | null>(null);
  const pendingFileRef = useRef<File | null>(null);

  const hasFile = uploadedFile !== null;
  const showResults = sections.length > 0 || phase === 'analyzing';

  const handleFileUpload = (file: File) => {
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_UPLOAD_EXTENSIONS.includes(ext as typeof ALLOWED_UPLOAD_EXTENSIONS[number])) {
      setFileError(`Unsupported type "${ext}". Allowed: ${ALLOWED_UPLOAD_EXTENSIONS.join(', ')}`);
      return;
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setFileError(`File too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Max ${MAX_UPLOAD_MB} MB.`);
      return;
    }
    setFileError(null);
    setUploadedFile({ name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB` });
    pendingFileRef.current = file;
  };

  const startNewAnalysis = () => {
    setUploadedFile(null);
    pendingFileRef.current = null;
    setIsRunning(false);
    setFileError(null);
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
      style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#f7f7f5' }}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
    >
      {!showResults ? (
        /* ═══ UPLOAD PAGE ═══ */
        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* Full-page drag overlay */}
          {isDragging && (
            <div style={{
              position: 'fixed', inset: '56px 0 0 56px',
              background: 'rgba(227, 6, 19, 0.08)',
              border: '3px dashed var(--col-background-brand)', borderRadius: 8, margin: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 100, pointerEvents: 'none',
            }}>
              <span style={{ fontSize: 20, fontWeight: 400, color: 'var(--col-background-brand)', fontFamily: F }}>
                Drop file to upload
              </span>
            </div>
          )}

          {/* Hero Section */}
          <section style={{
            maxWidth: 1440, margin: '0 auto',
            padding: '100px 60px 120px',
            display: 'grid',
            gridTemplateColumns: !hasFile ? '1.4fr 1fr' : '1fr',
            gap: 100, alignItems: 'center',
          }}>
            {/* Left: Value Proposition / Context */}
            <div style={{ position: 'relative' }}>
              {/* Gradient impulse line */}
              <div style={{
                position: 'absolute', left: -24, top: -10,
                width: 6, height: 180,
                background: 'linear-gradient(180deg, var(--col-background-brand) 0%, #cc0000 100%)',
              }} />

              <h1 style={{
                fontSize: 42, fontWeight: 400, lineHeight: 1.25, marginBottom: 28,
                color: 'var(--col-text-primary)', letterSpacing: '-0.5px', fontFamily: F,
              }}>
                {!hasFile ? 'AI-powered document intelligence' : 'Ready to analyze'}
              </h1>

              <p style={{
                fontSize: 20, fontWeight: 300, lineHeight: 1.65,
                color: 'var(--col-text-subtle)', fontFamily: F,
                marginBottom: !hasFile ? 0 : 48,
              }}>
                {!hasFile
                  ? 'Upload any document and get AI-generated insights, summaries, and explanations — automatically'
                  : 'Add optional context to guide the analysis, then let AI extract key insights'}
              </p>

              {/* File validation error */}
              {fileError && (
                <div style={{
                  padding: 12, marginBottom: 16, borderRadius: 6,
                  background: '#fef2f2', color: '#991b1b', fontSize: 13, fontFamily: F,
                }}>
                  {fileError}
                </div>
              )}

              {/* Context + Analyze (after file selected) */}
              {hasFile && (
                <div style={{ marginTop: 48 }}>
                  {/* Context input card */}
                  <div style={{
                    background: '#ffffff', border: '1px solid var(--col-border-illustrative)',
                    borderRadius: 8, padding: '28px 32px', marginBottom: 24,
                  }}>
                    <label style={{
                      display: 'block', fontSize: 14, fontWeight: 400,
                      color: 'var(--col-text-subtle)', marginBottom: 12, fontFamily: F,
                    }}>
                      Analysis focus (optional)
                    </label>
                    <textarea
                      value={focusContext}
                      onChange={(e) => setFocusContext(e.target.value)}
                      placeholder="Extract compliance clauses, summarize for executives, identify key metrics..."
                      style={{
                        width: '100%', minHeight: 120, padding: '14px 16px',
                        fontFamily: F, fontSize: 14, fontWeight: 300,
                        border: '1px solid var(--col-border-illustrative)', borderRadius: 8,
                        background: '#fafafa', color: 'var(--col-text-primary)',
                        resize: 'vertical', outline: 'none', lineHeight: 1.6, transition: 'all 0.15s',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--col-background-brand)'; e.currentTarget.style.background = '#ffffff'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--col-border-illustrative)'; e.currentTarget.style.background = '#fafafa'; }}
                    />
                  </div>

                  {/* Analyze button — full width */}
                  <button onClick={runAnalysis} disabled={isRunning}
                    style={{
                      width: '100%', padding: '18px 0', border: 'none', borderRadius: 6,
                      background: !isRunning ? 'var(--col-background-brand)' : 'var(--col-border-illustrative)',
                      color: '#fff', fontSize: 16, fontWeight: 500,
                      cursor: !isRunning ? 'pointer' : 'not-allowed',
                      fontFamily: F, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      transition: 'all 0.25s',
                    }}
                    onMouseEnter={(e) => { if (!isRunning) { e.currentTarget.style.background = '#ff1a1a'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(230,0,0,0.4)'; } }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--col-background-brand)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    {isRunning ? (
                      <><div style={{ width: 18, height: 18, border: '2px solid white', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Analyzing document...</>
                    ) : (
                      <><Sparkle size={20} weight="fill" /> Analyze Document</>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Right: Upload Card or File Preview */}
            {!hasFile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Upload card */}
                <label style={{
                  background: '#ffffff', border: '2px dashed var(--col-border-illustrative)',
                  borderRadius: 8, padding: '56px 40px', cursor: 'pointer', textAlign: 'center',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', fontFamily: F,
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--col-background-brand)'; e.currentTarget.style.borderStyle = 'solid'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(230, 0, 0, 0.15)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--col-border-illustrative)'; e.currentTarget.style.borderStyle = 'dashed'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <input type="file" accept={ALLOWED_UPLOAD_EXTENSIONS.join(',')}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                    style={{ display: 'none' }}
                  />
                  <FilePdf size={72} weight="duotone" color="var(--col-background-brand)" style={{ marginBottom: 24 }} />
                  <h3 style={{ fontSize: 19, fontWeight: 500, color: 'var(--col-text-primary)', margin: '0 0 12px 0', fontFamily: F, letterSpacing: '-0.2px' }}>
                    Drop your file here
                  </h3>
                  <p style={{ fontSize: 14, fontWeight: 300, color: 'var(--col-text-subtle)', margin: '0 0 24px 0', fontFamily: F, lineHeight: 1.6 }}>
                    or click to browse
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {['PDF', 'DOCX', 'PPTX', 'XLSX', 'HTML', 'PNG'].map((t) => (
                      <span key={t} style={{
                        padding: '6px 12px', background: '#fafafa',
                        border: '1px solid var(--col-border-illustrative)', borderRadius: 4,
                        fontSize: 11, fontWeight: 500, color: 'var(--col-text-subtle)', fontFamily: F, letterSpacing: '0.02em',
                      }}>{t}</span>
                    ))}
                  </div>
                </label>

                {/* Info card */}
                <div style={{
                  background: '#ffffff', border: '1px solid var(--col-border-illustrative)',
                  borderLeft: '4px solid var(--col-background-brand)', borderRadius: 8, padding: '24px 28px',
                }}>
                  <div style={{ fontSize: 15, fontWeight: 300, color: 'var(--col-text-subtle)', lineHeight: 1.6 }}>
                    <strong style={{ fontWeight: 500, color: 'var(--col-text-primary)' }}>Auto-detected lens</strong><br />
                    AI identifies document type and optimizes analysis accordingly
                  </div>
                </div>
              </div>
            ) : (
              /* File preview card */
              <div style={{
                background: '#ffffff', border: '2px solid var(--col-background-brand)',
                borderRadius: 8, overflow: 'hidden', fontFamily: F,
              }}>
                <div style={{
                  position: 'relative', padding: 32,
                  background: 'linear-gradient(135deg, #fffbf7 0%, #fff5f0 100%)',
                  borderBottom: '1px solid var(--col-border-illustrative)',
                }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: 8,
                    background: 'var(--col-background-brand)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 20, boxShadow: '0 4px 12px rgba(230,0,0,0.2)',
                  }}>
                    <FilePdf size={36} weight="fill" color="#ffffff" />
                  </div>
                  <button onClick={() => { setUploadedFile(null); pendingFileRef.current = null; }} style={{
                    position: 'absolute', top: 16, right: 16, background: '#ffffff',
                    border: '1px solid var(--col-border-illustrative)', borderRadius: 6,
                    cursor: 'pointer', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6,
                    color: 'var(--col-text-subtle)', fontSize: 13, fontWeight: 300, fontFamily: F, transition: 'all 0.15s',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--col-background-brand)'; e.currentTarget.style.color = 'var(--col-background-brand)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--col-border-illustrative)'; e.currentTarget.style.color = 'var(--col-text-subtle)'; }}
                  >
                    <X size={14} weight="bold" /> Remove
                  </button>
                </div>
                <div style={{ padding: '28px 32px' }}>
                  <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--col-text-primary)', fontFamily: F, marginBottom: 8, wordBreak: 'break-word', letterSpacing: '-0.2px' }}>
                    {uploadedFile.name}
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 14, fontWeight: 300, color: 'var(--col-text-subtle)', fontFamily: F }}>
                    <span>{uploadedFile.size}</span>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : (
        /* ═══ RESULTS PAGE ═══ */
        <>
          {/* Dark header */}
          <div style={{
            height: 48, background: '#1a1a1a', borderBottom: '1px solid #2a2a2a',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 20px', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <FileText size={16} weight="fill" color="#999" />
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
              transition: 'all 0.15s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#3a3a3a'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#2a2a2a'; e.currentTarget.style.color = '#ccc'; }}
            >
              <ArrowsClockwise size={14} /> New Analysis
            </button>
          </div>

          {/* Results content */}
          <div style={{ flex: 1, overflow: 'auto', background: '#f7f7f5' }}>
            <section style={{ maxWidth: 1440, margin: '0 auto', padding: '80px 60px 120px' }}>
              {/* Section header with gradient impulse */}
              <div style={{ marginBottom: 48 }}>
                <div style={{
                  width: 6, height: 80,
                  background: 'linear-gradient(180deg, var(--col-background-brand) 0%, #cc0000 100%)',
                  marginBottom: 24,
                }} />
                <h2 style={{
                  fontSize: 32, fontWeight: 400, marginBottom: 12,
                  color: 'var(--col-text-primary)', letterSpacing: '-0.3px', fontFamily: F,
                }}>
                  Analysis Results
                </h2>
                <p style={{ fontSize: 16, fontWeight: 300, color: 'var(--col-text-subtle)', margin: 0, fontFamily: F }}>
                  AI-generated insights from your document
                </p>
              </div>

              {/* Section cards — single column, proper reading flow */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {sections.map((sec) => (
                  <SectionCard key={sec.id} section={sec} />
                ))}
              </div>

              {/* Dark export CTA bar */}
              {phase === 'ready' && (
                <div style={{
                  marginTop: 56, background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
                  borderRadius: 8, padding: '40px 48px', position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                    background: 'var(--col-background-brand)',
                  }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{
                        fontSize: 24, fontWeight: 400, marginBottom: 8,
                        color: '#fff', letterSpacing: '-0.3px', fontFamily: F,
                      }}>
                        Ready to export?
                      </h3>
                      <p style={{ fontSize: 15, fontWeight: 300, color: 'rgba(255,255,255,0.75)', margin: 0, fontFamily: F }}>
                        Download or publish your analysis to GitLab
                      </p>
                    </div>
                    <ExportBar />
                  </div>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
