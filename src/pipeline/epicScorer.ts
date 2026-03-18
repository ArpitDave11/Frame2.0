/**
 * BM25-based quality scorer — T-4.8.
 *
 * Deterministic scoring module with no AI dependency. Used by Stage 3
 * (section scoring), Stage 6 (self-audit), and the orchestrator.
 *
 * Implements: BM25 saturation, filler/fluff word detection, 5-dimension
 * weighted geometric mean aggregation with per-dimension minimum gate.
 */

import type { ComplexityLevel } from '@/domain/types';

// ─── BM25 Saturation Primitive ──────────────────────────────

export function saturate(value: number, k: number): number {
  if (value <= 0 || k <= 0) return 0;
  return value / (value + k);
}

// ─── Filler Detection ───────────────────────────────────────

const FILLER_PATTERNS: Record<string, readonly string[]> = {
  hedging: [
    'perhaps', 'maybe', 'might', 'could', 'somewhat', 'arguably',
    'potentially', 'presumably', 'conceivably', 'supposedly',
    'seemingly', 'apparently', 'possibly', 'likely', 'unlikely',
    'probably', 'tends to', 'sort of', 'kind of', 'more or less',
    'in some cases', 'to some extent',
  ],
  emptyPhrases: [
    'it is important to note', 'at the end of the day',
    'needless to say', 'in order to', 'as a matter of fact',
    'it goes without saying', 'for all intents and purposes',
    'at this point in time', 'in the event that',
    'due to the fact that', 'on the other hand',
    'it should be noted that', 'when all is said and done',
    'the fact of the matter is', 'as previously mentioned',
    'with regard to', 'in terms of',
  ],
  aiFluff: [
    'delve', 'showcase', 'underscores', 'pivotal', 'realm',
    'tapestry', 'multifaceted', 'meticulous', 'paramount',
    'leverage', 'utilize', 'innovative', 'cutting-edge',
    'robust', 'seamless', 'holistic', 'synergy', 'paradigm',
    'transformative', 'groundbreaking',
  ],
  redundantModifiers: [
    'very', 'really', 'basically', 'actually', 'literally',
    'totally', 'essentially', 'absolutely', 'completely',
    'utterly', 'quite', 'rather', 'fairly',
  ],
  vagueLanguage: [
    'various', 'several', 'certain', 'appropriate', 'relevant',
    'aspects', 'things', 'stuff', 'proper', 'suitable',
    'adequate', 'significant', 'considerable',
  ],
};

export interface FillerAnalysis {
  readonly fillerCount: number;
  readonly totalWords: number;
  readonly fillerRatio: number;
  readonly detectedFillers: ReadonlyArray<{ word: string; category: string; position: number }>;
  readonly densityScore: number;
}

export function detectFiller(text: string): FillerAnalysis {
  const lowerText = text.toLowerCase();
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const totalWords = words.length;

  const detectedFillers: Array<{ word: string; category: string; position: number }> = [];

  for (const [category, patterns] of Object.entries(FILLER_PATTERNS)) {
    for (const pattern of patterns) {
      let searchFrom = 0;
      const lowerPattern = pattern.toLowerCase();

      while (true) {
        const idx = lowerText.indexOf(lowerPattern, searchFrom);
        if (idx === -1) break;

        // Verify word boundary (not a substring of a longer word)
        const before = idx > 0 ? lowerText[idx - 1] : ' ';
        const after = idx + lowerPattern.length < lowerText.length
          ? lowerText[idx + lowerPattern.length]
          : ' ';

        if (/\W/.test(before!) && /\W/.test(after!)) {
          detectedFillers.push({ word: pattern, category, position: idx });
        }

        searchFrom = idx + lowerPattern.length;
      }
    }
  }

  // Sort by position for stable output
  detectedFillers.sort((a, b) => a.position - b.position);

  const fillerCount = detectedFillers.length;
  const fillerRatio = totalWords > 0 ? fillerCount / totalWords : 0;
  const densityScore = 1 - saturate(fillerCount, 10);

  return { fillerCount, totalWords, fillerRatio, detectedFillers, densityScore };
}

