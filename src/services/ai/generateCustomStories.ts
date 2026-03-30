/**
 * generateCustomStories — AI-powered custom issue generation.
 *
 * User provides a plain-text description. AI correlates it with the epic
 * context and generates 1-5 structured user stories with acceptance criteria.
 * Ported from V4 skills.ts:4228-4334.
 */

import type { AIClientConfig } from '@/services/ai/types';
import { callAI } from '@/services/ai/aiClient';
import type { ParsedUserStory } from '@/pipeline/utils/parseUserStories';

export async function generateCustomStories(
  aiConfig: AIClientConfig,
  userDescription: string,
  epicContent: string,
  existingStories: readonly ParsedUserStory[],
  existingIssues: readonly { title: string; iid: number }[],
): Promise<ParsedUserStory[]> {
  const existingStoryTitles = existingStories.map((s) => `- ${s.title}`).join('\n');
  const existingIssueTitles = existingIssues.map((i) => `- #${i.iid}: ${i.title}`).join('\n');

  const systemPrompt = `You are a senior Agile product owner creating GitLab issues.

The user describes what they need in plain text. Using the project's epic for context, generate 1-5 well-structured user stories that can become GitLab issues.

RULES:
1. Each story MUST have: title (concise, action-oriented), persona, goal, benefit
2. Generate ONLY what the user asked for — do not pad with unrelated stories
3. If the request is specific (one task), generate 1 story
4. If the request is broad (a feature area), break into 2-5 stories
5. Titles should be professional GitLab issue titles (not "As a..." format)
6. Persona/goal/benefit come from the epic's context — use real roles and systems
7. Include 3-5 specific acceptance criteria per story
8. Do NOT duplicate any existing story or issue listed below
9. Stories must be technically grounded in the epic's architecture/tech stack

Return ONLY a JSON array (no markdown, no explanation):
[{ "title": "...", "persona": "...", "goal": "...", "benefit": "...", "acceptanceCriteria": ["..."] }]`;

  const userPrompt = `PROJECT EPIC (for context):
${epicContent.substring(0, 4000)}

EXISTING USER STORIES (do NOT duplicate):
${existingStoryTitles || '(none)'}

EXISTING GITLAB ISSUES (do NOT duplicate):
${existingIssueTitles || '(none)'}

USER'S REQUEST:
"${userDescription}"

Generate the appropriate user stories as JSON:`;

  const response = await callAI(aiConfig, {
    systemPrompt,
    userPrompt,
    temperature: 0.4,
  });

  let cleaned = response.content
    .trim()
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  if (!cleaned.startsWith('[')) {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) cleaned = match[0];
  }

  const parsed: unknown = JSON.parse(cleaned);
  if (!Array.isArray(parsed) || parsed.length === 0) return [];

  return parsed.map((story: Record<string, unknown>, index: number) => {
    const id = `custom-${Date.now()}-${index}`;
    const persona = (story.persona as string) || 'user';
    const goal = (story.goal as string) || (story.title as string) || '';
    const benefit = (story.benefit as string) || '';
    const criteria = (story.acceptanceCriteria as string[]) || [];

    return {
      id,
      title: (story.title as string) || `Custom Story ${index + 1}`,
      asA: persona,
      iWant: goal,
      soThat: benefit,
      acceptanceCriteria: criteria,
      priority: 'medium',
    };
  });
}
