import { describe, it, expect } from 'vitest';
import {
  epicToMarkdown,
  markdownToEpic,
  extractSectionContent,
  replaceSectionContent,
} from './epicSerializer';
import type { EpicDocument } from './types';

// ─── Fixtures ───────────────────────────────────────────────

function makeDoc(sections: { title: string; content: string }[]): EpicDocument {
  return {
    title: 'Test Epic',
    sections: sections.map((s) => ({
      ...s,
      wordCount: s.content.split(/\s+/).filter(Boolean).length,
      isRequired: true,
    })),
    metadata: { createdAt: 0, lastRefined: null, complexity: 'moderate' },
  };
}

const FULL_MARKDOWN = `# Auth Service Redesign

## 1. Objective

Redesign the authentication service for better scalability.

## 2. Background & Context

The current auth service was built in 2019 and has scaling issues.

## 3. Architecture Overview

\`\`\`mermaid
graph LR
  A[Client] --> B[API Gateway]
  B --> C[Auth Service]
\`\`\`

## 4. User Stories

As a developer, I want token refresh to be transparent.`;

// ─── epicToMarkdown ─────────────────────────────────────────

describe('epicToMarkdown', () => {
  it('serializes title as # heading', () => {
    const md = epicToMarkdown(makeDoc([]));
    expect(md.startsWith('# Test Epic')).toBe(true);
  });

  it('serializes sections with sequential numbering', () => {
    const md = epicToMarkdown(makeDoc([
      { title: 'Objective', content: 'The goal.' },
      { title: 'Scope', content: 'The scope.' },
    ]));
    expect(md).toContain('## 1. Objective');
    expect(md).toContain('## 2. Scope');
  });

  it('emits empty section headings (preserves template placeholders)', () => {
    const md = epicToMarkdown(makeDoc([
      { title: 'Objective', content: 'The goal.' },
      { title: 'Empty', content: '' },
      { title: 'Scope', content: 'The scope.' },
    ]));
    expect(md).toContain('## 1. Objective');
    expect(md).toContain('## 2. Empty');
    expect(md).toContain('## 3. Scope');
  });

  it('preserves section content verbatim', () => {
    const md = epicToMarkdown(makeDoc([
      { title: 'Code', content: '```ts\nconst x = 1;\n```' },
    ]));
    expect(md).toContain('```ts\nconst x = 1;\n```');
  });
});

// ─── markdownToEpic ─────────────────────────────────────────

describe('markdownToEpic', () => {
  it('extracts title from # heading', () => {
    const epic = markdownToEpic('# My Epic\n\n## 1. Intro\n\nHello');
    expect(epic.title).toBe('My Epic');
  });

  it('parses sections correctly', () => {
    const epic = markdownToEpic(FULL_MARKDOWN);
    expect(epic.sections).toHaveLength(4);
    expect(epic.sections[0]!.title).toBe('Objective');
    expect(epic.sections[1]!.title).toBe('Background & Context');
    expect(epic.sections[2]!.title).toBe('Architecture Overview');
    expect(epic.sections[3]!.title).toBe('User Stories');
  });

  it('empty input returns epic with empty title and 0 sections', () => {
    const epic = markdownToEpic('');
    expect(epic.title).toBe('');
    expect(epic.sections).toHaveLength(0);
  });

  it('single paragraph without heading puts text in title', () => {
    const epic = markdownToEpic('Just some text about a project');
    expect(epic.title).toBe('Just some text about a project');
    expect(epic.sections).toHaveLength(0);
  });

  it('counts words per section accurately', () => {
    const epic = markdownToEpic('# T\n\n## 1. S\n\none two three four five');
    expect(epic.sections[0]!.wordCount).toBe(5);
  });

  it('handles nested headings (###) without creating false boundaries', () => {
    const md = `# Title\n\n## 1. Main\n\nContent here.\n\n### Sub-heading\n\nMore content.\n\n## 2. Next\n\nNext section.`;
    const epic = markdownToEpic(md);
    expect(epic.sections).toHaveLength(2);
    expect(epic.sections[0]!.title).toBe('Main');
    expect(epic.sections[0]!.content).toContain('### Sub-heading');
    expect(epic.sections[0]!.content).toContain('More content.');
  });

  it('strips section numbers from titles', () => {
    const md = '# T\n\n## 3. Architecture\n\nContent\n\n## 10. Appendix\n\nData';
    const epic = markdownToEpic(md);
    expect(epic.sections[0]!.title).toBe('Architecture');
    expect(epic.sections[1]!.title).toBe('Appendix');
  });

  it('preserves Unicode content (CJK, emoji)', () => {
    const md = '# 프로젝트\n\n## 1. 概要\n\n这是一个测试 🚀✨';
    const epic = markdownToEpic(md);
    expect(epic.title).toBe('프로젝트');
    expect(epic.sections[0]!.title).toBe('概要');
    expect(epic.sections[0]!.content).toContain('🚀✨');
  });

  it('preserves Mermaid code blocks (## inside fences is not a section)', () => {
    const md = `# Title

## 1. Diagram

\`\`\`mermaid
graph LR
  A[## Not a heading] --> B[Node]
\`\`\`

## 2. Next

Content here.`;

    const epic = markdownToEpic(md);
    expect(epic.sections).toHaveLength(2);
    expect(epic.sections[0]!.title).toBe('Diagram');
    expect(epic.sections[0]!.content).toContain('## Not a heading');
    expect(epic.sections[1]!.title).toBe('Next');
  });

  it('defaults metadata to moderate complexity', () => {
    const epic = markdownToEpic('# Test');
    expect(epic.metadata.complexity).toBe('moderate');
    expect(epic.metadata.lastRefined).toBeNull();
  });
});

