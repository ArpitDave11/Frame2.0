/**
 * RefineCrewsStep — Final step of the Extreme Initiative wizard.
 *
 * Sequentially calls AI to refine each crew epic, shows progress,
 * allows preview / retry, and publishes when all crews are done.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useInitiativeStore } from '@/stores/initiativeStore';
import { useConfigStore } from '@/stores/configStore';
import { useUiStore } from '@/stores/uiStore';
import { refineCrewEpic } from '@/services/ai/initiative/refineCrewEpic';
import type { Crew, Header } from '@/stores/initiativeStore';

// ─── Styles ────────────────────────────────────────────────

const FONT_STACK = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  overflow: 'hidden',
  fontFamily: FONT_STACK,
};

const cardStyle: React.CSSProperties = {
  border: '1px solid #CCCABC',
  borderRadius: 8,
  padding: 16,
  marginBottom: 12,
};

const footerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingTop: 16,
  borderTop: '1px solid #EEEDEB',
  marginTop: 16,
};

const btnBase: React.CSSProperties = {
  fontFamily: FONT_STACK,
  fontSize: 14,
  padding: '8px 20px',
  borderRadius: 6,
  cursor: 'pointer',
  border: '1px solid #CCCABC',
  background: '#fff',
};

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  background: '#1A1A1A',
  color: '#fff',
  border: '1px solid #1A1A1A',
};

const previewBoxStyle: React.CSSProperties = {
  marginTop: 12,
  padding: 12,
  border: '1px solid #EEEDEB',
  borderRadius: 6,
  backgroundColor: '#FAFAF8',
  fontFamily: 'monospace',
  fontSize: 13,
  whiteSpace: 'pre-wrap',
  maxHeight: 300,
  overflow: 'auto',
};

// ─── Status helpers ────────────────────────────────────────

function statusIcon(status: Crew['refineStatus']): string {
  switch (status) {
    case 'pending':  return '\u23F3';
    case 'refining': return '\u27F3';
    case 'done':     return '\u2713';
    case 'error':    return '\u2717';
  }
}

function statusColor(status: Crew['refineStatus']): string {
  switch (status) {
    case 'done':  return '#00A651';
    case 'error': return '#E60000';
    default:      return '#666';
  }
}

function statusLabel(status: Crew['refineStatus']): string | null {
  switch (status) {
    case 'refining': return 'Refining...';
    case 'done':     return 'Done';
    case 'error':    return 'Error';
    default:         return null;
  }
}

// ─── Component ─────────────────────────────────────────────

export default function RefineCrewsStep() {
  const {
    crews,
    headers,
    streamEpicMarkdown,
    setCrewRefineStatus,
    setCrewRefinedEpic,
    setStep,
  } = useInitiativeStore();

  const config = useConfigStore((s) => s.config);
  const addToast = useUiStore((s) => s.addToast);

  const [expandedCrewId, setExpandedCrewId] = useState<string | null>(null);
  const runningRef = useRef(false);

  // Derive assigned headers for a given crew
  const getAssignedHeaders = useCallback(
    (crewId: string): Header[] =>
      headers.filter((h) => h.assignedCrewIds.includes(crewId)),
    [headers],
  );

  // Refine a single crew
  const refineSingle = useCallback(
    async (crew: Crew) => {
      setCrewRefineStatus(crew.id, 'refining');
      const assigned = getAssignedHeaders(crew.id);
      const result = await refineCrewEpic(
        config.ai.azure,
        config.endpoints.azureEndpoint,
        crew.name,
        assigned,
        streamEpicMarkdown,
      );
      if (result.ok) {
        setCrewRefinedEpic(crew.id, result.data);
        setCrewRefineStatus(crew.id, 'done');
      } else {
        setCrewRefineStatus(crew.id, 'error');
      }
    },
    [config, streamEpicMarkdown, getAssignedHeaders, setCrewRefineStatus, setCrewRefinedEpic],
  );

  // On mount, sequentially refine all pending crews
  useEffect(() => {
    if (runningRef.current) return;
    runningRef.current = true;

    const pending = useInitiativeStore
      .getState()
      .crews.filter((c) => c.refineStatus === 'pending');

    (async () => {
      for (const crew of pending) {
        await refineSingle(crew);
      }
      runningRef.current = false;
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Progress counts
  const doneCount = crews.filter((c) => c.refineStatus === 'done').length;
  const allDone = crews.length > 0 && crews.every((c) => c.refineStatus === 'done');

  const handlePublish = () => {
    addToast({
      type: 'success',
      title: 'Initiative refined! Select a crew epic to publish.',
    });
  };

  const handleRetry = (crew: Crew) => {
    refineSingle(crew);
  };

  const togglePreview = (crewId: string) => {
    setExpandedCrewId((prev) => (prev === crewId ? null : crewId));
  };

  return (
    <div style={containerStyle} data-testid="refine-crews-step">
      {/* Progress text */}
      <p style={{ margin: '0 0 16px', fontSize: 14, color: '#666' }}>
        {doneCount} of {crews.length} crews refined
      </p>

      {/* Crew cards */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {crews.map((crew) => (
          <div key={crew.id} style={cardStyle} data-testid={`crew-card-${crew.id}`}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 18,
                    color: statusColor(crew.refineStatus),
                  }}
                >
                  {statusIcon(crew.refineStatus)}
                </span>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{crew.name}</span>
                {statusLabel(crew.refineStatus) && (
                  <span
                    style={{
                      fontSize: 13,
                      color: statusColor(crew.refineStatus),
                      fontStyle: crew.refineStatus === 'refining' ? 'italic' : 'normal',
                    }}
                  >
                    {statusLabel(crew.refineStatus)}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {crew.refineStatus === 'error' && (
                  <button
                    style={{ ...btnBase, fontSize: 13, padding: '4px 12px', color: '#E60000' }}
                    onClick={() => handleRetry(crew)}
                  >
                    Retry
                  </button>
                )}
                {crew.refineStatus === 'done' && (
                  <button
                    style={{ ...btnBase, fontSize: 13, padding: '4px 12px' }}
                    onClick={() => togglePreview(crew.id)}
                  >
                    {expandedCrewId === crew.id ? 'Hide' : 'Preview'}
                  </button>
                )}
              </div>
            </div>

            {/* Expandable preview */}
            {expandedCrewId === crew.id && crew.refinedEpic && (
              <div style={previewBoxStyle}>{crew.refinedEpic}</div>
            )}
          </div>
        ))}
      </div>

      {/* Footer navigation */}
      <div style={footerStyle}>
        <button style={btnBase} onClick={() => setStep('splitCrews')}>
          &larr; Back
        </button>
        <button
          style={{
            ...btnPrimary,
            ...(allDone ? {} : { opacity: 0.4, cursor: 'not-allowed' }),
          }}
          disabled={!allDone}
          onClick={handlePublish}
        >
          Publish Initiative &rarr;
        </button>
      </div>
    </div>
  );
}
