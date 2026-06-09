/**
 * AnalysisProgress — live status banner for runAnalysis (B-24).
 *
 * One of three render modes:
 *   - idle      → nothing (returns null)
 *   - running   → bar + "Analyzed N of M epics · current: <title>" + Cancel
 *   - finished  → success/partial-failure summary with dismissable banner
 *
 * Pure presentational. Caller plumbs `progress`, `totalEpics`, and the
 * optional `failures` list from the brpStore. The store's `runAnalysis`
 * is already wired to update progress (B-15) and to forward per-epic
 * failures via the onError callback.
 *
 * Accessibility:
 *   - role=status + aria-live="polite" so screen readers announce the
 *     running progress without interrupting other speech.
 *   - role=alert on the failure summary so partial failures are announced
 *     when they appear.
 */

import { useMemo } from 'react';
import { CheckCircle, Warning, X } from '@phosphor-icons/react';
import { color, font, fontSize, fontWeight, radius } from '@/theme/tokens';

export interface AnalysisFailure {
  epicId: string;
  message: string;
}

export interface AnalysisProgressProps {
  /** Number of epics analyzed so far. */
  completed: number;
  /** Total epics in the run. When 0, the component renders nothing. */
  total: number;
  /** Title of the epic currently being analyzed (for the "current: …" line). */
  currentEpicTitle?: string | null;
  /** Per-epic failures collected during the run. Empty = full success. */
  failures?: AnalysisFailure[];
  /** True while analysis is actively running. */
  running: boolean;
  /** Caller-controlled dismiss for the finished banner. */
  onDismiss?: () => void;
  /** Optional cancel handler shown while running. */
  onCancel?: () => void;
}

export function AnalysisProgress({
  completed,
  total,
  currentEpicTitle,
  failures = [],
  running,
  onDismiss,
  onCancel,
}: AnalysisProgressProps) {
  const pct = useMemo(
    () => (total === 0 ? 0 : Math.round((completed / total) * 100)),
    [completed, total],
  );

  if (total === 0 && !running) return null;
  // Idle (haven't started) — nothing to show.
  if (!running && completed === 0 && failures.length === 0) return null;

  if (running) {
    return (
      <div
        data-testid="analysis-progress-running"
        role="status"
        aria-live="polite"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: '12px 16px',
          background: color.neutral50,
          border: `1px solid ${color.neutral200}`,
          borderRadius: radius.sm,
          fontFamily: font.sans,
          fontSize: fontSize.sm,
          color: color.grayV,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <span data-testid="analysis-progress-label">
            Analyzing <strong data-testid="analysis-progress-completed">{completed}</strong>{' '}
            of <strong data-testid="analysis-progress-total">{total}</strong> epics
            {currentEpicTitle ? (
              <>
                {' '}— current:{' '}
                <em
                  data-testid="analysis-progress-current"
                  style={{ fontStyle: 'normal', color: color.black }}
                >
                  {currentEpicTitle}
                </em>
              </>
            ) : null}
          </span>
          {onCancel ? (
            <button
              type="button"
              data-testid="analysis-progress-cancel"
              onClick={onCancel}
              style={{
                background: 'transparent',
                border: `1px solid ${color.neutral200}`,
                color: color.grayV,
                padding: '4px 10px',
                borderRadius: radius.sm,
                fontSize: fontSize.xs,
                fontWeight: fontWeight.medium,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          ) : null}
        </div>
        <div
          data-testid="analysis-progress-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={completed}
          style={{
            width: '100%',
            height: 6,
            background: color.neutral200,
            borderRadius: radius.full,
            overflow: 'hidden',
          }}
        >
          <div
            data-testid="analysis-progress-fill"
            style={{
              width: `${pct}%`,
              height: '100%',
              background: color.red,
              transition: 'width 200ms ease',
            }}
          />
        </div>
      </div>
    );
  }

  // Finished — success or partial-failure.
  const hasFailures = failures.length > 0;
  return (
    <div
      data-testid={hasFailures ? 'analysis-progress-partial' : 'analysis-progress-success'}
      role={hasFailures ? 'alert' : 'status'}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '12px 16px',
        background: hasFailures ? color.pastelI : color.pastelII,
        border: `1px solid ${hasFailures ? color.bordeauxI : color.grayI}`,
        borderRadius: radius.sm,
        fontFamily: font.sans,
        fontSize: fontSize.sm,
        color: hasFailures ? color.red : color.grayV,
      }}
    >
      {hasFailures ? (
        <Warning size={16} weight="fill" aria-hidden="true" />
      ) : (
        <CheckCircle size={16} weight="fill" aria-hidden="true" />
      )}
      <div style={{ flex: 1 }}>
        <div data-testid="analysis-progress-summary">
          {hasFailures
            ? `Analyzed ${completed - failures.length} of ${total} epics — ${failures.length} failed.`
            : `Analyzed all ${total} epics successfully.`}
        </div>
        {hasFailures ? (
          <ul
            data-testid="analysis-progress-failures"
            style={{ margin: '6px 0 0 18px', padding: 0, color: color.grayV }}
          >
            {failures.map((f) => (
              <li
                key={f.epicId}
                data-testid={`analysis-progress-failure-${f.epicId}`}
                style={{ fontSize: fontSize.xs, marginTop: 2 }}
              >
                <code style={{ fontFamily: font.mono }}>{f.epicId}</code> · {f.message}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          data-testid="analysis-progress-dismiss"
          aria-label="Dismiss analysis summary"
          onClick={onDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: color.grayIII,
            padding: 2,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={14} weight="bold" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
