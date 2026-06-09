/**
 * SummaryStrip — 6-metric portfolio header (quality remediation Task 2-1).
 *
 * The reference UI shows total capacity, human load, FRAME load, balance,
 * pods over capacity, and re-groom counts up front so the planner can
 * read the room before scrolling. The previous PortfolioView had no
 * equivalent — capacity only surfaced inside each pod card.
 *
 * Pure presentational. All numbers are passed in by the caller (which
 * derives them via computeCrewMetrics).
 */

import { color, font, fontSize, fontWeight } from '@/theme/tokens';

export interface SummaryStripProps {
  totalCapacity: number;
  humanLoad: number;
  frameLoad: number;
  balance: number;
  podsOver: number;
  totalPods: number;
  epicsToReGroom: number;
}

const labelStyle: React.CSSProperties = {
  fontSize: fontSize.xs,
  color: color.grayV,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontWeight: fontWeight.semibold,
  marginBottom: 6,
};

const valueBase: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 300,
  fontFamily: font.mono,
  lineHeight: 1,
};

const suffixStyle: React.CSSProperties = {
  fontSize: 14,
  color: color.grayV,
  marginLeft: 4,
  fontFamily: font.sans,
  fontWeight: fontWeight.normal,
};

export function SummaryStrip({
  totalCapacity,
  humanLoad,
  frameLoad,
  balance,
  podsOver,
  totalPods,
  epicsToReGroom,
}: SummaryStripProps) {
  const balancePositive = balance >= 0;
  const balanceColor = balancePositive ? color.semanticGreenText : color.red;
  const balancePrefix = balance > 0 ? '+' : '';

  return (
    <div
      data-testid="summary-strip"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 24,
        maxWidth: 900,
        fontFamily: font.sans,
      }}
    >
      <Metric label="Total capacity" testid="summary-total-capacity">
        <span style={valueBase}>{totalCapacity}</span>
        <span style={suffixStyle}>SP</span>
      </Metric>

      <Metric label="Human load" testid="summary-human-load">
        <span style={valueBase}>{humanLoad}</span>
        <span style={suffixStyle}>SP</span>
      </Metric>

      <Metric label="FRAME load" testid="summary-frame-load">
        <span style={valueBase}>{frameLoad}</span>
        <span style={suffixStyle}>SP</span>
      </Metric>

      <Metric label="Balance" testid="summary-balance">
        <span
          data-testid="summary-balance-value"
          style={{ ...valueBase, color: balanceColor }}
        >
          {balancePrefix}
          {balance}
        </span>
        <span style={{ ...suffixStyle, color: balanceColor }}>SP</span>
      </Metric>

      <Metric label="Pods over" testid="summary-pods-over">
        <span
          data-testid="summary-pods-over-value"
          style={{ ...valueBase, color: podsOver > 0 ? color.red : color.black }}
        >
          {podsOver}
        </span>
        <span style={suffixStyle}>/ {totalPods}</span>
      </Metric>

      <Metric label="Re-groom needed" testid="summary-regroom">
        <span
          data-testid="summary-regroom-value"
          style={{
            ...valueBase,
            color: epicsToReGroom > 0 ? color.red : color.black,
          }}
        >
          {epicsToReGroom}
        </span>
        <span style={suffixStyle}>epic{epicsToReGroom === 1 ? '' : 's'}</span>
      </Metric>
    </div>
  );
}

function Metric({
  label,
  testid,
  children,
}: {
  label: string;
  testid: string;
  children: React.ReactNode;
}) {
  return (
    <div data-testid={testid}>
      <div style={labelStyle}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline' }}>{children}</div>
    </div>
  );
}
