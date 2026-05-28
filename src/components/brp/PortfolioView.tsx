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
  Compass,
  Funnel,
  X,
} from '@phosphor-icons/react';
import {
  computeCrewMetrics,
  computeDelta,
  computePodMetrics,
  computeVariance,
} from '@/domain/brp';
import type { Crew, Epic, Pod, VarianceBand } from '@/domain/brp';
import { CrewSelector } from './CrewSelector';
import { SummaryStrip } from './SummaryStrip';
import { VarianceBadge } from './VarianceBadge';
import { color, font, fontSize, fontWeight, radius, shadow, transition } from '@/theme/tokens';

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

const GRID_TEMPLATE = '2fr 140px 140px 100px 180px';

export function PortfolioView({
  crews,
  crewFilterId,
  onSelectCrew,
  onSelectPod,
  onSelectEpicInPod,
  reGroomOnlyFilter = false,
  onToggleReGroomFilter,
  piName,
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
        gap: 24,
        padding: '24px 32px',
        flex: 1,
        background: color.neutral50,
        overflowY: 'auto',
        fontFamily: font.sans,
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Compass size={22} weight="bold" color={color.red} aria-hidden="true" />
            <h2
              data-testid="portfolio-view-title"
              style={{
                margin: 0,
                fontSize: fontSize.xl,
                fontWeight: fontWeight.medium,
                color: color.black,
                letterSpacing: '-0.3px',
              }}
            >
              Portfolio
            </h2>
            {piName ? (
              <span
                data-testid="portfolio-pi-badge"
                style={{
                  padding: '4px 12px',
                  border: `1px solid ${color.neutral200}`,
                  borderRadius: radius.sm,
                  background: color.neutral50,
                  fontSize: fontSize.xs,
                  fontWeight: fontWeight.semibold,
                  color: color.grayV,
                  letterSpacing: '0.3px',
                }}
              >
                {piName}
              </span>
            ) : null}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
            {onToggleReGroomFilter ? (
              <FilterButton
                active={reGroomOnlyFilter}
                onClick={onToggleReGroomFilter}
              />
            ) : null}
            <CrewSelector
              crews={crews}
              selectedCrewId={crewFilterId}
              onSelect={onSelectCrew}
            />
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

      {loadCrewsError ? (
        <div data-testid="portfolio-load-crews-error" role="alert" style={errorBannerStyle}>
          Crews failed to load: {loadCrewsError}
        </div>
      ) : null}
      {loadPodsError ? (
        <div data-testid="portfolio-load-pods-error" role="alert" style={errorBannerStyle}>
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
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          {visiblePods.map(({ crew, pod }) => (
            <PodSection
              key={pod.id}
              crew={crew}
              pod={pod}
              reGroomOnlyFilter={reGroomOnlyFilter}
              onSelectPod={onSelectPod}
              onSelectEpicInPod={onSelectEpicInPod}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Pod section + epic row ─────────────────────────────────

function PodSection({
  crew,
  pod,
  reGroomOnlyFilter,
  onSelectPod,
  onSelectEpicInPod,
}: {
  crew: Crew;
  pod: Pod;
  reGroomOnlyFilter: boolean;
  onSelectPod: (podId: string) => void;
  onSelectEpicInPod?: (podId: string, epicId: string) => void;
}) {
  const metrics = useMemo(() => computePodMetrics(pod), [pod]);
  const overCommit = metrics.balance < 0;
  const loadPct = Math.min(
    Math.round((metrics.frameLoad / Math.max(metrics.totalCapacity, 1)) * 100),
    100,
  );
  const confidencePct = Math.round(metrics.avgConfidence * 100);
  const visibleEpics = useMemo(
    () =>
      reGroomOnlyFilter
        ? pod.epics.filter((e) => computeVariance(e) === 're-groom')
        : pod.epics,
    [pod.epics, reGroomOnlyFilter],
  );

  return (
    <article
      data-testid={`portfolio-pod-section-${pod.id}`}
      data-overcommitted={overCommit ? 'true' : 'false'}
      style={{
        background: color.white,
        border: `1px solid ${overCommit ? color.bordeauxI : color.neutral200}`,
        borderRadius: radius.md,
        overflow: 'hidden',
        boxShadow: shadow.xs,
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: GRID_TEMPLATE,
          padding: '18px 24px',
          background: color.neutral50,
          borderBottom: `1px solid ${color.neutral200}`,
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
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
        </div>

        <div
          data-testid={`portfolio-pod-capacity-${pod.id}`}
          style={{
            textAlign: 'right',
            fontFamily: font.mono,
            fontSize: fontSize.sm,
            fontWeight: fontWeight.medium,
            color: color.grayV,
          }}
        >
          {metrics.totalCapacity} SP
        </div>

        <div
          data-testid={`portfolio-pod-frameload-${pod.id}`}
          style={{
            textAlign: 'right',
            fontFamily: font.mono,
            fontSize: fontSize.sm,
            fontWeight: fontWeight.medium,
            color: overCommit ? color.red : color.grayV,
          }}
        >
          {metrics.frameLoad} SP
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            data-testid={`portfolio-pod-loadbar-${pod.id}`}
            style={{
              width: 80,
              height: 6,
              background: color.neutral200,
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <div
              data-testid={`portfolio-pod-loadbar-fill-${pod.id}`}
              style={{
                height: '100%',
                width: `${loadPct}%`,
                background: overCommit ? color.red : color.bordeauxI,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <span
            data-testid={`portfolio-pod-confidence-${pod.id}`}
            style={{
              fontSize: fontSize.xs,
              fontFamily: font.mono,
              fontWeight: fontWeight.medium,
              color: color.grayIII,
            }}
          >
            {pod.epics.length === 0 ? '—' : `${confidencePct}%`}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            data-testid={`portfolio-pod-open-${pod.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectPod(pod.id);
            }}
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
      </div>

      {/* Epic rows — always rendered (no collapse) */}
      {visibleEpics.length === 0 ? (
        <div
          data-testid={`portfolio-pod-empty-${pod.id}`}
          style={{
            padding: '20px 24px 20px 24px',
            fontSize: fontSize.xs,
            color: color.grayIII,
            fontStyle: 'italic',
          }}
        >
          {reGroomOnlyFilter && pod.epics.length > 0
            ? 'No epics in this pod need re-grooming.'
            : 'No epics loaded yet.'}
        </div>
      ) : (
        visibleEpics.map((epic) => (
          <EpicRowCondensed
            key={epic.id}
            epic={epic}
            podId={pod.id}
            onSelect={onSelectEpicInPod}
          />
        ))
      )}
    </article>
  );
}

function EpicRowCondensed({
  epic,
  podId,
  onSelect,
}: {
  epic: Epic;
  podId: string;
  onSelect?: (podId: string, epicId: string) => void;
}) {
  const variance = computeVariance(epic);
  const delta = computeDelta(epic);
  const frame = epic.frameResult?.frameEstimate ?? null;
  const deltaColor =
    delta === null
      ? color.grayIII
      : delta > 0
        ? color.red
        : delta < 0
          ? color.semanticGreenText
          : color.grayV;
  const deltaLabel = delta === null ? '—' : delta > 0 ? `+${delta}` : String(delta);
  const handleClick = onSelect ? () => onSelect(podId, epic.id) : undefined;
  const handleKey: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (!onSelect) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(podId, epic.id);
    }
  };

  return (
    <div
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      data-testid={`portfolio-epic-row-${epic.id}`}
      data-variance={variance}
      onClick={handleClick}
      onKeyDown={onSelect ? handleKey : undefined}
      onMouseEnter={(e) => {
        if (onSelect) e.currentTarget.style.background = color.neutral50;
      }}
      onMouseLeave={(e) => {
        if (onSelect) e.currentTarget.style.background = 'transparent';
      }}
      style={{
        display: 'grid',
        gridTemplateColumns: GRID_TEMPLATE,
        padding: '12px 24px 12px 52px',
        borderBottom: `1px solid ${color.neutral200}`,
        alignItems: 'center',
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'background 0.12s ease',
        gap: 12,
      }}
    >
      <div style={{ minWidth: 0, overflow: 'hidden' }}>
        <div
          data-testid={`portfolio-epic-title-${epic.id}`}
          style={{
            fontSize: fontSize.sm,
            color: color.black,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {epic.title}
        </div>
        <div
          style={{
            fontSize: '0.6875rem',
            color: color.grayIII,
            fontFamily: font.mono,
          }}
        >
          !{epic.iid}
        </div>
      </div>
      <div
        data-testid={`portfolio-epic-human-${epic.id}`}
        style={{
          textAlign: 'right',
          fontFamily: font.mono,
          fontSize: fontSize.sm,
          color: color.grayV,
        }}
      >
        {epic.humanEstimate ?? '—'}
      </div>
      <div
        data-testid={`portfolio-epic-frame-${epic.id}`}
        style={{
          textAlign: 'right',
          fontFamily: font.mono,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.medium,
          color: color.black,
        }}
      >
        {frame ?? '—'}
      </div>
      <div
        data-testid={`portfolio-epic-delta-${epic.id}`}
        style={{
          textAlign: 'center',
          fontFamily: font.mono,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.medium,
          color: deltaColor,
        }}
      >
        {deltaLabel}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <VarianceBadge variance={variance} />
      </div>
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
