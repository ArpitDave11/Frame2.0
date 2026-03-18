/**
 * Section Discovery & Matching — Phase 1 (T-1.4).
 *
 * Discovers sections in epic markdown, matches them against category
 * templates using fuzzy title matching, and identifies missing required
 * sections.
 */

import type { SectionFormat } from './types';

// ─── Types ──────────────────────────────────────────────────

/** A section discovered by scanning raw markdown */
export interface DiscoveredSection {
  title: string;
  normalizedTitle: string;
  content: string;
  lineStart: number;
  lineEnd: number;
  wordCount: number;
  hasSubsections: boolean;
}

/** A single section definition within a category template */
export interface TemplateSectionDef {
  name: string;
  required: boolean;
  wordTarget: number;
  format?: SectionFormat;
  aliases?: string[];
}

/** A rich category template containing section definitions */
export interface RichCategoryTemplate {
  category: string;
  sections: TemplateSectionDef[];
}

/** Result of matching a discovered section against a template */
export interface SectionMatchResult {
  isRequired: boolean;
  matchedTemplateName: string | null;
  wordTarget: number;
  format?: SectionFormat;
}

// ─── Helpers ────────────────────────────────────────────────

function normalize(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Computes a fuzzy similarity score between two normalized titles.
 * Uses word-overlap (Jaccard-like): shared words / total unique words.
 * Returns 0–1 where 1 is a perfect match.
 */
function titleSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalize(a).split(' ').filter(Boolean));
  const wordsB = new Set(normalize(b).split(' ').filter(Boolean));

  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let shared = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) shared++;
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return shared / union;
}

/** Similarity threshold for fuzzy matching */
const FUZZY_THRESHOLD = 0.3;

// ─── discoverSections ───────────────────────────────────────

/**
 * Scans markdown and returns all top-level `## ` sections with metadata.
 * Respects code fences (## inside ``` is not a section boundary).
 */
export function discoverSections(markdown: string): DiscoveredSection[] {
  if (!markdown.trim()) return [];

  const lines = markdown.split('\n');
  const sections: DiscoveredSection[] = [];
  let fenceMarker: string | null = null;

  // Indices of ## heading lines (outside code fences)
  const headingIndices: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trimStart();
    if (fenceMarker === null) {
      const match = trimmed.match(/^(`{3,})/);
      if (match) fenceMarker = match[1]!;
    } else if (trimmed.startsWith(fenceMarker) && trimmed.slice(fenceMarker.length).trim() === '') {
      fenceMarker = null;
    }
    if (fenceMarker === null && /^## /.test(lines[i]!)) {
      headingIndices.push(i);
    }
  }

  for (let h = 0; h < headingIndices.length; h++) {
    const startLine = headingIndices[h]!;
    const endLine = h + 1 < headingIndices.length
      ? headingIndices[h + 1]!
      : lines.length;

    const rawTitle = lines[startLine]!
      .replace(/^## /, '')
      .replace(/^\d+\.\s*/, '')
      .trim();

    const contentLines = lines.slice(startLine + 1, endLine);
    const content = contentLines.join('\n').trim();

    const hasSubsections = contentLines.some((l) => /^### /.test(l));

    sections.push({
      title: rawTitle,
      normalizedTitle: normalize(rawTitle),
      content,
      lineStart: startLine,
      lineEnd: endLine - 1,
      wordCount: countWords(content),
      hasSubsections,
    });
  }

  return sections;
}

// ─── matchSectionToTemplate ─────────────────────────────────

/**
 * Matches a section title against a category template's section definitions.
 * Tries exact match first, then alias match, then fuzzy word-overlap.
 */
export function matchSectionToTemplate(
  sectionTitle: string,
  template: RichCategoryTemplate,
): SectionMatchResult {
  const norm = normalize(sectionTitle);

  // 1. Exact match on normalized name
  for (const def of template.sections) {
    if (normalize(def.name) === norm) {
      return {
        isRequired: def.required,
        matchedTemplateName: def.name,
        wordTarget: def.wordTarget,
        format: def.format,
      };
    }
  }

  // 2. Alias match
  for (const def of template.sections) {
    if (def.aliases) {
      for (const alias of def.aliases) {
        if (normalize(alias) === norm) {
          return {
            isRequired: def.required,
            matchedTemplateName: def.name,
            wordTarget: def.wordTarget,
            format: def.format,
          };
        }
      }
    }
  }

  // 3. Fuzzy match — best scoring above threshold
  let bestScore = 0;
  let bestDef: TemplateSectionDef | null = null;

  for (const def of template.sections) {
    const score = titleSimilarity(sectionTitle, def.name);
    if (score > bestScore) {
      bestScore = score;
      bestDef = def;
    }
    // Also check aliases
    if (def.aliases) {
      for (const alias of def.aliases) {
        const aliasScore = titleSimilarity(sectionTitle, alias);
        if (aliasScore > bestScore) {
          bestScore = aliasScore;
          bestDef = def;
        }
      }
    }
  }

  if (bestDef && bestScore >= FUZZY_THRESHOLD) {
    return {
      isRequired: bestDef.required,
      matchedTemplateName: bestDef.name,
      wordTarget: bestDef.wordTarget,
      format: bestDef.format,
    };
  }

  // No match
  return {
    isRequired: false,
    matchedTemplateName: null,
    wordTarget: 0,
  };
}

// ─── findMissingRequiredSections ────────────────────────────

/**
 * Returns the names of required template sections not found in the
 * discovered sections (using the same matching logic).
 */
export function findMissingRequiredSections(
  discovered: DiscoveredSection[],
  template: RichCategoryTemplate,
): string[] {
  const requiredDefs = template.sections.filter((d) => d.required);
  const missing: string[] = [];

  for (const def of requiredDefs) {
    const found = discovered.some((s) => {
      const match = matchSectionToTemplate(s.title, {
        category: template.category,
        sections: [def],
      });
      return match.matchedTemplateName !== null;
    });

    if (!found) {
      missing.push(def.name);
    }
  }

  return missing;
}
