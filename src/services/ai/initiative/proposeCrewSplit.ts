/**
 * AI Action — Propose Crew Split.
 *
 * Given a list of parsed headers and defined crews, asks the LLM to propose
 * header-to-crew assignments (many-to-many). Returns assignments map + reasoning.
 */

import { callAzure } from '@/services/ai/azureClient';
import type { AzureOpenAIConfig } from '@/domain/configTypes';
import type { Header, Crew } from '@/stores/initiativeStore';

// ─── Result Type ──────────────────────────────────────────────

export type SplitResult =
  | { ok: true; data: { assignments: Record<string, string[]>; reasoning: string } }
  | { ok: false; error: string };

// ─── Action ───────────────────────────────────────────────────

export async function proposeCrewSplit(
  config: AzureOpenAIConfig,
  endpoint: string,
  headers: Header[],
  crews: Crew[],
): Promise<SplitResult> {
  const headerList = headers.map((h) => `- [${h.id}] ${h.text} (H${h.level})`).join('\n');
  const crewList = crews.map((c) => `- [${c.id}] ${c.name}`).join('\n');

  try {
    const response = await callAzure(config, endpoint, {
      systemPrompt:
        'You are an initiative planning assistant. Given a list of headers (from a stream epic) and crew names, propose which headers should be assigned to which crews. A header CAN belong to multiple crews if it is cross-cutting. Return ONLY valid JSON: {"assignments": {"headerId": ["crewId", ...]}, "reasoning": "explanation of grouping logic"}',
      userPrompt: `Headers:\n${headerList}\n\nCrews:\n${crewList}`,
      maxTokens: 2000,
      temperature: 0.3,
    });

    const parsed = JSON.parse(response.content);

    if (
      !parsed ||
      typeof parsed.assignments !== 'object' ||
      typeof parsed.reasoning !== 'string'
    ) {
      return { ok: false, error: 'Response JSON missing required fields (assignments, reasoning)' };
    }

    return { ok: true, data: { assignments: parsed.assignments, reasoning: parsed.reasoning } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
