/**
 * AI Action — Generate Stream Epic for Extreme Initiative module.
 *
 * Calls Azure OpenAI to produce a structured H2/H3 epic outline
 * from a stream title and description, targeting a section count
 * appropriate for distribution across the given number of crews.
 */

import { callAzure } from '@/services/ai/azureClient';
import type { AzureOpenAIConfig } from '@/domain/configTypes';

type GenerateResult =
  | { ok: true; data: string }
  | { ok: false; error: string };

export async function generateStreamEpic(
  config: AzureOpenAIConfig,
  endpoint: string,
  title: string,
  description: string,
  crewCount: number,
): Promise<GenerateResult> {
  try {
    const response = await callAzure(config, endpoint, {
      systemPrompt: `You are an enterprise initiative planner. Given a stream title and description, generate a structured epic outline. Use ## for major workstreams and ### for sub-sections. Target approximately ${crewCount * 3}-${crewCount * 5} sections total so they can be distributed across ${crewCount} crews. Each section should be a meaningful unit of work.`,
      userPrompt: `Stream: ${title}\n\nDescription:\n${description}`,
      maxTokens: 4000,
      temperature: 0.7,
    });
    return { ok: true, data: response.content };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
