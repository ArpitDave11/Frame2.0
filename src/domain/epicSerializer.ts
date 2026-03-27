/**
 * Epic Markdown Serializer — Phase 1.
 *
 * Converts between EpicDocument (structured) and markdown (string).
 * Handles code fences, nested headings, and Unicode content.
 */

import type { EpicDocument, EpicSection } from './types';

// ─── Helpers ────────────────────────────────────────────────

function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Tracks code fence state using marker-matching.
 * Enters on opening ``` (3+ backticks), exits only on a matching
 * or longer fence with no trailing content. Handles nested fences
 * and language annotations correctly.
 */
function updateFenceState(line: string, currentMarker: string | null): string | null {
  const trimmed = line.trimStart();
  if (currentMarker === null) {
    const match = trimmed.match(/^(`{3,})/);
    if (match) return match[1]!;
    return null;
  }
  // Inside a fence — only exit on matching or longer fence with no trailing content
  if (trimmed.startsWith(currentMarker) && trimmed.slice(currentMarker.length).trim() === '') {
    return null;
  }
  return currentMarker;
}

/**
 * Splits markdown into top-level sections, respecting code fences.
 * A `## ` heading inside a fenced code block does NOT start a new section.
 */
function splitSections(markdown: string): { title: string; content: string }[] {
  const lines = markdown.split('\n');
  const sections: { title: string; content: string }[] = [];
  let currentTitle = '';
  let currentLines: string[] = [];
  let fenceMarker: string | null = null;

  for (const line of lines) {
    fenceMarker = updateFenceState(line, fenceMarker);

    // Only split on ## headings outside code fences
    if (fenceMarker === null && /^## /.test(line)) {
      if (currentTitle || currentLines.length > 0) {
        sections.push({ title: currentTitle, content: currentLines.join('\n').trim() });
      }
      // Strip optional numbering: "## 3. Architecture" → "Architecture"
      currentTitle = line
        .replace(/^## /, '')
        .replace(/^\d+\.\s*/, '')
        .trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // Push final section
  if (currentTitle || currentLines.length > 0) {
    sections.push({ title: currentTitle, content: currentLines.join('\n').trim() });
  }

  return sections;
}

// ─── safeTruncateTitle (F06) ─────────────────────────────────

/**
 * Words that should never be the last word of a truncated title.
 * Includes prepositions, conjunctions, articles, determiners.
 * F06 spec: 50+ unsafe ending words.
 */
const DANGLING_WORDS = new Set([
  'a', 'an', 'the', 'of', 'in', 'for', 'to', 'and', 'or', 'but', 'nor',
  'at', 'by', 'on', 'with', 'from', 'into', 'through', 'during', 'before',
  'after', 'above', 'below', 'between', 'under', 'over', 'about', 'against',
  'along', 'among', 'around', 'behind', 'beneath', 'beside', 'beyond',
  'despite', 'down', 'except', 'inside', 'near', 'off', 'onto', 'outside',
  'per', 'since', 'than', 'toward', 'towards', 'until', 'upon', 'via',
  'within', 'without', 'our', 'your', 'their', 'its', 'this', 'that', 'these',
  'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
]);

/**
 * Truncate a title at a safe word boundary, never ending with a dangling word.
 * F06 spec: minimum 3 words, max maxWords.
 */
export function safeTruncateTitle(title: string, maxWords: number = 8): string {
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return title;

  // Truncate to maxWords
  let end = maxWords;

  // Walk backward to find last non-dangling word
  while (end > 3 && DANGLING_WORDS.has(words[end - 1]!.toLowerCase())) {
    end--;
  }

  // Minimum 3 words
  if (end < 3) end = 3;

  return words.slice(0, end).join(' ');
}

// ─── enforceWordLimit (F08) ──────────────────────────────────

/**
 * Enforce word limits on AI-generated text. Runs AFTER every AI response.
 * - Within limit: pass through unchanged.
 * - 1x-2x over: trim at last sentence boundary within maxWords.
 * - Over 2x: returns text truncated at sentence boundary (caller can re-prompt).
 * - Hard fallback: word-level truncation if no sentence boundary found.
 *
 * F08 spec: mechanical enforcement, not reliant on AI compliance.
 */
export function enforceWordLimit(text: string, maxWords: number): string {
  if (maxWords <= 0) return text; // max: 0 means no limit (tables, metadata)

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;

  // Find last sentence boundary within maxWords
  const truncatedWords = words.slice(0, maxWords);
  const truncatedText = truncatedWords.join(' ');

  // Walk backward to find last sentence-ending punctuation
  const sentenceEnd = /[.!?]\s*$/;
  const sentences = truncatedText.split(/(?<=[.!?])\s+/);

  if (sentences.length > 1) {
    // Drop the last (likely incomplete) sentence
    sentences.pop();
    const result = sentences.join(' ').trim();
    if (result.length > 0) return result;
  }

  // No sentence boundary found — hard truncate at word limit
  return truncatedText + '...';
}

// ─── stripRequirementTags (F10) ─────────────────────────────

/**
 * Strip internal requirement traceability tags from text for output boundaries.
 * Handles: [Req #1], [Req #1, Req #3], [REQ-001], [req#2], etc.
 * Strips preceding whitespace to avoid double-spaces.
 * F10 spec: apply at publish, update, clipboard, export — NOT in editor state.
 */
export function stripRequirementTags(text: string): string {
  return text.replace(/\s*\[(?:Req|REQ)\s*[#-]?\s*\d+(?:\s*,\s*(?:Req|REQ)\s*[#-]?\s*\d+)*\]/gi, '');
}

// ─── epicToMarkdown ─────────────────────────────────────────

export function epicToMarkdown(epic: EpicDocument): string {
  const parts: string[] = [`# ${epic.title}`];
  let sectionNum = 1;

  for (const section of epic.sections) {
    parts.push('', `## ${sectionNum}. ${section.title}`);
    if (section.content.trim().length > 0) {
      parts.push('', section.content);
    }
    sectionNum++;
  }

  return parts.join('\n');
}

// ─── markdownToEpic ─────────────────────────────────────────

export function markdownToEpic(markdown: string): EpicDocument {
  const trimmed = markdown.trim();

  if (trimmed.length === 0) {
    return {
      title: '',
      sections: [],
      metadata: { createdAt: Date.now(), lastRefined: null, complexity: 'moderate' },
    };
  }

  // Extract title from first # heading
  let title = '';
  let bodyStart = 0;
  const lines = trimmed.split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (/^# /.test(lines[i]!)) {
      title = lines[i]!.replace(/^# /, '').trim();
      bodyStart = i + 1;
      break;
    }
  }

  // If no # heading found, treat first line as title
  if (!title && lines.length > 0) {
    title = lines[0]!.trim();
    bodyStart = 1;
  }

  const body = lines.slice(bodyStart).join('\n');
  const rawSections = splitSections(body);

  // First entry may be preamble content (before any ## heading)
  const sections: EpicSection[] = [];

  for (const raw of rawSections) {
    if (!raw.title && raw.content.trim().length === 0) continue;
    if (!raw.title) {
      // Preamble — treat as untitled section only if it has content
      if (raw.content.trim().length > 0) {
        sections.push({
          title: '',
          content: raw.content.trim(),
          wordCount: countWords(raw.content),
          isRequired: false,
        });
      }
      continue;
    }

    sections.push({
      title: raw.title,
      content: raw.content.trim(),
      wordCount: countWords(raw.content),
      isRequired: false,
    });
  }

  return {
    title,
    sections,
    metadata: { createdAt: Date.now(), lastRefined: null, complexity: 'moderate' },
  };
}

// ─── extractSectionContent ──────────────────────────────────

export function extractSectionContent(
  markdown: string,
  sectionTitle: string,
): string {
  const lower = sectionTitle.toLowerCase();
  const sections = splitSections(markdown);

  for (const s of sections) {
    if (s.title.toLowerCase() === lower) {
      return s.content.trim();
    }
  }

  return '';
}

// ─── replaceSectionContent ──────────────────────────────────

export function replaceSectionContent(
  markdown: string,
  sectionTitle: string,
  newContent: string,
): string {
  const lines = markdown.split('\n');
  const lower = sectionTitle.toLowerCase();
  let fenceMarker: string | null = null;
  let sectionStart = -1;
  let sectionEnd = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    fenceMarker = updateFenceState(line, fenceMarker);

    if (fenceMarker === null && /^## /.test(line)) {
      const heading = line.replace(/^## /, '').replace(/^\d+\.\s*/, '').trim();

      if (sectionStart >= 0) {
        // Found the next section — that's where ours ends
        sectionEnd = i;
        break;
      }

      if (heading.toLowerCase() === lower) {
        sectionStart = i;
      }
    }
  }

  if (sectionStart < 0) return markdown; // section not found

  // Replace: keep the heading line, swap content
  const before = lines.slice(0, sectionStart + 1);
  const after = lines.slice(sectionEnd);

  return [...before, '', newContent, '', ...after].join('\n');
}
