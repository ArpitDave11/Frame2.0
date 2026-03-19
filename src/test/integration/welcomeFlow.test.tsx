/**
 * Integration Test — Welcome -> Template -> Workspace flow (T-16.1).
 *
 * Verifies the complete user journey from landing on the welcome screen,
 * selecting a template, and arriving at the workspace with populated content.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '@/App';
import { MockAuthProvider } from '@/components/auth/MockAuthProvider';
import { useUiStore } from '@/stores/uiStore';
import { useEpicStore } from '@/stores/epicStore';

// ─── Mocks ──────────────────────────────────────────────────

// Mock mermaid (imported by blueprint components)
vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn().mockResolvedValue({ svg: '<svg></svg>' }) },
}));

// Mock image loading (jsdom doesn't load images)
beforeEach(() => {
  // Suppress act() warnings for async state updates in components we don't control
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (msg.includes('act(') || msg.includes('Not implemented') || msg.includes('Error: Could not parse CSS')) return;
    // eslint-disable-next-line no-console
    console.warn(...args);
  });
});

// ─── Reset Stores ───────────────────────────────────────────

beforeEach(() => {
  useUiStore.setState(useUiStore.getInitialState());
  useEpicStore.setState(useEpicStore.getInitialState());
});

// ─── Helper ─────────────────────────────────────────────────

function renderApp() {
  return render(
    <MockAuthProvider>
      <App />
    </MockAuthProvider>,
  );
}

// ─── Tests ──────────────────────────────────────────────────

describe('Welcome -> Template -> Workspace flow', () => {
  it('shows welcome screen by default (activeView = welcome)', () => {
    expect(useUiStore.getState().activeView).toBe('welcome');
    renderApp();
    expect(screen.getByTestId('welcome-screen')).toBeTruthy();
  });

  it('clicking a template card populates markdown with section headers', () => {
    renderApp();

    // Click the Technical Design template card
    const templateCard = screen.getByTestId('template-technical_design');
    fireEvent.click(templateCard);

    const { markdown } = useEpicStore.getState();
    // Technical Design has these sections
    expect(markdown).toContain('## Objective');
    expect(markdown).toContain('## Architecture Overview');
    expect(markdown).toContain('## Testing Strategy');
  });

  it('after template click, activeView switches to workspace', () => {
    renderApp();

    const templateCard = screen.getByTestId('template-technical_design');
    fireEvent.click(templateCard);

    expect(useUiStore.getState().activeView).toBe('workspace');
  });

  it('clicking Business Requirement template populates its specific sections', () => {
    renderApp();

    const templateCard = screen.getByTestId('template-business_requirement');
    fireEvent.click(templateCard);

    const { markdown } = useEpicStore.getState();
    expect(markdown).toContain('## Executive Summary');
    expect(markdown).toContain('## Acceptance Criteria');
    expect(markdown).toContain('## Timeline');
    expect(useUiStore.getState().activeView).toBe('workspace');
  });

  it('epicStore.markdown contains correct section headers for technical_design', () => {
    renderApp();

    fireEvent.click(screen.getByTestId('template-technical_design'));

    const { markdown } = useEpicStore.getState();
    // All 10 sections from technical_design template
    const expectedSections = [
      'Objective',
      'Context & Motivation',
      'Goals & Non-Goals',
      'Architecture Overview',
      'Component Design',
      'Data Model',
      'API Contracts',
      'Security',
      'Testing Strategy',
      'Rollout Plan',
    ];
    for (const section of expectedSections) {
      expect(markdown).toContain(`## ${section}`);
    }
  });

  it('epicStore document is parsed after template selection', () => {
    renderApp();

    fireEvent.click(screen.getByTestId('template-technical_design'));

    const { document } = useEpicStore.getState();
    // setMarkdown parses via markdownToEpic
    expect(document).not.toBeNull();
    expect(document!.sections.length).toBeGreaterThan(0);
  });

  it('each template generates markdown with placeholder content', () => {
    renderApp();

    fireEvent.click(screen.getByTestId('template-feature_specification'));

    const { markdown } = useEpicStore.getState();
    expect(markdown).toContain('## Objective');
    expect(markdown).toContain('_Your content here..._');
  });
});
