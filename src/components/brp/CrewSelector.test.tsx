import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CrewSelector } from './CrewSelector';
import type { Crew } from '@/domain/brp';

const crew = (id: string, name: string): Crew => ({
  id,
  name,
  gitlabGroupId: Number(id) || 0,
  pods: [],
});

describe('CrewSelector', () => {
  it('renders all crew names as options', () => {
    render(
      <CrewSelector
        crews={[crew('1', 'Alpha'), crew('2', 'Bravo')]}
        selectedCrewId={null}
        onSelect={() => {}}
      />,
    );
    const select = screen.getByTestId('crew-selector-select') as HTMLSelectElement;
    const labels = Array.from(select.options).map((o) => o.textContent);
    expect(labels).toContain('Alpha');
    expect(labels).toContain('Bravo');
    // Plus the placeholder.
    expect(labels.length).toBe(3);
  });

  it('renders the placeholder when no crews', () => {
    render(<CrewSelector crews={[]} selectedCrewId={null} onSelect={() => {}} />);
    const select = screen.getByTestId('crew-selector-select') as HTMLSelectElement;
    expect(select.options[0]?.textContent).toBe('No crews loaded');
    expect(select.disabled).toBe(true);
  });

  it('uses the placeholder when crews exist but none selected', () => {
    render(
      <CrewSelector
        crews={[crew('1', 'Alpha')]}
        selectedCrewId={null}
        onSelect={() => {}}
      />,
    );
    const select = screen.getByTestId('crew-selector-select') as HTMLSelectElement;
    expect(select.options[0]?.textContent).toBe('Select a crew…');
    expect(select.disabled).toBe(false);
  });

  it('selecting a crew calls onSelect with the crew id', () => {
    const onSelect = vi.fn();
    render(
      <CrewSelector
        crews={[crew('1', 'Alpha'), crew('2', 'Bravo')]}
        selectedCrewId={null}
        onSelect={onSelect}
      />,
    );
    fireEvent.change(screen.getByTestId('crew-selector-select'), {
      target: { value: '2' },
    });
    expect(onSelect).toHaveBeenCalledWith('2');
  });

  it('selecting the empty option calls onSelect with null', () => {
    const onSelect = vi.fn();
    render(
      <CrewSelector
        crews={[crew('1', 'Alpha')]}
        selectedCrewId="1"
        onSelect={onSelect}
      />,
    );
    fireEvent.change(screen.getByTestId('crew-selector-select'), {
      target: { value: '' },
    });
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('reflects selectedCrewId as the controlled value', () => {
    render(
      <CrewSelector
        crews={[crew('1', 'Alpha'), crew('2', 'Bravo')]}
        selectedCrewId="2"
        onSelect={() => {}}
      />,
    );
    expect((screen.getByTestId('crew-selector-select') as HTMLSelectElement).value).toBe('2');
  });

  it('respects the disabled prop', () => {
    render(
      <CrewSelector
        crews={[crew('1', 'Alpha')]}
        selectedCrewId={null}
        onSelect={() => {}}
        disabled
      />,
    );
    expect((screen.getByTestId('crew-selector-select') as HTMLSelectElement).disabled).toBe(true);
  });
});
