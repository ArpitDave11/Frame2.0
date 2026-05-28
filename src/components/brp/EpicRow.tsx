/**
 * EpicRow — one row of the Epic table in BRP (B-21).
 *
 * Renders inside a `<table>` (this is a `<tr>`). Columns:
 *   Title + iid · Human est. (editable) · FRAME est. · Δ · Variance · Conf
 *
 * Derived values flow through the domain pure functions —
 * `computeVariance(epic)` and `computeDelta(epic)` — so the row cannot
 * drift from the rest of BRP on the formulae. No store reads inside;
 * caller plumbs `onSelect` + `onHumanEstimateChange` to the brpStore.
 *
 * Accessibility:
 * - `aria-selected` on the row reflects the controlling state.
 * - Human-estimate input has its own label via aria-label so screen
 *   readers can announce which epic they're editing.
 * - VarianceBadge already announces the band; the row stays silent
 *   beyond that aside from its title/id text.
 */

import { useEffect, useState } from 'react';
import { computeDelta, computeVariance } from '@/domain/brp';
import type { Epic } from '@/domain/brp';
import { VarianceBadge } from './VarianceBadge';
import { color, font, fontSize, fontWeight } from '@/theme/tokens';

export interface EpicRowProps {
  epic: Epic;
  isSelected: boolean;
  onSelect: () => void;
  onHumanEstimateChange: (value: number | null) => void;
  /**
   * When true, the row renders a small "Likely duplicate" tag in the
   * title cell (B-34). Caller (PodView/BrpView) computes the dup
   * groups via brpActions.findDuplicatesInPodAction and passes the
   * boolean per row. Optional — false/undefined hides the tag.
   */
  isLikelyDuplicate?: boolean;
}

const cellBase: React.CSSProperties = {
  padding: '14px 20px',
  borderBottom: `1px solid ${color.neutral200}`,
  fontSize: fontSize.sm,
};

const numericCell: React.CSSProperties = {
  ...cellBase,
  textAlign: 'right',
  fontFamily: font.mono,
};

export function EpicRow({
  epic,
  isSelected,
  onSelect,
  onHumanEstimateChange,
  isLikelyDuplicate = false,
}: EpicRowProps) {
  // Local controlled value for the input so the user can type without
  // every keystroke round-tripping through the store. Commit on blur or
  // Enter — same pattern as a spreadsheet cell.
  const [draft, setDraft] = useState<string>(
    epic.humanEstimate === null ? '' : String(epic.humanEstimate),
  );

  // Sync local draft when the upstream value changes (e.g., another
  // tab cleared it, or the row remounted for a different epic).
  useEffect(() => {
    setDraft(epic.humanEstimate === null ? '' : String(epic.humanEstimate));
  }, [epic.humanEstimate, epic.id]);

  const variance = computeVariance(epic);
  const delta = computeDelta(epic);
  const confidencePct = epic.frameResult ? Math.round(epic.frameResult.confidence * 100) : null;
  const frameEstimate = epic.frameResult?.frameEstimate ?? null;

  const commitDraft = () => {
    const trimmed = draft.trim();
    if (trimmed === '') {
      if (epic.humanEstimate !== null) onHumanEstimateChange(null);
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0) {
      // Reject invalid input — revert the draft so the row stays consistent.
      setDraft(epic.humanEstimate === null ? '' : String(epic.humanEstimate));
      return;
    }
    if (n !== epic.humanEstimate) onHumanEstimateChange(n);
  };

  const handleRowClick: React.MouseEventHandler<HTMLTableRowElement> = (e) => {
    // Clicks that originate inside an interactive cell (input/button)
    // shouldn't toggle row selection — let those targets handle their own.
    const target = e.target as HTMLElement;
    if (target.closest('input,button,a')) return;
    onSelect();
  };

  const handleRowKey: React.KeyboardEventHandler<HTMLTableRowElement> = (e) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  const deltaColor =
    delta === null
      ? color.grayIII
      : delta > 0
        ? color.red
        : delta < 0
          ? color.grayV
          : color.black;

  const deltaLabel =
    delta === null ? '—' : delta > 0 ? `+${delta}` : String(delta);

  return (
    <tr
      data-testid={`epic-row-${epic.id}`}
      data-selected={isSelected ? 'true' : 'false'}
      aria-selected={isSelected}
      role="row"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={handleRowKey}
      onMouseEnter={(e) => {
        // Quality remediation Task 5-3: subtle row hover. Skip when
        // already selected so the active row's tint doesn't flicker.
        if (!isSelected) {
          (e.currentTarget as HTMLTableRowElement).style.background = color.neutral50;
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
        }
      }}
      style={{
        cursor: 'pointer',
        background: isSelected ? color.neutral50 : 'transparent',
        transition: 'background 0.12s ease',
      }}
    >
      <td style={cellBase}>
        <div
          data-testid={`epic-row-title-${epic.id}`}
          style={{
            fontWeight: fontWeight.normal,
            color: color.black,
            marginBottom: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>{epic.title}</span>
          {isLikelyDuplicate && (
            <span
              data-testid={`epic-row-duplicate-${epic.id}`}
              title="FRAME found another epic in this pod with a very similar title"
              style={{
                fontSize: '0.625rem',
                fontWeight: fontWeight.semibold,
                color: color.red,
                background: color.pastelI,
                border: `1px solid ${color.bordeauxI}`,
                borderRadius: 4,
                padding: '1px 6px',
                letterSpacing: '0.3px',
                textTransform: 'uppercase',
              }}
            >
              Likely duplicate
            </span>
          )}
        </div>
        <div
          data-testid={`epic-row-iid-${epic.id}`}
          style={{
            fontSize: '0.6875rem',
            color: color.grayIII,
            fontFamily: font.mono,
          }}
        >
          !{epic.iid}
        </div>
      </td>

      <td style={numericCell}>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          aria-label={`Human estimate for ${epic.title}`}
          data-testid={`epic-row-human-${epic.id}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.currentTarget as HTMLInputElement).blur();
            }
            if (e.key === 'Escape') {
              setDraft(epic.humanEstimate === null ? '' : String(epic.humanEstimate));
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          style={{
            width: 64,
            padding: '4px 8px',
            textAlign: 'right',
            border: `1px solid ${color.neutral200}`,
            borderRadius: 4,
            fontFamily: font.mono,
            fontSize: fontSize.sm,
            background: color.white,
            color: color.black,
            boxSizing: 'border-box',
          }}
        />
      </td>

      <td
        style={{
          ...numericCell,
          color: color.black,
          fontWeight: fontWeight.medium,
        }}
        data-testid={`epic-row-frame-${epic.id}`}
      >
        {frameEstimate ?? '—'}
      </td>

      <td
        style={{
          ...numericCell,
          fontWeight: fontWeight.medium,
          color: deltaColor,
        }}
        data-testid={`epic-row-delta-${epic.id}`}
      >
        {deltaLabel}
      </td>

      <td style={{ ...cellBase, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <VarianceBadge variance={variance} />
        </div>
      </td>

      <td
        style={{ ...numericCell, color: color.grayV }}
        data-testid={`epic-row-confidence-${epic.id}`}
      >
        {confidencePct === null ? '—' : `${confidencePct}%`}
      </td>
    </tr>
  );
}
