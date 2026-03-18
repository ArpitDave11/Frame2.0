/**
 * Stage 6 — Validation Gate.
 *
 * Quality gatekeeper: requirements traceability, self-audit scoring,
 * failure pattern detection. Blends AI score (70%) with local epicScorer
 * score (30%). Produces actionable feedback for retry loop.
 */

import type { AIClientConfig } from '@/services/ai/types';
import { callAI } from '@/services/ai/aiClient';
import { withRetry } from '@/services/ai/throttler';
import { buildValidationPrompt } from '@/pipeline/prompts/validationPrompt';
import { scoreDocument, getDefaultScoringConfig } from '@/pipeline/epicScorer';
// summarizeComprehension available from Stage 2 if needed for future expansion
import { discoverSections } from '@/domain/sectionDiscovery';
import type {
  ValidationInput,
  ValidationOutput,
  TraceabilityRow,
  AuditCheckItem,
  DetectedFailure,
  StageResult,
  PipelineConfig,
  PipelineProgressCallback,
} from '@/pipeline/pipelineTypes';

// ─── Constants ──────────────────────────────────────────────

const STAGE_NAME = 'validation';
const AI_WEIGHT = 0.7;
const LOCAL_WEIGHT = 0.3;

// ─── Main Stage Function ────────────────────────────────────

