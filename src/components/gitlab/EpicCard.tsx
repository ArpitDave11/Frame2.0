/**
 * EpicCard — Single epic row in the load modal list.
 *
 * Pixel-matches prototype App.tsx lines 464-486.
 */

import { useState } from 'react';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export interface EpicCardProps {
  title: string;
  iid: number;
  state: string;
  onClick: () => void;
}

export function EpicCard({ title, iid, state, onClick }: EpicCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      data-testid="epic-card"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--col-border-illustrative)',
        cursor: 'pointer',
        fontSize: 13,
        color: 'var(--col-text-subtle)',
        fontWeight: 300,
        display: 'flex',
        justifyContent: 'space-between',
        transition: 'background .1s',
        fontFamily: F,
        background: hovered ? 'var(--input-background)' : 'transparent',
      }}
    >
      <span style={{ color: 'var(--col-text-primary)' }}>
        {title} {'\u2014'} #{iid}
      </span>
      <span
        style={{
          fontSize: 11,
          color: 'var(--col-muted-foreground)',
        }}
      >
        {state}
      </span>
    </div>
  );
}
