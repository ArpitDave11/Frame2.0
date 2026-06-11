/**
 * Issue Refinery — Validation display card (R-11, restyled to Figma 3:21).
 *
 * Score tier badge (Good/Fair/Poor + N/100) beside a findings list. Each
 * finding's [critical]/[important]/[nit] prefix is rendered as a coloured
 * type pill and stripped from the body text. Advisory only — the UI never
 * gates Publish on the score (locked decision D6).
 */

import React from 'react';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';

type Severity = 'critical' | 'important' | 'nit' | 'unknown';

function parseFinding(s: string): { severity: Severity; text: string } {
  const m = s.match(/^\s*\[(critical|important|nit)\]\s*/i);
  if (m) {
    return { severity: m[1]!.toLowerCase() as Severity, text: s.slice(m[0].length) };
  }
  return { severity: 'unknown', text: s };
}

const SEV_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  important: 'Important',
  nit: 'Nit',
  unknown: 'Note',
};

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
          <span className="ir-validation-card__score-line">
            <span className="ir-validation-card__score-num">{validation.score}</span>
            <span className="ir-validation-card__score-suffix">/100</span>
          </span>
        </div>

        <div className="ir-validation-card__findings">
          {validation.findings.length === 0 ? (
            <p className="ir-validation-card__empty">No findings — looks clean.</p>
          ) : (
            <ul className="ir-validation-card__findings-list">
              {validation.findings.map((f, i) => {
                const { severity, text } = parseFinding(f);
                return (
                  <li
                    key={i}
                    className={`ir-finding ir-finding--${severity}`}
                    data-severity={severity}
                    data-testid={`validation-finding-${i}`}
                  >
                    <span className="ir-finding__type">{SEV_LABEL[severity]}</span>
                    <span className="ir-finding__text">{text}</span>
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
