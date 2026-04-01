/**
 * Tests for EditorPane — Markdown textarea + empty state.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditorPane } from './EditorPane';
import { useEpicStore } from '@/stores/epicStore';

beforeEach(() => {
  useEpicStore.setState(useEpicStore.getInitialState());
});

describe('EditorPane', () => {
  it('shows empty state when markdown is empty', () => {
    render(<EditorPane />);
    expect(screen.getByTestId('editor-empty-state')).toBeDefined();
    expect(screen.getByText('Create your epic')).toBeDefined();
  });

  it('shows textarea when markdown has content', () => {
    useEpicStore.setState({ markdown: '## Test\nSome content' });
    render(<EditorPane />);
    expect(screen.getByTestId('editor-textarea')).toBeDefined();
    expect(screen.queryByTestId('editor-empty-state')).toBeNull();
  });

  it('renders all 7 category buttons in empty state', () => {
    render(<EditorPane />);
    expect(screen.getByTestId('cat-btn-business_requirement')).toBeDefined();
    expect(screen.getByTestId('cat-btn-technical_design')).toBeDefined();
    expect(screen.getByTestId('cat-btn-feature_specification')).toBeDefined();
    expect(screen.getByTestId('cat-btn-api_specification')).toBeDefined();
    expect(screen.getByTestId('cat-btn-infrastructure_design')).toBeDefined();
    expect(screen.getByTestId('cat-btn-migration_plan')).toBeDefined();
    expect(screen.getByTestId('cat-btn-integration_spec')).toBeDefined();
  });

  it('clicking Technical Design populates editor with 11 section headers', () => {
    render(<EditorPane />);
    fireEvent.click(screen.getByTestId('cat-btn-technical_design'));
    const md = useEpicStore.getState().markdown;
    expect(md).toContain('## Objective');
    expect(md).toContain('## Architecture Overview');
    expect(md).toContain('## User Stories');
    expect(md.match(/^## /gm)?.length).toBe(11);
  });

  it('textarea value syncs with store', () => {
    useEpicStore.setState({ markdown: '## Hello\nWorld' });
    render(<EditorPane />);
    const textarea = screen.getByTestId('editor-textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('## Hello\nWorld');
  });

  it('typing in textarea updates store', () => {
    useEpicStore.setState({ markdown: '## Start' });
    render(<EditorPane />);
    fireEvent.change(screen.getByTestId('editor-textarea'), { target: { value: '## Changed' } });
    expect(useEpicStore.getState().markdown).toBe('## Changed');
  });

  it('header shows correct line count', () => {
    useEpicStore.setState({ markdown: 'line1\nline2\nline3' });
    render(<EditorPane />);
    expect(screen.getByTestId('line-count').textContent).toBe('3 lines');
  });

  it('header shows Editor label and Markdown badge', () => {
    render(<EditorPane />);
    expect(screen.getByText('Editor')).toBeDefined();
    expect(screen.getByTestId('editor-badge').textContent).toBe('Markdown');
  });

  it('dark background when content present', () => {
    useEpicStore.setState({ markdown: '## Test' });
    render(<EditorPane />);
    const textarea = screen.getByTestId('editor-textarea');
    // jsdom converts #1a1a1a → rgb(26, 26, 26)
    expect(textarea.style.background).toContain('26, 26, 26');
  });

  it('ImpulseLine red accent visible in empty state', () => {
    render(<EditorPane />);
    const emptyState = screen.getByTestId('editor-empty-state');
    const impulse = emptyState.querySelector('[style*="border-left"]');
    expect(impulse).toBeDefined();
  });
});
