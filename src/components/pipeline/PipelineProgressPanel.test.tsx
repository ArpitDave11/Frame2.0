/**
 * Tests for PipelineProgressPanel — T-8.1.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PipelineProgressPanel } from './PipelineProgressPanel';
import { usePipelineStore } from '@/stores/pipelineStore';

beforeEach(() => {
  usePipelineStore.setState(usePipelineStore.getInitialState());
});

describe('PipelineProgressPanel', () => {
  it('renders all 6 stages with names', () => {
    render(<PipelineProgressPanel />);
    const names = [
      'Comprehension',
      'Classification',
      'Structural',
      'Refinement',
      'Mandatory',
      'Validation',
    ];
    for (const name of names) {
      expect(screen.getByText(name)).toBeDefined();
    }
  });

  it('initial state shows all stages as pending with numbers 1-6', () => {
    render(<PipelineProgressPanel />);
    for (let i = 1; i <= 6; i++) {
      const indicator = screen.getByTestId(`stage-indicator-${i}`);
      expect(indicator.textContent).toBe(String(i));
    }
  });

  it('running stage has brand color indicator', () => {
    usePipelineStore.setState({
      stages: {
        1: { status: 'complete', message: '' },
        2: { status: 'running', message: 'Processing' },
        3: { status: 'pending', message: '' },
        4: { status: 'pending', message: '' },
        5: { status: 'pending', message: '' },
        6: { status: 'pending', message: '' },
      },
    });
    render(<PipelineProgressPanel />);
    const indicator = screen.getByTestId('stage-indicator-2');
    expect(indicator.style.background).toBe('var(--col-background-brand)');
  });

  it('complete stage has green check', () => {
    usePipelineStore.setState({
      stages: {
        1: { status: 'complete', message: '' },
        2: { status: 'pending', message: '' },
        3: { status: 'pending', message: '' },
        4: { status: 'pending', message: '' },
        5: { status: 'pending', message: '' },
        6: { status: 'pending', message: '' },
      },
    });
    render(<PipelineProgressPanel />);
    const indicator = screen.getByTestId('stage-indicator-1');
    expect(indicator.style.background).toBe('rgb(220, 252, 231)');
    // Should not show number, should show check icon (SVG)
    expect(indicator.textContent).not.toBe('1');
    expect(indicator.querySelector('svg')).toBeDefined();
  });

  it('progress bar is present', () => {
    render(<PipelineProgressPanel />);
    expect(screen.getByTestId('pipeline-progress-bar')).toBeDefined();
  });

  it('iteration counter is visible', () => {
    usePipelineStore.setState({ currentIteration: 2, maxIterations: 3 });
    render(<PipelineProgressPanel />);
    const counter = screen.getByTestId('iteration-counter');
    expect(counter.textContent).toBe('Iteration 2/3');
  });

  it('error stage has red background', () => {
    usePipelineStore.setState({
      stages: {
        1: { status: 'complete', message: '' },
        2: { status: 'error', message: 'Failed' },
        3: { status: 'pending', message: '' },
        4: { status: 'pending', message: '' },
        5: { status: 'pending', message: '' },
        6: { status: 'pending', message: '' },
      },
    });
    render(<PipelineProgressPanel />);
    const indicator = screen.getByTestId('stage-indicator-2');
    expect(indicator.style.background).toBe('rgb(254, 242, 242)');
  });
});
