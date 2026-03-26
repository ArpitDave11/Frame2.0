/**
 * Tests for WelcomeScreen — Landing page main content area.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WelcomeScreen } from './WelcomeScreen';
import { useUiStore } from '@/stores/uiStore';
import { useEpicStore } from '@/stores/epicStore';
import { EPIC_CATEGORIES } from '@/domain/categoryConstants';

// Reset stores between tests
beforeEach(() => {
  useUiStore.setState({
    activeView: 'welcome',
    activeModal: null,
  });
  useEpicStore.setState({
    markdown: '',
    document: null,
    isDirty: false,
    previousMarkdown: null,
    complexity: 'moderate',
    userEditedSections: [],
  });
});

describe('WelcomeScreen', () => {
  it('renders all 5 sections with correct id attributes', () => {
    render(<WelcomeScreen />);
    expect(document.getElementById('home')).not.toBeNull();
    expect(document.getElementById('actions')).not.toBeNull();
    expect(document.getElementById('lifecycle')).not.toBeNull();
    expect(document.getElementById('templates')).not.toBeNull();
    expect(document.getElementById('quickstart')).not.toBeNull();
  });

  it('"Create new epic" button calls setActiveView("workspace")', () => {
    render(<WelcomeScreen />);
    fireEvent.click(screen.getByTestId('cta-create'));
    expect(useUiStore.getState().activeView).toBe('workspace');
  });

  it('template card click populates editor with sections', () => {
    render(<WelcomeScreen />);
    // Click the first template card (Business Requirement)
    fireEvent.click(screen.getByTestId('template-business_requirement'));

    const md = useEpicStore.getState().markdown;
    const cat = EPIC_CATEGORIES.find((c) => c.id === 'business_requirement')!;

    // Verify each section heading is in the markdown
    for (const sec of cat.secs) {
      expect(md).toContain(`## ${sec}`);
    }
    expect(md).toContain('_Your content here..._');

    // Should also navigate to workspace
    expect(useUiStore.getState().activeView).toBe('workspace');
  });

  it('"Load from GitLab" opens modal', () => {
    render(<WelcomeScreen />);
    fireEvent.click(screen.getByTestId('cta-gitlab'));

    expect(useUiStore.getState().activeView).toBe('workspace');
    expect(useUiStore.getState().activeModal).toBe('loadEpic');
  });

  it('all 8 template cards rendered', () => {
    render(<WelcomeScreen />);
    for (const cat of EPIC_CATEGORIES) {
      expect(screen.getByTestId(`template-${cat.id}`)).toBeDefined();
    }
    expect(EPIC_CATEGORIES).toHaveLength(8);
  });

  it('lifecycle shows 5 stages', () => {
    render(<WelcomeScreen />);
    expect(screen.getByTestId('lifecycle-draft')).toBeDefined();
    expect(screen.getByTestId('lifecycle-refine')).toBeDefined();
    expect(screen.getByTestId('lifecycle-score')).toBeDefined();
    expect(screen.getByTestId('lifecycle-review')).toBeDefined();
    expect(screen.getByTestId('lifecycle-publish')).toBeDefined();
  });

  it('stats show expected values', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText('6x')).toBeDefined();
    expect(screen.getByText('8.2')).toBeDefined();
    expect(screen.getByText('7')).toBeDefined();
    expect(screen.getByText('faster than manual')).toBeDefined();
    expect(screen.getByText('average quality')).toBeDefined();
    expect(screen.getByText('ready-made')).toBeDefined();
  });

  it('"Create parent epic" action navigates to workspace', () => {
    render(<WelcomeScreen />);
    fireEvent.click(screen.getByTestId('action-create-parent'));
    expect(useUiStore.getState().activeView).toBe('workspace');
  });

  it('"Modify existing epics" action opens load modal', () => {
    render(<WelcomeScreen />);
    fireEvent.click(screen.getByTestId('action-modify'));
    expect(useUiStore.getState().activeView).toBe('workspace');
    expect(useUiStore.getState().activeModal).toBe('loadEpic');
  });
});
