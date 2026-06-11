/**
 * Issue Refinery — Comprehension display card (R-11, restyled to Figma 2:17).
 *
 * Two intent columns (epic / issue) above three colour-coded finding groups
 * (Gaps · amber, Ambiguities · purple, Alignment notes · green), each item
 * rendered as a tinted chip. Reads from `issueRefineryStore.comprehension`;
 * returns null when absent so the parent view doesn't have to gate.
 */

import React from 'react';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';

type GroupKind = 'gaps' | 'ambiguities' | 'alignment';

export const ComprehensionCard: React.FC = () => {
  const comprehension = useIssueRefineryStore((s) => s.comprehension);
  if (comprehension === null) return null;

  const { epicIntent, issueIntent, gaps, ambiguities, alignmentNotes } = comprehension;

  return (
    <section className="ir-card ir-comprehension-card" data-testid="comprehension-card">
      <header className="ir-card__header">
        <h3 className="ir-card__title">Comprehension</h3>
      </header>

      <div className="ir-comprehension-card__intents">
        <dl className="ir-comprehension-card__intent">
          <dt>Epic intent</dt>
          <dd>{epicIntent}</dd>
        </dl>
        <dl className="ir-comprehension-card__intent">
          <dt>Issue intent</dt>
          <dd>{issueIntent}</dd>
        </dl>
      </div>

      <FindingGroup kind="gaps" label="Gaps" items={gaps} emptyMessage="No gaps identified." />
      <FindingGroup kind="ambiguities" label="Ambiguities" items={ambiguities} emptyMessage="No ambiguities identified." />
      <FindingGroup kind="alignment" label="Alignment notes" items={alignmentNotes} emptyMessage="No alignment notes." />
    </section>
  );
};

interface FindingGroupProps {
  kind: GroupKind;
  label: string;
  items: string[];
  emptyMessage: string;
}

const FindingGroup: React.FC<FindingGroupProps> = ({ kind, label, items, emptyMessage }) => (
  <div className={`ir-comprehension-card__group ir-group--${kind}`} data-testid={`comprehension-${kind}`}>
    <div className="ir-group-head">
      <span className="ir-dot" aria-hidden="true" />
      <span className="ir-group-head__label">{label}</span>
      {items.length > 0 && <span className="ir-group-head__count">· {items.length}</span>}
    </div>
    {items.length === 0 ? (
      <p className="ir-comprehension-card__empty">{emptyMessage}</p>
    ) : (
      <ul className="ir-comprehension-card__items">
        {items.map((text, i) => (
          <li key={i} className="ir-chip">{text}</li>
        ))}
      </ul>
    )}
  </div>
);
