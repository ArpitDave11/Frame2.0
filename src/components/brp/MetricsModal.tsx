/**
 * MetricsModal — pod-scoped metrics in a modal with two tabs (B-20).
 *
 * Tab 1: Estimate variance — bar chart comparing human vs FRAME per epic
 *        (excludes flagged epics — they have no FRAME estimate to compare).
 * Tab 2: Capacity vs load — donut chart of variance distribution +
 *        capacity-vs-load summary.
 *
 * Pure presentational component:
 * - Takes `pod` and derives everything from `computePodMetrics(pod)` and
 *   `computeVariance(epic)` so the modal cannot drift from the rest of
 *   BRP on the formula.
 * - No store reads inside. Caller plumbs `open` and `onClose`.
 *
 * Color palette follows the FRAME design tokens — `chart` ramp for
 * variance bands, brand red for FRAME estimates, gray for human estimates.
 */

import { useEffect, useId, useMemo, useState } from 'react';
import { X } from '@phosphor-icons/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { computePodMetrics, computeVariance } from '@/domain/brp';
import type { Pod, VarianceBand } from '@/domain/brp';
import { color, font, fontSize, fontWeight, radius, shadow } from '@/theme/tokens';

export interface MetricsModalProps {
  open: boolean;
  pod: Pod;
  onClose: () => void;
}

// Color per variance band. Picks from the FRAME chart ramp (no raw hsl).
const BAND_COLOR: Record<Exclude<VarianceBand, 'pending'>, string> = {
  agree: color.grayV,
  caution: color.bordeauxI,
  're-groom': color.red,
  flagged: color.grayIII,
};

const BAND_LABEL: Record<Exclude<VarianceBand, 'pending'>, string> = {
  agree: 'In tolerance',
  caution: 'Discuss',
  're-groom': 'Re-groom',
  flagged: 'Needs detail',
};

type Tab = 'variance' | 'capacity';

