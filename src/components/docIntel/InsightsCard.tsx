/**
 * InsightsCard — numbered sub-cards with collapsible evidence quotes.
 * Renders from InsightsData, not raw markdown.
 */

import { useState } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import type { InsightsData } from '@/services/docIntel/dataTypes';
import { AnalysisMarkdown } from './AnalysisMarkdown';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

const SEVERITY_COLORS: Record<string, string> = {
  high: '#dc2626', medium: '#d97706', low: '#16a34a',
};

interface Props {
  data: InsightsData;
}

export function InsightsCard({ data }: Props) {
  return (
    <div>
      {/* Key Insights — numbered sub-cards */}
      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data.key_insights.map((ins, i) => (
          <li key={i}>
            <InsightItem index={i + 1} insight={ins} />
          </li>
        ))}
      </ol>

      {/* Simplified Explanations */}
      {data.simplified_explanations.length > 0 && (
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px dashed #f1f5f9' }}>
          <h3 style={{
            fontSize: 13, fontWeight: 600, textTransform: 'uppercase' as const,
            letterSpacing: '0.05em', color: 'var(--col-text-subtle)',
            margin: '0 0 12px', fontFamily: F,
          }}>
            Simplified Explanations
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.simplified_explanations.map((exp, i) => (
              <div key={i} style={{
                padding: '12px 16px', background: '#fafbfc',
                border: '1px solid #f1f5f9', borderRadius: 6,
              }}>
                <span style={{
                  fontFamily: '"JetBrains Mono", monospace', fontSize: 13,
                  fontWeight: 600, color: 'var(--col-text-primary)',
                }}>
                  {exp.term}
                </span>
                <div style={{ marginTop: 8 }}>
                  <AnalysisMarkdown>{exp.plain_md}</AnalysisMarkdown>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risks */}
      {data.risks.length > 0 && (
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px dashed #f1f5f9' }}>
          <h3 style={{
            fontSize: 13, fontWeight: 600, textTransform: 'uppercase' as const,
            letterSpacing: '0.05em', color: 'var(--col-text-subtle)',
            margin: '0 0 12px', fontFamily: F,
          }}>
            Risks
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.risks.map((risk, i) => (
              <div key={i} style={{
                padding: '12px 16px', background: '#fafbfc',
                border: '1px solid #f1f5f9', borderRadius: 6,
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <div style={{
                  display: 'flex', gap: 4, flexShrink: 0, marginTop: 2,
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 3,
                    background: SEVERITY_COLORS[risk.likelihood] + '15',
                    color: SEVERITY_COLORS[risk.likelihood], fontFamily: F,
                  }}>
                    {risk.likelihood}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 3,
                    background: SEVERITY_COLORS[risk.impact] + '15',
                    color: SEVERITY_COLORS[risk.impact], fontFamily: F,
                  }}>
                    {risk.impact}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <AnalysisMarkdown>{risk.description_md}</AnalysisMarkdown>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── InsightItem sub-card ──────────────────────────────────

function InsightItem({ index, insight }: { index: number; insight: InsightsData['key_insights'][0] }) {
  const [showEvidence, setShowEvidence] = useState(false);

  return (
    <article style={{
      background: '#fafbfc', border: '1px solid #f1f5f9',
      borderRadius: 6, padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
        <span style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 12,
          fontWeight: 600, color: 'var(--col-text-subtle)', letterSpacing: '0.05em',
        }}>
          {String(index).padStart(2, '0')}
        </span>
        <h3 style={{
          fontSize: 16, fontWeight: 600, lineHeight: 1.4,
          color: 'var(--col-text-primary)', margin: 0, fontFamily: F,
        }}>
          {insight.heading}
        </h3>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 3,
          background: SEVERITY_COLORS[insight.severity] + '15',
          color: SEVERITY_COLORS[insight.severity], fontFamily: F,
          flexShrink: 0,
        }}>
          {insight.severity}
        </span>
      </div>

      <div style={{ marginBottom: insight.evidence_quote ? 8 : 0 }}>
        <AnalysisMarkdown>{insight.body_md}</AnalysisMarkdown>
      </div>

      {/* Collapsible evidence quote */}
      {insight.evidence_quote && insight.evidence_quote !== 'Not directly quoted' && (
        <>
          <button onClick={() => setShowEvidence(!showEvidence)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            marginTop: 4, padding: '4px 8px', marginLeft: -8,
            background: 'transparent', border: 0, cursor: 'pointer',
            fontSize: 13, color: 'var(--col-text-subtle)', borderRadius: 4,
            fontFamily: F, transition: 'background 0.15s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ fontSize: 14 }}>&ldquo;</span>
            {showEvidence ? 'Hide source quote' : 'View source quote'}
            <CaretDown size={14} style={{
              transition: 'transform 150ms ease',
              transform: showEvidence ? 'rotate(180deg)' : 'rotate(0deg)',
            }} />
          </button>
          {showEvidence && (
            <figure style={{
              margin: '8px 0 0', padding: '12px 16px',
              borderLeft: '3px solid #cbd5e1', background: '#fafafa',
              borderRadius: '0 4px 4px 0',
            }}>
              <blockquote style={{
                fontStyle: 'italic', fontSize: 15, lineHeight: 1.65,
                color: 'var(--col-text-primary)', margin: 0, fontFamily: F,
              }}>
                &ldquo;{insight.evidence_quote}&rdquo;
              </blockquote>
            </figure>
          )}
        </>
      )}
    </article>
  );
}
