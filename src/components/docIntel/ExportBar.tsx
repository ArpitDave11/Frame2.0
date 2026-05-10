/**
 * ExportBar — download/export actions for analyzed documents.
 *
 * Markdown: fenced Mermaid blocks preserved (standard markdown).
 * PDF/DOCX: Mermaid fences replaced with inline SVG data URIs client-side
 *           before sending to backend export service. Users see rendered
 *           diagrams in the exported file, not raw source code.
 */

import { useState } from 'react';
import { DownloadSimple, FileDoc, FilePdf, GitBranch, Spinner } from '@phosphor-icons/react';
import mermaid from 'mermaid';
import { useDocIntelStore } from '@/stores/docIntelStore';
import { useUiStore } from '@/stores/uiStore';
import { PublishToGitLabDialog } from './PublishToGitLabDialog';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

// ─── Mermaid → SVG Embedding ───────────────────────────────

let svgCounter = 0;

/**
 * Replace all ```mermaid fences in markdown with inline SVG data URIs.
 * For PDF/DOCX export — users see rendered diagrams, not source code.
 */
async function embedMermaidAsSvg(md: string): Promise<string> {
  const fenceRegex = /```mermaid\n([\s\S]*?)```/g;
  const matches = [...md.matchAll(fenceRegex)];
  if (matches.length === 0) return md;

  let result = md;
  for (const match of matches) {
    const code = match[1]?.trim() ?? '';
    if (!code) continue;
    try {
      const id = `export-mermaid-${++svgCounter}`;
      const { svg } = await mermaid.render(id, code);
      const b64 = btoa(unescape(encodeURIComponent(svg)));
      const dataUri = `data:image/svg+xml;base64,${b64}`;
      result = result.replace(match[0], `![Diagram](${dataUri})`);
    } catch {
      // If Mermaid fails, keep the fenced code block as fallback
    }
  }
  return result;
}

// ─── Component ─────────────────────────────────────────────

export function ExportBar() {
  const sections = useDocIntelStore((s) => s.sections);
  const fileName = useDocIntelStore((s) => s.fileName);
  const addToast = useUiStore.getState().addToast;
  const [exporting, setExporting] = useState<'md' | 'docx' | 'pdf' | null>(null);
  const [showGitLab, setShowGitLab] = useState(false);

  const assembleMarkdown = () =>
    sections
      .filter((s) => s.status === 'done')
      .map((s) => s.markdown)
      .join('\n\n---\n\n');

  const baseFileName = (fileName ?? 'analysis').replace(/\.[^.]+$/, '');

  // ─── Markdown download (keeps fenced Mermaid — standard) ──

  const handleDownloadMd = () => {
    setExporting('md');
    const blob = new Blob([assembleMarkdown()], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseFileName}-analysis.md`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(null);
  };

  // ─── PDF/DOCX export (Mermaid → SVG data URIs → backend) ──

  const handleExport = async (format: 'docx' | 'pdf') => {
    setExporting(format);
    try {
      // Step 1: Render Mermaid diagrams to inline SVG data URIs
      const rawMd = assembleMarkdown();
      const processedMd = await embedMermaidAsSvg(rawMd);

      // Step 2: Send to export service
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, markdown: processedMd, title: baseFileName }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Export failed: HTTP ${res.status}${errText ? ` — ${errText.slice(0, 100)}` : ''}`);
      }

      // Step 3: Download the file
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseFileName}-analysis.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Export failed';
      addToast({ type: 'error', title: msg });
    } finally {
      setExporting(null);
    }
  };

  // ─── Button styles (for dark CTA bar context) ─────────────

  const ghost: React.CSSProperties = {
    padding: '14px 24px', border: '2px solid rgba(255,255,255,0.2)',
    borderRadius: 6, background: 'transparent', color: '#fff',
    fontSize: 13, fontWeight: 400, cursor: 'pointer', fontFamily: F,
    display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.25s',
  };

  const isExporting = exporting !== null;

  return (
    <>
      <div style={{ display: 'flex', gap: 10 }}>
        {/* Markdown download */}
        <button onClick={handleDownloadMd} disabled={isExporting} style={ghost}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ffffff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <DownloadSimple size={16} weight="bold" />
          {exporting === 'md' ? <Spinner size={14} className="animate-spin" /> : 'Markdown'}
        </button>

        {/* DOCX export */}
        <button onClick={() => handleExport('docx')} disabled={isExporting} style={ghost}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ffffff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <FileDoc size={16} weight="bold" />
          {exporting === 'docx' ? <Spinner size={14} className="animate-spin" /> : 'DOCX'}
        </button>

        {/* PDF export */}
        <button onClick={() => handleExport('pdf')} disabled={isExporting} style={ghost}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ffffff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <FilePdf size={16} weight="bold" />
          {exporting === 'pdf' ? <Spinner size={14} className="animate-spin" /> : 'PDF'}
        </button>

        {/* GitLab publish */}
        <button onClick={() => setShowGitLab(true)} disabled={isExporting} style={{
          ...ghost, border: 'none',
          background: 'var(--col-background-brand)', fontWeight: 500,
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#ff1a1a'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(230,0,0,0.4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--col-background-brand)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <GitBranch size={16} weight="bold" /> Publish to GitLab
        </button>
      </div>
      <PublishToGitLabDialog open={showGitLab} onClose={() => setShowGitLab(false)} />
    </>
  );
}
