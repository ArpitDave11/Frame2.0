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