// ─── Quality Weights & Config ───────────────────────────────

export interface QualityWeights {
  readonly completeness: number;
  readonly clarity: number;
  readonly specificity: number;
  readonly actionability: number;
  readonly technicalDepth: number;
}

export interface ScoringConfig {
  readonly k1: number;
  readonly b: number;
  readonly avgSectionLength: number;
  readonly weights: QualityWeights;
  readonly passingThreshold: number;
  readonly perDimensionMinimum: number;
}

const DEFAULT_WEIGHTS: QualityWeights = {
  completeness: 0.25,
  clarity: 0.20,
  specificity: 0.20,
  actionability: 0.20,
  technicalDepth: 0.15,
};

const COMPLEXITY_THRESHOLDS: Record<ComplexityLevel, number> = {
  simple: 80,
  moderate: 85,
  complex: 90,
};

export function getDefaultScoringConfig(complexity: ComplexityLevel): ScoringConfig {
  return {
    k1: 1.2,
    b: 0.75,
    avgSectionLength: 500,
    weights: DEFAULT_WEIGHTS,
    passingThreshold: COMPLEXITY_THRESHOLDS[complexity],
    perDimensionMinimum: 0.2,
  };
}

// ─── Section-Level Scoring ──────────────────────────────────

export interface SectionQualityScore {
  readonly completeness: number;
  readonly clarity: number;
  readonly specificity: number;
  readonly actionability: number;
  readonly technicalDepth: number;
  readonly overall: number;
}

export function scoreSection(
  content: string,
  expectedTerms: readonly string[],
  config: ScoringConfig,
): SectionQualityScore {
  const words = content.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  // Completeness: BM25-style length saturation relative to average
  const lengthNorm = 1 - config.b + config.b * (wordCount / config.avgSectionLength);
  const completeness = saturate(wordCount / Math.max(lengthNorm, 0.01), config.k1 * config.avgSectionLength);

  // Clarity: inverse of filler ratio
  const filler = detectFiller(content);
  const clarity = filler.densityScore;

  // Specificity: BM25 term coverage — what fraction of expected terms appear?
  const lowerContent = content.toLowerCase();
  const matchedTerms = expectedTerms.filter((term) =>
    lowerContent.includes(term.toLowerCase()),
  );
  const termCoverage = expectedTerms.length > 0
    ? matchedTerms.length / expectedTerms.length
    : 1;
  const specificity = saturate(termCoverage * 10, config.k1 * 5);

  // Actionability: presence of action verbs, numbers, concrete patterns
  const actionPatterns = [
    /\b(must|shall|will|should|requires?)\b/gi,
    /\b\d+(\.\d+)?(%|ms|s|gb|mb|kb|rpm|tps|req\/s)\b/gi,
    /\b(deploy|implement|configure|install|create|build|test|validate|monitor)\b/gi,
  ];
  const actionMatches = actionPatterns.reduce(
    (count, pattern) => count + (content.match(pattern)?.length ?? 0),
    0,
  );
  const actionability = saturate(actionMatches, config.k1 * 8);

  // Technical depth: presence of technical indicators
  const techPatterns = [
    /\b(api|rest|graphql|grpc|http|https|tcp|udp|websocket)\b/gi,
    /\b(database|schema|index|query|migration|transaction)\b/gi,
    /\b(kubernetes|docker|container|microservice|serverless|lambda)\b/gi,
    /\b(authentication|authorization|oauth|jwt|token|certificate)\b/gi,
    /\b(algorithm|complexity|latency|throughput|availability|scalability)\b/gi,
  ];
  const techMatches = techPatterns.reduce(
    (count, pattern) => count + (content.match(pattern)?.length ?? 0),
    0,
  );
  const technicalDepth = saturate(techMatches, config.k1 * 12);

  // Overall: weighted geometric mean, scaled to 0-100
  const dimensions = [
    { score: completeness, weight: config.weights.completeness },
    { score: clarity, weight: config.weights.clarity },
    { score: specificity, weight: config.weights.specificity },
    { score: actionability, weight: config.weights.actionability },
    { score: technicalDepth, weight: config.weights.technicalDepth },
  ];

  const overall = computeGeometricMean(dimensions);

  return { completeness, clarity, specificity, actionability, technicalDepth, overall };
}

