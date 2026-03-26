/**
 * analyzeStoryDuplicates — AI-powered duplicate detection.
 *
 * Compares parsed user stories against existing GitLab issues.
 * Returns similarity scores (0-100%) for each story.
 */

import { callAI } from './aiClient';
import type { AIClientConfig } from './types';
import type { ParsedUserStory } from '@/pipeline/utils/parseUserStories';

export interface DuplicateAnalysis {
  storyId: string;
  similarityScore: number; // 0-100
  matchedIssueId?: string;
  matchedIssueTitle?: string;
  reasoning: string;
}

export async function analyzeStoryDuplicates(
  stories: ParsedUserStory[],
  existingIssues: Array<{ id: string; title: string; description?: string }>,
  aiConfig: AIClientConfig,
): Promise<DuplicateAnalysis[]> {
  if (existingIssues.length === 0) {
    return stories.map((s) => ({
      storyId: s.id,
      similarityScore: 0,
      reasoning: 'No existing issues to compare against',
    }));
  }

  const systemPrompt = `You are a duplicate detection system. Compare user stories against existing GitLab issues and score their similarity from 0-100%.

Score guide:
- 0-30%: Clearly different topics
- 30-50%: Related but distinct scope
- 50-80%: Similar — likely overlapping requirements (warn)
- 80-100%: Duplicate — covers same requirement (flag)

Respond with a JSON array. Each element:
{
  "storyId": "US-XXX",
  "similarityScore": <number 0-100>,
  "matchedIssueId": "<id of most similar issue or null>",
  "matchedIssueTitle": "<title of matched issue or null>",
  "reasoning": "<brief explanation>"
}`;

  const userPrompt = `## User Stories (new)
${stories.map((s) => `- ${s.id}: ${s.title} — As a ${s.asA}, I want ${s.iWant}, so that ${s.soThat}`).join('\n')}

## Existing GitLab Issues
${existingIssues.map((i) => `- ${i.id}: ${i.title}${i.description ? ` — ${i.description.slice(0, 100)}` : ''}`).join('\n')}

Analyze each user story against all existing issues. Return JSON array.`;

  try {
    const response = await callAI(aiConfig, {
      systemPrompt,
      userPrompt,
      temperature: 0.3,
    });

    const parsed = parseAnalysisResponse(response.content);
    if (parsed) return parsed;
  } catch {
    // Fall through to fallback
  }

  // Fallback: simple title-based similarity (no AI)
  return stories.map((s) => {
    const storyWords = new Set(s.title.toLowerCase().split(/\s+/));
    let bestScore = 0;
    let bestIssue: typeof existingIssues[0] | undefined;

    for (const issue of existingIssues) {
      const issueWords = new Set(issue.title.toLowerCase().split(/\s+/));
      const intersection = [...storyWords].filter((w) => issueWords.has(w) && w.length > 3);
      const score = Math.round((intersection.length / Math.max(storyWords.size, issueWords.size)) * 100);
      if (score > bestScore) {
        bestScore = score;
        bestIssue = issue;
      }
    }

    return {
      storyId: s.id,
      similarityScore: bestScore,
      matchedIssueId: bestScore > 30 ? bestIssue?.id : undefined,
      matchedIssueTitle: bestScore > 30 ? bestIssue?.title : undefined,
      reasoning: 'Keyword-based fallback (AI unavailable)',
    };
  });
}

function parseAnalysisResponse(content: string): DuplicateAnalysis[] | null {
  try {
    const arr = JSON.parse(content.trim());
    if (Array.isArray(arr)) return arr;
  } catch { /* continue */ }

  const codeBlock = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlock?.[1]) {
    try {
      const arr = JSON.parse(codeBlock[1].trim());
      if (Array.isArray(arr)) return arr;
    } catch { /* continue */ }
  }

  return null;
}
