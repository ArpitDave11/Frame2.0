/**
 * generateIssueDescription — AI-generated GitLab issue descriptions.
 *
 * Takes a parsed user story and epic context, generates a full
 * GitLab issue description with requirements, AC, and context.
 */

import { callAI } from './aiClient';
import type { AIClientConfig } from './types';
import type { ParsedUserStory } from '@/pipeline/utils/parseUserStories';

export async function generateIssueDescription(
  story: ParsedUserStory,
  epicTitle: string,
  epicContent: string,
  aiConfig: AIClientConfig,
): Promise<string> {
  const systemPrompt = `You generate professional GitLab issue descriptions from user stories.

Output format (markdown):
## Description
<2-3 sentence summary derived from the user story and epic context>

## User Story
**As a** ${story.asA}, **I want** ${story.iWant}, **so that** ${story.soThat}

## Acceptance Criteria
<numbered list of testable acceptance criteria>

## Technical Notes
<brief technical considerations based on the epic's architecture context>

## Definition of Done
- [ ] Implementation complete
- [ ] Unit tests written and passing
- [ ] Code reviewed
- [ ] Documentation updated

If the story has test cases, add a section after Definition of Done:

## Test Cases
<numbered list of test scenarios>

Keep it concise and actionable. Use the epic context to add relevant technical details.`;

  const userPrompt = `Epic: "${epicTitle}"
Story: ${story.id} — ${story.title}
As a: ${story.asA}
I want: ${story.iWant}
So that: ${story.soThat}
Acceptance Criteria: ${story.acceptanceCriteria.join('; ')}
Priority: ${story.priority}
${story.testCases?.length ? `Test Cases: ${story.testCases.join('; ')}` : ''}
${story.storyPoints ? `Story Points: ${story.storyPoints}` : ''}

Epic context (first 2000 chars):
${epicContent.slice(0, 2000)}

Generate the issue description.`;

  try {
    const response = await callAI(aiConfig, {
      systemPrompt,
      userPrompt,
      temperature: 0.4,
    });
    return response.content;
  } catch {
    // Fallback: build a basic description without AI
    return buildFallbackDescription(story, epicTitle);
  }
}

function buildFallbackDescription(story: ParsedUserStory, epicTitle: string): string {
  return `## Description
${story.title} — part of the "${epicTitle}" epic.

## User Story
**As a** ${story.asA}, **I want** ${story.iWant}, **so that** ${story.soThat}

## Acceptance Criteria
${story.acceptanceCriteria.map((ac, i) => `${i + 1}. ${ac}`).join('\n')}

## Definition of Done
- [ ] Implementation complete
- [ ] Unit tests written and passing
- [ ] Code reviewed
${story.testCases?.length ? `\n## Test Cases\n${story.testCases.map((tc, i) => `${i + 1}. ${tc}`).join('\n')}` : ''}`;
}