export async function runStage6Validation(
  input: ValidationInput,
  config: PipelineConfig,
  aiConfig: AIClientConfig,
  onProgress?: PipelineProgressCallback,
): Promise<StageResult<ValidationOutput>> {
  const startTime = Date.now();

  onProgress?.({
    stageName: STAGE_NAME,
    status: 'running',
    message: 'Validating epic quality...',
    timestamp: Date.now(),
  });

  try {
    // Build the full epic text from assembled sections
    const epicText = input.mandatory.assembledEpic.sections
      .map((s) => `## ${s.title}\n${s.content}`)
      .join('\n\n');

    // Run local scoring in parallel with AI call
    const localScore = runLocalScoring(epicText, config);

    const prompt = buildValidationPrompt({
      assembledEpic: epicText,
      originalRequirements: JSON.stringify(input.comprehension.extractedRequirements),
      originalEntities: JSON.stringify(input.comprehension.keyEntities.map((e) => e.name)),
      userStories: JSON.stringify(input.mandatory.userStories),
      classificationResult: JSON.stringify(input.classification),
      passingScore: config.passingScore,
      complexityLevel: config.complexity,
      iterationNumber: 0,
    });

    const response = await withRetry(
      () => callAI(aiConfig, {
        systemPrompt: prompt,
        userPrompt: 'Validate the epic and produce the JSON output as specified.',
      }),
      STAGE_NAME,
      3,
    );

    const parsed = parseValidationResponse(response.content);

    if (!parsed) {
      onProgress?.({
        stageName: STAGE_NAME,
        status: 'failed',
        message: 'Failed to parse AI validation response',
        timestamp: Date.now(),
      });

      return {
        success: false,
        data: emptyValidationOutput(config.passingScore),
        metadata: {
          stageName: STAGE_NAME,
          duration: Date.now() - startTime,
          tokensUsed: response.usage?.totalTokens ?? 0,
          model: response.model,
        },
      };
    }

    // Blend AI score with local score
    const aiScore = Math.max(0, Math.min(100, parsed.overallScore));
    const blendedScore = Math.round(AI_WEIGHT * aiScore + LOCAL_WEIGHT * localScore);
    const passed = blendedScore >= config.passingScore;

    // Validate feedback quality
    const feedback = passed
      ? []
      : validateFeedbackQuality(parsed.feedback);

    const result: ValidationOutput = {
      traceabilityMatrix: parsed.traceabilityMatrix,
      auditChecks: parsed.auditChecks,
      overallScore: blendedScore,
      passed,
      detectedFailures: parsed.detectedFailures,
      feedback,
    };

    onProgress?.({
      stageName: STAGE_NAME,
      status: 'complete',
      score: blendedScore,
      message: passed
        ? `Validation passed (score: ${blendedScore}/${config.passingScore})`
        : `Validation failed (score: ${blendedScore}/${config.passingScore}), ${feedback.length} feedback items`,
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
      data: emptyValidationOutput(config.passingScore),
      metadata: {
        stageName: STAGE_NAME,
        duration: Date.now() - startTime,
        tokensUsed: 0,
        model: '',
      },
    };
  }
}

// ─── Local Scoring ──────────────────────────────────────────

function runLocalScoring(epicText: string, config: PipelineConfig): number {
  const scoringConfig = getDefaultScoringConfig(config.complexity);
  const discovered = discoverSections(epicText);

  if (discovered.length === 0) return 0;

  const sections = discovered.map((s) => ({ title: s.title, content: s.content }));
  const termsMap = new Map<string, readonly string[]>();
  // Use section titles as basic expected terms
  for (const s of discovered) {
    termsMap.set(s.title, s.title.toLowerCase().split(/\s+/));
  }

  const report = scoreDocument(sections, termsMap, scoringConfig);
  return report.aggregateScore;
}

// ─── Feedback Quality Validation ────────────────────────────

export function validateFeedbackQuality(feedback: readonly string[]): string[] {
  const qualified: string[] = [];

  for (const item of feedback) {
    if (isActionableFeedback(item)) {
      qualified.push(item);
    }
    // Skip generic/vague feedback silently
  }

  // If AI produced no actionable feedback but validation failed, add a default
  if (qualified.length === 0) {
    qualified.push('The epic did not meet the quality threshold. Review section completeness and specificity.');
  }

  return qualified;
}

export function isActionableFeedback(item: string): boolean {
  const lower = item.toLowerCase();

  // Must contain at least one specificity indicator
  const hasSpecificReference =
    /\bsec(tion)?[\s-]?\d/i.test(item) ||           // section reference (e.g., "Section 3")
    /\b(req|us|story)[\s-]?\d/i.test(item) ||        // requirement/story ID
    /\b["'][^"']{3,}["']/i.test(item) ||              // quoted section name
    /\b(completeness|clarity|specificity|actionability|technical\s*depth)\b/i.test(item) || // quality dimension
    /\b(missing|lacks?|absent|no\s+mention|add|include|remove|replace|fix|update)\b/i.test(item); // action verb

  // Reject obviously generic items
  const isGeneric =
    lower === 'improve quality' ||
    lower === 'needs improvement' ||
    lower === 'add more detail' ||
    lower === 'needs work' ||
    (lower.length < 20 && !/\d/.test(lower));

  return hasSpecificReference && !isGeneric;
}

// ─── JSON Parsing ───────────────────────────────────────────

interface ParsedValidation {
  traceabilityMatrix: TraceabilityRow[];
  auditChecks: AuditCheckItem[];
  overallScore: number;
  detectedFailures: DetectedFailure[];
  feedback: string[];
}

function parseValidationResponse(content: string): ParsedValidation | null {
  const json = tryParseJSON(content) ?? tryExtractFromCodeBlock(content);
  if (!json || typeof json !== 'object') return null;

  const obj = json as Record<string, unknown>;

  const rawMatrix = Array.isArray(obj['traceabilityMatrix']) ? obj['traceabilityMatrix'] as unknown[] : [];
  const rawChecks = Array.isArray(obj['auditChecks']) ? obj['auditChecks'] as unknown[] : [];
  const rawScore = typeof obj['overallScore'] === 'number' ? obj['overallScore'] : -1;
  const rawFailures = Array.isArray(obj['detectedFailures']) ? obj['detectedFailures'] as unknown[] : [];
  const rawFeedback = Array.isArray(obj['feedback']) ? obj['feedback'] as unknown[] : [];

  if (rawScore < 0) return null;

  return {
    traceabilityMatrix: rawMatrix.map(normalizeTraceabilityRow),
    auditChecks: rawChecks.map(normalizeAuditCheck),
    overallScore: rawScore,
    detectedFailures: rawFailures.map(normalizeFailure),
    feedback: rawFeedback.filter((v): v is string => typeof v === 'string'),
  };
}

function normalizeTraceabilityRow(raw: unknown): TraceabilityRow {
  const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const coverage = typeof obj['coverage'] === 'string' ? obj['coverage'] : '';
  return {
    requirementId: typeof obj['requirementId'] === 'string' ? obj['requirementId'] : 'UNKNOWN',
    coveredBy: Array.isArray(obj['coveredBy'])
      ? (obj['coveredBy'] as unknown[]).filter((v): v is string => typeof v === 'string')
      : [],
    coverage: (coverage === 'full' || coverage === 'partial' || coverage === 'missing') ? coverage : 'missing',
  };
}

function normalizeAuditCheck(raw: unknown): AuditCheckItem {
  const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const score = typeof obj['score'] === 'number' ? Math.max(0, Math.min(10, obj['score'])) : 0;
  return {
    checkName: typeof obj['checkName'] === 'string' ? obj['checkName'] : 'unknown',
    passed: typeof obj['passed'] === 'boolean' ? obj['passed'] : score >= 7,
    score,
    details: typeof obj['details'] === 'string' ? obj['details'] : '',
  };
}

function normalizeFailure(raw: unknown): DetectedFailure {
  const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const severity = typeof obj['severity'] === 'string' ? obj['severity'] : '';
  return {
    pattern: typeof obj['pattern'] === 'string' ? obj['pattern'] : 'unknown pattern',
    severity: (severity === 'critical' || severity === 'major' || severity === 'minor') ? severity : 'minor',
    recommendation: typeof obj['recommendation'] === 'string' ? obj['recommendation'] : '',
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

function emptyValidationOutput(passingScore: number): ValidationOutput {
  return {
    traceabilityMatrix: [],
    auditChecks: [],
    overallScore: 0,
    passed: false,
    detectedFailures: [],
    feedback: [`Validation could not be performed. Passing threshold: ${passingScore}.`],
  };
}
