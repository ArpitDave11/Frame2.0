import { useState, useRef, useEffect } from 'react';
import type { Stream } from '@/stores/initiativeStore';

export interface StreamComboboxProps {
  streams: Stream[];
  selectedStreamId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
}

export function StreamCombobox({ streams, selectedStreamId, onSelect, onCreate }: StreamComboboxProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedStream = streams.find((s) => s.id === selectedStreamId);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = streams.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase()),
  );

  const exactMatch = streams.some(
    (s) => s.name.toLowerCase() === query.trim().toLowerCase(),
  );

  const handleSelect = (id: string) => {
    onSelect(id);
    const stream = streams.find((s) => s.id === id);
    if (stream) setQuery(stream.name);
    setOpen(false);
  };

  const handleCreate = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <label
        style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: 500,
          marginBottom: 4,
          fontFamily: "Frutiger, Arial, Helvetica, sans-serif",
        }}
      >
        Stream
      </label>
      <input
        data-testid="stream-combobox-input"
        type="text"
        placeholder={selectedStream ? selectedStream.name : 'Search or create a stream...'}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '8px 12px',
          border: '1px solid #CCCABC',
          borderRadius: 6,
          fontSize: '0.875rem',
          fontFamily: "Frutiger, Arial, Helvetica, sans-serif",
          outline: 'none',
        }}
      />
      {open && (filtered.length > 0 || (query.trim() && !exactMatch)) && (
        <ul
          data-testid="stream-combobox-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            margin: 0,
            padding: 0,
            listStyle: 'none',
            border: '1px solid #CCCABC',
            borderRadius: 6,
            background: '#FFFFFF',
            maxHeight: 200,
            overflowY: 'auto',
            zIndex: 10,
            marginTop: 4,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        >
          {filtered.map((s) => (
            <li
              key={s.id}
              data-testid={`stream-option-${s.id}`}
              onClick={() => handleSelect(s.id)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontFamily: "Frutiger, Arial, Helvetica, sans-serif",
                background: s.id === selectedStreamId ? '#F5F0E1' : 'transparent',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLLIElement).style.background = '#F5F0E1';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLLIElement).style.background =
                  s.id === selectedStreamId ? '#F5F0E1' : 'transparent';
              }}
            >
              {s.name}
            </li>
          ))}
          {query.trim() && !exactMatch && (
            <li
              data-testid="stream-create-option"
              onClick={handleCreate}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontFamily: "Frutiger, Arial, Helvetica, sans-serif",
                color: '#E60000',
                fontWeight: 500,
                borderTop: filtered.length > 0 ? '1px solid #CCCABC' : 'none',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLLIElement).style.background = '#F5F0E1';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLLIElement).style.background = 'transparent';
              }}
            >
              Create &lsquo;{query.trim()}&rsquo;
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export default StreamCombobox;
