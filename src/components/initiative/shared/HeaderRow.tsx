import { CrewChipSelector } from './CrewChipSelector';
import { SharedHeaderBadge } from './SharedHeaderBadge';

interface HeaderRowProps {
  header: {
    id: string;
    text: string;
    level: 2 | 3;
    assignedCrewIds: string[];
    aiAssigned: boolean;
  };
  crews: Array<{ id: string; name: string }>;
  onAssign: (headerId: string, crewId: string) => void;
  onUnassign: (headerId: string, crewId: string) => void;
}

export function HeaderRow({ header, crews, onAssign, onUnassign }: HeaderRowProps) {
  const isH2 = header.level === 2;

  return (
    <div
      data-testid={`header-row-${header.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        paddingLeft: isH2 ? 0 : 24,
        marginBottom: 4,
      }}
    >
      <span style={{ fontWeight: isH2 ? 700 : 400, fontSize: isH2 ? 15 : 14 }}>
        {header.text}
      </span>
      <SharedHeaderBadge count={header.assignedCrewIds.length} />
      <CrewChipSelector
        assignedCrewIds={header.assignedCrewIds}
        crews={crews}
        onAssign={(crewId) => onAssign(header.id, crewId)}
        onUnassign={(crewId) => onUnassign(header.id, crewId)}
      />
    </div>
  );
}
