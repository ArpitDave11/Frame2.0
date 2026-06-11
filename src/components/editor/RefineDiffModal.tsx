/**
 * RefineDiffModal — unified line diff of the epic before vs. after refine.
 *
 * Read-only review surface; Keep / Revert actions live in RefineReviewBar
 * and are mirrored here for convenience.
 */

import { useMemo } from 'react';
import { useEpicStore } from '@/stores/epicStore';
import { useUiStore } from '@/stores/uiStore';
import { diffLines, diffStats } from '@/domain/lineDiff';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace";

export function RefineDiffModal() {
  const reviewBaseline = useEpicStore((s) => s.reviewBaseline);
  const markdown = useEpicStore((s) => s.markdown);
  const acceptRefine = useEpicStore((s) => s.acceptRefine);
  const revertRefine = useEpicStore((s) => s.revertRefine);
  const closeModal = useUiStore((s) => s.closeModal);
  const addToast = useUiStore((s) => s.addToast);

  const lines = useMemo(
    () => diffLines(reviewBaseline ?? '', markdown),
    [reviewBaseline, markdown],
  );
  const { added, removed } = diffStats(lines);

  if (reviewBaseline === null) {
    return (
      <div style={{ fontFamily: F, fontSize: 13, color: 'var(--col-text-subtle)' }}>
        No refine result awaiting review.
      </div>
    );
  }

  return (
    <div data-testid="refine-diff-modal" style={{ fontFamily: F }}>
      <div style={{ fontSize: 12, fontWeight: 300, color: 'var(--col-text-subtle)', marginBottom: 10 }}>
        <span style={{ color: '#166534', fontWeight: 500 }}>+{added} added</span>
        {' · '}
        <span style={{ color: '#991b1b', fontWeight: 500 }}>−{removed} removed</span>
        {' — green lines are the AI’s additions, red lines were replaced.'}
      </div>

      <div
        data-testid="refine-diff-body"
        style={{
          maxHeight: '55vh',
          overflow: 'auto',
          border: '1px solid var(--col-border-illustrative)',
          borderRadius: '0.375rem',
          background: '#1a1a1a',
          padding: '10px 0',
        }}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 10,
              padding: '0 14px',
              fontFamily: MONO,
              fontSize: 12,
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              background:
                line.type === 'added'
                  ? 'rgba(34,197,94,0.12)'
                  : line.type === 'removed'
                    ? 'rgba(230,0,0,0.12)'
                    : 'transparent',
              color:
                line.type === 'added' ? '#86efac' : line.type === 'removed' ? '#fca5a5' : '#9a9a9a',
            }}
          >
            <span aria-hidden style={{ width: 12, flexShrink: 0, userSelect: 'none' }}>
              {line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' '}
            </span>
            <span>{line.text || ' '}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
        <button
          data-testid="refine-diff-revert-btn"
          onClick={() => {
            revertRefine();
            addToast({ type: 'info', title: 'Reverted to your pre-refine content' });
            closeModal();
          }}
          style={{
            padding: '7px 16px', border: '1px solid var(--col-border-illustrative)',
            borderRadius: '0.375rem', background: 'var(--col-background-ui-10)',
            color: 'var(--col-text-primary)', fontSize: 13, fontWeight: 400,
            cursor: 'pointer', fontFamily: F,
          }}
        >
          Revert to my version
        </button>
        <button
          data-testid="refine-diff-keep-btn"
          onClick={() => {
            acceptRefine();
            addToast({ type: 'success', title: 'Refined content kept' });
            closeModal();
          }}
          style={{
            padding: '7px 18px', border: 'none',
            borderRadius: '0.375rem', background: 'var(--col-background-brand)',
            color: '#ffffff', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', fontFamily: F,
          }}
        >
          Keep changes
        </button>
      </div>
    </div>
  );
}
