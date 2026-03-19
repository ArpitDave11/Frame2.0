/**
 * ImpulseLine + Keyline — UBS brand accent components.
 * Pixel-matched to UI_Prototype ImpulseLine.tsx.
 */

import type { ReactNode } from 'react';

export function ImpulseLine({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        paddingLeft: 20,
        borderLeft: '4px solid var(--col-background-brand)',
      }}
    >
      {children}
    </div>
  );
}

export function Keyline() {
  return (
    <span
      style={{
        display: 'block',
        height: 4,
        width: 60,
        marginTop: 8,
        background: 'var(--col-background-brand)',
      }}
    />
  );
}
