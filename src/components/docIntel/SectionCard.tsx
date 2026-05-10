/**
 * SectionCard — routes to dedicated section renderers based on section kind.
 *
 * Each section type has its own renderer that consumes structured data
 * (not raw markdown). AnalysisMarkdown is used only for prose body fields
 * inside those renderers. Markdown is kept for export only.
 */

import { useCallback } from 'react';
import { ArrowCounterClockwise, ArrowsClockwise, Spinner } from '@phosphor-icons/react';
import { useDocIntelStore } from '@/stores/docIntelStore';
import type { Section } from '@/stores/docIntelStore';
import type { SummaryData, InsightsData, VisualsData } from '@/services/docIntel/dataTypes';
import { regenerateSection } from '@/services/docIntel/analyzeAction';
import { SummaryCard } from './SummaryCard';
import { InsightsCard } from './InsightsCard';
import { VisualsCard } from './VisualsCard';
import { AnalysisMarkdown } from './AnalysisMarkdown';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

const SECTION_ICONS: Record<string, string> = {
  summary: '\u{1F4CB}', insights: '\u{1F4A1}', explanations: '\u{1F4D6}', visuals: '\u{1F4CA}',
};

interface Props {
  section: Section;
}

export function SectionCard({ section }: Props) {
  const revertSection = useDocIntelStore((s) => s.revertSection);

  const handleRegenerate = useCallback(() => {
    regenerateSection(section.id);
  }, [section.id]);

  const handleRevert = useCallback(() => {
    revertSection(section.id);
  }, [section.id, revertSection]);

  const isGenerating = section.status === 'generating';
  const canRevert = section.history.length > 0;

  // Route to dedicated renderer based on section kind + data availability
  function renderContent() {
    if (isGenerating) {
      return (
        <div style={{ color: 'var(--col-text-subtle)', fontStyle: 'italic', padding: 8 }}>
          Analyzing document...
        </div>
      );
    }
    if (section.status === 'error') {
      return (
        <div style={{ color: '#991b1b', padding: 12, background: '#fef2f2', borderRadius: 6 }}>
          {section.error ?? 'Analysis failed'}
        </div>
      );
    }

    // If structured data is available, use dedicated renderers
    if (section.data) {
      switch (section.kind) {
        case 'summary':
          return <SummaryCard data={section.data as SummaryData} />;
        case 'insights':
        case 'explanations':
          return <InsightsCard data={section.data as InsightsData} />;
        case 'visuals':
          return <VisualsCard data={section.data as VisualsData} />;
      }
    }

    // Fallback: render markdown if no structured data
    return <AnalysisMarkdown>{section.markdown}</AnalysisMarkdown>;
  }

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid var(--col-border-illustrative)',
      borderLeft: '4px solid var(--col-background-brand)',
      borderRadius: 8,
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px', borderBottom: '1px solid #f1f5f9',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: F }}>
          <span style={{ fontSize: 20 }}>{SECTION_ICONS[section.id] ?? '\u{1F4C4}'}</span>
          <h2 style={{
            fontSize: 22, fontWeight: 600, lineHeight: 1.3,
            color: 'var(--col-text-primary)', margin: 0,
            letterSpacing: '-0.01em', fontFamily: F,
          }}>
            {section.label}
          </h2>
          {isGenerating && <Spinner size={16} className="animate-spin" />}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handleRevert} disabled={!canRevert || isGenerating}
            title="Revert to previous version"
            style={{
              padding: '6px 12px', borderRadius: 6, border: '1px solid #e5e7eb',
              background: '#fff', cursor: canRevert && !isGenerating ? 'pointer' : 'not-allowed',
              opacity: canRevert && !isGenerating ? 1 : 0.4, display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: F, fontSize: 13, transition: 'all 0.15s',
            }}>
            <ArrowCounterClockwise size={14} /> Revert
          </button>
          <button onClick={handleRegenerate} disabled={isGenerating}
            title="Regenerate this section"
            style={{
              padding: '6px 12px', borderRadius: 6, border: 'none',
              background: isGenerating ? '#fca5a5' : 'var(--col-background-brand)',
              color: '#fff', cursor: isGenerating ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: F, fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
            }}>
            <ArrowsClockwise size={14} /> {isGenerating ? 'Generating...' : 'Regenerate'}
          </button>
        </div>
      </div>

      {/* Content — routed to dedicated renderer */}
      <div style={{ padding: 24, fontFamily: F }}>
        {renderContent()}
      </div>
    </div>
  );
}
