/**
 * DocIntelView — root component for Document Intelligence tab.
 * Routes between empty state, loading, and workspace based on phase.
 */

import { useState } from 'react';
import { Spinner } from '@phosphor-icons/react';
import { useDocIntelStore } from '@/stores/docIntelStore';
import { DocIntelEmptyState } from './DocIntelEmptyState';
import { DocIntelWorkspace } from './DocIntelWorkspace';
import { runDocIntelAnalysis } from '@/services/docIntel/analyzeAction';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export default function DocIntelView() {
  const phase = useDocIntelStore((s) => s.phase);
  const [uploading, setUploading] = useState(false);

  const handleFileSelected = async (file: File) => {
    setUploading(true);
    await runDocIntelAnalysis(file);
    setUploading(false);
  };

  if (phase === 'empty' && !uploading) {
    return <DocIntelEmptyState onFileSelected={handleFileSelected} />;
  }

  if (uploading || phase === 'analyzing') {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', fontFamily: F, gap: 16,
      }}>
        <Spinner size={32} className="animate-spin" color="var(--col-background-brand)" />
        <span style={{ fontSize: 14, color: 'var(--col-text-subtle)' }}>
          {phase === 'analyzing' ? 'Analyzing document...' : 'Uploading and extracting...'}
        </span>
      </div>
    );
  }

  return <DocIntelWorkspace />;
}
