/**
 * PipelineProgressPanel — T-8.1.
 *
 * Read-only display of the 6-stage pipeline progress.
 * Reads from pipelineStore. Shows stage indicators, progress bar,
 * and iteration counter.
 */

import { useEffect, useState } from 'react';
import { Check, X, Warning } from '@phosphor-icons/react';
import { usePipelineStore } from '@/stores/pipelineStore';
import type { StageStatus } from '@/stores/pipelineStore';
import { useUiStore } from '@/stores/uiStore';
import { cancelRefinePipeline } from '@/pipeline/refinePipelineAction';

// ─── Stage Definitions ─────────────────────────────────────

const STAGES = [
  { name: 'Comprehension', sub: 'Building mental model' },
  { name: 'Classification', sub: 'Detecting document type' },
  { name: 'Structural', sub: 'Assessing structure' },
  { name: 'Refinement', sub: 'Rewriting sections' },
  { name: 'Mandatory', sub: 'Diagram + stories' },
  { name: 'Validation', sub: 'Quality gate' },
] as const;

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

// ─── Indicator Styles ──────────────────────────────────────

function getIndicatorStyle(status: StageStatus): React.CSSProperties {
  switch (status) {
    case 'running':
      return {
        background: 'var(--col-background-brand)',
        color: '#ffffff',
        animation: 'ubsPulse 1.5s ease infinite',
      };
    case 'complete':
      return {
        background: '#dcfce7',
        color: '#166534',
      };
    case 'error':
      return {
        background: '#fef2f2',
        color: '#991b1b',
      };
    default:
      return {
        background: 'var(--input-background)',
        color: 'var(--col-text-subtle)',
      };
  }
}

// ─── Elapsed Formatting ────────────────────────────────────

function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}

// ─── Component ─────────────────────────────────────────────

