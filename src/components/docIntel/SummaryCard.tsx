/**
 * SummaryCard — structured summary with pull-quote + audience brief.
 * Renders from SummaryData, not raw markdown.
 */

import type { SummaryData } from '@/services/docIntel/dataTypes';
import { AnalysisMarkdown } from './AnalysisMarkdown';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

interface Props {
  data: SummaryData;
}

export function SummaryCard({ data }: Props) {
  return (
    <div>
      {/* One-line summary as pull-quote */}
      <aside style={{
        margin: '0 0 20px', padding: '16px 20px',
        borderLeft: '4px solid var(--col-background-brand)',
        background: '#fdf2f3', borderRadius: '0 6px 6px 0',
        display: 'flex', gap: 12,
      }}>
        <span style={{ fontSize: 20, color: 'var(--col-background-brand)', marginTop: 2 }}>&ldquo;</span>
        <p style={{
          fontSize: 17, fontWeight: 500, lineHeight: 1.55,
          color: 'var(--col-text-primary)', margin: 0, fontFamily: F,
        }}>
          {data.one_line_summary}
        </p>
      </aside>

      {/* Executive summary prose */}
      <AnalysisMarkdown>{data.executive_summary}</AnalysisMarkdown>

      {/* Audience brief — subordinated subsection */}
      {data.audience_brief && (
        <div style={{
          marginTop: 24, paddingTop: 20,
          borderTop: '1px dashed #f1f5f9',
        }}>
          <h3 style={{
            fontSize: 13, fontWeight: 600, textTransform: 'uppercase' as const,
            letterSpacing: '0.05em', color: 'var(--col-text-subtle)',
            margin: '0 0 12px', fontFamily: F,
          }}>
            Audience Brief
          </h3>
          <AnalysisMarkdown>{data.audience_brief}</AnalysisMarkdown>
        </div>
      )}
    </div>
  );
}
