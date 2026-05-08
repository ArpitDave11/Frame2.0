/**
 * ExportBar — download/export actions for analyzed documents.
 */

import { DownloadSimple } from '@phosphor-icons/react';
import { useDocIntelStore } from '@/stores/docIntelStore';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function ExportBar() {
  const sections = useDocIntelStore((s) => s.sections);
  const fileName = useDocIntelStore((s) => s.fileName);

  const handleDownloadMd = () => {
    const md = sections
      .filter((s) => s.status === 'done')
      .map((s) => s.markdown)
      .join('\n\n---\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(fileName ?? 'analysis').replace(/\.[^.]+$/, '')}-analysis.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      display: 'flex', gap: 8, padding: '16px 0',
      borderTop: '1px solid var(--col-border-illustrative)', marginTop: 16,
    }}>
      <button onClick={handleDownloadMd} style={{
        padding: '8px 14px', borderRadius: 6, border: '1px solid #d1d5db',
        background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        fontFamily: F, fontSize: 13,
      }}>
        <DownloadSimple size={16} /> Download Markdown
      </button>
    </div>
  );
}
