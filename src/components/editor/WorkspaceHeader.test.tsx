/**
 * Tests for WorkspaceHeader — Toolbar with all action buttons.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceHeader } from './WorkspaceHeader';
import { useUiStore } from '@/stores/uiStore';
import { useEpicStore } from '@/stores/epicStore';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useBlueprintStore } from '@/stores/blueprintStore';

beforeEach(() => {
  useUiStore.setState(useUiStore.getInitialState());
  useEpicStore.setState(useEpicStore.getInitialState());
  usePipelineStore.setState(usePipelineStore.getInitialState());
  useBlueprintStore.setState(useBlueprintStore.getInitialState());
});

function isDisabled(el: HTMLElement): boolean {
  return (el as HTMLButtonElement).disabled === true;
}

describe('WorkspaceHeader', () => {
  it('renders all buttons', () => {
    render(<WorkspaceHeader />);
    expect(screen.getByTestId('btn-load')).toBeDefined();
    expect(screen.getByTestId('btn-save')).toBeDefined();
    expect(screen.getByTestId('btn-undo')).toBeDefined();
    expect(screen.getByTestId('btn-refine')).toBeDefined();
    expect(screen.getByTestId('btn-issues')).toBeDefined();
    expect(screen.getByTestId('btn-publish')).toBeDefined();
    expect(screen.getByTestId('btn-settings')).toBeDefined();
    expect(screen.getByTestId('category-select')).toBeDefined();
    expect(screen.getByTestId('complexity-selector')).toBeDefined();
  });

  it('refine button disabled when epic is empty', () => {
    render(<WorkspaceHeader />);
    expect(isDisabled(screen.getByTestId('btn-refine'))).toBe(true);
  });

  it('refine button disabled when pipeline is running', () => {
    useEpicStore.setState({ markdown: '## Test\nContent here' });
    usePipelineStore.setState({ isRunning: true });
    render(<WorkspaceHeader />);
    expect(isDisabled(screen.getByTestId('btn-refine'))).toBe(true);
  });

  it('refine button enabled when epic has content and pipeline idle', () => {
    useEpicStore.setState({ markdown: '## Test\nContent here' });
    render(<WorkspaceHeader />);
    expect(isDisabled(screen.getByTestId('btn-refine'))).toBe(false);
  });

  it('refine click opens pipeline modal', () => {
    useEpicStore.setState({ markdown: '## Test\nContent' });
    render(<WorkspaceHeader />);
    fireEvent.click(screen.getByTestId('btn-refine'));
    expect(useUiStore.getState().activeModal).toBe('pipeline');
  });

  it('publish button disabled when epic is empty', () => {
    render(<WorkspaceHeader />);
    expect(isDisabled(screen.getByTestId('btn-publish'))).toBe(true);
  });

  it('issues button disabled when no diagram', () => {
    render(<WorkspaceHeader />);
    expect(isDisabled(screen.getByTestId('btn-issues'))).toBe(true);
  });

  it('category dropdown shows 7 options + placeholder', () => {
    render(<WorkspaceHeader />);
    const select = screen.getByTestId('category-select') as HTMLSelectElement;
    expect(select.options).toHaveLength(8);
  });

  it('complexity selector shows 3 options', () => {
    render(<WorkspaceHeader />);
    expect(screen.getByTestId('complexity-simple')).toBeDefined();
    expect(screen.getByTestId('complexity-moderate')).toBeDefined();
    expect(screen.getByTestId('complexity-complex')).toBeDefined();
  });

  it('clicking simple changes complexity in store', () => {
    render(<WorkspaceHeader />);
    fireEvent.click(screen.getByTestId('complexity-simple'));
    expect(useEpicStore.getState().complexity).toBe('simple');
  });

  it('undo button disabled when no previous markdown', () => {
    render(<WorkspaceHeader />);
    expect(isDisabled(screen.getByTestId('btn-undo'))).toBe(true);
  });

  it('undo button enabled when previous markdown exists', () => {
    useEpicStore.setState({ previousMarkdown: '## Old content' });
    render(<WorkspaceHeader />);
    expect(isDisabled(screen.getByTestId('btn-undo'))).toBe(false);
  });

  it('score badge hidden when score is null', () => {
    render(<WorkspaceHeader />);
    expect(screen.queryByTestId('score-badge')).toBeNull();
  });

  it('score badge shows value when score exists', () => {
    useEpicStore.setState({
      document: {
        title: 'Test',
        sections: [],
        metadata: { createdAt: 0, lastRefined: null, complexity: 'moderate', qualityScore: 8.2 },
      },
    });
    render(<WorkspaceHeader />);
    expect(screen.getByTestId('score-badge')).toBeDefined();
    expect(screen.getByText('8.2')).toBeDefined();
  });

  it('settings gear opens settings modal', () => {
    render(<WorkspaceHeader />);
    fireEvent.click(screen.getByTestId('btn-settings'));
    expect(useUiStore.getState().activeModal).toBe('settings');
  });

  it('load button opens loadEpic modal', () => {
    render(<WorkspaceHeader />);
    fireEvent.click(screen.getByTestId('btn-load'));
    expect(useUiStore.getState().activeModal).toBe('loadEpic');
  });
});
