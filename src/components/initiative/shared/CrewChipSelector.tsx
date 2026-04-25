import { useState, useRef, useEffect } from 'react';

interface CrewChipSelectorProps {
  assignedCrewIds: string[];
  crews: Array<{ id: string; name: string }>;
  onAssign: (crewId: string) => void;
  onUnassign: (crewId: string) => void;
}

const chipStyle: React.CSSProperties = {
  background: '#E6000020',
  border: '1px solid #E60000',
  borderRadius: 12,
  padding: '2px 8px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 13,
};

export function CrewChipSelector({ assignedCrewIds, crews, onAssign, onUnassign }: CrewChipSelectorProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const assignedSet = new Set(assignedCrewIds);
  const assignedCrews = crews.filter((c) => assignedSet.has(c.id));
  const unassignedCrews = crews
    .filter((c) => !assignedSet.has(c.id))
    .filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div ref={containerRef} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, position: 'relative', flexWrap: 'wrap' }}>
      {assignedCrews.map((crew) => (
        <span key={crew.id} style={chipStyle}>
          {crew.name}
          <button
            aria-label={`Remove ${crew.name}`}
            onClick={() => onUnassign(crew.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontSize: 13,
              lineHeight: 1,
              color: 'inherit',
            }}
          >
            ×
          </button>
        </span>
      ))}
      <button
        onClick={() => { setOpen(!open); setFilter(''); }}
        style={{
          background: 'none',
          border: '1px dashed #999',
          borderRadius: 12,
          padding: '2px 8px',
          cursor: 'pointer',
          fontSize: 13,
        }}
      >
        + Assign
      </button>
      {open && (
        <div
          data-testid="crew-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            zIndex: 10,
            minWidth: 160,
          }}
        >
          <input
            data-testid="crew-filter-input"
            type="text"
            placeholder="Filter…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '4px 8px', border: 'none', borderBottom: '1px solid #eee', outline: 'none', fontSize: 13 }}
          />
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 160, overflowY: 'auto' }}>
            {unassignedCrews.map((crew) => (
              <li
                key={crew.id}
                onClick={() => { onAssign(crew.id); setOpen(false); }}
                style={{ padding: '6px 8px', cursor: 'pointer', fontSize: 13 }}
              >
                {crew.name}
              </li>
            ))}
            {unassignedCrews.length === 0 && (
              <li style={{ padding: '6px 8px', color: '#999', fontSize: 13 }}>No crews available</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