export function PipelineProgressPanel() {
  const stages = usePipelineStore((s) => s.stages);
  const isRunning = usePipelineStore((s) => s.isRunning);
  const error = usePipelineStore((s) => s.error);
  const currentIteration = usePipelineStore((s) => s.currentIteration);
  const maxIterations = usePipelineStore((s) => s.maxIterations);
  const runStartedAt = usePipelineStore((s) => s.runStartedAt);
  const statusNote = usePipelineStore((s) => s.statusNote);
  const openModal = useUiStore((s) => s.openModal);
  const closeModal = useUiStore((s) => s.closeModal);

  // 1s tick re-renders the elapsed timers while the pipeline runs
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [isRunning]);

  const now = Date.now();

  // Count completed stages for progress bar
  const completedStages = Object.values(stages).filter(
    (s) => s.status === 'complete',
  ).length;

  // Determine status text
  const statusText = error
    ? 'Error'
    : isRunning
      ? 'Processing...'
      : completedStages === 6
        ? 'Complete'
        : 'Idle';

  return (
    <div data-testid="pipeline-progress-panel" style={{ fontFamily: F }}>
      {/* Inline keyframes for pulse animation */}
      <style>{`@keyframes ubsPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }`}</style>

      {/* Stage rows */}
      {STAGES.map((stage, index) => {
        const stageNum = (index + 1) as 1 | 2 | 3 | 4 | 5 | 6;
        const entry = stages[stageNum];
        const status = entry.status;
        const indicatorStyle = getIndicatorStyle(status);

        const elapsed =
          entry.startedAt != null
            ? formatElapsed((entry.finishedAt ?? now) - entry.startedAt)
            : null;

        return (
          <div
            key={stage.name}
            data-testid={`stage-row-${stageNum}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '10px 0',
            }}
          >
            {/* Circle indicator */}
            <div
              data-testid={`stage-indicator-${stageNum}`}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 500,
                flexShrink: 0,
                transition: 'all .3s',
                ...indicatorStyle,
              }}
            >
              {status === 'complete' ? (
                <Check size={13} weight="bold" color="#166534" />
              ) : status === 'error' ? (
                <X size={13} weight="bold" color="#991b1b" />
              ) : (
                stageNum
              )}
            </div>

            {/* Stage text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                data-testid={`stage-name-${stageNum}`}
                style={{
                  fontSize: 13,
                  fontWeight: status === 'running' || status === 'complete' ? 400 : 300,
                  color:
                    status === 'running' || status === 'complete'
                      ? 'var(--col-text-primary)'
                      : 'var(--col-text-subtle)',
                }}
              >
                {stage.name}
              </div>
              {status === 'running' && (
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--col-text-subtle)',
                    fontWeight: 300,
                    marginTop: 2,
                  }}
                >
                  {stage.sub}
                </div>
              )}
            </div>

            {/* Per-stage elapsed (latest pass) */}
            {elapsed && status !== 'pending' && (
              <span
                data-testid={`stage-elapsed-${stageNum}`}
                style={{
                  fontSize: 10,
                  fontWeight: 300,
                  color: 'var(--col-text-subtle)',
                  fontVariantNumeric: 'tabular-nums',
                  flexShrink: 0,
                }}
              >
                {elapsed}
              </span>
            )}
          </div>
        );
      })}

      {/* Quality-gate loop explanation */}
      {statusNote && !error && (
        <div
          data-testid="pipeline-status-note"
          role="status"
          style={{
            marginTop: 12,
            padding: '8px 12px',
            borderRadius: '0.375rem',
            borderLeft: '3px solid #f59e0b',
            background: '#fffbeb',
            fontSize: 12,
            fontWeight: 400,
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Warning size={14} weight="fill" color="#f59e0b" />
          {statusNote}
        </div>
      )}

      {/* Persistent error panel — actionable, never silent */}
      {error && (
        <div
          data-testid="pipeline-error-panel"
          role="alert"
          style={{
            marginTop: 12,
            padding: '12px 14px',
            borderRadius: '0.375rem',
            borderLeft: '3px solid #E60000',
            background: '#fef2f2',
            fontSize: 12,
            fontWeight: 400,
            color: '#991b1b',
          }}
        >
          <div style={{ marginBottom: 10, lineHeight: 1.5 }}>{error}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              data-testid="pipeline-error-settings-btn"
              onClick={() => openModal('settings')}
              style={{
                padding: '5px 12px',
                border: '1px solid #E60000',
                borderRadius: '0.375rem',
                background: 'transparent',
                color: '#E60000',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: F,
              }}
            >
              Open Settings
            </button>
            <button
              data-testid="pipeline-error-close-btn"
              onClick={closeModal}
              style={{
                padding: '5px 12px',
                border: '1px solid var(--col-border-illustrative)',
                borderRadius: '0.375rem',
                background: 'transparent',
                color: 'var(--col-text-primary)',
                fontSize: 12,
                fontWeight: 400,
                cursor: 'pointer',
                fontFamily: F,
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div
        data-testid="pipeline-progress-bar"
        style={{
          marginTop: 16,
          height: 3,
          background: 'var(--muted, #e5e7eb)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${(completedStages / 6) * 100}%`,
            height: '100%',
            background: 'var(--col-background-brand)',
            transition: 'width .5s ease',
          }}
        />
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginTop: 8,
          fontSize: 10,
          color: 'var(--col-text-subtle)',
          fontWeight: 300,
          fontFamily: F,
        }}
      >
        <span data-testid="iteration-counter">
          Iteration {Math.max(1, currentIteration || 1)}/{maxIterations}
        </span>
        {runStartedAt != null && (
          <span data-testid="pipeline-total-elapsed" style={{ fontVariantNumeric: 'tabular-nums' }}>
            Elapsed {formatElapsed(now - runStartedAt)}
          </span>
        )}
        <span style={{ flex: 1 }} />
        <span data-testid="pipeline-status-text">{statusText}</span>
        {isRunning && (
          <button
            data-testid="pipeline-cancel-btn"
            onClick={cancelRefinePipeline}
            style={{
              padding: '4px 12px',
              border: '1px solid var(--col-border-illustrative)',
              borderRadius: '0.375rem',
              background: 'var(--col-background-ui-10)',
              color: 'var(--col-text-primary)',
              fontSize: 11,
              fontWeight: 400,
              cursor: 'pointer',
              fontFamily: F,
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
