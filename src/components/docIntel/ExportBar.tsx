/**
 * ExportBar — download/export actions for analyzed documents.
 */

import { useState } from 'react';
import { DownloadSimple, FileDoc, FilePdf, GitBranch, Spinner } from '@phosphor-icons/react';
import { useDocIntelStore } from '@/stores/docIntelStore';
import { PublishToGitLabDialog } from './PublishToGitLabDialog';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

const BTN_STYLE: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 6, border: '1px solid #d1d5db',
  background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
  fontFamily: F, fontSize: 13,
};

export function ExportBar() {
  const sections = useDocIntelStore((s) => s.sections);
  const fileName = useDocIntelStore((s) => s.fileName);
  const [exporting, setExporting] = useState<'docx' | 'pdf' | null>(null);
  const [showGitLab, setShowGitLab] = useState(false);

  const assembleMarkdown = () =>
    sections
      .filter((s) => s.status === 'done')
      .map((s) => s.markdown)
      .join('\n\n---\n\n');

  const baseFileName = (fileName ?? 'analysis').replace(/\.[^.]+$/, '');

  const handleDownloadMd = () => {
    const blob = new Blob([assembleMarkdown()], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseFileName}-analysis.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async (format: 'docx' | 'pdf') => {
    setExporting(format);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, markdown: assembleMarkdown(), title: baseFileName }),
      });
      if (!res.ok) throw new Error(`Export failed: HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseFileName}-analysis.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export error:', e);
    } finally {
      setExporting(null);
    }
  };

  return (
    <>
      <div style={{
        display: 'flex', gap: 8, padding: '16px 0', flexWrap: 'wrap',
        borderTop: '1px solid var(--col-border-illustrative)', marginTop: 16,
      }}>
        <button onClick={handleDownloadMd} style={BTN_STYLE}>
          <DownloadSimple size={16} /> Markdown
        </button>
        <button onClick={() => handleExport('docx')} disabled={exporting !== null} style={BTN_STYLE}>
          {exporting === 'docx' ? <Spinner size={16} className="animate-spin" /> : <FileDoc size={16} />}
          DOCX
        </button>
        <button onClick={() => handleExport('pdf')} disabled={exporting !== null} style={BTN_STYLE}>
          {exporting === 'pdf' ? <Spinner size={16} className="animate-spin" /> : <FilePdf size={16} />}
          PDF
        </button>
        <button onClick={() => setShowGitLab(true)} style={{
          ...BTN_STYLE,
          background: 'var(--col-background-brand)', color: '#fff',
          border: 'none', fontWeight: 500,
        }}>
          <GitBranch size={16} /> Publish to GitLab
        </button>
      </div>
      <PublishToGitLabDialog open={showGitLab} onClose={() => setShowGitLab(false)} />
    </>
  );
}
