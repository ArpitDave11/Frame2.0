/**
 * VisualsCard — renders Mermaid diagrams from structured VisualsData.
 */

import type { VisualsData } from '@/services/docIntel/dataTypes';
import { MermaidPreview } from './MermaidPreview';

interface Props {
  data: VisualsData;
}

export function VisualsCard({ data }: Props) {
  if (!data.diagrams.length) {
    return (
      <p style={{
        color: 'var(--col-text-subtle)', fontStyle: 'italic', fontSize: 14,
        fontFamily: "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif",
      }}>
        No diagrams generated — try regenerating.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {data.diagrams.map((d, i) => (
        <MermaidPreview
          key={i}
          code={d.mermaid_source}
          title={d.title}
          caption={d.caption}
        />
      ))}
    </div>
  );
}
