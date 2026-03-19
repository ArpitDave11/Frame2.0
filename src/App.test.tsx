/**
 * Tests for App.tsx — Layout Shell & View Router.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { useUiStore } from '@/stores/uiStore';
import { MockAuthProvider } from '@/components/auth/MockAuthProvider';

const renderApp = () =>
  render(
    <MockAuthProvider>
      <App />
    </MockAuthProvider>,
  );

beforeEach(() => {
  useUiStore.setState(useUiStore.getInitialState());
});

describe('App', () => {
  it('renders without crashing', () => {
    renderApp();
    expect(screen.getByTestId('app-root')).toBeDefined();
  });

  it('shows WelcomeLayout when activeView is welcome', () => {
    renderApp();
    expect(screen.getByTestId('welcome-sidebar')).toBeDefined();
    expect(screen.queryByTestId('workspace-sidebar')).toBeNull();
  });

  it('shows WorkspaceLayout when activeView is workspace', () => {
    useUiStore.setState({ activeView: 'workspace' });
    renderApp();
    expect(screen.getByTestId('workspace-sidebar')).toBeDefined();
    expect(screen.queryByTestId('welcome-sidebar')).toBeNull();
  });

  it('root div has overflow auto in welcome mode', () => {
    renderApp();
    const root = screen.getByTestId('app-root');
    expect(root.style.overflow).toBe('auto');
  });

  it('root div has overflow hidden in workspace mode', () => {
    useUiStore.setState({ activeView: 'workspace' });
    renderApp();
    const root = screen.getByTestId('app-root');
    expect(root.style.overflow).toBe('hidden');
  });

  it('root div has height 100vh', () => {
    renderApp();
    const root = screen.getByTestId('app-root');
    expect(root.style.height).toBe('100vh');
  });

  it('root div has Frutiger font family', () => {
    renderApp();
    const root = screen.getByTestId('app-root');
    expect(root.style.fontFamily).toContain('Frutiger');
  });

  it('workspace shows planner view by default', () => {
    useUiStore.setState({ activeView: 'workspace' });
    renderApp();
    expect(screen.getByTestId('planner-view')).toBeDefined();
  });

  it('workspace sidebar has all 4 nav items', () => {
    useUiStore.setState({ activeView: 'workspace' });
    renderApp();
    expect(screen.getByTestId('nav-planner')).toBeDefined();
    expect(screen.getByTestId('nav-issues')).toBeDefined();
    expect(screen.getByTestId('nav-blueprint')).toBeDefined();
    expect(screen.getByTestId('nav-analytics')).toBeDefined();
  });

  it('workspace sidebar has settings button', () => {
    useUiStore.setState({ activeView: 'workspace' });
    renderApp();
    expect(screen.getByTestId('nav-settings')).toBeDefined();
  });
});
