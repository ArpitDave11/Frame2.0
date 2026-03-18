import { describe, it, expect } from 'vitest';
import {
  discoverSections,
  matchSectionToTemplate,
  findMissingRequiredSections,
} from './sectionDiscovery';
import type { RichCategoryTemplate, DiscoveredSection } from './sectionDiscovery';
import { createMockEpicContent } from '../test/helpers';

// ─── Fixtures ───────────────────────────────────────────────

const TECH_DESIGN_TEMPLATE: RichCategoryTemplate = {
  category: 'technical_design',
  sections: [
    { name: 'Objective', required: true, wordTarget: 150 },
    { name: 'Background & Context', required: true, wordTarget: 200, aliases: ['Context', 'Background'] },
    { name: 'Proposed Design', required: true, wordTarget: 400, format: 'prose', aliases: ['Architecture Overview', 'High-Level Architecture', 'Design'] },
    { name: 'Alternatives Considered', required: true, wordTarget: 200, format: 'comparison-table-and-prose' },
    { name: 'Implementation Plan', required: true, wordTarget: 300, format: 'phase-table' },
    { name: 'Security Considerations', required: false, wordTarget: 150, aliases: ['Security'] },
    { name: 'Testing Strategy', required: false, wordTarget: 150 },
    { name: 'Rollout Plan', required: false, wordTarget: 150, aliases: ['Deployment Plan'] },
  ],
};

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

### Token Flow

The token flow uses JWT with refresh.

### Session Management

Sessions are stored in Redis.

## 4. Alternatives Considered

We evaluated three options and chose microservices.

## 5. Implementation Plan

Phase 1: Extract auth from monolith.
Phase 2: Deploy standalone service.

## 6. User Stories

As a developer, I want token refresh to be transparent.`;

// ─── discoverSections ───────────────────────────────────────

describe('discoverSections', () => {
  it('discovers correct count from a multi-section epic', () => {
    const sections = discoverSections(FULL_MARKDOWN);
    expect(sections).toHaveLength(6);
  });

  it('discovers 0 sections from empty string', () => {
    expect(discoverSections('')).toHaveLength(0);
  });

  it('discovers sections from a 17-section mock epic', () => {
    const md = createMockEpicContent(17);
    const sections = discoverSections(md);
    expect(sections).toHaveLength(17);
  });

  it('returns correct titles (numbering stripped)', () => {
    const sections = discoverSections(FULL_MARKDOWN);
    expect(sections[0]!.title).toBe('Objective');
    expect(sections[2]!.title).toBe('Architecture Overview');
    expect(sections[5]!.title).toBe('User Stories');
  });

  it('normalizedTitle is lowercase alphanumeric', () => {
    const sections = discoverSections(FULL_MARKDOWN);
    const bg = sections[1]!;
    expect(bg.normalizedTitle).toBe('background context');
  });

  it('word counts are accurate', () => {
    const sections = discoverSections(FULL_MARKDOWN);
    const objective = sections[0]!;
    // "Redesign the authentication service for better scalability." = 7 words
    expect(objective.wordCount).toBe(7);
  });

  it('hasSubsections is true when section contains ### headings', () => {
    const sections = discoverSections(FULL_MARKDOWN);
    const arch = sections[2]!; // Architecture Overview has ### Token Flow and ### Session Management
    expect(arch.hasSubsections).toBe(true);
  });

  it('hasSubsections is false when section has no ### headings', () => {
    const sections = discoverSections(FULL_MARKDOWN);
    const objective = sections[0]!;
    expect(objective.hasSubsections).toBe(false);
  });

  it('line numbers are accurate for first section', () => {
    const sections = discoverSections(FULL_MARKDOWN);
    const objective = sections[0]!;
    // Find the actual line number of "## 1. Objective" in FULL_MARKDOWN
    const lines = FULL_MARKDOWN.split('\n');
    const expectedStart = lines.findIndex((l) => l.startsWith('## 1. Objective'));
    expect(objective.lineStart).toBe(expectedStart);
  });

  it('line numbers allow extraction back to original content', () => {
    const lines = FULL_MARKDOWN.split('\n');
    const sections = discoverSections(FULL_MARKDOWN);
    const bg = sections[1]!; // Background & Context

    // Content between lineStart+1 and lineEnd should match discovered content
    const extractedLines = lines.slice(bg.lineStart + 1, bg.lineEnd + 1);
    const extracted = extractedLines.join('\n').trim();
    expect(extracted).toBe(bg.content);
  });

  it('does not split on ## inside code fences', () => {
    const md = `## Diagram

\`\`\`mermaid
graph LR
  A[## Not a heading] --> B
\`\`\`

## Next Section

Content here.`;

    const sections = discoverSections(md);
    expect(sections).toHaveLength(2);
    expect(sections[0]!.title).toBe('Diagram');
    expect(sections[0]!.content).toContain('## Not a heading');
  });
});

// ─── matchSectionToTemplate ─────────────────────────────────

