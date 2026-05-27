/**
 * PortfolioView — top-level BRP dashboard (B-25).
 *
 * Renders a grid of PodCards across all crews (or filtered to one crew).
 * Each card summarises the pod's capacity, FRAME load, balance, and
 * variance-band counts so the planner can spot trouble at a glance.
 *
 * Pure presentational. Caller plumbs `crews`, optional `crewFilterId`,
 * `onSelectPod`, and `onSelectCrew`. The numbers flow through
 * `computePodMetrics` so the cards cannot drift from the rest of BRP.
 */

import { useMemo } from 'react';
import { Compass, ArrowRight } from '@phosphor-icons/react';
import { computePodMetrics, computeVariance } from '@/domain/brp';
import type { Crew, Pod, VarianceBand } from '@/domain/brp';
import { CrewSelector } from './CrewSelector';
import { color, font, fontSize, fontWeight, radius, shadow } from '@/theme/tokens';

export interface PortfolioViewProps {
  crews: Crew[];
  crewFilterId: string | null;
  onSelectCrew: (crewId: string | null) => void;
  onSelectPod: (podId: string) => void;
  /** Trigger brpActions.loadCrewsAction. When provided, shown in the
   *  header AND as a CTA when no crews are loaded. */
  onLoadCrews?: () => void;
  /** Trigger brpActions.loadPodsAction for the currently-filtered crew.
   *  Shown as a CTA when a crew is filtered but has no pods. */
  onLoadPods?: () => void;
  /** Live state of the in-flight load (drives the button label). */
  loadCrewsState?: 'idle' | 'loading' | 'error';
  loadPodsState?: 'idle' | 'loading' | 'error';
  loadCrewsError?: string;
  loadPodsError?: string;
}

interface PodCardEntry {
  crew: Crew;
  pod: Pod;
}

const BAND_COLOR: Record<Exclude<VarianceBand, 'pending'>, string> = {
  agree: color.grayV,
  caution: color.bordeauxI,
  're-groom': color.red,
  flagged: color.grayIII,
};

const BAND_LABEL: Record<VarianceBand, string> = {
  agree: 'In tolerance',
  caution: 'Discuss',
  're-groom': 'Re-groom',
  flagged: 'Needs detail',
  pending: 'Pending',
};

