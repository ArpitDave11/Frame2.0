/**
 * PodView — single-pod inspector (B-26).
 *
 * Three regions side-by-side:
 *   - Header: pod name, crew name, action buttons (Capacity, Metrics, Add epics, Run analysis)
 *   - Left:   table of EpicRows + the AnalysisProgress banner
 *   - Right:  DetailPanel for the currently selected epic
 *
 * Pure presentational. Caller plumbs the entire state shape (pod + crew
 * + selectedEpicId + analysisProgress + failures) plus all action
 * callbacks. The store wiring happens at the action layer (B-29/B-30).
 */

import { useMemo } from 'react';
import { Plus, Gauge, ChartLineUp, Lightning, ArrowLeft } from '@phosphor-icons/react';
import { computePodMetrics } from '@/domain/brp';
import type { Crew, Epic, Pod } from '@/domain/brp';
import { EpicRow } from './EpicRow';
import { DetailPanel } from './DetailPanel';
import { AnalysisProgress, type AnalysisFailure } from './AnalysisProgress';
import { color, font, fontSize, fontWeight, radius, shadow } from '@/theme/tokens';

export interface PodViewProps {
  pod: Pod;
  crew: Crew;
  selectedEpicId: string | null;
  /** Progress shape from brpStore.analysisProgress. null = no run in flight or completed. */
  analysisRunning: boolean;
  analysisCompleted: number;
  analysisTotal: number;
  analysisCurrentEpicTitle?: string | null;
  analysisFailures?: AnalysisFailure[];
  /**
   * AI-assist (B-34): set of epic ids the duplicate detector flagged
   * as likely duplicates inside THIS pod. Empty = no warnings.
   */
  duplicateEpicIds?: ReadonlySet<string>;
  /**
   * AI-assist (B-34): variance interpreter explanation for the
   * currently-selected epic. null/undefined hides the banner.
   */
  selectedVarianceMessage?: string | null;
  onBackToPortfolio: () => void;
  onSelectEpic: (epicId: string | null) => void;
  onHumanEstimateChange: (epicId: string, value: number | null) => void;
  onOpenCapacityDialog: () => void;
  onOpenMetricsModal: () => void;
  onOpenEpicPicker: () => void;
  onRunAnalysis: () => void;
  onCancelAnalysis?: () => void;
  onSendToGrooming?: (epic: Epic) => void;
  onDismissAnalysisResult?: () => void;
}

const tableHeadStyle: React.CSSProperties = {
  padding: '10px 20px',
  fontSize: fontSize.xs,
  fontWeight: fontWeight.semibold,
  color: color.grayV,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  textAlign: 'left',
  borderBottom: `1px solid ${color.neutral200}`,
};

