/**
 * SectionCard — single analysis section with markdown rendering + regenerate/revert.
 */

import { useCallback } from 'react';
import { ArrowCounterClockwise, ArrowsClockwise, Spinner } from '@phosphor-icons/react';
import { useDocIntelStore } from '@/stores/docIntelStore';
import type { Section } from '@/stores/docIntelStore';
import { regenerateSection } from '@/services/docIntel/analyzeAction';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

  return (
    <div style={{
      border: '1px solid var(--col-border-illustrative)',
      borderRadius: 8, marginBottom: 16, overflow: 'hidden', background: '#fff',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid var(--col-border-illustrative)',
        background: '#fafafa',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: F }}>
          <span>{SECTION_ICONS[section.id] ?? '\u{1F4C4}'}</span>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{section.label}</span>
          {isGenerating && <Spinner size={14} className="animate-spin" />}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={handleRevert} disabled={!canRevert || isGenerating}
            title="Revert to previous version"
            style={{
              padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db',
              background: '#fff', cursor: canRevert && !isGenerating ? 'pointer' : 'not-allowed',
              opacity: canRevert && !isGenerating ? 1 : 0.4, display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: F, fontSize: 12,
            }}>
            <ArrowCounterClockwise size={12} /> Revert
          </button>
          <button onClick={handleRegenerate} disabled={isGenerating}
            title="Regenerate this section"
            style={{
              padding: '4px 8px', borderRadius: 4, border: 'none',
              background: isGenerating ? '#fca5a5' : 'var(--col-background-brand)',
              color: '#fff', cursor: isGenerating ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: F, fontSize: 12, fontWeight: 500,
            }}>
            <ArrowsClockwise size={12} /> {isGenerating ? 'Generating...' : 'Regenerate'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 16, fontFamily: F, fontSize: 14, lineHeight: 1.6 }}>
        {isGenerating ? (
          <div style={{ color: 'var(--col-text-subtle)', fontStyle: 'italic' }}>
            Analyzing document...
          </div>
        ) : section.status === 'error' ? (
          <div style={{ color: '#991b1b', padding: 12, background: '#fef2f2', borderRadius: 6 }}>
            {section.error ?? 'Analysis failed'}
          </div>
        ) : (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {section.markdown}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
