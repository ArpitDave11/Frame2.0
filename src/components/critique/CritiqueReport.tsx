/**
 * CritiqueReport — T-9.1.
 *
 * Full quality report modal content. Reads ValidationOutput from
 * pipelineStore.lastValidation and renders:
 * - Ring gauge (overall score)
 * - Audit checks grid
 * - Detected failures (severity-colored)
 * - Traceability summary
 * - Feedback list
 */

import { useState, useEffect } from 'react';
import { usePipelineStore } from '@/stores/pipelineStore';
import type { ValidationOutput } from '@/pipeline/pipelineTypes';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

// ─── Ring Gauge (adapted from AnalyticsPanel) ────────────────

function ScoreRing({ score, size = 140 }: { score: number; size?: number }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = animatedScore / 100;
  const strokeDashoffset = circumference * (1 - pct);

  const color = score >= 70 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  const bgRing =
    score >= 70
      ? 'rgba(34,197,94,0.10)'
      : score >= 50
        ? 'rgba(245,158,11,0.10)'
        : 'rgba(239,68,68,0.10)';

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 200);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div data-testid="score-ring" style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgRing}
          strokeWidth={10}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span data-testid="score-value" style={{ fontSize: 28, fontWeight: 500, fontFamily: F, color }}>
          {score}
        </span>
        <span style={{ fontSize: 11, fontWeight: 300, color: 'var(--col-text-subtle, #666)', fontFamily: F }}>
          /100
        </span>
      </div>
    </div>
  );
}

// ─── Severity helpers ────────────────────────────────────────

const SEVERITY_STYLES: Record<string, { bg: string; border: string; color: string }> = {
  critical: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', color: '#dc2626' },
  major: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', color: '#d97706' },
  minor: { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)', color: '#2563eb' },
};

const COVERAGE_STYLES: Record<string, { bg: string; color: string }> = {
  full: { bg: 'rgba(34,197,94,0.12)', color: '#16a34a' },
  partial: { bg: 'rgba(245,158,11,0.12)', color: '#d97706' },
  missing: { bg: 'rgba(239,68,68,0.12)', color: '#dc2626' },
};

// ─── Main Component ──────────────────────────────────────────

export function CritiqueReport() {
  const lastValidation = usePipelineStore((s) => s.lastValidation);

  if (!lastValidation) {
    return (
      <div
        data-testid="critique-empty"
        style={{
          padding: '40px 24px',
          textAlign: 'center',
          fontFamily: F,
          fontSize: 13,
          fontWeight: 300,
          color: 'var(--col-text-subtle, #666)',
        }}
      >
        No quality report available. Run Refine to generate one.
      </div>
    );
  }

  const v: ValidationOutput = lastValidation;
  const coveredCount = v.traceabilityMatrix.filter((r) => r.coverage === 'full').length;
  const partialCount = v.traceabilityMatrix.filter((r) => r.coverage === 'partial').length;
  const missingCount = v.traceabilityMatrix.filter((r) => r.coverage === 'missing').length;
  const totalReqs = v.traceabilityMatrix.length;

  return (
    <div
      data-testid="critique-report"
      style={{
        fontFamily: F,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        padding: '4px 0',
        maxHeight: '70vh',
        overflow: 'auto',
      }}
    >
      {/* ── Overall Score Ring ──────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
        <ScoreRing score={v.overallScore} size={140} />
      </div>

      {/* ── Audit Checks Grid ──────────────────── */}
      {v.auditChecks.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--col-text-primary, #1a1a1a)',
              marginBottom: 10,
            }}
          >
            Audit Checks
          </div>
          <div
            data-testid="audit-checks-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
            }}
          >
            {v.auditChecks.map((check, i) => (
              <div
                key={i}
                data-testid="audit-check-item"
                style={{
                  background: 'var(--col-background-ui-10, #fff)',
                  border: '1px solid var(--col-border-illustrative, #e5e5e5)',
                  borderRadius: 8,
                  padding: '10px 12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--col-text-primary, #1a1a1a)' }}>
                    {check.checkName}
                  </span>
                  <span
                    data-testid={check.passed ? 'badge-pass' : 'badge-fail'}
                    style={{
                      fontSize: 9,
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: 99,
                      background: check.passed ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                      color: check.passed ? '#16a34a' : '#dc2626',
                    }}
                  >
                    {check.passed ? 'Pass' : 'Fail'}
                  </span>
                </div>
                {/* Score bar */}
                <div style={{ height: 3, background: '#f0f0f0', borderRadius: 2, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(check.score / 10) * 100}%`,
                      background: check.passed ? '#22c55e' : '#ef4444',
                      borderRadius: 2,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Detected Failures ──────────────────── */}
      {v.detectedFailures.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--col-text-primary, #1a1a1a)',
              marginBottom: 10,
            }}
          >
            Detected Failures
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {v.detectedFailures.map((f, i) => {
              const sev = SEVERITY_STYLES[f.severity] ?? SEVERITY_STYLES.minor!;
              return (
                <div
                  key={i}
                  data-testid="failure-card"
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: sev.bg,
                    border: `1px solid ${sev.border}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span
                      data-testid={`severity-${f.severity}`}
                      style={{
                        fontSize: 9,
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: sev.color,
                      }}
                    >
                      {f.severity}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 400,
                      color: 'var(--col-text-primary, #1a1a1a)',
                      marginBottom: 4,
                    }}
                  >
                    {f.pattern}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 300,
                      color: 'var(--col-text-subtle, #666)',
                      lineHeight: 1.45,
                    }}
                  >
                    {f.recommendation}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Traceability Summary ───────────────── */}
      {v.traceabilityMatrix.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--col-text-primary, #1a1a1a)',
              marginBottom: 10,
            }}
          >
            Traceability
          </div>
          <div
            data-testid="traceability-summary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 300, color: 'var(--col-text-subtle, #666)' }}>
              {coveredCount}/{totalReqs} requirements covered
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'Full', count: coveredCount, key: 'full' },
              { label: 'Partial', count: partialCount, key: 'partial' },
              { label: 'Missing', count: missingCount, key: 'missing' },
            ].map(({ label, count, key }) => {
              const style = COVERAGE_STYLES[key]!;
              return (
                <span
                  key={key}
                  data-testid={`coverage-${key}`}
                  style={{
                    fontSize: 11,
                    fontWeight: 400,
                    padding: '3px 10px',
                    borderRadius: 99,
                    background: style.bg,
                    color: style.color,
                    fontFamily: F,
                  }}
                >
                  {label}: {count}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Feedback ──────────────────────────── */}
      {v.feedback.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--col-text-primary, #1a1a1a)',
              marginBottom: 10,
            }}
          >
            Suggestions
          </div>
          <ul
            style={{
              margin: 0,
              padding: '0 0 0 16px',
              listStyleType: 'disc',
            }}
          >
            {v.feedback.map((fb, i) => (
              <li
                key={i}
                data-testid="feedback-item"
                style={{
                  fontSize: 12,
                  fontWeight: 300,
                  color: 'var(--col-text-primary, #1a1a1a)',
                  lineHeight: 1.6,
                  marginBottom: 4,
                }}
              >
                {fb}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
