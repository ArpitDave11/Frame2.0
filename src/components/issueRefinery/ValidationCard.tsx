/**
 * Issue Refinery — Validation display card (R-11).
 *
 * Color-coded score badge + findings list, advisory only (per locked
 * decision D6 the UI never gates Publish on the score). Reads directly
 * from `issueRefineryStore.validation`.
 */

import React from 'react';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';

type Severity = 'critical' | 'important' | 'nit' | 'unknown';

function parseFindingSeverity(s: string): Severity {
  if (/^\s*\[critical\]/i.test(s)) return 'critical';
  if (/^\s*\[important\]/i.test(s)) return 'important';
  if (/^\s*\[nit\]/i.test(s)) return 'nit';
  return 'unknown';
}

function scoreTier(score: number): 'good' | 'warn' | 'poor' {
  if (score >= 80) return 'good';
  if (score >= 60) return 'warn';
  return 'poor';
}

export const ValidationCard: React.FC = () => {
  const validation = useIssueRefineryStore((s) => s.validation);
  if (validation === null) return null;

  const tier = scoreTier(validation.score);
  const tierLabel = tier === 'good' ? 'Good' : tier === 'warn' ? 'Fair' : 'Poor';

  return (
    <section className="ir-card ir-validation-card" data-testid="validation-card">
      <header className="ir-card__header">
        <h3 className="ir-card__title">Validation</h3>
        <span className="ir-card__subtitle">advisory only</span>
      </header>

      <div className="ir-validation-card__row">
        <div
          className={`ir-validation-card__score ir-validation-card__score--${tier}`}
          data-testid="validation-score"
          data-tier={tier}
          aria-label={`${tierLabel} quality, score ${validation.score} out of 100`}
        >
          <span className="ir-validation-card__score-tier">{tierLabel}</span>
          <span className="ir-validation-card__score-num">{validation.score}</span>
          <span className="ir-validation-card__score-suffix">/100</span>
        </div>

        <div className="ir-validation-card__findings">
          {validation.findings.length === 0 ? (
            <p className="ir-validation-card__empty">No findings — looks clean.</p>
          ) : (
            <ul className="ir-validation-card__findings-list">
              {validation.findings.map((f, i) => {
                const sev = parseFindingSeverity(f);
                return (
                  <li
                    key={i}
                    className={`ir-validation-card__finding ir-validation-card__finding--${sev}`}
                    data-severity={sev}
                    data-testid={`validation-finding-${i}`}
                  >
                    {f}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};
