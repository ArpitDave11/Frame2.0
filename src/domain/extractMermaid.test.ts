import { describe, it, expect } from 'vitest';
import { extractMermaidDiagram } from './extractMermaid';

describe('extractMermaidDiagram', () => {
  it('returns null when no mermaid block exists', () => {
    expect(extractMermaidDiagram('# Epic\n\nNo diagrams here.')).toBeNull();
  });

  it('returns null for an empty mermaid block', () => {
    expect(extractMermaidDiagram('```mermaid\n\n```')).toBeNull();
  });

  it('extracts code and detects flowchart type', () => {
    const md = '# Epic\n\n```mermaid\nflowchart TD\n  A --> B\n```\n\nMore text';
    const result = extractMermaidDiagram(md);
    expect(result?.type).toBe('flowchart');
    expect(result?.code).toBe('flowchart TD\n  A --> B');
  });

  it('normalizes graph to flowchart and handles init directives', () => {
    const md = '```mermaid\n%%{init: {"theme":"base"}}%%\ngraph LR\n  X --> Y\n```';
    expect(extractMermaidDiagram(md)?.type).toBe('flowchart');
  });

  it('detects sequenceDiagram type', () => {
    const md = '```mermaid\nsequenceDiagram\n  A->>B: hi\n```';
    expect(extractMermaidDiagram(md)?.type).toBe('sequenceDiagram');
  });

  it('extracts only the first block when several exist', () => {
    const md = '```mermaid\npie\n  "a": 1\n```\n\n```mermaid\nflowchart TD\n  A-->B\n```';
    expect(extractMermaidDiagram(md)?.type).toBe('pie');
  });
});
