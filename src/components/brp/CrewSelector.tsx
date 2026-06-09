/**
 * CrewSelector — controlled dropdown listing the loaded BRP crews (B-23).
 *
 * Pure presentational. Caller plumbs `crews` + `selectedCrewId` from the
 * brpStore and reacts to `onSelect`. Disabled when `crews` is empty —
 * the planner should run the Load action first.
 */

import type { Crew } from '@/domain/brp';
import { color, font, fontSize, fontWeight, radius } from '@/theme/tokens';

export interface CrewSelectorProps {
  crews: Crew[];
  selectedCrewId: string | null;
  onSelect: (crewId: string | null) => void;
  disabled?: boolean;
}

export function CrewSelector({
  crews,
  selectedCrewId,
  onSelect,
  disabled = false,
}: CrewSelectorProps) {
  const empty = crews.length === 0;
  const effectiveDisabled = disabled || empty;

  return (
    <span
      data-testid="crew-selector"
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: font.sans,
      }}
    >
      <select
        data-testid="crew-selector-select"
        aria-label="Crew"
        value={selectedCrewId ?? ''}
        disabled={effectiveDisabled}
        onChange={(e) => onSelect(e.target.value === '' ? null : e.target.value)}
        style={{
          padding: '6px 12px',
          border: `1px solid ${color.neutral200}`,
          borderRadius: radius.sm,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.normal,
          background: color.white,
          color: color.black,
          cursor: effectiveDisabled ? 'not-allowed' : 'pointer',
          opacity: effectiveDisabled ? 0.5 : 1,
          fontFamily: font.sans,
        }}
      >
        <option value="">
          {empty ? 'No crews loaded' : 'Select a crew…'}
        </option>
        {crews.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </span>
  );
}
