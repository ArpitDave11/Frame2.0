/**
 * ExportBar — download/export actions for analyzed documents.
 * Styled for the dark CTA bar context (white text, ghost/filled buttons).
 */

import { useState } from 'react';
import { DownloadSimple, GitBranch, Spinner } from '@phosphor-icons/react';
import { useDocIntelStore } from '@/stores/docIntelStore';
import { PublishToGitLabDialog } from './PublishToGitLabDialog';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

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

  // Export handler — currently downloads as markdown. DOCX/PDF via export service (Phase 2).
  void exporting; // reserved for future DOCX/PDF export state
  void setExporting;

  // Ghost button style (for dark background context)
  const ghost: React.CSSProperties = {
    padding: '14px 28px', border: '2px solid rgba(255,255,255,0.2)',
    borderRadius: 6, background: 'transparent', color: '#fff',
    fontSize: 14, fontWeight: 400, cursor: 'pointer', fontFamily: F,
    display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.25s',
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={handleDownloadMd} style={ghost}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ffffff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <DownloadSimple size={18} weight="bold" />
          {exporting ? <Spinner size={16} className="animate-spin" /> : 'Export'}
        </button>
        <button onClick={() => setShowGitLab(true)} style={{
          ...ghost, border: 'none',
          background: 'var(--col-background-brand)', fontWeight: 500,
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#ff1a1a'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(230,0,0,0.4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--col-background-brand)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <GitBranch size={18} weight="bold" /> Publish to GitLab
        </button>
      </div>
      <PublishToGitLabDialog open={showGitLab} onClose={() => setShowGitLab(false)} />
    </>
  );
}
