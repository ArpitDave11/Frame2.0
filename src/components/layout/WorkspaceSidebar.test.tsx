/**
 * Tests for WorkspaceSidebar — Main app navigation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { useUiStore } from '@/stores/uiStore';

beforeEach(() => {
  useUiStore.setState(useUiStore.getInitialState());
});

describe('WorkspaceSidebar', () => {
  it('renders 5 navigation items + collapse button + logo', () => {
    render(<WorkspaceSidebar />);
    expect(screen.getByTestId('nav-planner')).toBeDefined();
    expect(screen.getByTestId('nav-issues')).toBeDefined();
    expect(screen.getByTestId('nav-blueprint')).toBeDefined();
    expect(screen.getByTestId('nav-analytics')).toBeDefined();
    expect(screen.getByTestId('nav-settings')).toBeDefined();
    expect(screen.getByTestId('workspace-collapse')).toBeDefined();
    expect(screen.getByTestId('workspace-ubs-logo')).toBeDefined();
  });

  it('click Epic Planner → activeTab becomes planner', () => {
    render(<WorkspaceSidebar />);
    fireEvent.click(screen.getByTestId('nav-planner'));
    expect(useUiStore.getState().activeTab).toBe('planner');
  });

  it('click Issue Manager → activeTab becomes issues', () => {
    render(<WorkspaceSidebar />);
    fireEvent.click(screen.getByTestId('nav-issues'));
    expect(useUiStore.getState().activeTab).toBe('issues');
  });

  it('click Blueprints → activeTab becomes blueprint', () => {
    render(<WorkspaceSidebar />);
    fireEvent.click(screen.getByTestId('nav-blueprint'));
    expect(useUiStore.getState().activeTab).toBe('blueprint');
  });

  it('click Analytics → activeTab becomes analytics', () => {
    render(<WorkspaceSidebar />);
    fireEvent.click(screen.getByTestId('nav-analytics'));
    expect(useUiStore.getState().activeTab).toBe('analytics');
  });

  it('click Settings → opens settings modal, activeTab unchanged', () => {
    useUiStore.setState({ activeTab: 'planner' });
    render(<WorkspaceSidebar />);
    fireEvent.click(screen.getByTestId('nav-settings'));
    expect(useUiStore.getState().activeModal).toBe('settings');
    expect(useUiStore.getState().activeTab).toBe('planner');
  });

  it('click UBS logo → activeView becomes welcome', () => {
    useUiStore.setState({ activeView: 'workspace' });
    render(<WorkspaceSidebar />);
    fireEvent.click(screen.getByTestId('workspace-logo'));
    expect(useUiStore.getState().activeView).toBe('welcome');
  });

  it('collapsed state: labels hidden, width 56px', () => {
    useUiStore.setState({ sidebarCollapsed: true });
    render(<WorkspaceSidebar />);
    const sidebar = screen.getByTestId('workspace-sidebar');
    expect(sidebar.style.width).toBe('56px');
    expect(screen.queryByText('Epic Planner')).toBeNull();
    expect(screen.queryByText('Issue Manager')).toBeNull();
    expect(screen.queryByText('Collapse')).toBeNull();
  });

  it('expanded state: labels visible, width 220px', () => {
    useUiStore.setState({ sidebarCollapsed: false });
    render(<WorkspaceSidebar />);
    const sidebar = screen.getByTestId('workspace-sidebar');
    expect(sidebar.style.width).toBe('220px');
    expect(screen.getByText('Epic Planner')).toBeDefined();
    expect(screen.getByText('Issue Manager')).toBeDefined();
    expect(screen.getByText('Collapse')).toBeDefined();
  });

  it('active item has highlighted background', () => {
    useUiStore.setState({ activeTab: 'issues' });
    render(<WorkspaceSidebar />);
    const issuesBtn = screen.getByTestId('nav-issues');
    expect(issuesBtn.style.background).toContain('var(--input-background)');
    const plannerBtn = screen.getByTestId('nav-planner');
    expect(plannerBtn.style.background).toBe('transparent');
  });

  it('settings item does NOT get active highlight', () => {
    // Even if someone tried to set activeTab to 'settings', it should not highlight
    render(<WorkspaceSidebar />);
    fireEvent.click(screen.getByTestId('nav-settings'));
    const settingsBtn = screen.getByTestId('nav-settings');
    expect(settingsBtn.style.background).toBe('transparent');
  });

  it('collapse toggle calls toggleSidebar', () => {
    render(<WorkspaceSidebar />);
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
    fireEvent.click(screen.getByTestId('workspace-collapse'));
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });

  it('FRAME text visible when expanded, hidden when collapsed', () => {
    render(<WorkspaceSidebar />);
    expect(screen.getByTestId('workspace-frame-text')).toBeDefined();
    useUiStore.setState({ sidebarCollapsed: true });
    // Need to re-render
    const { unmount } = render(<WorkspaceSidebar />);
    expect(screen.queryAllByTestId('workspace-frame-text').length).toBeLessThanOrEqual(1);
    unmount();
  });
});