export function PodView({
  pod,
  crew,
  selectedEpicId,
  analysisRunning,
  analysisCompleted,
  analysisTotal,
  analysisCurrentEpicTitle,
  analysisFailures = [],
  duplicateEpicIds,
  selectedVarianceMessage,
  onBackToPortfolio,
  onSelectEpic,
  onHumanEstimateChange,
  onOpenCapacityDialog,
  onOpenMetricsModal,
  onOpenEpicPicker,
  onRunAnalysis,
  onCancelAnalysis,
  onSendToGrooming,
  onDismissAnalysisResult,
}: PodViewProps) {
  const metrics = useMemo(() => computePodMetrics(pod), [pod]);
  const selectedEpic = useMemo(
    () => pod.epics.find((e) => e.id === selectedEpicId) ?? null,
    [pod.epics, selectedEpicId],
  );
  const overCommit = metrics.balance < 0;

  return (
    <section
      data-testid="pod-view"
      data-pod-id={pod.id}
      style={{
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        background: color.white,
        overflow: 'hidden',
        fontFamily: font.sans,
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: '20px 28px',
          borderBottom: `1px solid ${color.neutral200}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          background: color.neutral50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            data-testid="pod-view-back"
            onClick={onBackToPortfolio}
            aria-label="Back to portfolio"
            style={{
              background: color.white,
              border: `1px solid ${color.neutral200}`,
              borderRadius: radius.sm,
              padding: '6px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: fontSize.xs,
              color: color.grayV,
            }}
          >
            <ArrowLeft size={12} weight="bold" aria-hidden="true" />
            Portfolio
          </button>
          <div>
            <div
              data-testid="pod-view-crew"
              style={{
                fontSize: fontSize.xs,
                color: color.grayIII,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {crew.name}
            </div>
            <h2
              data-testid="pod-view-title"
              style={{
                margin: 0,
                fontSize: fontSize.lg,
                fontWeight: fontWeight.medium,
                color: color.black,
                letterSpacing: '-0.2px',
              }}
            >
              {pod.name}
            </h2>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <PodActionButton
            onClick={onOpenCapacityDialog}
            icon={<Gauge size={14} weight="bold" aria-hidden="true" />}
            label="Capacity"
            testid="pod-view-action-capacity"
          />
          <PodActionButton
            onClick={onOpenMetricsModal}
            icon={<ChartLineUp size={14} weight="bold" aria-hidden="true" />}
            label="Metrics"
            testid="pod-view-action-metrics"
          />
          <PodActionButton
            onClick={onOpenEpicPicker}
            icon={<Plus size={14} weight="bold" aria-hidden="true" />}
            label="Add epics"
            testid="pod-view-action-add-epics"
          />
          <PodActionButton
            onClick={onRunAnalysis}
            icon={<Lightning size={14} weight="fill" aria-hidden="true" />}
            label="Run analysis"
            primary
            testid="pod-view-action-analyze"
            disabled={pod.epics.length === 0 || analysisRunning}
          />
        </div>
      </header>

      {/* Quick metrics strip */}
      <div
        data-testid="pod-view-metrics-strip"
        style={{
          display: 'flex',
          gap: 24,
          padding: '12px 28px',
          borderBottom: `1px solid ${color.neutral200}`,
          background: color.white,
          fontSize: fontSize.sm,
          color: color.grayV,
        }}
      >
        <span>
          Capacity{' '}
          <strong data-testid="pod-view-capacity" style={{ color: color.black }}>
            {metrics.totalCapacity}
          </strong>{' '}
          SP
        </span>
        <span>
          FRAME load{' '}
          <strong data-testid="pod-view-frame-load" style={{ color: color.black }}>
            {metrics.frameLoad}
          </strong>{' '}
          SP
        </span>
        <span
          data-testid="pod-view-balance"
          data-overcommitted={overCommit ? 'true' : 'false'}
          style={{
            color: overCommit ? color.red : color.grayV,
            fontWeight: fontWeight.semibold,
          }}
        >
          {overCommit
            ? `Over by ${-metrics.balance} SP`
            : `${metrics.balance} SP free`}
        </span>
        <span>
          {metrics.epicCount} epic{metrics.epicCount === 1 ? '' : 's'}
          {metrics.flaggedCount > 0 ? ` · ${metrics.flaggedCount} needs detail` : ''}
          {metrics.reGroomCount > 0 ? ` · ${metrics.reGroomCount} re-groom` : ''}
        </span>
      </div>

      {/* Analysis progress (only renders when active or completed) */}
      <div style={{ padding: '12px 28px 0 28px' }}>
        <AnalysisProgress
          completed={analysisCompleted}
          total={analysisTotal}
          running={analysisRunning}
          currentEpicTitle={analysisCurrentEpicTitle}
          failures={analysisFailures}
          onCancel={onCancelAnalysis}
          onDismiss={onDismissAnalysisResult}
        />
      </div>

      {/* Main: table + detail panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div
          data-testid="pod-view-table-region"
          style={{
            flex: selectedEpic ? '0 0 58%' : 1,
            overflow: 'auto',
            borderRight: selectedEpic ? `1px solid ${color.neutral200}` : 'none',
            padding: 28,
          }}
        >
          {pod.epics.length === 0 ? (
            <div
              data-testid="pod-view-empty-epics"
              style={{
                background: color.neutral50,
                border: `1px dashed ${color.neutral200}`,
                borderRadius: radius.md,
                padding: '60px 28px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: fontSize.base, color: color.grayV, marginBottom: 6 }}>
                No epics in this pod yet
              </div>
              <div style={{ fontSize: fontSize.sm, color: color.grayIII }}>
                Click “Add epics” to import them from GitLab.
              </div>
            </div>
          ) : (
            <div
              style={{
                background: color.white,
                border: `1px solid ${color.neutral200}`,
                borderRadius: radius.md,
                overflow: 'hidden',
                boxShadow: shadow.xs,
              }}
            >
              <table
                data-testid="pod-view-table"
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontFamily: font.sans,
                }}
              >
                <thead>
                  <tr>
                    <th style={tableHeadStyle}>Epic</th>
                    <th style={{ ...tableHeadStyle, textAlign: 'right' }}>Human</th>
                    <th style={{ ...tableHeadStyle, textAlign: 'right' }}>FRAME</th>
                    <th style={{ ...tableHeadStyle, textAlign: 'right' }}>Δ</th>
                    <th style={{ ...tableHeadStyle, textAlign: 'center' }}>Variance</th>
                    <th style={{ ...tableHeadStyle, textAlign: 'right' }}>Conf</th>
                  </tr>
                </thead>
                <tbody>
                  {pod.epics.map((epic) => (
                    <EpicRow
                      key={epic.id}
                      epic={epic}
                      isSelected={epic.id === selectedEpicId}
                      isLikelyDuplicate={duplicateEpicIds?.has(epic.id) ?? false}
                      onSelect={() =>
                        onSelectEpic(epic.id === selectedEpicId ? null : epic.id)
                      }
                      onHumanEstimateChange={(value) => onHumanEstimateChange(epic.id, value)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedEpic && (
          <div
            data-testid="pod-view-detail-region"
            style={{
              flex: '0 0 42%',
              overflow: 'hidden',
              display: 'flex',
            }}
          >
            <DetailPanel
              epic={selectedEpic}
              onClose={() => onSelectEpic(null)}
              onSendToGrooming={onSendToGrooming}
              varianceMessage={selectedVarianceMessage ?? undefined}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function PodActionButton({
  onClick,
  icon,
  label,
  primary = false,
  disabled = false,
  testid,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
  disabled?: boolean;
  testid: string;
}) {
  return (
    <button
      type="button"
      data-testid={testid}
      disabled={disabled}
      onClick={onClick}
      style={{
        background: disabled ? color.neutral200 : primary ? color.red : color.white,
        color: disabled ? color.grayIII : primary ? color.white : color.grayV,
        border: primary ? 'none' : `1px solid ${color.neutral200}`,
        padding: '8px 14px',
        borderRadius: radius.sm,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: font.sans,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
      }}
    >
      {icon}
      {label}
    </button>
  );
}