export function PortfolioView({
  crews,
  crewFilterId,
  onSelectCrew,
  onSelectPod,
  onLoadCrews,
  onLoadPods,
  loadCrewsState = 'idle',
  loadPodsState = 'idle',
  loadCrewsError,
  loadPodsError,
}: PortfolioViewProps) {
  const entries = useMemo<PodCardEntry[]>(() => {
    const visible = crewFilterId === null
      ? crews
      : crews.filter((c) => c.id === crewFilterId);
    const out: PodCardEntry[] = [];
    for (const c of visible) {
      for (const p of c.pods) out.push({ crew: c, pod: p });
    }
    return out;
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
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
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
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
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
      </header>

      {/* Persistent error banners — sit above the grid so they're visible
          regardless of which empty state is active. */}
      {loadCrewsError ? (
        <div
          data-testid="portfolio-load-crews-error"
          role="alert"
          style={errorBannerStyle}
        >
          Crews failed to load: {loadCrewsError}
        </div>
      ) : null}
      {loadPodsError ? (
        <div
          data-testid="portfolio-load-pods-error"
          role="alert"
          style={errorBannerStyle}
        >
          Pods failed to load: {loadPodsError}
        </div>
      ) : null}

      {/* Grid */}
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
      ) : entries.length === 0 ? (
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
          data-testid="portfolio-view-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {entries.map(({ crew, pod }) => (
            <PodCard
              key={pod.id}
              crew={crew}
              pod={pod}
              onSelect={() => onSelectPod(pod.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function PodCard({
  crew,
  pod,
  onSelect,
}: {
  crew: Crew;
  pod: Pod;
  onSelect: () => void;
}) {
  const metrics = computePodMetrics(pod);
  const overCommit = metrics.balance < 0;

  // Variance distribution per band (non-zero only).
  const bandCounts: Array<{ band: Exclude<VarianceBand, 'pending'>; count: number }> = [];
  for (const band of ['agree', 'caution', 're-groom', 'flagged'] as const) {
    const count = pod.epics.filter((e) => computeVariance(e) === band).length;
    if (count > 0) bandCounts.push({ band, count });
  }
  const pendingCount = pod.epics.filter((e) => computeVariance(e) === 'pending').length;

  return (
    <button
      type="button"
      data-testid={`portfolio-pod-card-${pod.id}`}
      onClick={onSelect}
      style={{
        textAlign: 'left',
        background: color.white,
        border: `1px solid ${overCommit ? color.bordeauxI : color.neutral200}`,
        borderRadius: radius.md,
        padding: 18,
        boxShadow: shadow.sm,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        fontFamily: font.sans,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div
            data-testid={`portfolio-pod-crew-${pod.id}`}
            style={{
              fontSize: fontSize.xs,
              color: color.grayIII,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 4,
            }}
          >
            {crew.name}
          </div>
          <div
            data-testid={`portfolio-pod-name-${pod.id}`}
            style={{
              fontSize: fontSize.base,
              fontWeight: fontWeight.medium,
              color: color.black,
            }}
          >
            {pod.name}
          </div>
        </div>
        <ArrowRight size={14} color={color.grayIII} aria-hidden="true" />
      </div>

      {/* Capacity / Load row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: fontSize.sm,
          color: color.grayV,
        }}
      >
        <span>
          Capacity{' '}
          <strong data-testid={`portfolio-pod-capacity-${pod.id}`} style={{ color: color.black }}>
            {metrics.totalCapacity}
          </strong>{' '}
          SP
        </span>
        <span>
          FRAME{' '}
          <strong data-testid={`portfolio-pod-frameload-${pod.id}`} style={{ color: color.black }}>
            {metrics.frameLoad}
          </strong>{' '}
          SP
        </span>
      </div>

      {/* Balance banner */}
      <div
        data-testid={`portfolio-pod-balance-${pod.id}`}
        data-overcommitted={overCommit ? 'true' : 'false'}
        style={{
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
          color: overCommit ? color.red : color.grayV,
        }}
      >
        {overCommit ? `Over by ${-metrics.balance} SP` : `${metrics.balance} SP free`}
      </div>

      {/* Variance distribution */}
      {pod.epics.length === 0 ? (
        <div style={{ fontSize: fontSize.xs, color: color.grayIII }}>
          No epics loaded
        </div>
      ) : (
        <>
          <div
            data-testid={`portfolio-pod-distribution-${pod.id}`}
            style={{ display: 'flex', height: 6, borderRadius: radius.full, overflow: 'hidden' }}
          >
            {bandCounts.map(({ band, count }) => (
              <div
                key={band}
                data-testid={`portfolio-pod-distribution-${pod.id}-${band}`}
                title={`${BAND_LABEL[band]} — ${count}`}
                style={{
                  flex: count,
                  background: BAND_COLOR[band],
                }}
              />
            ))}
            {pendingCount > 0 && (
              <div
                data-testid={`portfolio-pod-distribution-${pod.id}-pending`}
                title={`Pending — ${pendingCount}`}
                style={{ flex: pendingCount, background: color.neutral200 }}
              />
            )}
          </div>
          <div
            style={{
              fontSize: fontSize.xs,
              color: color.grayIII,
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <span data-testid={`portfolio-pod-epic-count-${pod.id}`}>
              {pod.epics.length} epic{pod.epics.length === 1 ? '' : 's'}
            </span>
            {metrics.flaggedCount > 0 && (
              <span data-testid={`portfolio-pod-flagged-count-${pod.id}`}>
                · {metrics.flaggedCount} needs detail
              </span>
            )}
            {metrics.reGroomCount > 0 && (
              <span data-testid={`portfolio-pod-regroom-count-${pod.id}`}>
                · {metrics.reGroomCount} re-groom
              </span>
            )}
          </div>
        </>
      )}
    </button>
  );
}

function EmptyState({
  title,
  hint,
  testid,
  action,
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
      }}
    >
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
  background: color.pastelI,
  border: `1px solid ${color.bordeauxI}`,
  borderRadius: radius.sm,
  color: color.red,
  fontSize: fontSize.sm,
  fontFamily: font.sans,
};

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
      }}
    >
      {isLoading ? loadingLabel : label}
    </button>
  );
}
