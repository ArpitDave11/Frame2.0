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
import { getDiagramConfig } from '@/services/templates/templateLoader';
import { applyDiagramTheme } from '@/pipeline/utils/diagramTheme';
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

// 5 stable types for architecture diagrams (removed pie, journey, gantt, erDiagram — not useful for epic blueprints)
const VALID_MERMAID_DIRECTIVES = [
  'graph', 'flowchart', 'sequenceDiagram', 'classDiagram',
  'stateDiagram',
];

/**
 * Category-specific skeleton diagrams — LAST RESORT fallback only.
 * Used when AI returns empty/invalid diagram after all retries.
 * Each skeleton is a minimal valid Mermaid diagram that makes sense
 * for the category type. The user can refine via Blueprint chat.
 */
const CATEGORY_SKELETONS: Record<string, string> = {
  general: `flowchart LR
    Input["Input"] --> Process["Core Process"]
    Process --> Output["Output"]
    Process --> Store[("Data Store")]
    classDef primary fill:#77AADD,stroke:#4477AA,stroke-width:2px,color:#1A1A2E
    classDef storage fill:#DDCC77,stroke:#AA9944,stroke-width:2px,color:#1A1A2E
    class Input,Process,Output primary
    class Store storage`,

  technical_design: `flowchart LR
    Client["Client"] --> API["API Layer"]
    API --> Service["Service Layer"]
    Service --> DB[("Database")]
    Service --> Cache[("Cache")]
    classDef primary fill:#77AADD,stroke:#4477AA,stroke-width:2px,color:#1A1A2E
    classDef storage fill:#DDCC77,stroke:#AA9944,stroke-width:2px,color:#1A1A2E
    class Client,API,Service primary
    class DB,Cache storage`,

  business_requirement: `flowchart TD
    Start(["Start"]) --> Step1["Step 1: Initiate"]
    Step1 --> Decision{"Decision?"}
    Decision -->|"Approved"| Step2["Step 2: Execute"]
    Decision -->|"Rejected"| Review["Review & Revise"]
    Review --> Step1
    Step2 --> End(["Complete"])
    classDef primary fill:#77AADD,stroke:#4477AA,stroke-width:2px,color:#1A1A2E
    classDef decision fill:#44BB99,stroke:#228877,stroke-width:1.5px,color:#1A1A2E
    class Step1,Step2,Review primary
    class Decision decision`,

  feature_specification: `flowchart TD
    User(["User Action"]) --> Screen1["Screen 1"]
    Screen1 --> Validate{"Valid Input?"}
    Validate -->|"Yes"| Success["Success State"]
    Validate -->|"No"| Error["Error Message"]
    Error --> Screen1
    Success --> Next["Next Screen"]
    classDef primary fill:#77AADD,stroke:#4477AA,stroke-width:2px,color:#1A1A2E
    classDef decision fill:#44BB99,stroke:#228877,stroke-width:1.5px,color:#1A1A2E
    classDef error fill:#EE8866,stroke:#C56040,stroke-width:2px,color:#1A1A2E
    class Screen1,Success,Next primary
    class Validate decision
    class Error error`,

  api_specification: `sequenceDiagram
    participant C as Client
    participant G as API Gateway
    participant S as Service
    participant D as Database
    C->>G: Request
    G->>G: Validate Auth
    G->>S: Forward Request
    S->>D: Query Data
    D-->>S: Result
    S-->>G: Response
    G-->>C: Response`,

  infrastructure_design: `flowchart LR
    LB["Load Balancer"] --> App1["App Server 1"]
    LB --> App2["App Server 2"]
    App1 --> DB[("Primary DB")]
    App2 --> DB
    DB --> Replica[("Read Replica")]
    App1 --> Cache[("Cache")]
    App2 --> Cache
    classDef primary fill:#77AADD,stroke:#4477AA,stroke-width:2px,color:#1A1A2E
    classDef storage fill:#DDCC77,stroke:#AA9944,stroke-width:2px,color:#1A1A2E
    class LB,App1,App2 primary
    class DB,Replica,Cache storage`,

  migration_plan: `flowchart TD
    Assess(["Assess Current State"]) --> Plan["Plan Migration"]
    Plan --> Prep["Prepare Target"]
    Prep --> DryRun["Dry Run"]
    DryRun --> Validate{"Validation Pass?"}
    Validate -->|"Pass"| Execute["Execute Migration"]
    Validate -->|"Fail"| Fix["Fix Issues"]
    Fix --> DryRun
    Execute --> GoNoGo{"Go / No-Go?"}
    GoNoGo -->|"Go"| Cutover["Cutover"]
    GoNoGo -->|"No-Go"| Rollback["Rollback"]
    Cutover --> Hypercare["Hypercare Period"]
    classDef primary fill:#77AADD,stroke:#4477AA,stroke-width:2px,color:#1A1A2E
    classDef decision fill:#44BB99,stroke:#228877,stroke-width:1.5px,color:#1A1A2E
    classDef error fill:#EE8866,stroke:#C56040,stroke-width:2px,color:#1A1A2E
    class Assess,Plan,Prep,DryRun,Execute,Cutover,Hypercare primary
    class Validate,GoNoGo decision
    class Fix,Rollback error`,

  integration_spec: `flowchart LR
    SystemA["System A"] -->|"Data Flow"| Integration["Integration Layer"]
    Integration -->|"Transform"| SystemB["System B"]
    Integration --> Monitor["Monitoring"]
    Integration --> ErrorQ["Error Queue"]
    ErrorQ -->|"Retry"| Integration
    classDef primary fill:#77AADD,stroke:#4477AA,stroke-width:2px,color:#1A1A2E
    classDef secondary fill:#8DA0CB,stroke:#6070A8,stroke-width:1.5px,color:#1A1A2E
    classDef error fill:#EE8866,stroke:#C56040,stroke-width:2px,color:#1A1A2E
    class SystemA,SystemB primary
    class Integration,Monitor secondary
    class ErrorQ error`,
};

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

    const diagramCfg = getDiagramConfig(input.classification.primaryCategory);

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
      diagramPrimaryType: diagramCfg.primary.type,
      diagramPrimaryPurpose: diagramCfg.primary.purpose,
      diagramSecondaryType: diagramCfg.secondary.type,
      diagramSecondaryPurpose: diagramCfg.secondary.purpose,
      categoryName: input.classification.primaryCategory,
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
    const category = input.classification.primaryCategory;
    const validatedStories = validateStoryCount(parsed.userStories, storyMin, storyMax);

    // Primary diagram — mandatory, falls back to skeleton
    const syntaxChecked = validateMermaidSyntax(parsed.architectureDiagram, category);
    const validatedDiagram = await fixMermaidWithAI(syntaxChecked, aiConfig, config.generationTemperature);
    const themedDiagram = applyDiagramTheme(validatedDiagram);

    // Secondary diagram — optional, skip on any failure (no skeleton fallback)
    let themedSecondary = '';
    try {
      const rawSecondary = parsed.processFlowDiagram ?? '';
      if (rawSecondary.trim()) {
        const secondarySyntaxChecked = validateMermaidSyntax(rawSecondary);
        // NO category fallback — empty means skip
        const secondaryFixed = await fixMermaidWithAI(secondarySyntaxChecked, aiConfig, config.generationTemperature);
        themedSecondary = applyDiagramTheme(secondaryFixed);
      }
    } catch {
      // Silent — secondary is optional
    }

    // Assemble epic from refined sections + generated content
    const assembledEpic = assembleEpic(
      input.refinement.refinedSections,
      themedDiagram,
      themedSecondary,
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

export function validateMermaidSyntax(diagram: string, category?: string): string {
  let trimmed = diagram.trim();
  if (!trimmed) {
    // LAST RESORT: Use category-specific skeleton if AI returned nothing
    const skeleton = category ? CATEGORY_SKELETONS[category] : undefined;
    if (skeleton) {
      console.warn(`[Stage 5] AI returned empty diagram — using ${category} skeleton fallback`);
      return skeleton;
    }
    return 'graph TD\n  A["No diagram generated — refine via Blueprint"]';
  }

  // ─── Auto-fix common LLM syntax errors ───

  // Fix 0: Strip AI-generated %%{init:} blocks — theming is handled by applyDiagramTheme
  trimmed = trimmed.replace(/%%\{init:[\s\S]*?\}%%\s*/g, '');
  trimmed = trimmed.trim();

  // Fix 1: Colon-style edge labels → pipe syntax
  // "A --> B: label text" → "A -->|label text| B"
  trimmed = trimmed.replace(
    /(\w+)\s*(-->|-.->|==>)\s*(\w+)\s*:\s*([^\n]+)/g,
    (_, src, arrow, tgt, label) => `${src} ${arrow}|${label.trim()}| ${tgt}`,
  );

  // Fix 2: Unsafe subgraph IDs — multi-word IDs or IDs with special chars
  // "subgraph Auth & Security" → 'subgraph AuthSecurity["Auth & Security"]'
  // "subgraph approval flow" → 'subgraph approvalflow["approval flow"]'
  trimmed = trimmed.replace(
    /^(\s*subgraph\s+)([^\n"[\]]+[ \t]+[^\n"[\]]+)$/gm,
    (_, prefix, name) => {
      const safeId = name.trim().replace(/[^a-zA-Z0-9]/g, '');
      return `${prefix}${safeId}["${name.trim()}"]`;
    },
  );

  // Fix 3: Unicode arrows in labels → plain text
  trimmed = trimmed.replace(/→/g, ' to ').replace(/←/g, ' from ').replace(/↔/g, ' between ');

  // Fix 4: Dash-text-arrow syntax → pipe syntax
  // '--"Yes"-->' → '-->|"Yes"|'
  trimmed = trimmed.replace(
    /--"([^"]+)"-->/g,
    (_, label) => `-->|"${label}"|`,
  );

  const firstLine = trimmed.split('\n')[0]!.trim();
  const isValid = VALID_MERMAID_DIRECTIVES.some(
    (d) => firstLine.startsWith(d),
  );

  if (isValid) return trimmed;

  // Invalid syntax — try category skeleton before showing error placeholder
  const skeleton = category ? CATEGORY_SKELETONS[category] : undefined;
  if (skeleton) {
    console.warn(`[Stage 5] Invalid diagram syntax — using ${category} skeleton fallback`);
    return skeleton;
  }
  return `graph TD\n  A["Invalid diagram"]\n  B["Original: ${firstLine.slice(0, 50)}"]`;
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
  // Quick check: does the diagram have labels with special chars that aren't quoted,
  // or subgraph IDs with special chars?
  const needsFix = /\w+\[[^\]"]*[()\/&:;][^\]"]*\]/.test(diagram)
    || /^\s*subgraph\s+[^\n"[\]]*[&/():][^\n"]*$/m.test(diagram);
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
  'deployment architecture',
  'process flow',
  'process flow diagram',
  'user stories',
]);

// ─── Epic Assembly ──────────────────────────────────────────

function assembleEpic(
  refinedSections: MandatoryInput['refinement']['refinedSections'],
  diagram: string,
  processFlowDiagram: string,
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

  // Add process flow diagram section (only if generated — no fallback, static in markdown)
  if (processFlowDiagram && processFlowDiagram.trim()) {
    sections.push({
      id: 'process-flow-diagram',
      title: 'Process Flow',
      content: `\`\`\`mermaid\n${processFlowDiagram}\n\`\`\``,
    });
  }

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

  const processFlowDiagram = typeof obj['processFlowDiagram'] === 'string' ? obj['processFlowDiagram'] : '';

  return { architectureDiagram: diagram, processFlowDiagram, userStories: stories, generatedTitle };
}

interface ParsedMandatory {
  architectureDiagram: string;
  processFlowDiagram: string;
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

// ─── Diagram Theme Injection ────────────────────────────────
// Shared: src/pipeline/utils/diagramTheme.ts

// ─── Empty Output ───────────────────────────────────────────

function emptyMandatoryOutput(): MandatoryOutput {
  return {
    architectureDiagram: '',
    userStories: [],
    assembledEpic: { title: '', sections: [], metadata: {} },
  };
}