export function MetricsModal({ open, pod, onClose }: MetricsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('variance');
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const metrics = useMemo(() => computePodMetrics(pod), [pod]);

  const { epicChartData, varianceCounts, totalEpics } = useMemo(() => {
    // B-32 I1: also exclude pending epics — they have no FRAME estimate,
    // so a `frame: 0` bar would misrepresent the data as "FRAME said 0".
    // Eligible = analyzed (frameResult !== null) AND not flagged.
    const eligible = pod.epics.filter(
      (e) => e.frameResult !== null && computeVariance(e) !== 'flagged',
    );
    const epicChartData = eligible.map((e) => ({
      name: truncate(e.title, 18),
      human: e.humanEstimate ?? 0,
      frame: e.frameResult?.frameEstimate ?? 0,
    }));

    const bands: Array<Exclude<VarianceBand, 'pending'>> = [
      'agree',
      'caution',
      're-groom',
      'flagged',
    ];
    const varianceCounts = bands
      .map((band) => ({
        band,
        label: BAND_LABEL[band],
        count: pod.epics.filter((e) => computeVariance(e) === band).length,
      }))
      .filter((v) => v.count > 0);
    const totalEpics = varianceCounts.reduce((s, d) => s + d.count, 0);

    return { epicChartData, varianceCounts, totalEpics };
  }, [pod]);

  if (!open) return null;

  return (
    <>
      <div
        data-testid="metrics-modal-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999,
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="metrics-modal"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 760,
          maxHeight: '90vh',
          background: color.white,
          borderRadius: radius.xl,
          boxShadow: shadow.xl,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: font.sans,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 28px',
            borderBottom: `1px solid ${color.neutral200}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: color.neutral50,
          }}
        >
          <h2
            id={titleId}
            data-testid="metrics-modal-title"
            style={{
              fontSize: fontSize.lg,
              fontWeight: fontWeight.medium,
              margin: 0,
              color: color.black,
            }}
          >
            Pod metrics — {pod.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close metrics modal"
            data-testid="metrics-modal-close"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 6,
              color: color.grayIII,
            }}
          >
            <X size={22} weight="bold" aria-hidden="true" />
          </button>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          style={{
            display: 'flex',
            borderBottom: `1px solid ${color.neutral200}`,
            padding: '0 28px',
            background: color.white,
          }}
        >
          <TabButton
            id="variance"
            active={activeTab === 'variance'}
            onClick={() => setActiveTab('variance')}
          >
            Estimate variance
          </TabButton>
          <TabButton
            id="capacity"
            active={activeTab === 'capacity'}
            onClick={() => setActiveTab('capacity')}
          >
            Capacity vs load
          </TabButton>
        </div>

        {/* Body */}
        <div
          style={{ flex: 1, padding: 28, overflowY: 'auto', minHeight: 360 }}
          role="tabpanel"
        >
          {activeTab === 'variance' ? (
            <VarianceTab
              chartData={epicChartData}
              humanLoad={metrics.humanLoad}
              frameLoad={metrics.frameLoad}
            />
          ) : (
            <CapacityTab
              varianceCounts={varianceCounts}
              totalEpics={totalEpics}
              totalCapacity={metrics.totalCapacity}
              frameLoad={metrics.frameLoad}
              balance={metrics.balance}
            />
          )}
        </div>
      </div>
    </>
  );
}

// ─── Subcomponents ──────────────────────────────────────────

function TabButton({
  id,
  active,
  onClick,
  children,
}: {
  id: Tab;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-testid={`metrics-tab-${id}`}
      onClick={onClick}
      style={{
        padding: '14px 20px',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        fontFamily: font.sans,
        fontSize: fontSize.sm,
        borderBottom: `2px solid ${active ? color.red : 'transparent'}`,
        fontWeight: active ? fontWeight.semibold : fontWeight.normal,
        color: active ? color.black : color.grayIII,
      }}
    >
      {children}
    </button>
  );
}

function VarianceTab({
  chartData,
  humanLoad,
  frameLoad,
}: {
  chartData: Array<{ name: string; human: number; frame: number }>;
  humanLoad: number;
  frameLoad: number;
}) {
  const variance = frameLoad - humanLoad;
  return (
    <div data-testid="metrics-variance-tab">
      <div data-testid="metrics-variance-chart" style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={color.neutral200} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: color.grayV }}
            />
            <YAxis
              label={{
                value: 'Story points',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 12, fill: color.grayV },
              }}
              tick={{ fontSize: 12, fill: color.grayV }}
            />
            <Tooltip />
            <Legend
              wrapperStyle={{ fontSize: 13, fontFamily: font.sans }}
              iconType="square"
            />
            <Bar dataKey="human" name="Human estimate" fill={color.grayIII} />
            <Bar dataKey="frame" name="FRAME estimate" fill={color.red} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div
        data-testid="metrics-variance-summary"
        style={{
          marginTop: 20,
          padding: '14px 18px',
          background: color.neutral50,
          borderRadius: radius.md,
          fontSize: fontSize.sm,
          color: color.grayV,
          border: `1px solid ${color.neutral200}`,
        }}
      >
        <strong style={{ color: color.black }}>Human total:</strong>{' '}
        <span data-testid="metrics-human-total">{humanLoad}</span> SP &nbsp;·&nbsp;{' '}
        <strong style={{ color: color.black }}>FRAME total:</strong>{' '}
        <span data-testid="metrics-frame-total">{frameLoad}</span> SP &nbsp;·&nbsp;
        variance{' '}
        <span data-testid="metrics-variance-delta">
          {variance > 0 ? `+${variance}` : variance}
        </span>{' '}
        SP
      </div>
    </div>
  );
}

function CapacityTab({
  varianceCounts,
  totalEpics,
  totalCapacity,
  frameLoad,
  balance,
}: {
  varianceCounts: Array<{ band: Exclude<VarianceBand, 'pending'>; label: string; count: number }>;
  totalEpics: number;
  totalCapacity: number;
  frameLoad: number;
  balance: number;
}) {
  return (
    <div
      data-testid="metrics-capacity-tab"
      style={{ display: 'flex', alignItems: 'center', gap: 48, justifyContent: 'center' }}
    >
      <div data-testid="metrics-capacity-chart" style={{ width: 280, height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={varianceCounts}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={2}
              dataKey="count"
              nameKey="label"
            >
              {varianceCounts.map((d) => (
                <Cell key={d.band} fill={BAND_COLOR[d.band]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 240 }}>
        <div style={{ fontSize: fontSize.sm, color: color.grayV }}>
          FRAME load{' '}
          <strong style={{ color: color.black }} data-testid="metrics-load-frame">
            {frameLoad} SP
          </strong>{' '}
          against usable capacity{' '}
          <strong style={{ color: color.black }} data-testid="metrics-load-capacity">
            {totalCapacity} SP
          </strong>
        </div>
        <div
          data-testid="metrics-balance-message"
          style={{
            fontSize: fontSize.base,
            fontWeight: fontWeight.semibold,
            color: balance < 0 ? color.red : color.grayV,
          }}
        >
          {balance < 0 ? `Over by ${-balance} SP` : `Fits — ${balance} SP free`}
        </div>
        <div
          data-testid="metrics-variance-legend"
          style={{
            borderTop: `1px solid ${color.neutral200}`,
            paddingTop: 14,
          }}
        >
          {varianceCounts.map((d) => (
            <div
              key={d.band}
              data-testid={`metrics-legend-${d.band}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: fontSize.sm,
                padding: '6px 0',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  background: BAND_COLOR[d.band],
                }}
              />
              <span style={{ flex: 1, color: color.grayV }}>{d.label}</span>
              <strong style={{ color: color.black }}>{d.count}</strong>
              <span style={{ color: color.grayIII, minWidth: 44, textAlign: 'right' }}>
                {totalEpics ? Math.round((d.count / totalEpics) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
