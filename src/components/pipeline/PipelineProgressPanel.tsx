/**
 * PipelineProgressPanel — T-8.1.
 *
 * Read-only display of the 6-stage pipeline progress.
 * Reads from pipelineStore. Shows stage indicators, progress bar,
 * and iteration counter.
 */

import { Check, X } from '@phosphor-icons/react';
import { usePipelineStore } from '@/stores/pipelineStore';
import type { StageStatus } from '@/stores/pipelineStore';

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

// ─── Component ─────────────────────────────────────────────

export function PipelineProgressPanel() {
  const stages = usePipelineStore((s) => s.stages);
  const isRunning = usePipelineStore((s) => s.isRunning);
  const error = usePipelineStore((s) => s.error);
  const currentIteration = usePipelineStore((s) => s.currentIteration);
  const maxIterations = usePipelineStore((s) => s.maxIterations);

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
            <div>
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
          </div>
        );
      })}

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
          justifyContent: 'space-between',
          marginTop: 8,
          fontSize: 10,
          color: 'var(--col-text-subtle)',
          fontWeight: 300,
          fontFamily: F,
        }}
      >
        <span data-testid="iteration-counter">
          Iteration {currentIteration}/{maxIterations}
        </span>
        <span data-testid="pipeline-status-text">{statusText}</span>
      </div>
    </div>
  );
}
