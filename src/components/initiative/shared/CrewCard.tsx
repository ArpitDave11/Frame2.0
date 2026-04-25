import React from 'react';

export interface CrewCardProps {
  crew: { id: string; name: string };
  headers: Array<{ id: string; text: string; assignedCrewIds: string[] }>;
}

const SharedHeaderBadge: React.FC = () => (
  <span
    style={{
      fontSize: '0.75rem',
      marginLeft: 4,
      opacity: 0.7,
    }}
    title="Shared across multiple crews"
  >
    ⇄
  </span>
);

export const CrewCard: React.FC<CrewCardProps> = ({ crew, headers }) => {
  const visible = headers.slice(0, 3);
  const remaining = headers.length - visible.length;

  return (
    <div
      style={{
        border: '1px solid #CCCABC',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <strong>{crew.name}</strong>
        <span
          style={{
            fontSize: '0.75rem',
            background: '#EEEEE4',
            borderRadius: 10,
            padding: '2px 8px',
          }}
        >
          {headers.length}
        </span>
      </div>

      {headers.length === 0 ? (
        <p style={{ color: '#999', fontSize: '0.85rem', margin: 0 }}>
          No headers assigned yet
        </p>
      ) : (
        <>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.85rem' }}>
            {visible.map((h) => (
              <li key={h.id}>
                {h.text}
                {h.assignedCrewIds.length >= 2 && <SharedHeaderBadge />}
              </li>
            ))}
          </ul>
          {remaining > 0 && (
            <p style={{ color: '#888', fontSize: '0.8rem', margin: '4px 0 0 18px' }}>
              +{remaining} more
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default CrewCard;
