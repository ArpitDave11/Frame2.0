/**
 * refineCrewEpic — AI action for refining individual crew epics.
 *
 * Takes a crew name, its assigned headers, and the parent stream epic
 * context, then calls Azure OpenAI to generate a focused crew-level epic.
 */

import { callAzure } from '@/services/ai/azureClient';
import type { AzureOpenAIConfig } from '@/domain/configTypes';
import type { Header } from '@/stores/initiativeStore';

export type RefineCrewEpicResult =
  | { ok: true; data: string }
  | { ok: false; error: string };

export async function refineCrewEpic(
  config: AzureOpenAIConfig,
  endpoint: string,
  crewName: string,
  assignedHeaders: Header[],
  streamEpicContext: string,
): Promise<RefineCrewEpicResult> {
  const headerList = assignedHeaders
    .map((h) => `${'#'.repeat(h.level)} ${h.text}`)
    .join('\n');

  const systemPrompt = `You are a technical writer producing structured crew epics for software delivery teams.

Write a focused crew epic for "${crewName}" covering these assigned headers:
${headerList}

Use the parent stream epic as context. Output clean markdown with:
- A title (H1) for the crew epic
- Sections (H2/H3) for each assigned header, expanded with implementation detail
- Clear scope boundaries — only cover the assigned headers
- Actionable acceptance criteria where appropriate

Keep the output professional, concise, and ready for engineering consumption.`;

  const userPrompt = `Parent stream epic context:
${streamEpicContext}

Generate the crew epic for "${crewName}".`;

  try {
    const response = await callAzure(config, endpoint, {
      systemPrompt,
      userPrompt,
      temperature: 0.4,
      maxTokens: 4000,
    });
    return { ok: true, data: response.content };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
