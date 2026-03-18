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

const VALID_MERMAID_DIRECTIVES = [
  'graph', 'flowchart', 'sequenceDiagram', 'classDiagram',
  'stateDiagram', 'erDiagram', 'gantt', 'pie', 'journey',
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
    const validatedDiagram = validateMermaidSyntax(parsed.architectureDiagram);

    // Assemble epic from refined sections + generated content
    const assembledEpic = assembleEpic(
      input.refinement.refinedSections,
      validatedDiagram,
      validatedStories,
      input.classification.primaryCategory,
    );

    const result: MandatoryOutput = {
      architectureDiagram: validatedDiagram,
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
  };
}

// ─── Epic Assembly ──────────────────────────────────────────

function assembleEpic(
  refinedSections: MandatoryInput['refinement']['refinedSections'],
  diagram: string,
  stories: readonly PipelineUserStory[],
  category: string,
): AssembledEpic {
  const sections: Array<{ id: string; title: string; content: string }> = [];

  // Add refined sections
  for (const s of refinedSections) {
    sections.push({ id: s.sectionId, title: s.title, content: s.content });
  }

  // Add architecture diagram section
  sections.push({
    id: 'architecture-diagram',
    title: 'Architecture Diagram',
    content: `\`\`\`mermaid\n${diagram}\n\`\`\``,
  });

  // Add user stories section
  const storyLines = stories.map((s) =>
    `### ${s.id}: ${s.title}\n**As a** ${s.asA}, **I want** ${s.iWant}, **So that** ${s.soThat}\n\n**Acceptance Criteria:**\n${s.acceptanceCriteria.map((c) => `- ${c}`).join('\n')}\n\n**Priority:** ${s.priority}`,
  );
  sections.push({
    id: 'user-stories',
    title: 'User Stories',
    content: storyLines.join('\n\n'),
  });

  return {
    title: `${category} Epic`,
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

  return { architectureDiagram: diagram, userStories: stories };
}

interface ParsedMandatory {
  architectureDiagram: string;
  userStories: PipelineUserStory[];
}

function normalizeStory(raw: unknown): PipelineUserStory {
  const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const priority = typeof obj['priority'] === 'string' ? obj['priority'] : '';
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

// ─── Empty Output ───────────────────────────────────────────

function emptyMandatoryOutput(): MandatoryOutput {
  return {
    architectureDiagram: '',
    userStories: [],
    assembledEpic: { title: '', sections: [], metadata: {} },
  };
}
