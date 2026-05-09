/**
 * DocIntelHeader — dark header with filename, lens badge, and new-analysis button.
 */

import { useDocIntelStore } from '@/stores/docIntelStore';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

const LENS_LABELS: Record<string, string> = {
  executive: 'Executive Brief', technical: 'Technical', legal: 'Legal',
  financial: 'Financial', operational: 'Operational', risk: 'Risk', summary: 'Summary',
};

export function DocIntelHeader() {
  const fileName = useDocIntelStore((s) => s.fileName);
  const lens = useDocIntelStore((s) => s.lens);
  const reset = useDocIntelStore((s) => s.reset);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 20px', background: '#1a1a1a', fontFamily: F,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>
          {fileName ?? 'Document'}
        </span>
        {lens && (
          <span style={{
            fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 4,
            background: 'var(--col-background-brand)', color: '#fff',
          }}>
            {LENS_LABELS[lens] ?? lens}
          </span>
        )}
      </div>
      <button onClick={reset} style={{
        padding: '6px 12px', borderRadius: 4, border: '1px solid #555',
        background: 'transparent', color: '#aaa', cursor: 'pointer',
        fontFamily: F, fontSize: 12,
      }}>
        New Analysis
      </button>
    </div>
  );
}
