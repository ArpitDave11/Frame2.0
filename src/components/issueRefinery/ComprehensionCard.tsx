/**
 * Issue Refinery — Comprehension display card (R-11).
 *
 * Renders the output of the Comprehension stage: epicIntent, issueIntent,
 * and three lists (gaps, ambiguities, alignmentNotes). Reads directly from
 * `issueRefineryStore.comprehension`; returns null when the field is null
 * so the parent view doesn't have to gate.
 */

import React from 'react';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';

export const ComprehensionCard: React.FC = () => {
  const comprehension = useIssueRefineryStore((s) => s.comprehension);
  if (comprehension === null) return null;

  const { epicIntent, issueIntent, gaps, ambiguities, alignmentNotes } = comprehension;

  return (
    <section className="ir-card ir-comprehension-card" data-testid="comprehension-card">
      <header className="ir-card__header">
        <h3 className="ir-card__title">Comprehension</h3>
      </header>

      <dl className="ir-comprehension-card__intents">
        <dt>Epic intent</dt>
        <dd>{epicIntent}</dd>
        <dt>Issue intent</dt>
        <dd>{issueIntent}</dd>
      </dl>

      <FindingList label="Gaps" items={gaps} testIdSuffix="gaps" emptyMessage="No gaps identified." />
      <FindingList
        label="Ambiguities"
        items={ambiguities}
        testIdSuffix="ambiguities"
        emptyMessage="No ambiguities identified."
      />
      <FindingList
        label="Alignment notes"
        items={alignmentNotes}
        testIdSuffix="alignment"
        emptyMessage="No alignment notes."
      />
    </section>
  );
};

interface FindingListProps {
  label: string;
  items: string[];
  testIdSuffix: string;
  emptyMessage: string;
}

const FindingList: React.FC<FindingListProps> = ({ label, items, testIdSuffix, emptyMessage }) => (
  <div className="ir-comprehension-card__group" data-testid={`comprehension-${testIdSuffix}`}>
    <h4 className="ir-comprehension-card__group-title">{label}</h4>
    {items.length === 0 ? (
      <p className="ir-comprehension-card__empty">{emptyMessage}</p>
    ) : (
      <ul className="ir-comprehension-card__items">
        {items.map((text, i) => (
          <li key={i}>{text}</li>
        ))}
      </ul>
    )}
  </div>
);