describe('matchSectionToTemplate', () => {
  it('exact match: "Objective" matches "Objective"', () => {
    const result = matchSectionToTemplate('Objective', TECH_DESIGN_TEMPLATE);
    expect(result.matchedTemplateName).toBe('Objective');
    expect(result.isRequired).toBe(true);
    expect(result.wordTarget).toBe(150);
  });

  it('exact match is case-insensitive', () => {
    const result = matchSectionToTemplate('objective', TECH_DESIGN_TEMPLATE);
    expect(result.matchedTemplateName).toBe('Objective');
  });

  it('alias match: "Architecture Overview" matches "Proposed Design"', () => {
    const result = matchSectionToTemplate('Architecture Overview', TECH_DESIGN_TEMPLATE);
    expect(result.matchedTemplateName).toBe('Proposed Design');
    expect(result.isRequired).toBe(true);
  });

  it('alias match: "High-Level Architecture" matches "Proposed Design"', () => {
    const result = matchSectionToTemplate('High-Level Architecture', TECH_DESIGN_TEMPLATE);
    expect(result.matchedTemplateName).toBe('Proposed Design');
  });

  it('alias match: "Security" matches "Security Considerations"', () => {
    const result = matchSectionToTemplate('Security', TECH_DESIGN_TEMPLATE);
    expect(result.matchedTemplateName).toBe('Security Considerations');
    expect(result.isRequired).toBe(false);
  });

  it('alias match: "Background" matches "Background & Context" via alias', () => {
    const result = matchSectionToTemplate('Background', TECH_DESIGN_TEMPLATE);
    expect(result.matchedTemplateName).toBe('Background & Context');
  });

  it('fuzzy match: "Project Context and Background" matches "Background & Context" via word overlap', () => {
    const result = matchSectionToTemplate('Project Context and Background', TECH_DESIGN_TEMPLATE);
    expect(result.matchedTemplateName).toBe('Background & Context');
  });

  it('fuzzy match: "Alternatives Review" matches "Alternatives Considered" via word overlap', () => {
    // Jaccard: shared={alternatives} / union={alternatives,review,considered} = 1/3 = 0.33 ≥ 0.3
    const result = matchSectionToTemplate('Alternatives Review', TECH_DESIGN_TEMPLATE);
    expect(result.matchedTemplateName).toBe('Alternatives Considered');
  });

  it('no match: "Random Title" returns null', () => {
    const result = matchSectionToTemplate('Random Title', TECH_DESIGN_TEMPLATE);
    expect(result.matchedTemplateName).toBeNull();
    expect(result.isRequired).toBe(false);
    expect(result.wordTarget).toBe(0);
  });

  it('no match: empty string returns null', () => {
    const result = matchSectionToTemplate('', TECH_DESIGN_TEMPLATE);
    expect(result.matchedTemplateName).toBeNull();
  });

  it('returns format from template when matched', () => {
    const result = matchSectionToTemplate('Alternatives Considered', TECH_DESIGN_TEMPLATE);
    expect(result.format).toBe('comparison-table-and-prose');
  });

  it('format is undefined when template section has no format', () => {
    const result = matchSectionToTemplate('Objective', TECH_DESIGN_TEMPLATE);
    expect(result.format).toBeUndefined();
  });
});

// ─── findMissingRequiredSections ────────────────────────────

describe('findMissingRequiredSections', () => {
  it('returns empty when all required sections present', () => {
    const discovered: DiscoveredSection[] = [
      makeDisco('Objective'),
      makeDisco('Background & Context'),
      makeDisco('Architecture Overview'),  // alias for Proposed Design
      makeDisco('Alternatives Considered'),
      makeDisco('Implementation Plan'),
    ];

    const missing = findMissingRequiredSections(discovered, TECH_DESIGN_TEMPLATE);
    expect(missing).toHaveLength(0);
  });

  it('identifies missing required sections', () => {
    const discovered: DiscoveredSection[] = [
      makeDisco('Objective'),
      makeDisco('Background & Context'),
    ];

    const missing = findMissingRequiredSections(discovered, TECH_DESIGN_TEMPLATE);
    expect(missing).toContain('Proposed Design');
    expect(missing).toContain('Alternatives Considered');
    expect(missing).toContain('Implementation Plan');
    expect(missing).toHaveLength(3);
  });

  it('does not include optional sections in missing list', () => {
    const discovered: DiscoveredSection[] = [
      makeDisco('Objective'),
      makeDisco('Background & Context'),
      makeDisco('Proposed Design'),
      makeDisco('Alternatives Considered'),
      makeDisco('Implementation Plan'),
    ];

    const missing = findMissingRequiredSections(discovered, TECH_DESIGN_TEMPLATE);
    expect(missing).not.toContain('Security Considerations');
    expect(missing).not.toContain('Testing Strategy');
    expect(missing).not.toContain('Rollout Plan');
  });

  it('recognizes aliased sections as present', () => {
    const discovered: DiscoveredSection[] = [
      makeDisco('Objective'),
      makeDisco('Context'),           // alias for Background & Context
      makeDisco('Design'),            // alias for Proposed Design
      makeDisco('Alternatives Considered'),
      makeDisco('Implementation Plan'),
    ];

    const missing = findMissingRequiredSections(discovered, TECH_DESIGN_TEMPLATE);
    expect(missing).toHaveLength(0);
  });

  it('returns all required when discovered is empty', () => {
    const missing = findMissingRequiredSections([], TECH_DESIGN_TEMPLATE);
    const requiredCount = TECH_DESIGN_TEMPLATE.sections.filter((s) => s.required).length;
    expect(missing).toHaveLength(requiredCount);
  });
});

// ─── Helper ─────────────────────────────────────────────────

function makeDisco(title: string): DiscoveredSection {
  return {
    title,
    normalizedTitle: title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim(),
    content: `Content for ${title}.`,
    lineStart: 0,
    lineEnd: 1,
    wordCount: 3,
    hasSubsections: false,
  };
}
