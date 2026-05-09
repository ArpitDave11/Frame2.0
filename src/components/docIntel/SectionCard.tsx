/**
 * SectionCard — single analysis section with BlockNote editing + regenerate/revert.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ArrowCounterClockwise, ArrowsClockwise, Spinner } from '@phosphor-icons/react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useDocIntelStore } from '@/stores/docIntelStore';
import type { Section } from '@/stores/docIntelStore';
import { regenerateSection } from '@/services/docIntel/analyzeAction';
import { MermaidPreview } from './MermaidPreview';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

const SECTION_ICONS: Record<string, string> = {
  summary: '\u{1F4CB}', insights: '\u{1F4A1}', explanations: '\u{1F4D6}', visuals: '\u{1F4CA}',
};

interface Props {
  section: Section;
}

export function SectionCard({ section }: Props) {
  const revertSection = useDocIntelStore((s) => s.revertSection);
  const updateSection = useDocIntelStore((s) => s.updateSection);
  const lastImportedRef = useRef<string>('');

  const editor = useCreateBlockNote();

  // Import markdown into editor when section.markdown changes externally
  // (from analysis or regeneration — not from user edits)
  useEffect(() => {
    if (!editor || !section.markdown || section.markdown === lastImportedRef.current) return;
    lastImportedRef.current = section.markdown;
    (async () => {
      try {
        const blocks = await editor.tryParseMarkdownToBlocks(section.markdown);
        editor.replaceBlocks(editor.document, blocks);
      } catch {
        // fallback: just set a paragraph with raw text
      }
    })();
  }, [editor, section.markdown]);

  const handleChange = useCallback(async () => {
    if (!editor) return;
    try {
      const md = await editor.blocksToMarkdownLossy(editor.document);
      if (md !== lastImportedRef.current) {
        lastImportedRef.current = md;
        updateSection(section.id, md);
      }
    } catch {
      // ignore export errors
    }
  }, [editor, section.id, updateSection]);

  const handleRegenerate = useCallback(() => {
    regenerateSection(section.id);
  }, [section.id]);

  const handleRevert = useCallback(() => {
    revertSection(section.id);
  }, [section.id, revertSection]);

  // Extract Mermaid diagrams from visuals section for preview rendering
  const mermaidDiagrams = useMemo(() => {
    if (section.kind !== 'visuals' || !section.markdown) return [];
    const diagrams: { title: string; code: string; caption: string }[] = [];
    const regex = /###\s*(.+?)\n[\s\S]*?```mermaid\n([\s\S]*?)```(?:\n\n_(.+?)_)?/g;
    let match;
    while ((match = regex.exec(section.markdown)) !== null) {
      diagrams.push({
        title: match[1]?.trim() ?? 'Diagram',
        code: match[2]?.trim() ?? '',
        caption: match[3]?.trim() ?? '',
      });
    }
    return diagrams;
  }, [section.kind, section.markdown]);

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
      <div style={{ padding: '8px 16px', fontFamily: F, fontSize: 14, lineHeight: 1.6 }}>
        {isGenerating ? (
          <div style={{ color: 'var(--col-text-subtle)', fontStyle: 'italic', padding: 8 }}>
            Analyzing document...
          </div>
        ) : section.status === 'error' ? (
          <div style={{ color: '#991b1b', padding: 12, background: '#fef2f2', borderRadius: 6 }}>
            {section.error ?? 'Analysis failed'}
          </div>
        ) : section.kind === 'visuals' && mermaidDiagrams.length > 0 ? (
          /* Visuals section: render Mermaid diagrams as interactive previews */
          <div>
            {mermaidDiagrams.map((d, i) => (
              <MermaidPreview key={i} code={d.code} title={d.title} caption={d.caption} />
            ))}
            <BlockNoteView editor={editor} onChange={handleChange} theme="light" />
          </div>
        ) : (
          <BlockNoteView editor={editor} onChange={handleChange} theme="light" />
        )}
      </div>
    </div>
  );
}
