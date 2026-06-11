/**
 * Extract the first ```mermaid fenced block from markdown.
 * Pure — used when loading an epic from GitLab so an existing
 * architecture diagram lands in Blueprints immediately.
 */

const MERMAID_FENCE = /```mermaid\s*\n([\s\S]*?)```/;

const TYPE_PATTERN = /^\s*(?:%%\{[^}]*\}%%\s*)*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|mindmap)/m;

export interface ExtractedDiagram {
  code: string;
  type: string;
}

export function extractMermaidDiagram(markdown: string): ExtractedDiagram | null {
  const match = MERMAID_FENCE.exec(markdown);
  if (!match?.[1]) return null;
  const code = match[1].trim();
  if (!code) return null;
  const type = (TYPE_PATTERN.exec(code)?.[1] ?? 'flowchart').replace(/^graph$/, 'flowchart');
  return { code, type };
}
