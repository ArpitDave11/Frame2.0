/**
 * CrewSelector — controlled dropdown listing the loaded BRP crews (B-23).
 *
 * Pure presentational. Caller plumbs `crews` + `selectedCrewId` from the
 * brpStore and reacts to `onSelect`. Disabled when `crews` is empty —
 * the planner should run the Load action first.
 */

import { CaretDown } from '@phosphor-icons/react';
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
    <label
      data-testid="crew-selector"
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: 4,
        fontFamily: font.sans,
        fontSize: fontSize.xs,
        color: color.grayV,
      }}
    >
      <span style={{ fontWeight: fontWeight.medium }}>Crew</span>
      <span
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        <select
          data-testid="crew-selector-select"
          value={selectedCrewId ?? ''}
          disabled={effectiveDisabled}
          onChange={(e) => onSelect(e.target.value === '' ? null : e.target.value)}
          style={{
            appearance: 'none',
            background: color.white,
            border: `1px solid ${color.neutral200}`,
            borderRadius: radius.sm,
            padding: '8px 32px 8px 12px',
            fontFamily: font.sans,
            fontSize: fontSize.sm,
            color: color.black,
            minWidth: 220,
            cursor: effectiveDisabled ? 'not-allowed' : 'pointer',
            opacity: effectiveDisabled ? 0.5 : 1,
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
        <CaretDown
          size={14}
          weight="bold"
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: 10,
            color: color.grayIII,
            pointerEvents: 'none',
          }}
        />
      </span>
    </label>
  );
}