// ─── Round-trip ─────────────────────────────────────────────

describe('round-trip: markdownToEpic(epicToMarkdown(epic))', () => {
  it('preserves all sections', () => {
    const original = makeDoc([
      { title: 'Objective', content: 'Build a better auth service.' },
      { title: 'Background', content: 'Legacy system is slow.' },
      { title: 'Design', content: 'Use microservices architecture.' },
    ]);

    const roundTripped = markdownToEpic(epicToMarkdown(original));

    expect(roundTripped.title).toBe(original.title);
    expect(roundTripped.sections).toHaveLength(original.sections.length);
    for (let i = 0; i < original.sections.length; i++) {
      expect(roundTripped.sections[i]!.title).toBe(original.sections[i]!.title);
      expect(roundTripped.sections[i]!.content).toBe(original.sections[i]!.content);
    }
  });

  it('preserves content with code fences', () => {
    const original = makeDoc([
      { title: 'Code', content: '```ts\nconst x = 1;\n## Not a heading\n```' },
    ]);

    const roundTripped = markdownToEpic(epicToMarkdown(original));
    expect(roundTripped.sections).toHaveLength(1);
    expect(roundTripped.sections[0]!.content).toContain('## Not a heading');
  });

  it('preserves empty sections through round-trip', () => {
    const original = makeDoc([
      { title: 'Objective', content: 'The goal.' },
      { title: 'Placeholder', content: '' },
      { title: 'Scope', content: 'The scope.' },
    ]);

    const roundTripped = markdownToEpic(epicToMarkdown(original));

    expect(roundTripped.sections).toHaveLength(3);
    expect(roundTripped.sections[0]!.title).toBe('Objective');
    expect(roundTripped.sections[1]!.title).toBe('Placeholder');
    expect(roundTripped.sections[1]!.content).toBe('');
    expect(roundTripped.sections[2]!.title).toBe('Scope');
  });

  it('handles nested code fences with different backtick counts', () => {
    const md = `# Title

## 1. Outer

\`\`\`\`markdown
Here is an example:
\`\`\`python
print("hello")
\`\`\`
\`\`\`\`

## 2. After Fences

Content after the nested fence block.`;

    const epic = markdownToEpic(md);
    expect(epic.sections).toHaveLength(2);
    expect(epic.sections[0]!.title).toBe('Outer');
    expect(epic.sections[0]!.content).toContain('```python');
    expect(epic.sections[1]!.title).toBe('After Fences');
  });

  it('preserves a full 4-section epic', () => {
    const epic = markdownToEpic(FULL_MARKDOWN);
    const md2 = epicToMarkdown(epic);
    const epic2 = markdownToEpic(md2);

    expect(epic2.sections).toHaveLength(epic.sections.length);
    for (let i = 0; i < epic.sections.length; i++) {
      expect(epic2.sections[i]!.title).toBe(epic.sections[i]!.title);
    }
  });
});

// ─── extractSectionContent ──────────────────────────────────

describe('extractSectionContent', () => {
  it('finds correct content by section title', () => {
    const content = extractSectionContent(FULL_MARKDOWN, 'Objective');
    expect(content).toBe('Redesign the authentication service for better scalability.');
  });

  it('is case-insensitive', () => {
    const content = extractSectionContent(FULL_MARKDOWN, 'objective');
    expect(content).toBe('Redesign the authentication service for better scalability.');
  });

  it('returns empty string for non-existent section', () => {
    const content = extractSectionContent(FULL_MARKDOWN, 'Nonexistent');
    expect(content).toBe('');
  });

  it('extracts content with code blocks', () => {
    const content = extractSectionContent(FULL_MARKDOWN, 'Architecture Overview');
    expect(content).toContain('```mermaid');
    expect(content).toContain('graph LR');
  });
});

// ─── replaceSectionContent ──────────────────────────────────

describe('replaceSectionContent', () => {
  it('replaces only the targeted section', () => {
    const result = replaceSectionContent(
      FULL_MARKDOWN,
      'Objective',
      'New objective content.',
    );

    expect(result).toContain('New objective content.');
    // Other sections unchanged
    expect(result).toContain('The current auth service was built in 2019');
    expect(result).toContain('```mermaid');
  });

  it('preserves heading line of replaced section', () => {
    const result = replaceSectionContent(FULL_MARKDOWN, 'Objective', 'New.');
    expect(result).toContain('## 1. Objective');
  });

  it('returns original markdown if section not found', () => {
    const result = replaceSectionContent(FULL_MARKDOWN, 'Nonexistent', 'New.');
    expect(result).toBe(FULL_MARKDOWN);
  });

  it('is case-insensitive for section matching', () => {
    const result = replaceSectionContent(FULL_MARKDOWN, 'objective', 'Changed.');
    expect(result).toContain('Changed.');
  });

  it('replaces last section correctly', () => {
    const result = replaceSectionContent(
      FULL_MARKDOWN,
      'User Stories',
      'New user stories content.',
    );
    expect(result).toContain('New user stories content.');
    // Previous section unchanged
    expect(result).toContain('```mermaid');
  });
});
