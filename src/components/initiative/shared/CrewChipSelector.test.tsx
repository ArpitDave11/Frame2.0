import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CrewChipSelector } from './CrewChipSelector';

const crews = [
  { id: 'c1', name: 'Alpha' },
  { id: 'c2', name: 'Bravo' },
  { id: 'c3', name: 'Charlie' },
];

describe('CrewChipSelector', () => {
  it('renders chips for assigned crews', () => {
    render(
      <CrewChipSelector assignedCrewIds={['c1', 'c2']} crews={crews} onAssign={vi.fn()} onUnassign={vi.fn()} />,
    );
    expect(screen.getByText('Alpha')).toBeDefined();
    expect(screen.getByText('Bravo')).toBeDefined();
    expect(screen.queryByText('Charlie')).toBeNull();
  });

  it('calls onUnassign when × clicked', () => {
    const onUnassign = vi.fn();
    render(
      <CrewChipSelector assignedCrewIds={['c1']} crews={crews} onAssign={vi.fn()} onUnassign={onUnassign} />,
    );
    fireEvent.click(screen.getByLabelText('Remove Alpha'));
    expect(onUnassign).toHaveBeenCalledWith('c1');
  });

  it('shows dropdown with unassigned crews on "+ Assign" click', () => {
    render(
      <CrewChipSelector assignedCrewIds={['c1']} crews={crews} onAssign={vi.fn()} onUnassign={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('+ Assign'));
    const dropdown = screen.getByTestId('crew-dropdown');
    expect(dropdown).toBeDefined();
    expect(screen.getByText('Bravo')).toBeDefined();
    expect(screen.getByText('Charlie')).toBeDefined();
  });

  it('calls onAssign when crew selected from dropdown', () => {
    const onAssign = vi.fn();
    render(
      <CrewChipSelector assignedCrewIds={['c1']} crews={crews} onAssign={onAssign} onUnassign={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('+ Assign'));
    fireEvent.click(screen.getByText('Bravo'));
    expect(onAssign).toHaveBeenCalledWith('c2');
  });

  it('closes dropdown after selecting a crew', () => {
    render(
      <CrewChipSelector assignedCrewIds={['c1']} crews={crews} onAssign={vi.fn()} onUnassign={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('+ Assign'));
    fireEvent.click(screen.getByText('Bravo'));
    expect(screen.queryByTestId('crew-dropdown')).toBeNull();
  });

  it('filters dropdown by text input', () => {
    render(
      <CrewChipSelector assignedCrewIds={[]} crews={crews} onAssign={vi.fn()} onUnassign={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('+ Assign'));
    fireEvent.change(screen.getByTestId('crew-filter-input'), { target: { value: 'bra' } });
    expect(screen.getByText('Bravo')).toBeDefined();
    expect(screen.queryByText('Alpha')).toBeNull();
    expect(screen.queryByText('Charlie')).toBeNull();
  });
});
