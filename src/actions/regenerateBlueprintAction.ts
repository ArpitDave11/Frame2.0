/**
 * regenerateBlueprintAction — Standalone diagram regeneration.
 *
 * Reads current epic from epicStore, sends to AI with focused
 * diagram prompt, writes result to blueprintStore.
 * Does NOT re-run the full 6-stage pipeline.
 */

import { useEpicStore } from '@/stores/epicStore';
import { useConfigStore } from '@/stores/configStore';
import { useBlueprintStore } from '@/stores/blueprintStore';
import { useUiStore } from '@/stores/uiStore';
import { callAI, isAIEnabled } from '@/services/ai/aiClient';
import type { AIClientConfig } from '@/services/ai/types';
import { applyDiagramTheme } from '@/pipeline/utils/diagramTheme';

export async function regenerateBlueprintAction(instruction?: string): Promise<void> {
  const epicStore = useEpicStore.getState();
  const configStore = useConfigStore.getState();
  const blueprintStore = useBlueprintStore.getState();
  const addToast = useUiStore.getState().addToast;

  if (!epicStore.markdown.trim()) {
    addToast({ type: 'error', title: 'No epic content to generate a diagram from.' });
    return;
  }
  if (!isAIEnabled(configStore.config)) {
    addToast({ type: 'error', title: 'No AI provider configured. Open Settings.' });
    return;
  }

  const aiConfig: AIClientConfig = {
    provider: configStore.config.ai.provider,
    azure: configStore.config.ai.azure,
    openai: configStore.config.ai.openai,
    endpoints: configStore.config.endpoints,
  };

  blueprintStore.setGenerating(true);

  try {
    const response = await callAI(aiConfig, {
      systemPrompt: `You are an expert software architect. Generate an architecture diagram in valid Mermaid syntax.

Choose the best diagram type based on content:
- flowchart LR/TD for system architecture, components, data pipelines
- sequenceDiagram for time-ordered interactions between actors
- stateDiagram-v2 for lifecycle/state transitions

Node shapes by type:
- Services: ID["Label"] (rectangle)
- Databases: ID[("Label")] (cylinder)
- External: ID{{"Label"}} (hexagon)
- Events: ID(("Label")) (circle)

Syntax rules:
- Node IDs: short alphanumeric (2-5 chars), no hyphens/spaces
- Labels with special characters: wrap in double quotes inside brackets
- One connection per line (never chain A --> B --> C)
- Subgraph names with spaces: subgraph SG["My Group"]
- Never use "end" as a node label

Semantic colors via classDef (Paul Tol Light — WCAG AA compliant):
classDef service fill:#77AADD,stroke:#4477AA,stroke-width:2px,color:#1A1A2E
classDef database fill:#DDCC77,stroke:#AA9944,stroke-width:2px,color:#1A1A2E
classDef external fill:#B3B3B3,stroke:#888888,stroke-width:1.5px,color:#1A1A2E
classDef queue fill:#EE8866,stroke:#C56040,stroke-width:1.5px,color:#1A1A2E
classDef cache fill:#44BB99,stroke:#228877,stroke-width:1.5px,color:#1A1A2E
classDef security fill:#FFAABB,stroke:#CC7799,stroke-width:1.5px,color:#1A1A2E
classDef infra fill:#8DA0CB,stroke:#6070A8,stroke-width:1.5px,color:#1A1A2E

Apply classes: API["Gateway"]:::service
After connections, add linkStyle for 5-10 key arrows with semantic colors.

Respond with ONLY the Mermaid code. No explanation, no markdown fences.`,
      userPrompt: instruction
        ? `Modify the existing diagram based on this instruction: "${instruction}"\n\nExisting diagram:\n${blueprintStore.code.substring(0, 4000)}\n\nEpic context:\n${epicStore.markdown.substring(0, 4000)}`
        : `Generate an architecture diagram for this epic:\n\n${epicStore.markdown.substring(0, 8000)}`,
      temperature: 0.3,
    });

    let code = response.content.trim();
    code = code.replace(/^```(?:mermaid)?\n?/m, '').replace(/\n?```\s*$/m, '').trim();

    if (!code) {
      addToast({ type: 'error', title: 'AI returned empty diagram.' });
      return;
    }

    const themed = applyDiagramTheme(code);
    const diagType = (code.match(/^\s*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie)/m)?.[1] ?? 'flowchart').replace(/^graph.*/, 'flowchart');
    blueprintStore.setCode(themed, diagType, undefined, instruction ?? 'Generated');
    addToast({ type: 'success', title: instruction ? `Applied: ${instruction}` : 'Blueprint regenerated.' });
  } catch (err) {
    addToast({ type: 'error', title: `Regeneration failed: ${err instanceof Error ? err.message : String(err)}` });
  } finally {
    blueprintStore.setGenerating(false);
  }
}

// ─── D1: Stage 1 — Interpret diagram feedback (cheap AI call) ──

export interface DiagramInterpretation {
  interpretation: string;
  changeItems: string[];
  confidence: 'high' | 'medium' | 'low';
}

export async function interpretDiagramFeedback(
  feedback: string,
): Promise<DiagramInterpretation> {
  const currentDiagram = useBlueprintStore.getState().code;
  const epicContext = useEpicStore.getState().markdown.substring(0, 2000);
  const configStore = useConfigStore.getState();

  if (!isAIEnabled(configStore.config)) {
    throw new Error('No AI provider configured.');
  }

  const aiConfig: AIClientConfig = {
    provider: configStore.config.ai.provider,
    azure: configStore.config.ai.azure,
    openai: configStore.config.ai.openai,
    endpoints: configStore.config.endpoints,
  };

  const response = await callAI(aiConfig, {
    systemPrompt: `You are a diagram architect. The user wants to modify a Mermaid diagram.
Describe what changes you would make. Return ONLY valid JSON:
{
  "interpretation": "1-2 sentence summary of planned changes",
  "changeItems": ["Change 1", "Change 2", ...],
  "confidence": "high" | "medium" | "low"
}
Do NOT generate any Mermaid code. Just describe the plan.`,
    userPrompt: `Current diagram (first 3000 chars):\n${currentDiagram.substring(0, 3000)}\n\nEpic context:\n${epicContext}\n\nUser feedback: "${feedback}"`,
    temperature: 0.3,
  });

  try {
    const text = response.content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch {
    return { interpretation: feedback, changeItems: [feedback], confidence: 'low' };
  }
}
