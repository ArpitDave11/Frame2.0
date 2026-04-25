/**
 * Tests for StepIndicator — 4-step wizard stepper bar.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StepIndicator from './StepIndicator';

describe('StepIndicator', () => {
  it('renders 4 step labels', () => {
    render(
      <StepIndicator current="init" onStepClick={() => {}} completedSteps={[]} />,
    );
    expect(screen.getByText('Init')).toBeDefined();
    expect(screen.getByText('Stream Epic')).toBeDefined();
    expect(screen.getByText('Split Crews')).toBeDefined();
    expect(screen.getByText('Refine')).toBeDefined();
  });

  it('completed steps are not aria-disabled', () => {
    render(
      <StepIndicator
        current="splitCrews"
        onStepClick={() => {}}
        completedSteps={['init', 'streamEpic']}
      />,
    );
    expect(screen.getByTestId('step-init').getAttribute('aria-disabled')).toBeNull();
    expect(screen.getByTestId('step-streamEpic').getAttribute('aria-disabled')).toBeNull();
    // Active step also not disabled
    expect(screen.getByTestId('step-splitCrews').getAttribute('aria-disabled')).toBeNull();
  });

  it('future steps are aria-disabled="true"', () => {
    render(
      <StepIndicator
        current="streamEpic"
        onStepClick={() => {}}
        completedSteps={['init']}
      />,
    );
    expect(screen.getByTestId('step-splitCrews').getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByTestId('step-refineCrews').getAttribute('aria-disabled')).toBe('true');
  });

  it('calls onStepClick when completed step clicked', () => {
    const handler = vi.fn();
    render(
      <StepIndicator
        current="splitCrews"
        onStepClick={handler}
        completedSteps={['init', 'streamEpic']}
      />,
    );
    fireEvent.click(screen.getByTestId('step-init'));
    expect(handler).toHaveBeenCalledWith('init');
    fireEvent.click(screen.getByTestId('step-streamEpic'));
    expect(handler).toHaveBeenCalledWith('streamEpic');
  });

  it('does not call onStepClick when future step clicked', () => {
    const handler = vi.fn();
    render(
      <StepIndicator
        current="init"
        onStepClick={handler}
        completedSteps={[]}
      />,
    );
    fireEvent.click(screen.getByTestId('step-splitCrews'));
    expect(handler).not.toHaveBeenCalled();
  });
});
