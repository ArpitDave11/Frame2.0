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

function applyDiagramTheme(diagramCode: string): string {
  if (diagramCode.includes('%%{init:')) return diagramCode;
  const themeInit = `%%{init: {'theme': 'base', 'themeVariables': {
  'primaryColor': '#0072B2',
  'primaryTextColor': '#ffffff',
  'primaryBorderColor': '#005A8C',
  'secondaryColor': '#56B4E9',
  'secondaryTextColor': '#ffffff',
  'secondaryBorderColor': '#0072B2',
  'tertiaryColor': '#E69F00',
  'tertiaryTextColor': '#000000',
  'tertiaryBorderColor': '#CC8800',
  'lineColor': '#64748B',
  'textColor': '#1F2937',
  'mainBkg': '#FAFAFA',
  'nodeBorder': '#E5E7EB',
  'clusterBkg': '#F0F9FF',
  'clusterBorder': '#BAE6FD',
  'edgeLabelBackground': 'transparent',
  'fontSize': '14px'
}}}%%\n`;
  return themeInit + diagramCode;
}

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

Semantic colors via classDef (Paul Tol Light palette):
classDef service fill:#99DDFF,stroke:#33BBEE,color:#000
classDef database fill:#77AADD,stroke:#4477AA,color:#000
classDef external fill:#EE8866,stroke:#CC3311,color:#000
classDef queue fill:#EEDD88,stroke:#CCBB44,color:#000
classDef cache fill:#44BB99,stroke:#009988,color:#000
classDef security fill:#FFAABB,stroke:#EE3377,color:#000
classDef infra fill:#DDDDDD,stroke:#999999,color:#000

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
