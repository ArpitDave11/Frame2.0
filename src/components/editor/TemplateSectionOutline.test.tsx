/**
 * Tests for TemplateSectionOutline — section navigator with completion status.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplateSectionOutline } from './TemplateSectionOutline';
import { useEpicStore } from '@/stores/epicStore';

beforeEach(() => {
  useEpicStore.setState(useEpicStore.getInitialState());
});

describe('TemplateSectionOutline', () => {
  it('returns null when no category is set', () => {
    const { container } = render(<TemplateSectionOutline />);
    expect(container.innerHTML).toBe('');
  });

  it('shows all expected sections for technical_design', () => {
    useEpicStore.setState({
      markdown: '',
      document: {
        title: 'Test',
        category: 'technical_design',
        sections: [],
        metadata: { createdAt: 0, lastRefined: null, complexity: 'moderate' },
      },
      complexity: 'moderate',
    });

    render(<TemplateSectionOutline />);
    const outline = screen.getByTestId('template-section-outline');
    expect(outline).toBeDefined();

    // Required sections for technical_design at moderate complexity
    expect(screen.getByText('Objective')).toBeDefined();
    expect(screen.getByText('Architecture Overview')).toBeDefined();
    expect(screen.getByText('Technical Requirements')).toBeDefined();
    expect(screen.getByText('Data Model')).toBeDefined();
    expect(screen.getByText('API Design')).toBeDefined();
    expect(screen.getByText('Implementation Plan')).toBeDefined();
    expect(screen.getByText('User Stories')).toBeDefined();
  });

  it('marks present sections with check', () => {
    useEpicStore.setState({
      markdown: '## Objective\n\nSome content\n\n## Architecture Overview\n\nMore content',
      document: {
        title: 'Test',
        category: 'technical_design',
        sections: [],
        metadata: { createdAt: 0, lastRefined: null, complexity: 'moderate' },
      },
      complexity: 'moderate',
    });

    render(<TemplateSectionOutline />);
    const checks = screen.getAllByTestId('section-present');
    expect(checks.length).toBe(2);
  });

  it('marks missing sections as incomplete', () => {
    useEpicStore.setState({
      markdown: '## Objective\n\nSome content',
      document: {
        title: 'Test',
        category: 'technical_design',
        sections: [],
        metadata: { createdAt: 0, lastRefined: null, complexity: 'moderate' },
      },
      complexity: 'moderate',
    });

    render(<TemplateSectionOutline />);
    const missing = screen.getAllByTestId('section-missing');
    // At least some sections should be missing
    expect(missing.length).toBeGreaterThan(0);
  });

  it('click on missing section calls onInsertSection', () => {
    useEpicStore.setState({
      markdown: '## Objective\n\nSome content',
      document: {
        title: 'Test',
        category: 'technical_design',
        sections: [],
        metadata: { createdAt: 0, lastRefined: null, complexity: 'moderate' },
      },
      complexity: 'moderate',
    });

    const onInsert = vi.fn();
    render(<TemplateSectionOutline onInsertSection={onInsert} />);

    // Find "Architecture Overview" which should be missing
    const archItem = screen.getByText('Architecture Overview');
    fireEvent.click(archItem.closest('[role="button"]')!);

    expect(onInsert).toHaveBeenCalledWith('Architecture Overview');
  });

  it('shows required labels for required sections', () => {
    useEpicStore.setState({
      markdown: '',
      document: {
        title: 'Test',
        category: 'technical_design',
        sections: [],
        metadata: { createdAt: 0, lastRefined: null, complexity: 'moderate' },
      },
      complexity: 'moderate',
    });

    render(<TemplateSectionOutline />);
    const requiredLabels = screen.getAllByTestId('required-label');
    expect(requiredLabels.length).toBeGreaterThan(0);
  });
});
