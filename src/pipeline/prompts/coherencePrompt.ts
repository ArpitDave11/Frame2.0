/**
 * Stage 4b — Cross-Section Coherence prompt builder.
 *
 * Reads all refined sections together and fixes contradictions,
 * redundancy, missing cross-references, and inconsistent terminology.
 */

import type { ComplexityLevel } from '@/domain/types';

export const PROMPT_VERSION = '1.0.0';

export interface CoherencePromptVars {
  readonly allSections: string;
  readonly categoryName: string;
  readonly complexityLevel: ComplexityLevel;
}

export function buildCoherencePrompt(vars: CoherencePromptVars): string {
  return `<system>
You are an expert technical editor performing a cross-section coherence review.
Your job is to read ALL sections of a document together and fix:
1. **Contradictions**: Section A says X, Section B says Y — resolve to one truth
2. **Redundancy**: Same point made in multiple sections — consolidate to one location
3. **Missing cross-references**: Vague "see above" or "as mentioned" — add specific section references
4. **Inconsistent terminology**: Same concept called different names — unify to one term
</system>

<task>
Review the following ${vars.categoryName} document sections as a whole.
Fix any coherence issues you find. Return the corrected sections with a list of fixes.

Complexity: ${vars.complexityLevel}
</task>

<all_sections>
${vars.allSections}
</all_sections>

<output_format>
Respond with a single JSON object. Do not include any text outside the JSON.

\`\`\`json
{
  "refinedSections": [
    {
      "sectionId": "string",
      "title": "string",
      "content": "string — corrected content",
      "formatUsed": "string"
    }
  ],
  "fixes": [
    {
      "type": "contradiction | redundancy | missing-crossref | terminology",
      "sections": ["section-id-1", "section-id-2"],
      "description": "What was found and how it was fixed"
    }
  ]
}
\`\`\`

### Rules:
- Return ALL sections, even unchanged ones (preserve order and IDs).
- Only modify content where a coherence issue exists.
- If no issues are found, return sections unchanged with an empty fixes array.
- Each fix must reference the specific sections affected.
</output_format>`;
}
