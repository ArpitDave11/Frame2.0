/**
 * PortfolioView — top-level BRP dashboard.
 *
 * Quality remediation Phase 2 rewrite: the previous version was a flat
 * grid of pod cards that hid each pod's epics behind a click. The
 * portfolio now shows a vertical list of always-expanded pod sections
 * with the constituent epic rows visible inline, so a planner can scan
 * the whole portfolio without drilling in. Per user direction the
 * sections are NOT collapsible — every epic stays visible. Each section
 * has:
 *   - a header row (pod name | capacity | FRAME load | load bar +
 *     confidence% | Open button)
 *   - epic rows beneath using the same 5-column grid, indented,
 *     click-through to that epic in PodView
 *
 * Header now hosts the SummaryStrip (Task 2-4), PI badge (Task 3-3),
 * and the Re-groom filter (Task 3-1) — all optional so unwired callers
 * still render.
 *
 * Pure presentational. Caller plumbs every collection + every callback.
 * Numbers flow through computePodMetrics / computeCrewMetrics /
 * computeVariance / computeDelta so the dashboard cannot drift from
 * the rest of BRP on the formulae.
 */

import { useMemo } from 'react';
import {
  ArrowRight,
  CheckCircle,
  Funnel,
  Sparkle,
  X,
} from '@phosphor-icons/react';
import {
  computeCrewMetrics,
  computePodMetrics,
  computeVariance,
} from '@/domain/brp';
import type { Crew, Pod, VarianceBand } from '@/domain/brp';
import { CrewSelector } from './CrewSelector';
import { SummaryStrip } from './SummaryStrip';
import { color, cssVar, font, fontSize, fontWeight, radius, shadow, transition } from '@/theme/tokens';

export interface PortfolioViewProps {
  crews: Crew[];
  crewFilterId: string | null;
  onSelectCrew: (crewId: string | null) => void;
  /** Open a pod's PodView (no epic preselection). */
  onSelectPod: (podId: string) => void;

  // Phase 2 quality remediation —————————————————————————————

  /** Open a pod's PodView AND select an epic. Plumbed from BrpView. */
  onSelectEpicInPod?: (podId: string, epicId: string) => void;

  // Phase 3 quality remediation —————————————————————————————

  /** When true, hide pods + epics that have no re-groom variance. */
  reGroomOnlyFilter?: boolean;
  /** Toggle the re-groom-only filter. Plumbed from brpStore. */
  onToggleReGroomFilter?: () => void;
  /** Active PI name. Shows a small badge next to the title when provided. */
  piName?: string | null;

  // Portfolio-level analysis (reference UI parity) —————————
  /** Trigger analysis across all visible pods. */
  onRunAnalysis?: () => void;
  /** True while a portfolio-level analysis is in flight. */
  analysisRunning?: boolean;

  // Existing load-action wiring (post-B-42) ————————————————

  onLoadCrews?: () => void;
  onLoadPods?: () => void;
  loadCrewsState?: 'idle' | 'loading' | 'error';
  loadPodsState?: 'idle' | 'loading' | 'error';
  loadCrewsError?: string;
  loadPodsError?: string;
}

// Quality remediation Task 1-2: match VarianceBadge's semantic palette
// so the mini distribution bar on each pod card reads as the same
// visual language as the badges in the rows beneath it.
const BAND_COLOR: Record<Exclude<VarianceBand, 'pending'>, string> = {
  agree: color.semanticGreenText,
  caution: color.semanticAmberText,
  're-groom': color.red,
  flagged: color.semanticPurpleText,
};

const BAND_LABEL: Record<VarianceBand, string> = {
  agree: 'In tolerance',
  caution: 'Discuss',
  're-groom': 'Re-groom',
  flagged: 'Needs detail',
  pending: 'Pending',
};

