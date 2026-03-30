/**
 * Tests for WorkspaceSidebar — Main app navigation (nested layout).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { useUiStore } from '@/stores/uiStore';
import { MockAuthProvider } from '@/components/auth/MockAuthProvider';

const renderSidebar = () =>
  render(
    <MockAuthProvider>
      <WorkspaceSidebar />
    </MockAuthProvider>,
  );

beforeEach(() => {
  useUiStore.setState(useUiStore.getInitialState());
});

describe('WorkspaceSidebar', () => {
  it('renders all navigation items + collapse + logo', () => {
    renderSidebar();
    expect(screen.getByTestId('nav-planner')).toBeDefined();
    expect(screen.getByTestId('nav-linked-issues')).toBeDefined();
    expect(screen.getByTestId('nav-blueprints')).toBeDefined();
    expect(screen.getByTestId('nav-sprint')).toBeDefined();
    expect(screen.getByTestId('nav-analytics')).toBeDefined();
    expect(screen.getByTestId('nav-settings')).toBeDefined();
    expect(screen.getByTestId('workspace-collapse')).toBeDefined();
    expect(screen.getByTestId('workspace-ubs-logo')).toBeDefined();
  });

  it('click Requirement Design → activeTab becomes planner', () => {
    renderSidebar();
    fireEvent.click(screen.getByTestId('nav-planner'));
    expect(useUiStore.getState().activeTab).toBe('planner');
  });

  it('click Performa - Sprint → activeTab=issues, issueSubTab=sprint', () => {
    renderSidebar();
    fireEvent.click(screen.getByTestId('nav-sprint'));
    expect(useUiStore.getState().activeTab).toBe('issues');
    expect(useUiStore.getState().issueSubTab).toBe('sprint');
  });

  it('click Linked Issues → activeTab=issues, issueSubTab=epic', () => {
    renderSidebar();
    fireEvent.click(screen.getByTestId('nav-linked-issues'));
    expect(useUiStore.getState().activeTab).toBe('issues');
    expect(useUiStore.getState().issueSubTab).toBe('epic');
  });

  it('click Blueprints → activeTab becomes blueprint', () => {
    renderSidebar();
    fireEvent.click(screen.getByTestId('nav-blueprints'));
    expect(useUiStore.getState().activeTab).toBe('blueprint');
  });

  it('click Analytics → activeTab becomes analytics', () => {
    renderSidebar();
    fireEvent.click(screen.getByTestId('nav-analytics'));
    expect(useUiStore.getState().activeTab).toBe('analytics');
  });

  it('click Settings → opens settings modal, activeTab unchanged', () => {
    useUiStore.setState({ activeTab: 'planner' });
    renderSidebar();
    fireEvent.click(screen.getByTestId('nav-settings'));
    expect(useUiStore.getState().activeModal).toBe('settings');
    expect(useUiStore.getState().activeTab).toBe('planner');
  });

  it('click UBS logo → activeView becomes welcome', () => {
    useUiStore.setState({ activeView: 'workspace' });
    renderSidebar();
    fireEvent.click(screen.getByTestId('workspace-logo'));
    expect(useUiStore.getState().activeView).toBe('welcome');
  });

  it('collapsed state: labels hidden, width 56px', () => {
    useUiStore.setState({ sidebarCollapsed: true });
    renderSidebar();
    const sidebar = screen.getByTestId('workspace-sidebar');
    expect(sidebar.style.width).toBe('56px');
    expect(screen.queryByText('Requirement Design')).toBeNull();
    expect(screen.queryByText('Performa - Sprint')).toBeNull();
    expect(screen.queryByText('Collapse')).toBeNull();
  });

  it('expanded state: labels visible, width 220px', () => {
    useUiStore.setState({ sidebarCollapsed: false });
    renderSidebar();
    const sidebar = screen.getByTestId('workspace-sidebar');
    expect(sidebar.style.width).toBe('220px');
    expect(screen.getByText('Requirement Design')).toBeDefined();
    expect(screen.getByText('Performa - Sprint')).toBeDefined();
    expect(screen.getByText('Collapse')).toBeDefined();
  });

  it('active item has highlighted background', () => {
    useUiStore.setState({ activeTab: 'issues', issueSubTab: 'sprint' });
    renderSidebar();
    const sprintBtn = screen.getByTestId('nav-sprint');
    expect(sprintBtn.style.background).toContain('var(--input-background)');
    const plannerBtn = screen.getByTestId('nav-planner');
    expect(plannerBtn.style.background).toBe('transparent');
  });

  it('Linked Issues highlighted when issueSubTab=epic, Sprint not', () => {
    useUiStore.setState({ activeTab: 'issues', issueSubTab: 'epic' });
    renderSidebar();
    const linkedBtn = screen.getByTestId('nav-linked-issues');
    expect(linkedBtn.style.background).toContain('var(--input-background)');
    const sprintBtn = screen.getByTestId('nav-sprint');
    expect(sprintBtn.style.background).toBe('transparent');
  });

  it('settings item does NOT get active highlight', () => {
    renderSidebar();
    fireEvent.click(screen.getByTestId('nav-settings'));
    const settingsBtn = screen.getByTestId('nav-settings');
    expect(settingsBtn.style.background).toBe('transparent');
  });

  it('collapse toggle calls toggleSidebar', () => {
    renderSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
    fireEvent.click(screen.getByTestId('workspace-collapse'));
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });

  it('FRAME text visible when expanded, hidden when collapsed', () => {
    renderSidebar();
    expect(screen.getByTestId('workspace-frame-text')).toBeDefined();
    useUiStore.setState({ sidebarCollapsed: true });
    const { unmount } = renderSidebar();
    expect(screen.queryAllByTestId('workspace-frame-text').length).toBeLessThanOrEqual(1);
    unmount();
  });
});
