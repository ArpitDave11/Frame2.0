import React from 'react';
import { CrewCard } from './CrewCard';

export interface CrewSummaryRailProps {
  crews: Array<{ id: string; name: string }>;
  headers: Array<{ id: string; text: string; assignedCrewIds: string[] }>;
  onAddCrew: () => void;
}

export const CrewSummaryRail: React.FC<CrewSummaryRailProps> = ({
  crews,
  headers,
  onAddCrew,
}) => {
  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      <button
        onClick={onAddCrew}
        style={{
          width: '100%',
          padding: '8px 12px',
          marginBottom: 12,
          cursor: 'pointer',
          border: '1px dashed #CCCABC',
          borderRadius: 8,
          background: 'transparent',
          fontSize: '0.85rem',
        }}
      >
        + New Crew
      </button>

      {crews.map((crew) => {
        const crewHeaders = headers.filter((h) =>
          h.assignedCrewIds.includes(crew.id),
        );
        return <CrewCard key={crew.id} crew={crew} headers={crewHeaders} />;
      })}
    </div>
  );
};

export default CrewSummaryRail;
