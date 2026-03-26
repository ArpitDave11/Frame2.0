/**
 * Tests for PreviewPane — Live markdown rendering via react-markdown.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PreviewPane } from './PreviewPane';
import { useEpicStore } from '@/stores/epicStore';

beforeEach(() => {
  useEpicStore.setState(useEpicStore.getInitialState());
});

describe('PreviewPane', () => {
  it('shows empty state when markdown is empty', () => {
    render(<PreviewPane />);
    expect(screen.getByTestId('preview-empty')).toBeDefined();
    expect(screen.getByText('Preview renders here')).toBeDefined();
  });

  it('## Heading renders as h2 element', () => {
    useEpicStore.setState({ markdown: '## Architecture Overview' });
    render(<PreviewPane />);
    const content = screen.getByTestId('preview-content');
    const h2 = content.querySelector('h2');
    expect(h2).toBeDefined();
    expect(h2?.textContent).toBe('Architecture Overview');
  });

  it('# Title renders as h1 element', () => {
    useEpicStore.setState({ markdown: '# Epic Title' });
    render(<PreviewPane />);
    const content = screen.getByTestId('preview-content');
    const h1 = content.querySelector('h1');
    expect(h1).toBeDefined();
    expect(h1?.textContent).toBe('Epic Title');
  });

  it('### Sub-heading renders as h3 element', () => {
    useEpicStore.setState({ markdown: '### US-001: Login' });
    render(<PreviewPane />);
    const content = screen.getByTestId('preview-content');
    const h3 = content.querySelector('h3');
    expect(h3).toBeDefined();
    expect(h3?.textContent).toBe('US-001: Login');
  });

  it('*italic* renders as em element', () => {
    useEpicStore.setState({ markdown: '*Your content here*' });
    render(<PreviewPane />);
    const content = screen.getByTestId('preview-content');
    const em = content.querySelector('em');
    expect(em).toBeDefined();
    expect(em?.textContent).toBe('Your content here');
  });

  it('**bold** renders as strong element', () => {
    useEpicStore.setState({ markdown: '**Priority: high**' });
    render(<PreviewPane />);
    const content = screen.getByTestId('preview-content');
    const strong = content.querySelector('strong');
    expect(strong).toBeDefined();
    expect(strong?.textContent).toBe('Priority: high');
  });

  it('normal text renders as paragraph', () => {
    useEpicStore.setState({ markdown: 'Some regular text here' });
    render(<PreviewPane />);
    const content = screen.getByTestId('preview-content');
    const p = content.querySelector('p');
    expect(p).toBeDefined();
    expect(p?.textContent).toBe('Some regular text here');
  });

  it('bullet list renders as ul', () => {
    useEpicStore.setState({ markdown: '- Item one\n- Item two' });
    render(<PreviewPane />);
    const content = screen.getByTestId('preview-content');
    const ul = content.querySelector('ul');
    expect(ul).toBeDefined();
    const items = content.querySelectorAll('li');
    expect(items.length).toBe(2);
  });

  it('mermaid code block renders MermaidBlock component', () => {
    useEpicStore.setState({ markdown: '```mermaid\ngraph TD\n  A-->B\n```' });
    render(<PreviewPane />);
    const content = screen.getByTestId('preview-content');
    // In test environment, mermaid.render is async — shows "Rendering diagram..." loading state initially
    expect(content.textContent).toContain('Rendering diagram');
  });

  it('content updates live when store changes', () => {
    const { rerender } = render(<PreviewPane />);
    expect(screen.getByTestId('preview-empty')).toBeDefined();

    useEpicStore.setState({ markdown: '## New Section' });
    rerender(<PreviewPane />);
    const h2 = screen.getByTestId('preview-content').querySelector('h2');
    expect(h2?.textContent).toBe('New Section');
  });

  it('no Blueprint tab present', () => {
    render(<PreviewPane />);
    expect(screen.queryByText('Blueprint')).toBeNull();
  });

  it('Preview label visible with Eye icon', () => {
    render(<PreviewPane />);
    expect(screen.getByText('Preview')).toBeDefined();
  });
});
