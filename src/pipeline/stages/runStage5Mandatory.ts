/**
 * Stage 5 — Mandatory Sections.
 *
 * Generates architecture diagram (Mermaid), user stories with acceptance
 * criteria, and assembles the final epic. Story count scales with complexity.
 */

import type { AIClientConfig } from '@/services/ai/types';
import { callAI } from '@/services/ai/aiClient';
import { withRetry } from '@/services/ai/throttler';
import { buildMandatoryPrompt } from '@/pipeline/prompts/mandatoryPrompt';
import { summarizeComprehension } from '@/pipeline/stages/runStage2Classification';
import type {
  MandatoryInput,
  MandatoryOutput,
  PipelineUserStory,
  AssembledEpic,
  StageResult,
  PipelineConfig,
  PipelineProgressCallback,
} from '@/pipeline/pipelineTypes';

// ─── Constants ──────────────────────────────────────────────

const STAGE_NAME = 'mandatory';

// 6 stable types for architecture diagrams (removed pie, journey, gantt — not useful for epic blueprints)
const VALID_MERMAID_DIRECTIVES = [
  'graph', 'flowchart', 'sequenceDiagram', 'classDiagram',
  'stateDiagram', 'erDiagram',
];

// ─── Main Stage Function ────────────────────────────────────