// Variance distribution segment colours for each pod card's mini health
// bar. Mirrors BAND_COLOR plus a muted grey for the pending band so the
// card summarises a pod's epics without listing every row.
const SEG_COLOR: Record<VarianceBand, string> = {
  agree: color.semanticGreenText,
  caution: color.semanticAmberText,
  're-groom': color.red,
  flagged: color.semanticPurpleText,
  pending: color.grayIII,
};

export function PortfolioView({
  crews,
  crewFilterId,
  onSelectCrew,
  onSelectPod,
  reGroomOnlyFilter = false,
  onToggleReGroomFilter,
  piName,
  onRunAnalysis,
  analysisRunning = false,
  onLoadCrews,
  onLoadPods,
  loadCrewsState = 'idle',
  loadPodsState = 'idle',
  loadCrewsError,
  loadPodsError,
}: PortfolioViewProps) {
  const visibleCrews = useMemo(
    () => (crewFilterId === null ? crews : crews.filter((c) => c.id === crewFilterId)),
    [crews, crewFilterId],
  );

  const visiblePods = useMemo<Array<{ crew: Crew; pod: Pod }>>(() => {
    const out: Array<{ crew: Crew; pod: Pod }> = [];
    for (const c of visibleCrews) {
      for (const p of c.pods) {
        if (reGroomOnlyFilter) {
          const hasReGroom = p.epics.some((e) => computeVariance(e) === 're-groom');
          if (!hasReGroom) continue;
        }
        out.push({ crew: c, pod: p });
      }
    }
    return out;
  }, [visibleCrews, reGroomOnlyFilter]);

  // Crew-level rollup for the SummaryStrip. When the planner has
  // filtered to one crew, aggregate that crew; otherwise build a
  // virtual rollup across every loaded crew.
  const crewMetrics = useMemo(() => {
    if (crews.length === 0) return null;
    if (crewFilterId) {
      const crew = crews.find((c) => c.id === crewFilterId);
      return crew ? computeCrewMetrics(crew) : null;
    }
    // Aggregate every crew. Compose a virtual crew that owns every
    // loaded pod, then reuse computeCrewMetrics — keeps the formula
    // single-sourced.
    const allPods = crews.flatMap((c) => c.pods);
    const virtual: Crew = {
      id: '__all__',
      name: 'All crews',
      gitlabGroupId: 0,
      pods: allPods,
    };
    return computeCrewMetrics(virtual);
  }, [crews, crewFilterId]);

  return (
    <section
      data-testid="portfolio-view"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        height: '100%',
        background: color.neutral50,
        fontFamily: font.sans,
      }}
    >
      {/* Top bar — white background, matches reference layout */}
      <header
        style={{
          background: color.white,
          borderBottom: `1px solid ${color.neutral200}`,
          padding: '24px 40px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <h1
                data-testid="portfolio-view-title"
                style={{
                  margin: 0,
                  fontSize: fontSize['2xl'],
                  fontWeight: fontWeight.light,
                  color: color.black,
                  letterSpacing: '-0.5px',
                }}
              >
                Portfolio view
              </h1>
              {piName ? (
                <span
                  data-testid="portfolio-pi-badge"
                  style={{
                    padding: '4px 12px',
                    border: `1px solid ${color.neutral200}`,
                    borderRadius: radius.sm,
                    background: color.neutral50,
                    fontSize: fontSize.xs,
                    fontWeight: fontWeight.medium,
                    color: color.grayV,
                  }}
                >
                  {piName}
                </span>
              ) : null}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <CrewSelector
                crews={crews}
                selectedCrewId={crewFilterId}
                onSelect={onSelectCrew}
              />
              {onToggleReGroomFilter ? (
                <FilterButton
                  active={reGroomOnlyFilter}
                  onClick={onToggleReGroomFilter}
                />
              ) : null}
              {onLoadCrews ? (
                <LoadButton
                  testid="portfolio-load-crews"
                  onClick={onLoadCrews}
                  state={loadCrewsState}
                  label={crews.length === 0 ? 'Load crews' : 'Refresh crews'}
                  loadingLabel="Loading…"
                />
              ) : null}
              {onLoadPods && crewFilterId ? (
                <LoadButton
                  testid="portfolio-load-pods"
                  onClick={onLoadPods}
                  state={loadPodsState}
                  label="Load pods"
                  loadingLabel="Loading…"
                />
              ) : null}
            </div>
          </div>

          {onRunAnalysis ? (
            <button
              type="button"
              data-testid="portfolio-run-analysis"
              disabled={analysisRunning || crews.length === 0}
              onClick={onRunAnalysis}
              style={{
                background: analysisRunning ? color.grayIII : color.red,
                color: color.white,
                border: 'none',
                padding: '10px 20px',
                borderRadius: radius.md,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                cursor: analysisRunning ? 'not-allowed' : 'pointer',
                transition: transition.fast,
                boxShadow: '0 2px 4px rgba(230, 0, 0, 0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                opacity: analysisRunning ? 0.7 : 1,
                fontFamily: font.sans,
              }}
              onMouseEnter={(e) => {
                if (!analysisRunning) {
                  e.currentTarget.style.boxShadow = '0 3px 6px rgba(230, 0, 0, 0.25)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!analysisRunning) {
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(230, 0, 0, 0.15)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <Sparkle size={16} weight="fill" aria-hidden="true" />
              {analysisRunning ? 'Analyzing…' : 'Analysis'}
            </button>
          ) : null}
        </div>

        {crewMetrics ? (
          <SummaryStrip
            totalCapacity={crewMetrics.totalCapacity}
            humanLoad={crewMetrics.humanLoad}
            frameLoad={crewMetrics.frameLoad}
            balance={crewMetrics.balance}
            podsOver={crewMetrics.podsOver}
            totalPods={crewMetrics.totalPods}
            epicsToReGroom={crewMetrics.epicsToReGroom}
          />
        ) : null}
      </header>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 40px' }}>
      {loadCrewsError ? (
        <div data-testid="portfolio-load-crews-error" role="alert" style={{ ...errorBannerStyle, marginBottom: 16 }}>
          Crews failed to load: {loadCrewsError}
        </div>
      ) : null}
      {loadPodsError ? (
        <div data-testid="portfolio-load-pods-error" role="alert" style={{ ...errorBannerStyle, marginBottom: 16 }}>
          Pods failed to load: {loadPodsError}
        </div>
      ) : null}

      {/* Body */}
      {crews.length === 0 ? (
        <EmptyState
          testid="portfolio-view-empty-crews"
          title="No crews loaded yet"
          hint={
            onLoadCrews
              ? 'Click “Load crews” above to fetch from GitLab.'
              : 'Configure GitLab in Settings, then load a crew.'
          }
          action={
            onLoadCrews
              ? {
                  label: loadCrewsState === 'loading' ? 'Loading…' : 'Load crews',
                  onClick: onLoadCrews,
                  disabled: loadCrewsState === 'loading',
                  testid: 'portfolio-view-empty-crews-load',
                }
              : undefined
          }
        />
      ) : visiblePods.length === 0 && reGroomOnlyFilter ? (
        <EmptyState
          testid="portfolio-view-no-regroom"
          title="No epics need re-grooming"
          hint="All estimates are within acceptable variance."
          icon={<CheckCircle size={32} color={color.semanticGreenText} weight="fill" />}
        />
      ) : visiblePods.length === 0 ? (
        <EmptyState
          testid="portfolio-view-empty-pods"
          title={
            crewFilterId
              ? 'This crew has no pods loaded'
              : 'Pick a crew + load its pods'
          }
          hint={
            crewFilterId && onLoadPods
              ? 'Click “Load pods” above to fetch from GitLab.'
              : 'Pick a crew in the selector above to load its pods.'
          }
          action={
            crewFilterId && onLoadPods
              ? {
                  label: loadPodsState === 'loading' ? 'Loading…' : 'Load pods',
                  onClick: onLoadPods,
                  disabled: loadPodsState === 'loading',
                  testid: 'portfolio-view-empty-pods-load',
                }
              : undefined
          }
        />
      ) : (
        <div
          data-testid="portfolio-view-pod-list"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 20,
            alignItems: 'start',
          }}
        >
          {visiblePods.map(({ crew, pod }) => (
            <PodCard key={pod.id} crew={crew} pod={pod} onSelectPod={onSelectPod} />
          ))}
        </div>
      )}
      </div>
    </section>
  );
}

// ─── Pod card ───────────────────────────────────────────────
//
// One card per pod. Summarises the pod's epics as a variance
// distribution bar + count chips instead of listing every row, so the
// portfolio stays scannable at 20-30 pods. Full epic detail lives one
// click away in PodView (Open). Derived values flow through
// computePodMetrics / computeVariance so the card cannot drift on the
// formulae.

function PodCard({
  crew,
  pod,
  onSelectPod,
}: {
  crew: Crew;
  pod: Pod;
  onSelectPod: (podId: string) => void;
}) {
  const metrics = useMemo(() => computePodMetrics(pod), [pod]);
  const overCommit = metrics.balance < 0;
  const loadPct = Math.min(
    Math.round((metrics.frameLoad / Math.max(metrics.totalCapacity, 1)) * 100),
    100,
  );
  const confidencePct = Math.round(metrics.avgConfidence * 100);
  const total = pod.epics.length;

  // Per-band epic counts drive the distribution bar + summary chips.
  const counts = useMemo(() => {
    const c: Record<VarianceBand, number> = {
      agree: 0,
      caution: 0,
      're-groom': 0,
      flagged: 0,
      pending: 0,
    };
    for (const e of pod.epics) c[computeVariance(e)] += 1;
    return c;
  }, [pod.epics]);

  const segments = (
    ['agree', 'caution', 're-groom', 'flagged', 'pending'] as VarianceBand[]
  ).filter((b) => counts[b] > 0);

  const alerts: string[] = [];
  if (counts['re-groom'] > 0) alerts.push(`${counts['re-groom']} re-groom`);
  if (counts.flagged > 0) alerts.push(`${counts.flagged} needs detail`);
  if (counts.pending > 0) alerts.push(`${counts.pending} pending`);
  const chips =
    total === 0
      ? 'No epics loaded yet'
      : `${total} epic${total === 1 ? '' : 's'}${
          alerts.length ? ` · ${alerts.join(' · ')}` : ''
        }`;

  const balancePrefix = metrics.balance > 0 ? '+' : '';
  const pillLabel = overCommit
    ? `${-metrics.balance} SP over`
    : `${balancePrefix}${metrics.balance} SP free`;

  return (
    <article
      data-testid={`portfolio-pod-section-${pod.id}`}
      data-overcommitted={overCommit ? 'true' : 'false'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        background: color.white,
        border: `1px solid ${overCommit ? color.bordeauxI : color.neutral200}`,
        borderRadius: radius.xl,
        padding: 20,
        boxShadow: shadow.xs,
        minWidth: 0,
      }}
    >
      {/* Header: crew + name | balance pill */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            data-testid={`portfolio-pod-crew-${pod.id}`}
            style={{
              fontSize: '0.6875rem',
              color: color.grayIII,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 2,
            }}
          >
            {crew.name}
          </div>
          <h3
            data-testid={`portfolio-pod-name-${pod.id}`}
            style={{
              fontSize: fontSize.base,
              fontWeight: fontWeight.medium,
              color: color.black,
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {pod.name}
          </h3>
        </div>
        <span
          data-testid={`portfolio-pod-balance-${pod.id}`}
          data-overcommitted={overCommit ? 'true' : 'false'}
          style={{
            flexShrink: 0,
            padding: '4px 10px',
            borderRadius: radius.full,
            fontSize: fontSize.xs,
            fontWeight: fontWeight.semibold,
            whiteSpace: 'nowrap',
            background: overCommit ? color.semanticRedBg : color.semanticGreenBg,
            color: overCommit ? color.red : color.semanticGreenText,
          }}
        >
          {pillLabel}
        </span>
      </div>

      {/* Metrics */}
      <div style={{ display: 'flex', gap: 24 }}>
        <CardMetric label="Capacity" testid={`portfolio-pod-capacity-${pod.id}`}>
          {metrics.totalCapacity} SP
        </CardMetric>
        <CardMetric
          label="FRAME load"
          testid={`portfolio-pod-frameload-${pod.id}`}
          valueColor={overCommit ? color.red : color.black}
        >
          {metrics.frameLoad} SP
        </CardMetric>
        <CardMetric label="Confidence" testid={`portfolio-pod-confidence-${pod.id}`}>
          {total === 0 ? '—' : `${confidencePct}%`}
        </CardMetric>
      </div>

      {/* Load bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fontSize.xs }}>
          <span style={{ color: color.grayV, fontWeight: fontWeight.medium }}>Load</span>
          <span
            style={{
              fontFamily: font.mono,
              fontWeight: fontWeight.medium,
              color: overCommit ? color.red : color.grayV,
            }}
          >
            {loadPct}%
          </span>
        </div>
        <div
          data-testid={`portfolio-pod-loadbar-${pod.id}`}
          style={{
            height: 8,
            background: color.neutral200,
            borderRadius: radius.full,
            overflow: 'hidden',
          }}
        >
          <div
            data-testid={`portfolio-pod-loadbar-fill-${pod.id}`}
            style={{
              width: `${loadPct}%`,
              height: '100%',
              background: overCommit ? cssVar.destructive : color.red,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Variance distribution + summary chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          data-testid={`portfolio-pod-distribution-${pod.id}`}
          role="img"
          aria-label={`Variance distribution — ${chips}`}
          style={{
            display: 'flex',
            height: 10,
            background: color.neutral200,
            borderRadius: radius.full,
            overflow: 'hidden',
          }}
        >
          {segments.map((b) => (
            <div
              key={b}
              data-band={b}
              style={{ flexGrow: counts[b], background: SEG_COLOR[b] }}
            />
          ))}
        </div>
        <div
          data-testid={
            total === 0 ? `portfolio-pod-empty-${pod.id}` : `portfolio-pod-chips-${pod.id}`
          }
          style={{
            fontSize: fontSize.xs,
            color: color.grayV,
            fontStyle: total === 0 ? 'italic' : 'normal',
          }}
        >
          {chips}
        </div>
      </div>

      {/* Open → PodView (the full epic table lives there) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
        <button
          type="button"
          data-testid={`portfolio-pod-open-${pod.id}`}
          onClick={() => onSelectPod(pod.id)}
          aria-label={`Open ${pod.name}`}
          style={{
            background: color.white,
            border: `1px solid ${color.neutral200}`,
            borderRadius: radius.sm,
            padding: '6px 12px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: fontSize.sm,
            fontWeight: fontWeight.medium,
            color: color.red,
            transition: transition.fast,
            fontFamily: font.sans,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = color.semanticRedBg;
            e.currentTarget.style.borderColor = color.red;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = color.white;
            e.currentTarget.style.borderColor = color.neutral200;
          }}
        >
          Open
          <ArrowRight size={14} weight="bold" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function CardMetric({
  label,
  testid,
  valueColor = color.black,
  children,
}: {
  label: string;
  testid: string;
  valueColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
      <span
        style={{
          fontSize: '0.625rem',
          fontWeight: fontWeight.semibold,
          color: color.grayIII,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </span>
      <span
        data-testid={testid}
        style={{
          fontSize: fontSize.base,
          fontWeight: fontWeight.medium,
          fontFamily: font.mono,
          color: valueColor,
        }}
      >
        {children}
      </span>
    </div>
  );
}

// ─── Sub-pieces ─────────────────────────────────────────────

function FilterButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      data-testid="portfolio-regroom-filter"
      data-active={active ? 'true' : 'false'}
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 12px',
        background: active ? color.semanticRedBg : color.white,
        color: active ? color.red : color.grayV,
        border: `1px solid ${active ? color.red : color.neutral200}`,
        borderRadius: radius.sm,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        cursor: 'pointer',
        fontFamily: font.sans,
        transition: transition.fast,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = color.grayIII;
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = color.neutral200;
        }
      }}
    >
      <Funnel size={14} weight={active ? 'fill' : 'regular'} aria-hidden="true" />
      Re-groom only
      {active ? <X size={12} weight="bold" aria-hidden="true" /> : null}
    </button>
  );
}

function LoadButton({
  testid,
  onClick,
  state,
  label,
  loadingLabel,
}: {
  testid: string;
  onClick: () => void;
  state: 'idle' | 'loading' | 'error';
  label: string;
  loadingLabel: string;
}) {
  const isLoading = state === 'loading';
  return (
    <button
      type="button"
      data-testid={testid}
      data-state={state}
      disabled={isLoading}
      onClick={onClick}
      style={{
        background: isLoading ? color.neutral200 : color.white,
        color: isLoading ? color.grayIII : color.grayV,
        border: `1px solid ${state === 'error' ? color.bordeauxI : color.neutral200}`,
        padding: '8px 14px',
        borderRadius: radius.sm,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        cursor: isLoading ? 'wait' : 'pointer',
        fontFamily: font.sans,
        transition: transition.fast,
      }}
      onMouseEnter={(e) => {
        if (!isLoading) e.currentTarget.style.borderColor = color.grayIII;
      }}
      onMouseLeave={(e) => {
        if (!isLoading) {
          e.currentTarget.style.borderColor =
            state === 'error' ? color.bordeauxI : color.neutral200;
        }
      }}
    >
      {isLoading ? loadingLabel : label}
    </button>
  );
}

function EmptyState({
  title,
  hint,
  testid,
  action,
  icon,
}: {
  title: string;
  hint: string;
  testid: string;
  action?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    testid: string;
  };
  icon?: React.ReactNode;
}) {
  return (
    <div
      data-testid={testid}
      style={{
        background: color.white,
        border: `1px dashed ${color.neutral200}`,
        borderRadius: radius.md,
        padding: '60px 28px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: icon ? 14 : 0,
      }}
    >
      {icon}
      <div style={{ fontSize: fontSize.base, color: color.grayV, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: fontSize.sm, color: color.grayIII, marginBottom: action ? 16 : 0 }}>
        {hint}
      </div>
      {action ? (
        <button
          type="button"
          data-testid={action.testid}
          disabled={action.disabled}
          onClick={action.onClick}
          style={{
            background: action.disabled ? color.neutral200 : color.red,
            color: action.disabled ? color.grayIII : color.white,
            border: 'none',
            padding: '10px 22px',
            borderRadius: radius.sm,
            fontSize: fontSize.sm,
            fontWeight: fontWeight.medium,
            cursor: action.disabled ? 'not-allowed' : 'pointer',
            fontFamily: font.sans,
            transition: transition.fast,
          }}
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

const errorBannerStyle: React.CSSProperties = {
  padding: '10px 14px',
  background: color.semanticRedBg,
  border: `1px solid ${color.bordeauxI}`,
  borderRadius: radius.sm,
  color: color.red,
  fontSize: fontSize.sm,
  fontFamily: font.sans,
};

// Suppress unused-import warnings — these are exported via the rendered
// children but TS doesn't trace JSX nullability deeply enough.
export { BAND_COLOR, BAND_LABEL };
