import React, { useCallback } from 'react';
import { useInitiativeStore } from '@/stores/initiativeStore';
import { StreamCombobox } from '../shared/StreamCombobox';

const FONT_FAMILY = "Frutiger, Arial, Helvetica, sans-serif";

const CREW_DEFAULTS = [
  'Crew Alpha', 'Crew Beta', 'Crew Gamma', 'Crew Delta', 'Crew Epsilon',
  'Crew Zeta', 'Crew Eta', 'Crew Theta', 'Crew Iota', 'Crew Kappa',
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px 12px',
  border: '1px solid #CCCABC',
  borderRadius: 6,
  fontSize: '0.875rem',
  fontFamily: FONT_FAMILY,
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 500,
  marginBottom: 4,
  fontFamily: FONT_FAMILY,
};

export function InitStep() {
  const streams = useInitiativeStore((s) => s.streams);
  const selectedStreamId = useInitiativeStore((s) => s.selectedStreamId);
  const title = useInitiativeStore((s) => s.title);
  const description = useInitiativeStore((s) => s.description);
  const crews = useInitiativeStore((s) => s.crews);
  const setStep = useInitiativeStore((s) => s.setStep);
  const selectStream = useInitiativeStore((s) => s.selectStream);
  const createStream = useInitiativeStore((s) => s.createStream);
  const setTitle = useInitiativeStore((s) => s.setTitle);
  const setDescription = useInitiativeStore((s) => s.setDescription);
  const addCrew = useInitiativeStore((s) => s.addCrew);
  const removeCrew = useInitiativeStore((s) => s.removeCrew);
  const renameCrew = useInitiativeStore((s) => s.renameCrew);

  const [aiSuggest, setAiSuggest] = React.useState(false);

  const crewCount = crews.length;

  // ── Crew count stepper ──────────────────────────────────
  const setCrewCount = useCallback(
    (target: number) => {
      const clamped = Math.max(2, Math.min(10, target));
      if (clamped > crewCount) {
        for (let i = crewCount; i < clamped; i++) {
          addCrew(CREW_DEFAULTS[i] ?? `Crew ${i + 1}`);
        }
      } else if (clamped < crewCount) {
        // Remove from end
        const toRemove = crews.slice(clamped);
        for (const c of toRemove) removeCrew(c.id);
      }
    },
    [crewCount, crews, addCrew, removeCrew],
  );

  // Ensure at least 2 crews on mount
  React.useEffect(() => {
    if (crews.length < 2) {
      const needed = 2 - crews.length;
      for (let i = 0; i < needed; i++) {
        addCrew(CREW_DEFAULTS[crews.length + i] ?? `Crew ${crews.length + i + 1}`);
      }
    }
    // Run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStreamCreate = useCallback(
    (name: string) => {
      const s = createStream(name);
      selectStream(s.id);
    },
    [createStream, selectStream],
  );

  const canProceed = title.trim().length > 0 && selectedStreamId !== null;

  return (
    <div
      data-testid="init-step"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        maxWidth: 560,
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* Stream selector */}
      <StreamCombobox
        streams={streams}
        selectedStreamId={selectedStreamId}
        onSelect={selectStream}
        onCreate={handleStreamCreate}
      />

      {/* Title */}
      <div>
        <label style={labelStyle}>Title</label>
        <input
          data-testid="init-title-input"
          type="text"
          placeholder="Initiative title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Description */}
      <div>
        <label style={labelStyle}>Description</label>
        <textarea
          data-testid="init-description-input"
          placeholder="Brief description of the initiative..."
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {/* Crew count stepper */}
      <div>
        <label style={labelStyle}>How many crews?</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            data-testid="crew-decrement"
            type="button"
            onClick={() => setCrewCount(crewCount - 1)}
            disabled={crewCount <= 2}
            style={{
              width: 32,
              height: 32,
              border: '1px solid #CCCABC',
              borderRadius: 6,
              background: crewCount <= 2 ? '#F5F0E1' : '#FFFFFF',
              cursor: crewCount <= 2 ? 'not-allowed' : 'pointer',
              fontSize: 16,
              fontWeight: 500,
              fontFamily: FONT_FAMILY,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            -
          </button>
          <span
            data-testid="crew-count-display"
            style={{
              minWidth: 28,
              textAlign: 'center',
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            {crewCount}
          </span>
          <button
            data-testid="crew-increment"
            type="button"
            onClick={() => setCrewCount(crewCount + 1)}
            disabled={crewCount >= 10}
            style={{
              width: 32,
              height: 32,
              border: '1px solid #CCCABC',
              borderRadius: 6,
              background: crewCount >= 10 ? '#F5F0E1' : '#FFFFFF',
              cursor: crewCount >= 10 ? 'not-allowed' : 'pointer',
              fontSize: 16,
              fontWeight: 500,
              fontFamily: FONT_FAMILY,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* Crew name inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={labelStyle}>Crew names</label>
        {crews.map((crew, idx) => (
          <input
            key={crew.id}
            data-testid={`crew-name-input-${idx}`}
            type="text"
            value={crew.name}
            onChange={(e) => renameCrew(crew.id, e.target.value)}
            disabled={aiSuggest}
            style={{
              ...inputStyle,
              opacity: aiSuggest ? 0.6 : 1,
            }}
          />
        ))}
      </div>

      {/* AI suggest checkbox */}
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.875rem',
          fontFamily: FONT_FAMILY,
          cursor: 'pointer',
        }}
      >
        <input
          data-testid="ai-suggest-checkbox"
          type="checkbox"
          checked={aiSuggest}
          onChange={(e) => setAiSuggest(e.target.checked)}
        />
        Let AI suggest crew names
      </label>

      {/* Footer: Generate button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
        <button
          data-testid="generate-stream-epic-btn"
          type="button"
          disabled={!canProceed}
          onClick={() => setStep('streamEpic')}
          style={{
            padding: '10px 24px',
            border: 'none',
            borderRadius: 6,
            background: canProceed ? '#E60000' : '#CCCABC',
            color: '#FFFFFF',
            fontSize: '0.875rem',
            fontWeight: 500,
            fontFamily: FONT_FAMILY,
            cursor: canProceed ? 'pointer' : 'not-allowed',
            opacity: canProceed ? 1 : 0.7,
          }}
        >
          Generate Stream Epic &rarr;
        </button>
      </div>
    </div>
  );
}

export default InitStep;
