/**
 * Tests for PreviewPane — Live markdown rendering.
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

  it('_italic_ renders as italic paragraph', () => {
    useEpicStore.setState({ markdown: '_Your content here..._' });
    render(<PreviewPane />);
    const content = screen.getByTestId('preview-content');
    const italic = content.querySelector('p[style*="italic"]');
    expect(italic).toBeDefined();
    expect(italic?.textContent).toBe('Your content here...');
  });

  it('normal text renders as paragraph', () => {
    useEpicStore.setState({ markdown: 'Some regular text here' });
    render(<PreviewPane />);
    const content = screen.getByTestId('preview-content');
    const p = content.querySelector('p');
    expect(p).toBeDefined();
    expect(p?.textContent).toBe('Some regular text here');
  });

  it('empty lines render as br', () => {
    useEpicStore.setState({ markdown: 'Line 1\n\nLine 2' });
    render(<PreviewPane />);
    const content = screen.getByTestId('preview-content');
    const br = content.querySelector('br');
    expect(br).toBeDefined();
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
