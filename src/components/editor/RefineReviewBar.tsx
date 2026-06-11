/**
 * RefineReviewBar — appears after the AI pipeline rewrites the epic.
 *
 * Gives the user explicit control over the AI's output instead of a silent
 * overwrite: view a line diff, keep the changes, or revert to the pre-refine
 * content. Backed by epicStore.reviewBaseline (set by applyRefinedEpic).
 */

import { Sparkle, ArrowCounterClockwise, Check, Eye } from '@phosphor-icons/react';
import { useEpicStore } from '@/stores/epicStore';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useUiStore } from '@/stores/uiStore';
import { diffLines, diffStats } from '@/domain/lineDiff';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function RefineReviewBar() {
  const reviewBaseline = useEpicStore((s) => s.reviewBaseline);
  const markdown = useEpicStore((s) => s.markdown);
  const acceptRefine = useEpicStore((s) => s.acceptRefine);
  const revertRefine = useEpicStore((s) => s.revertRefine);
  const isRunning = usePipelineStore((s) => s.isRunning);
  const qualityScore = useEpicStore((s) => s.document?.metadata?.qualityScore ?? null);
  const openModal = useUiStore((s) => s.openModal);
  const addToast = useUiStore((s) => s.addToast);

  if (reviewBaseline === null || isRunning) return null;

  const { added, removed } = diffStats(diffLines(reviewBaseline, markdown));

  const handleKeep = () => {
    acceptRefine();
    addToast({ type: 'success', title: 'Refined content kept' });
  };
  const handleRevert = () => {
    revertRefine();
    addToast({ type: 'info', title: 'Reverted to your pre-refine content' });
  };

  return (
    <div
      data-testid="refine-review-bar"
      role="region"
      aria-label="Review AI refine result"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 24px',
        background: '#F5F0E1',
        borderBottom: '1px solid var(--col-border-illustrative)',
        fontFamily: F,
        flexShrink: 0,
      }}
    >
      <Sparkle size={14} weight="fill" color="var(--col-background-brand)" />
      <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--col-text-primary)' }}>
        AI refine applied
        {qualityScore !== null && <> — score <strong>{qualityScore.toFixed(1)}/10</strong></>}
        <span style={{ color: 'var(--col-text-subtle)', marginLeft: 8 }}>
          +{added} / −{removed} lines
        </span>
      </span>
      <span style={{ flex: 1 }} />
      <button
        data-testid="refine-review-view-btn"
        onClick={() => openModal('refineReview')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 12px', border: '1px solid var(--col-border-illustrative)',
          borderRadius: '0.375rem', background: 'var(--col-background-ui-10)',
          color: 'var(--col-text-primary)', fontSize: 12, fontWeight: 400,
          cursor: 'pointer', fontFamily: F,
        }}
      >
        <Eye size={12} weight="regular" /> View changes
      </button>
      <button
        data-testid="refine-review-revert-btn"
        onClick={handleRevert}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 12px', border: '1px solid var(--col-border-illustrative)',
          borderRadius: '0.375rem', background: 'var(--col-background-ui-10)',
          color: 'var(--col-text-primary)', fontSize: 12, fontWeight: 400,
          cursor: 'pointer', fontFamily: F,
        }}
      >
        <ArrowCounterClockwise size={12} weight="regular" /> Revert
      </button>
      <button
        data-testid="refine-review-keep-btn"
        onClick={handleKeep}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 14px', border: 'none',
          borderRadius: '0.375rem', background: 'var(--col-background-brand)',
          color: '#ffffff', fontSize: 12, fontWeight: 500,
          cursor: 'pointer', fontFamily: F,
        }}
      >
        <Check size={12} weight="bold" /> Keep changes
      </button>
    </div>
  );
}
