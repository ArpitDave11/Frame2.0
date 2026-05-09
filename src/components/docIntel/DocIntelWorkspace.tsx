/**
 * DocIntelWorkspace — main workspace showing analysis results.
 */

import { useDocIntelStore } from '@/stores/docIntelStore';
import { DocIntelHeader } from './DocIntelHeader';
import { SectionCard } from './SectionCard';
import { ExportBar } from './ExportBar';

export function DocIntelWorkspace() {
  const sections = useDocIntelStore((s) => s.sections);
  const phase = useDocIntelStore((s) => s.phase);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <DocIntelHeader />
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {sections.map((sec) => (
          <SectionCard key={sec.id} section={sec} />
        ))}
        {phase === 'ready' && <ExportBar />}
      </div>
    </div>
  );
}
