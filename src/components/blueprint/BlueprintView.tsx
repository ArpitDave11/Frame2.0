/**
 * BlueprintView — Full-width blueprint diagram viewer with 2-stage refinement.
 *
 * Features: diagram rendering, version history, confirmation card,
 * chat input, "Use This Diagram" embed, draft/final labeling.
 */

import { useCallback } from 'react';
import { SquaresFour, CheckCircle, XCircle, PencilSimple, ArrowRight } from '@phosphor-icons/react';
import { useBlueprintStore } from '@/stores/blueprintStore';
import { useEpicStore } from '@/stores/epicStore';
import { useUiStore } from '@/stores/uiStore';
import { DiagramRenderer } from './DiagramRenderer';
import { DiagramControls } from './DiagramControls';
import { interpretDiagramFeedback } from '@/actions/regenerateBlueprintAction';
import { regenerateBlueprintAction } from '@/actions/regenerateBlueprintAction';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function BlueprintView() {
  const code = useBlueprintStore((s) => s.code);
  const isFullscreen = useBlueprintStore((s) => s.isFullscreen);
  const diagramType = useBlueprintStore((s) => s.diagramType);
  const versions = useBlueprintStore((s) => s.versions);
  const activeVersionIndex = useBlueprintStore((s) => s.activeVersionIndex);
  const revertToVersion = useBlueprintStore((s) => s.revertToVersion);
  const isDraft = useBlueprintStore((s) => s.isDraft);
  const finalize = useBlueprintStore((s) => s.finalize);

  // D2: Refinement state
  const diagramFeedback = useBlueprintStore((s) => s.diagramFeedback);
  const diagramInterpretation = useBlueprintStore((s) => s.diagramInterpretation);
  const diagramRefineState = useBlueprintStore((s) => s.diagramRefineState);
  const setDiagramFeedback = useBlueprintStore((s) => s.setDiagramFeedback);
  const setDiagramInterpretation = useBlueprintStore((s) => s.setDiagramInterpretation);
  const setDiagramRefineState = useBlueprintStore((s) => s.setDiagramRefineState);
  const clearRefinement = useBlueprintStore((s) => s.clearRefinement);

  const addToast = useUiStore((s) => s.addToast);

  // D4: Submit feedback → Stage 1 interpret
  const handleFeedbackSubmit = useCallback(async () => {
    if (!diagramFeedback.trim()) return;
    setDiagramRefineState('interpreting');
    try {
      const result = await interpretDiagramFeedback(diagramFeedback.trim());
      setDiagramInterpretation(result);
      setDiagramRefineState('confirming');
    } catch {
      setDiagramRefineState('idle');
      addToast({ type: 'error', title: 'Failed to interpret feedback' });
    }
  }, [diagramFeedback, setDiagramRefineState, setDiagramInterpretation, addToast]);

  // D2: Confirm → Stage 2 apply
  const handleConfirmApply = useCallback(async () => {
    if (!diagramInterpretation) return;
    setDiagramRefineState('refining');
    try {
      await regenerateBlueprintAction(diagramInterpretation.changeItems.join('. '));
      clearRefinement();
    } catch {
      setDiagramRefineState('idle');
      addToast({ type: 'error', title: 'Failed to apply changes' });
    }
  }, [diagramInterpretation, setDiagramRefineState, clearRefinement, addToast]);

  // D5: Embed diagram into epic
  const handleEmbedDiagram = useCallback(() => {
    useEpicStore.getState().replaceArchitectureSection(code);
    addToast({ type: 'success', title: 'Diagram embedded in epic' });
  }, [code, addToast]);

  if (!code.trim()) {
    return (
      <div data-testid="blueprint-empty" style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 12, padding: 48, fontFamily: F, color: 'var(--col-text-subtle, #888)',
      }}>
        <SquaresFour size={32} weight="regular" color="var(--col-text-subtle, #888)" />
        <div style={{ fontSize: 14, fontWeight: 500 }}>Run Refine to generate an architecture diagram</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>The AI pipeline creates Mermaid diagrams automatically</div>
      </div>
    );
  }

  const confidenceEmoji = diagramInterpretation?.confidence === 'high' ? '💡'
    : diagramInterpretation?.confidence === 'medium' ? '🤔' : '❓';

  return (
    <div data-testid="blueprint-viewer" style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: isFullscreen ? '#fff' : 'var(--col-background-ui-10, #fafafa)',
      ...(isFullscreen ? { position: 'fixed', inset: 0, zIndex: 200 } : {}),
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 24px',
        borderBottom: '1px solid var(--col-border-illustrative, #e5e5e5)',
        background: '#fff',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
      }}>
        <span style={{ fontWeight: 600, fontSize: 16, fontFamily: F, color: 'var(--col-text-primary)' }}>
          Blueprint Diagram
        </span>
        {diagramType && (
          <span style={{
            padding: '4px 12px', backgroundColor: 'rgba(230, 0, 0, 0.08)', color: '#E60000',
            borderRadius: 4, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const,
            letterSpacing: '0.05em', border: '1px solid rgba(230, 0, 0, 0.15)', fontFamily: F,
          }}>
            {diagramType}
          </span>
        )}

        {/* D6: Draft/Finalized badge */}
        {isDraft ? (
          <button onClick={finalize} style={{
            padding: '3px 10px', borderRadius: 4, border: '1px solid #fde68a',
            background: '#fffbeb', color: '#92400e', fontSize: 10, fontWeight: 500,
            fontFamily: F, cursor: 'pointer',
          }}>
            📝 Draft
          </button>
        ) : (
          <span style={{
            padding: '3px 10px', borderRadius: 4, border: '1px solid #bbf7d0',
            background: '#f0fdf4', color: '#166534', fontSize: 10, fontWeight: 500, fontFamily: F,
          }}>
            ✅ Final
          </span>
        )}

        <span style={{ flex: 1 }} />

        {/* D5: Use This Diagram button */}
        <button
          onClick={handleEmbedDiagram}
          data-testid="embed-diagram-btn"
          style={{
            padding: '6px 14px', borderRadius: 6, border: 'none',
            background: '#E60000', color: '#fff', fontSize: 11, fontWeight: 500,
            fontFamily: F, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <ArrowRight size={12} /> Use This Diagram
        </button>
      </div>

      {/* Version history pills */}
      {versions.length > 1 && (
        <div style={{
          padding: '8px 24px',
          borderBottom: '1px solid var(--col-border-illustrative, #e5e5e5)',
          background: '#FAFAFA', display: 'flex', alignItems: 'center', gap: 6,
          flexShrink: 0, overflowX: 'auto',
        }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--col-text-subtle)', marginRight: 4, fontFamily: F }}>
            History:
          </span>
          {versions.map((v, i) => (
            <button
              key={i}
              onClick={() => revertToVersion(i)}
              title={`${v.label || 'v' + (i + 1)} — ${new Date(v.timestamp).toLocaleTimeString()}`}
              data-testid={`version-pill-${i}`}
              style={{
                padding: '3px 10px', borderRadius: 12,
                border: i === activeVersionIndex ? '2px solid #E60000' : '1px solid var(--col-border-illustrative, #e0e0e0)',
                background: i === activeVersionIndex ? 'rgba(230, 0, 0, 0.06)' : '#fff',
                color: i === activeVersionIndex ? '#E60000' : 'var(--col-text-subtle)',
                fontSize: 11, fontWeight: i === activeVersionIndex ? 600 : 400,
                fontFamily: F, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              v{i + 1}{v.label ? ` · ${v.label}` : ''}
            </button>
          ))}
        </div>
      )}

      {/* Diagram */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <div style={{ padding: 24 }}>
          <DiagramRenderer />
        </div>
        <DiagramControls />
      </div>

      {/* D2: Confirmation card (when interpreting/confirming/refining) */}
      {diagramRefineState === 'interpreting' && (
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--col-border-illustrative)', background: '#fff', textAlign: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--col-text-subtle)', fontFamily: F, fontStyle: 'italic' }}>
            Understanding your feedback...
          </span>
        </div>
      )}

      {diagramRefineState === 'confirming' && diagramInterpretation && (
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--col-border-illustrative)', background: '#fff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>{confidenceEmoji}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--col-text-primary)', fontFamily: F }}>
              Planned changes:
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--col-text-primary)', fontFamily: F, fontWeight: 300, marginBottom: 12, lineHeight: 1.6 }}>
            {diagramInterpretation.interpretation}
          </div>
          <ul style={{ margin: '0 0 12px 16px', padding: 0, fontSize: 12, color: 'var(--col-text-subtle)', fontFamily: F, fontWeight: 300 }}>
            {diagramInterpretation.changeItems.map((item, i) => (
              <li key={i} style={{ marginBottom: 3 }}>{item}</li>
            ))}
          </ul>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleConfirmApply} style={{
              padding: '7px 16px', borderRadius: 6, border: 'none', background: '#E60000', color: '#fff',
              fontSize: 12, fontWeight: 500, fontFamily: F, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <CheckCircle size={14} /> Yes, apply
            </button>
            <button onClick={clearRefinement} style={{
              padding: '7px 16px', borderRadius: 6, border: '1px solid var(--col-border-illustrative)',
              background: '#fff', color: 'var(--col-text-subtle)', fontSize: 12, fontWeight: 400,
              fontFamily: F, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <XCircle size={14} /> Not quite
            </button>
            <button onClick={() => {
              setDiagramFeedback(diagramInterpretation.interpretation);
              clearRefinement();
            }} style={{
              padding: '7px 16px', borderRadius: 6, border: '1px solid var(--col-border-illustrative)',
              background: '#fff', color: 'var(--col-text-subtle)', fontSize: 12, fontWeight: 400,
              fontFamily: F, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <PencilSimple size={14} /> Let me clarify
            </button>
          </div>
        </div>
      )}

      {diagramRefineState === 'refining' && (
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--col-border-illustrative)', background: '#fff', textAlign: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--col-text-subtle)', fontFamily: F, fontStyle: 'italic' }}>
            Applying changes to diagram...
          </span>
        </div>
      )}

      {/* D4: Chat input (only when idle) */}
      {diagramRefineState === 'idle' && (
        <div style={{
          padding: '12px 24px', borderTop: '1px solid var(--col-border-illustrative)', background: '#fff',
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <input
            type="text"
            data-testid="diagram-feedback-input"
            value={diagramFeedback}
            onChange={(e) => setDiagramFeedback(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleFeedbackSubmit(); } }}
            placeholder="What would you like to change? e.g. 'Add a Redis cache between API and Database'"
            style={{
              flex: 1, padding: '9px 14px', borderRadius: 6,
              border: '1px solid var(--col-border-illustrative)', fontSize: 12,
              fontFamily: F, fontWeight: 300, outline: 'none',
            }}
          />
          <button
            onClick={handleFeedbackSubmit}
            disabled={!diagramFeedback.trim()}
            style={{
              padding: '9px 16px', borderRadius: 6, border: 'none',
              background: diagramFeedback.trim() ? '#E60000' : '#e5e7eb',
              color: diagramFeedback.trim() ? '#fff' : 'var(--col-text-subtle)',
              fontSize: 12, fontWeight: 500, fontFamily: F,
              cursor: diagramFeedback.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Send
          </button>
        </div>
      )}

      {/* Hint text */}
      {diagramRefineState === 'idle' && (
        <div style={{ padding: '0 24px 8px', fontSize: 10, color: 'var(--col-text-subtle)', fontFamily: F, opacity: 0.6 }}>
          ⏎ Enter to submit · Or use quick actions in the toolbar above
        </div>
      )}
    </div>
  );
}