export async function runStage5Mandatory(
  input: MandatoryInput,
  config: PipelineConfig,
  aiConfig: AIClientConfig,
  onProgress?: PipelineProgressCallback,
): Promise<StageResult<MandatoryOutput>> {
  const startTime = Date.now();

  onProgress?.({
    stageName: STAGE_NAME,
    status: 'running',
    message: 'Generating architecture diagram and user stories...',
    timestamp: Date.now(),
  });

  try {
    const entityNames = input.comprehension.keyEntities.map((e) => e.name);
    const [storyMin, storyMax] = config.storyCountRange;

    const prompt = buildMandatoryPrompt({
      refinedSections: JSON.stringify(input.refinement.refinedSections),
      classificationResult: JSON.stringify(input.classification),
      comprehensionSummary: summarizeComprehension(input.comprehension),
      storyCountMin: storyMin,
      storyCountMax: storyMax,
      complexityLevel: config.complexity,
      existingEntities: entityNames,
      sla: config.sla,
      includeStoryPoints: config.sla !== undefined || config.complexity !== 'simple',
    });

    const response = await withRetry(
      () => callAI(aiConfig, {
        systemPrompt: prompt,
        userPrompt: 'Generate the mandatory sections and produce the JSON output as specified.',
        temperature: config.generationTemperature,
      }),
      STAGE_NAME,
      3,
    );

    const parsed = parseMandatoryResponse(response.content);

    if (!parsed) {
      onProgress?.({
        stageName: STAGE_NAME,
        status: 'failed',
        message: 'Failed to parse AI response as valid MandatoryOutput',
        timestamp: Date.now(),
      });

      return {
        success: false,
        data: emptyMandatoryOutput(),
        metadata: {
          stageName: STAGE_NAME,
          duration: Date.now() - startTime,
          tokensUsed: response.usage?.totalTokens ?? 0,
          model: response.model,
        },
      };
    }

    // Validate and adjust story count
    const validatedStories = validateStoryCount(parsed.userStories, storyMin, storyMax);
    const syntaxChecked = validateMermaidSyntax(parsed.architectureDiagram);
    const validatedDiagram = await fixMermaidWithAI(syntaxChecked, aiConfig, config.generationTemperature);
    const themedDiagram = applyDiagramTheme(validatedDiagram);

    // Assemble epic from refined sections + generated content
    const assembledEpic = assembleEpic(
      input.refinement.refinedSections,
      themedDiagram,
      validatedStories,
      input.title || parsed.generatedTitle,
    );

    const result: MandatoryOutput = {
      architectureDiagram: themedDiagram,
      userStories: validatedStories,
      assembledEpic,
    };

    onProgress?.({
      stageName: STAGE_NAME,
      status: 'complete',
      message: `Generated ${validatedStories.length} stories and architecture diagram`,
      timestamp: Date.now(),
    });

    return {
      success: true,
      data: result,
      metadata: {
        stageName: STAGE_NAME,
        duration: Date.now() - startTime,
        tokensUsed: response.usage?.totalTokens ?? 0,
        model: response.model,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    onProgress?.({
      stageName: STAGE_NAME,
      status: 'failed',
      message,
      timestamp: Date.now(),
    });

    return {
      success: false,
      data: emptyMandatoryOutput(),
      metadata: {
        stageName: STAGE_NAME,
        duration: Date.now() - startTime,
        tokensUsed: 0,
        model: '',
      },
    };
  }
}

// ─── Mermaid Validation ─────────────────────────────────────

export function validateMermaidSyntax(diagram: string): string {
  const trimmed = diagram.trim();
  if (!trimmed) return 'graph TD\n  A[No diagram generated]';

  const firstLine = trimmed.split('\n')[0]!.trim();
  const isValid = VALID_MERMAID_DIRECTIVES.some(
    (d) => firstLine.startsWith(d),
  );

  return isValid ? trimmed : `graph TD\n  A[Invalid diagram]\n  B[Original: ${firstLine.slice(0, 50)}]`;
}

/**
 * Calls AI to fix Mermaid syntax issues — unquoted special characters,
 * invalid node IDs, broken arrows, etc. Returns the fixed diagram.
 */
async function fixMermaidWithAI(
  diagram: string,
  aiConfig: AIClientConfig,
  temperature: number,
): Promise<string> {
  // Quick check: does the diagram have labels with special chars that aren't quoted?
  const needsFix = /\w+\[[^\]"]*[()\/&:;][^\]"]*\]/.test(diagram);
  if (!needsFix) return diagram;

  try {
    const response = await callAI(aiConfig, {
      systemPrompt: `You are a Mermaid diagram syntax expert. Fix the following Mermaid diagram so it renders without errors.

Rules:
- Any node label containing parentheses (), slashes /, ampersands &, colons :, or semicolons ; MUST have the label text wrapped in double quotes inside the brackets.
- Example: A["SOC 2 / ISO 27001"] not A[SOC 2 / ISO 27001]
- Example: B["E3 (Epic Management)"] not B[E3 (Epic Management)]
- Do NOT change the diagram structure, nodes, edges, or subgraphs — ONLY fix the quoting.
- Return ONLY the fixed Mermaid code, nothing else. No explanation, no markdown fences.`,
      userPrompt: diagram,
      temperature,
    });

    const fixed = response.content.trim();
    // Sanity check: must still start with a valid directive
    const firstLine = fixed.split('\n')[0]?.trim() ?? '';
    if (VALID_MERMAID_DIRECTIVES.some((d) => firstLine.startsWith(d))) {
      return fixed;
    }
    // AI returned garbage — use original
    return diagram;
  } catch {
    // AI call failed — use original diagram as-is
    return diagram;
  }
}

// ─── Story Count Validation ─────────────────────────────────

function validateStoryCount(
  stories: readonly PipelineUserStory[],
  min: number,
  max: number,
): PipelineUserStory[] {
  const validated = stories.map(validateStory);
  if (validated.length > max) return validated.slice(0, max);
  if (validated.length < min) {
    console.warn(`[mandatory] AI generated ${validated.length} stories, below minimum of ${min}`);
  }
  return validated;
}

let storyIdCounter = 0;

function validateStory(raw: PipelineUserStory): PipelineUserStory {
  return {
    id: raw.id || `US-fallback-${++storyIdCounter}`,
    title: raw.title || 'Untitled Story',
    asA: raw.asA || 'user',
    iWant: raw.iWant || '',
    soThat: raw.soThat || '',
    acceptanceCriteria: raw.acceptanceCriteria.length > 0
      ? raw.acceptanceCriteria.slice(0, 5)
      : ['Acceptance criteria not specified'],
    priority: raw.priority || 'medium',
    ...(raw.storyPoints !== undefined ? { storyPoints: raw.storyPoints } : {}),
    ...(raw.testCases !== undefined && raw.testCases.length > 0 ? { testCases: raw.testCases } : {}),
  };
}

/** Section titles that Stage 5 owns — skip duplicates from Stage 4 */
const MANDATORY_SECTION_TITLES = new Set([
  'architecture diagram',
  'architecture overview',
  'user stories',
]);

// ─── Epic Assembly ──────────────────────────────────────────

function assembleEpic(
  refinedSections: MandatoryInput['refinement']['refinedSections'],
  diagram: string,
  stories: readonly PipelineUserStory[],
  epicTitle: string,
): AssembledEpic {
  const sections: Array<{ id: string; title: string; content: string }> = [];

  // Add refined sections, skipping those that Stage 5 will generate authoritatively
  for (const s of refinedSections) {
    if (MANDATORY_SECTION_TITLES.has(s.title.toLowerCase().trim())) continue;
    sections.push({ id: s.sectionId, title: s.title, content: s.content });
  }

  // Add architecture diagram section (single authoritative version)
  sections.push({
    id: 'architecture-diagram',
    title: 'Deployment Architecture \u2014 Component and Flow Diagram',
    content: `\`\`\`mermaid\n${diagram}\n\`\`\``,
  });

  // Add user stories section
  const storyLines = stories.map((s) => {
    let md = `### ${s.id}: ${s.title}`;
    if (s.storyPoints) md += `\n**Story Points:** ${s.storyPoints}`;
    md += `\n**As a** ${s.asA}, **I want** ${s.iWant}, **So that** ${s.soThat}`;
    md += `\n\n**Acceptance Criteria:**\n${s.acceptanceCriteria.map((c) => `- ${c}`).join('\n')}`;
    md += `\n\n**Priority:** ${s.priority}`;
    if (s.testCases && s.testCases.length > 0) {
      md += `\n\n**Test Cases:**\n${s.testCases.map((tc, i) => `${i + 1}. ${tc}`).join('\n')}`;
    }
    return md;
  });
  sections.push({
    id: 'user-stories',
    title: 'User Stories',
    content: storyLines.join('\n\n'),
  });

  return {
    title: epicTitle,
    sections,
    metadata: {
      totalSections: sections.length,
      totalStories: stories.length,
      diagramType: diagram.split('\n')[0]?.trim().split(' ')[0] ?? 'graph',
      assembledAt: new Date().toISOString(),
    },
  };
}

// ─── JSON Parsing ───────────────────────────────────────────

function parseMandatoryResponse(content: string): ParsedMandatory | null {
  const json = tryParseJSON(content) ?? tryExtractFromCodeBlock(content);
  if (!json || typeof json !== 'object') return null;

  const obj = json as Record<string, unknown>;
  const diagram = typeof obj['architectureDiagram'] === 'string' ? obj['architectureDiagram'] : '';
  const rawStories = Array.isArray(obj['userStories']) ? obj['userStories'] as unknown[] : [];

  if (rawStories.length === 0) return null;

  const stories: PipelineUserStory[] = rawStories.map(normalizeStory);

  // Extract AI-generated title from assembledEpic (used when no title provided)
  const asmEpic = typeof obj['assembledEpic'] === 'object' && obj['assembledEpic'] !== null
    ? obj['assembledEpic'] as Record<string, unknown>
    : {};
  const generatedTitle = typeof asmEpic['title'] === 'string' && asmEpic['title'].length > 0
    ? asmEpic['title']
    : 'Untitled Epic';

  return { architectureDiagram: diagram, userStories: stories, generatedTitle };
}

interface ParsedMandatory {
  architectureDiagram: string;
  userStories: PipelineUserStory[];
  generatedTitle: string;
}

function normalizeStory(raw: unknown): PipelineUserStory {
  const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const priority = typeof obj['priority'] === 'string' ? obj['priority'] : '';

  // Parse storyPoints (optional)
  const rawPoints = typeof obj['storyPoints'] === 'number' ? obj['storyPoints'] : undefined;
  const storyPoints = rawPoints !== undefined
    ? ([1, 2, 3, 5].includes(rawPoints) ? rawPoints : Math.min(5, Math.max(1, Math.round(rawPoints))))
    : undefined;

  // Parse testCases (optional)
  const testCases = Array.isArray(obj['testCases'])
    ? (obj['testCases'] as unknown[]).filter((v): v is string => typeof v === 'string')
    : undefined;

  return {
    id: typeof obj['id'] === 'string' ? obj['id'] : `US-fallback-${++storyIdCounter}`,
    title: typeof obj['title'] === 'string' ? obj['title'] : 'Untitled',
    asA: typeof obj['asA'] === 'string' ? obj['asA'] : 'user',
    iWant: typeof obj['iWant'] === 'string' ? obj['iWant'] : '',
    soThat: typeof obj['soThat'] === 'string' ? obj['soThat'] : '',
    acceptanceCriteria: Array.isArray(obj['acceptanceCriteria'])
      ? (obj['acceptanceCriteria'] as unknown[]).filter((v): v is string => typeof v === 'string')
      : [],
    priority: (priority === 'high' || priority === 'medium' || priority === 'low') ? priority : 'medium',
    ...(storyPoints !== undefined ? { storyPoints } : {}),
    ...(testCases !== undefined && testCases.length > 0 ? { testCases } : {}),
  };
}

function tryParseJSON(text: string): unknown {
  try { return JSON.parse(text.trim()); } catch { return null; }
}

function tryExtractFromCodeBlock(text: string): unknown {
  const match = /```(?:json)?\s*\n?([\s\S]*?)```/.exec(text);
  if (!match?.[1]) return null;
  return tryParseJSON(match[1]);
}

// ─── Diagram Theme Injection (colorblind-safe palette) ──────

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
}}}%%
`;
  return themeInit + diagramCode;
}

// ─── Empty Output ───────────────────────────────────────────

function emptyMandatoryOutput(): MandatoryOutput {
  return {
    architectureDiagram: '',
    userStories: [],
    assembledEpic: { title: '', sections: [], metadata: {} },
  };
}
