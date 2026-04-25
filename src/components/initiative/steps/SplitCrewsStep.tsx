/**
 * SplitCrewsStep — Step 3 of the Initiative wizard.
 *
 * Two-column layout: left shows filterable header list with crew chip
 * assignment; right shows the CrewSummaryRail. Top bar has Re-propose
 * and reasoning controls. Footer navigates between steps.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useInitiativeStore } from '@/stores/initiativeStore';
import { useConfigStore } from '@/stores/configStore';
import { HeaderRow } from '@/components/initiative/shared/HeaderRow';
import { CrewSummaryRail } from '@/components/initiative/shared/CrewSummaryRail';
import { proposeCrewSplit } from '@/services/ai/initiative/proposeCrewSplit';

export function SplitCrewsStep() {
  const {
    headers,
    crews,
    assignHeaderToCrew,
    unassignHeaderFromCrew,
    applyAiProposal,
    addCrew,
    setStep,
  } = useInitiativeStore();

  const config = useConfigStore((s) => s.config);

  const [filter, setFilter] = useState('');
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const didAutoPropose = useRef(false);

  // ─── Auto-propose on first mount if nothing assigned ──────
  useEffect(() => {
    if (didAutoPropose.current) return;
    const allEmpty = headers.every((h) => h.assignedCrewIds.length === 0);
    if (allEmpty && headers.length > 0 && crews.length > 0) {
      didAutoPropose.current = true;
      runProposal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Propose crew split ───────────────────────────────────
  async function runProposal() {
    setProposing(true);
    setError(null);
    const result = await proposeCrewSplit(
      config.ai.azure,
      config.endpoints.azureEndpoint,
      useInitiativeStore.getState().headers,
      useInitiativeStore.getState().crews,
    );
    setProposing(false);
    if (result.ok) {
      applyAiProposal(result.data.assignments);
      setReasoning(result.data.reasoning);
    } else {
      setError(result.error);
    }
  }

  // ─── Derived data ─────────────────────────────────────────
  const filteredHeaders = useMemo(() => {
    let list = headers;
    if (filter) {
      const lower = filter.toLowerCase();
      list = list.filter((h) => h.text.toLowerCase().includes(lower));
    }
    if (showUnassigned) {
      list = list.filter((h) => h.assignedCrewIds.length === 0);
    }
    return list;
  }, [headers, filter, showUnassigned]);

  const assignedCount = headers.filter((h) => h.assignedCrewIds.length > 0).length;
  const unassignedCount = headers.length - assignedCount;
  const emptyCrews = crews.filter(
    (c) => !headers.some((h) => h.assignedCrewIds.includes(c.id)),
  );
  const canProceed = emptyCrews.length === 0 && crews.length > 0;

  // ─── Handlers ─────────────────────────────────────────────
  function handleAddCrew() {
    const name = window.prompt('Crew name:');
    if (name?.trim()) addCrew(name.trim());
  }

  // ─── Render ───────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      {/* ── Top bar ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button
          onClick={runProposal}
          disabled={proposing || crews.length === 0}
          style={{
            padding: '6px 14px',
            background: '#E60000',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: proposing || crews.length === 0 ? 'not-allowed' : 'pointer',
            opacity: proposing || crews.length === 0 ? 0.5 : 1,
            fontSize: '0.85rem',
          }}
        >
          {proposing ? 'Proposing...' : 'Re-propose'}
        </button>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowReasoning((v) => !v)}
            disabled={!reasoning}
            style={{
              padding: '6px 14px',
              background: 'transparent',
              border: '1px solid #CCCABC',
              borderRadius: 6,
              cursor: reasoning ? 'pointer' : 'not-allowed',
              opacity: reasoning ? 1 : 0.5,
              fontSize: '0.85rem',
            }}
          >
            Why these crews?
          </button>

          {showReasoning && reasoning && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: 4,
                padding: 12,
                background: '#fff',
                border: '1px solid #CCCABC',
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                width: 340,
                maxHeight: 220,
                overflowY: 'auto',
                zIndex: 20,
                fontSize: '0.85rem',
                whiteSpace: 'pre-wrap',
              }}
            >
              {reasoning}
            </div>
          )}
        </div>

        {error && (
          <span style={{ color: '#E60000', fontSize: '0.8rem' }}>{error}</span>
        )}
      </div>

      {/* ── Two-column body ─────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, gap: 16, minHeight: 0 }}>
        {/* Left column — headers */}
        <div style={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Filter bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexShrink: 0 }}>
            <input
              type="text"
              placeholder="Filter headers..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                flex: 1,
                padding: '6px 10px',
                border: '1px solid #CCCABC',
                borderRadius: 6,
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={showUnassigned}
                onChange={(e) => setShowUnassigned(e.target.checked)}
              />
              Show unassigned
            </label>
            <span style={{ fontSize: '0.8rem', color: '#666', whiteSpace: 'nowrap' }}>
              {assignedCount}/{headers.length} assigned | {unassignedCount} unassigned
            </span>
          </div>

          {/* Scrollable header list */}
          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #CCCABC', borderRadius: 8, padding: 8 }}>
            {filteredHeaders.length === 0 ? (
              <div style={{ color: '#999', fontSize: '0.85rem', padding: 12 }}>
                {headers.length === 0 ? 'No headers parsed yet.' : 'No headers match the current filter.'}
              </div>
            ) : (
              filteredHeaders.map((h) => (
                <HeaderRow
                  key={h.id}
                  header={h}
                  crews={crews}
                  onAssign={assignHeaderToCrew}
                  onUnassign={unassignHeaderFromCrew}
                />
              ))
            )}
          </div>
        </div>

        {/* Right column — crew rail */}
        <div style={{ flex: '0 0 40%', minHeight: 0 }}>
          <CrewSummaryRail
            crews={crews}
            headers={headers}
            onAddCrew={handleAddCrew}
          />
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', flexShrink: 0, paddingTop: 8 }}>
        <button
          onClick={() => setStep('streamEpic')}
          style={{
            padding: '8px 18px',
            background: 'transparent',
            border: '1px solid #CCCABC',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          &larr; Back
        </button>
        <button
          onClick={() => setStep('refineCrews')}
          disabled={!canProceed}
          title={
            !canProceed
              ? `${emptyCrews.length} crew(s) have no assigned headers`
              : undefined
          }
          style={{
            padding: '8px 18px',
            background: canProceed ? '#E60000' : '#ccc',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: canProceed ? 'pointer' : 'not-allowed',
            fontSize: '0.85rem',
          }}
        >
          Refine Crew Epics &rarr;
        </button>
      </div>
    </div>
  );
}

export default SplitCrewsStep;
