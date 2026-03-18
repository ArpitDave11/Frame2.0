import { describe, it, expect, beforeEach } from 'vitest';
import { useEpicStore } from './epicStore';
import type { EpicDocument } from '../domain/types';

// Reset store between tests
beforeEach(() => {
  useEpicStore.setState(useEpicStore.getInitialState());
});

// ─── Fixtures ───────────────────────────────────────────────

const MOCK_DOC: EpicDocument = {
  title: 'Auth Redesign',
  sections: [
    { title: 'Objective', content: 'Redesign auth.', wordCount: 2, isRequired: true },
    { title: 'Scope', content: 'Backend only.', wordCount: 2, isRequired: true },
  ],
  metadata: { createdAt: 0, lastRefined: null, complexity: 'moderate' },
};

const MOCK_MD = `# Test Epic

## 1. Objective

Build a better auth service.

## 2. Background

Legacy system is slow.`;

// ─── Initial State ──────────────────────────────────────────

describe('initial state', () => {
  it('document is null', () => {
    expect(useEpicStore.getState().document).toBeNull();
  });

  it('markdown is empty', () => {
    expect(useEpicStore.getState().markdown).toBe('');
  });

  it('complexity is moderate', () => {
    expect(useEpicStore.getState().complexity).toBe('moderate');
  });

  it('isDirty is false', () => {
    expect(useEpicStore.getState().isDirty).toBe(false);
  });

  it('previousMarkdown is null', () => {
    expect(useEpicStore.getState().previousMarkdown).toBeNull();
  });
});

// ─── setMarkdown ────────────────────────────────────────────

describe('setMarkdown', () => {
  it('updates markdown and parses document', () => {
    useEpicStore.getState().setMarkdown('# Test');
    const { markdown, document } = useEpicStore.getState();
    expect(markdown).toBe('# Test');
    expect(document).not.toBeNull();
    expect(document!.title).toBe('Test');
  });

  it('sets isDirty to true', () => {
    useEpicStore.getState().setMarkdown('# Test');
    expect(useEpicStore.getState().isDirty).toBe(true);
  });

  it('sets document to null for empty markdown', () => {
    useEpicStore.getState().setMarkdown('');
    expect(useEpicStore.getState().document).toBeNull();
  });

  it('parses sections from markdown', () => {
    useEpicStore.getState().setMarkdown(MOCK_MD);
    const doc = useEpicStore.getState().document!;
    expect(doc.sections.length).toBeGreaterThanOrEqual(2);
    expect(doc.sections[0]!.title).toBe('Objective');
  });
});

// ─── setDocument ────────────────────────────────────────────

describe('setDocument', () => {
  it('updates document and serializes to markdown', () => {
    useEpicStore.getState().setDocument(MOCK_DOC);
    const { document, markdown } = useEpicStore.getState();
    expect(document).toBe(MOCK_DOC);
    expect(markdown).toContain('# Auth Redesign');
    expect(markdown).toContain('## 1. Objective');
    expect(markdown).toContain('## 2. Scope');
  });

  it('sets isDirty to true', () => {
    useEpicStore.getState().setDocument(MOCK_DOC);
    expect(useEpicStore.getState().isDirty).toBe(true);
  });
});

// ─── setComplexity ──────────────────────────────────────────

describe('setComplexity', () => {
  it('updates complexity to complex', () => {
    useEpicStore.getState().setComplexity('complex');
    expect(useEpicStore.getState().complexity).toBe('complex');
  });

  it('updates complexity to simple', () => {
    useEpicStore.getState().setComplexity('simple');
    expect(useEpicStore.getState().complexity).toBe('simple');
  });
});

// ─── applyRefinedEpic ───────────────────────────────────────

describe('applyRefinedEpic', () => {
  it('stores current markdown as previousMarkdown', () => {
    useEpicStore.getState().setMarkdown(MOCK_MD);
    useEpicStore.getState().applyRefinedEpic('# Refined\n\n## 1. New\n\nNew content.');

    const state = useEpicStore.getState();
    expect(state.previousMarkdown).toBe(MOCK_MD);
    expect(state.markdown).toBe('# Refined\n\n## 1. New\n\nNew content.');
  });

  it('parses the refined markdown into document', () => {
    useEpicStore.getState().applyRefinedEpic('# Refined Epic');
    expect(useEpicStore.getState().document!.title).toBe('Refined Epic');
  });

  it('sets isDirty to true', () => {
    useEpicStore.getState().applyRefinedEpic('# Refined');
    expect(useEpicStore.getState().isDirty).toBe(true);
  });
});

// ─── undo ───────────────────────────────────────────────────

describe('undo', () => {
  it('restores previousMarkdown and clears it', () => {
    useEpicStore.getState().setMarkdown(MOCK_MD);
    useEpicStore.getState().applyRefinedEpic('# Refined');

    useEpicStore.getState().undo();
    const state = useEpicStore.getState();
    expect(state.markdown).toBe(MOCK_MD);
    expect(state.previousMarkdown).toBeNull();
  });

  it('re-parses document after undo', () => {
    useEpicStore.getState().setMarkdown(MOCK_MD);
    useEpicStore.getState().applyRefinedEpic('# Refined');
    useEpicStore.getState().undo();

    const doc = useEpicStore.getState().document!;
    expect(doc.sections[0]!.title).toBe('Objective');
  });

  it('is a no-op when previousMarkdown is null', () => {
    useEpicStore.getState().setMarkdown(MOCK_MD);
    const before = useEpicStore.getState().markdown;

    useEpicStore.getState().undo();
    expect(useEpicStore.getState().markdown).toBe(before);
  });
});

// ─── updateSection ──────────────────────────────────────────

describe('updateSection', () => {
  it('updates only the targeted section', () => {
    useEpicStore.getState().setMarkdown(MOCK_MD);
    useEpicStore.getState().updateSection('Objective', 'Updated objective content.');

    const state = useEpicStore.getState();
    expect(state.markdown).toContain('Updated objective content.');
    expect(state.markdown).toContain('Legacy system is slow.');
  });

  it('re-parses document after section update', () => {
    useEpicStore.getState().setMarkdown(MOCK_MD);
    useEpicStore.getState().updateSection('Objective', 'New goal here.');

    const doc = useEpicStore.getState().document!;
    const obj = doc.sections.find((s) => s.title === 'Objective');
    expect(obj!.content).toContain('New goal here.');
  });

  it('sets isDirty to true', () => {
    useEpicStore.getState().setMarkdown(MOCK_MD);
    useEpicStore.setState({ isDirty: false });
    useEpicStore.getState().updateSection('Objective', 'Changed.');
    expect(useEpicStore.getState().isDirty).toBe(true);
  });
});

// ─── reset ──────────────────────────────────────────────────

describe('reset', () => {
  it('clears everything back to initial state', () => {
    useEpicStore.getState().setMarkdown(MOCK_MD);
    useEpicStore.getState().setComplexity('complex');
    useEpicStore.getState().applyRefinedEpic('# Refined');

    useEpicStore.getState().reset();
    const state = useEpicStore.getState();
    expect(state.document).toBeNull();
    expect(state.markdown).toBe('');
    expect(state.isDirty).toBe(false);
    expect(state.previousMarkdown).toBeNull();
    expect(state.complexity).toBe('moderate');
  });
});
