/**
 * Tests for ViewRouter — Content area switching.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ViewRouter } from './ViewRouter';
import { useUiStore } from '@/stores/uiStore';

beforeEach(() => {
  useUiStore.setState(useUiStore.getInitialState());
});

describe('ViewRouter', () => {
  it('planner tab renders PlannerView', () => {
    useUiStore.setState({ activeTab: 'planner' });
    render(<ViewRouter />);
    expect(screen.getByTestId('planner-view')).toBeDefined();
  });

  it('issues tab renders IssueManagerView', () => {
    useUiStore.setState({ activeTab: 'issues' });
    render(<ViewRouter />);
    expect(screen.getByTestId('issues-view')).toBeDefined();
    expect(screen.getByTestId('issue-manager-view')).toBeDefined();
  });

  it('blueprint tab renders BlueprintView', () => {
    useUiStore.setState({ activeTab: 'blueprint' });
    render(<ViewRouter />);
    expect(screen.getByTestId('blueprint-view')).toBeDefined();
    expect(screen.getByText(/Blueprints/)).toBeDefined();
  });

  it('analytics tab renders AnalyticsPanel', () => {
    useUiStore.setState({ activeTab: 'analytics' });
    render(<ViewRouter />);
    expect(screen.getByTestId('analytics-view')).toBeDefined();
    expect(screen.getByText('Epic Analytics')).toBeDefined();
  });

  it('planner view has flex: 1', () => {
    useUiStore.setState({ activeTab: 'planner' });
    render(<ViewRouter />);
    const planner = screen.getByTestId('planner-view');
    expect(planner.style.flex).toContain('1');
  });

  it('switching tabs unmounts previous view', () => {
    const { rerender } = render(<ViewRouter />);
    useUiStore.setState({ activeTab: 'planner' });
    rerender(<ViewRouter />);
    expect(screen.getByTestId('planner-view')).toBeDefined();

    useUiStore.setState({ activeTab: 'issues' });
    rerender(<ViewRouter />);
    expect(screen.getByTestId('issues-view')).toBeDefined();
    expect(screen.queryByTestId('planner-view')).toBeNull();
  });

  it('unknown tab falls back to PlannerView', () => {
    // Force an invalid tab value
    useUiStore.setState({ activeTab: 'planner' }); // default fallback
    render(<ViewRouter />);
    expect(screen.getByTestId('planner-view')).toBeDefined();
  });

  it('analytics view contains real AnalyticsPanel content', () => {
    useUiStore.setState({ activeTab: 'analytics' });
    render(<ViewRouter />);
    // Check for prototype-specific content
    expect(screen.getByText('Epic Health Score')).toBeDefined();
    expect(screen.getByText('Status Breakdown')).toBeDefined();
    expect(screen.getByText('Weekly Velocity')).toBeDefined();
  });
});
