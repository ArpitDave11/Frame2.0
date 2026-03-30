/**
 * parseUserStories — Extract user stories from refined epic markdown.
 *
 * Parses the "User Stories" section and extracts structured story objects.
 * Handles multiple formats:
 *   - ### US-001: Title           (heading — pipeline output)
 *   - **US-001:** Title           (bold at line start — hand-edited)
 *   - - **US-001:** Title         (bold with bullet — imported)
 * Story IDs are normalized to 3-digit padding (US-1 → US-001).
 */

export interface ParsedUserStory {
  id: string;
  title: string;
  asA: string;
  iWant: string;
  soThat: string;
  acceptanceCriteria: string[];
  priority: string;
  storyPoints?: number;
  testCases?: string[];
}

/**
 * Matches any of the 3 story header formats:
 *   ### US-123: Title
 *   **US-123:** Title   or   **US-123: Title**
 *   - **US-123:** Title  or  * **US-123:** Title
 *
 * Captures: [1] = digit(s), [2] = rest of the line (title)
 */
const STORY_HEADER = /^(?:#{1,4}\s+|[-*]\s*\*\*|\*\*)US-(\d+)[:\s*]*\**[:\s]*(.*)$/gm;

export function parseUserStories(epicContent: string): ParsedUserStory[] {
  const stories: ParsedUserStory[] = [];

  // Find all story header positions
  const headers: Array<{ digits: string; titleLine: string; index: number }> = [];
  let match: RegExpExecArray | null;
  STORY_HEADER.lastIndex = 0;

  while ((match = STORY_HEADER.exec(epicContent)) !== null) {
    headers.push({
      digits: match[1]!,
      titleLine: cleanTitle(match[2] ?? ''),
      index: match.index,
    });
  }

  if (headers.length === 0) return [];

  // Extract body for each story (text between this header and the next)
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]!;
    const nextIndex = i + 1 < headers.length ? headers[i + 1]!.index : epicContent.length;
    const headerEnd = epicContent.indexOf('\n', header.index);
    const body = headerEnd >= 0 ? epicContent.slice(headerEnd + 1, nextIndex).trim() : '';

    const id = normalizeId(header.digits);

    const asAMatch = /\*\*As a\*\*\s*(.+?)(?:,|\n)/i.exec(body);
    const iWantMatch = /\*\*I want\*\*\s*(.+?)(?:,|\n)/i.exec(body);
    const soThatMatch = /\*\*So that\*\*\s*(.+?)(?:\.|,|\n|$)/i.exec(body);

    const acSection = body.match(/\*{0,2}Acceptance Criteria\*{0,2}:?\*{0,2}\s*\n([\s\S]*?)(?:\n\s*\n|\n\*\*|$)/i);
    const acceptanceCriteria: string[] = [];
    if (acSection?.[1]) {
      const bullets = acSection[1].match(/^[-*]\s+(.+)/gm);
      if (bullets) {
        for (const b of bullets) {
          acceptanceCriteria.push(b.replace(/^[-*]\s+/, '').trim());
        }
      }
    }

    const priorityMatch = /\*\*Priority(?:\*\*)?[:\s*]*(\w+)/i.exec(body);
    const spMatch = /\*\*Story Points(?:\*\*)?[:\s*]*(\d+)/i.exec(body);
    const storyPoints = spMatch ? parseInt(spMatch[1]!, 10) : undefined;

    const tcSection = body.match(/\*{0,2}Test Cases\*{0,2}:?\*{0,2}\s*\n((?:\s*\d+\.\s*.+\n?)+)/i);
    const testCases: string[] = [];
    if (tcSection?.[1]) {
      const lines = tcSection[1].match(/\d+\.\s*(.+)/g);
      if (lines) {
        for (const line of lines) {
          testCases.push(line.replace(/^\d+\.\s*/, '').trim());
        }
      }
    }

    stories.push({
      id,
      title: header.titleLine || 'Untitled Story',
      asA: asAMatch?.[1]?.trim() ?? 'user',
      iWant: iWantMatch?.[1]?.trim() ?? (header.titleLine || 'this feature'),
      soThat: soThatMatch?.[1]?.trim() ?? 'achieve the goal',
      acceptanceCriteria: acceptanceCriteria.length > 0 ? acceptanceCriteria : ['Functionality works as described'],
      priority: priorityMatch?.[1]?.toLowerCase() ?? 'medium',
      ...(storyPoints !== undefined ? { storyPoints } : {}),
      ...(testCases.length > 0 ? { testCases } : {}),
    });
  }

  return stories;
}

/** Normalize story ID digits to 3-digit padded format. */
function normalizeId(digits: string): string {
  const num = parseInt(digits, 10);
  return `US-${String(num).padStart(3, '0')}`;
}

/** Strip trailing bold markers, brackets, and whitespace from title text. */
function cleanTitle(raw: string): string {
  return raw.replace(/\[.*?\]/g, '').replace(/\*+/g, '').trim();
}