// ─── Document-Level Scoring ─────────────────────────────────

export interface DocumentQualityReport {
  readonly sectionScores: ReadonlyArray<{ sectionTitle: string; score: SectionQualityScore }>;
  readonly aggregateScore: number;
  readonly passed: boolean;
  readonly failedDimensions: readonly string[];
  readonly recommendations: readonly string[];
}

export function scoreDocument(
  sections: ReadonlyArray<{ title: string; content: string }>,
  expectedTermsBySection: Map<string, readonly string[]>,
  config: ScoringConfig,
): DocumentQualityReport {
  const sectionScores = sections.map((section) => {
    const terms = expectedTermsBySection.get(section.title) ?? [];
    return {
      sectionTitle: section.title,
      score: scoreSection(section.content, terms, config),
    };
  });

  // Aggregate: average each dimension across sections, then geometric mean
  const dimensionNames = ['completeness', 'clarity', 'specificity', 'actionability', 'technicalDepth'] as const;
  const weightEntries = dimensionNames.map((dim) => {
    const avg = sectionScores.length > 0
      ? sectionScores.reduce((sum, s) => sum + s.score[dim], 0) / sectionScores.length
      : 0;
    return { score: avg, weight: config.weights[dim] };
  });

  const aggregateScore = computeGeometricMean(weightEntries);

  // Per-dimension minimum gate
  const failedDimensions: string[] = [];
  for (let i = 0; i < dimensionNames.length; i++) {
    if (weightEntries[i]!.score < config.perDimensionMinimum) {
      failedDimensions.push(dimensionNames[i]!);
    }
  }

  const passed = aggregateScore >= config.passingThreshold && failedDimensions.length === 0;

  // Generate recommendations for failing dimensions
  const recommendations: string[] = [];
  if (aggregateScore < config.passingThreshold) {
    recommendations.push(
      `Overall score ${aggregateScore.toFixed(1)} is below the passing threshold of ${config.passingThreshold}.`,
    );
  }
  for (const dim of failedDimensions) {
    const avg = weightEntries[dimensionNames.indexOf(dim as typeof dimensionNames[number])]!.score;
    recommendations.push(
      `Dimension "${dim}" averaged ${(avg * 100).toFixed(1)}%, below the minimum of ${(config.perDimensionMinimum * 100).toFixed(0)}%.`,
    );
  }

  // Find weakest sections
  for (const entry of sectionScores) {
    if (entry.score.overall < config.passingThreshold) {
      recommendations.push(
        `Section "${entry.sectionTitle}" scored ${entry.score.overall.toFixed(1)}/100 — needs improvement.`,
      );
    }
  }

  return { sectionScores, aggregateScore, passed, failedDimensions, recommendations };
}

// ─── Internals ──────────────────────────────────────────────

function computeGeometricMean(
  dimensions: ReadonlyArray<{ score: number; weight: number }>,
): number {
  const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);
  if (totalWeight === 0) return 0;

  const logSum = dimensions.reduce((sum, d) => {
    const clamped = Math.max(d.score, 0.01);
    return sum + (d.weight / totalWeight) * Math.log(clamped);
  }, 0);

  return Math.round(Math.exp(logSum) * 100 * 100) / 100;
}

// Export filler patterns for test verification
export const FILLER_PATTERN_COUNTS = Object.fromEntries(
  Object.entries(FILLER_PATTERNS).map(([k, v]) => [k, v.length]),
) as Record<string, number>;
