/**
 * Lens prompt templates for Doc Intelligence analysis.
 * 7 lenses × 3 parallel calls (summary, insights, visuals).
 */

import type { LensType } from '@/stores/docIntelStore';

// ─── System Prompts per Lens ───────────────────────────────

const LENS_SYSTEM_PROMPTS: Record<LensType, string> = {
  executive: 'You are a senior strategy analyst preparing an executive briefing. Write for C-suite: focus on business impact, strategic alignment, and decisions needed. Use confident, concise language. No technical jargon.',
  technical: 'You are a principal engineer performing a technical review. Focus on architecture, implementation details, dependencies, risks, and technical debt. Be precise and specific.',
  legal: 'You are a legal analyst reviewing a document for compliance, liability, and regulatory implications. Flag obligations, risks, and ambiguous language. Cite specific sections.',
  financial: 'You are a financial analyst extracting financial implications. Focus on costs, revenue impact, ROI, budget requirements, and financial risks. Use concrete numbers where available.',
  operational: 'You are an operations manager creating an operational guide. Focus on processes, workflows, resource requirements, timelines, and operational risks. Be actionable.',
  risk: 'You are a risk analyst performing a comprehensive risk assessment. Identify, categorize, and prioritize risks. Include likelihood, impact, and mitigation strategies.',
  summary: 'You are a technical writer creating a comprehensive summary. Cover all key points concisely. Be neutral and factual.',
};

export function getLensSystemPrompt(lens: LensType, focusContext: string): string {
  const base = LENS_SYSTEM_PROMPTS[lens];
  const focus = focusContext.trim()
    ? `\n\nUSER FOCUS: The user has asked you to focus on: "${focusContext.trim()}". Prioritize this in your analysis.`
    : '';
  return `${base}${focus}

BREVITY RULES:
- No preamble. No postamble. Lead with the answer.
- Every sentence must add information. Cut filler.
- Prefer active voice. No marketing adjectives.`;
}

// ─── Per-Call Prompts ──────────────────────────────────────

export function buildSummaryPrompt(docContext: string): string {
  return `Analyze this document and produce a structured summary.

<document>
${docContext}
</document>

Respond with JSON matching this exact schema:
\`\`\`json
{
  "title": "string — concise document title (5-10 words)",
  "oneLineSummary": "string — one sentence capturing the core message",
  "executiveSummaryMd": "string — 150-250 word markdown overview",
  "audienceBriefMd": "string — 100-200 word markdown rewrite tuned to the analysis lens"
}
\`\`\``;
}

export function buildInsightsPrompt(docContext: string): string {
  return `Extract key insights, simplified explanations, and risks from this document.

<document>
${docContext}
</document>

Respond with JSON matching this exact schema:
\`\`\`json
{
  "keyInsights": [
    { "heading": "string", "bodyMd": "string — 2-3 sentence markdown", "severity": "high | medium | low" }
  ],
  "simplifiedExplanations": [
    { "term": "string — complex concept from the document", "plainMd": "string — plain-language explanation" }
  ],
  "risks": [
    { "descriptionMd": "string", "likelihood": "high | medium | low", "impact": "high | medium | low" }
  ]
}
\`\`\`
Return 3-7 insights, 3-5 explanations, and 2-5 risks.`;
}

export function buildVisualsPrompt(docContext: string): string {
  return `Generate Mermaid diagrams that visualize the key structures and flows in this document.

<document>
${docContext}
</document>

Respond with JSON matching this exact schema:
\`\`\`json
{
  "diagrams": [
    {
      "title": "string — descriptive diagram title",
      "kind": "flowchart | sequenceDiagram | classDiagram | stateDiagram-v2 | erDiagram | gantt | mindmap",
      "mermaidSource": "string — valid Mermaid syntax",
      "caption": "string — one-sentence description of what the diagram shows"
    }
  ]
}
\`\`\`
Generate 1-3 diagrams. Use flowchart for system architecture, sequenceDiagram for processes.
For flowchart/graph ONLY: use classDef for semantic colors. For all other types: do NOT use classDef or linkStyle.`;
}
