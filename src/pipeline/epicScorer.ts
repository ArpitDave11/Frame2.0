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
  readonly completeness: number;     // 0–1
  readonly clarity: number;          // 0–1
  readonly specificity: number;      // 0–1
  readonly actionability: number;    // 0–1
  readonly technicalDepth: number;   // 0–1
  readonly overall: number;          // 0–100 (note: different scale from dimensions)
}

export function scoreSection(
  content: string,
  expectedTerms: readonly string[],
  config: ScoringConfig,
): SectionQualityScore {
  const words = content.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  // Completeness: k=100 so avg-length section (~500 words) scores ~0.83
  const lengthNorm = 1 - config.b + config.b * (wordCount / config.avgSectionLength);
  const completeness = saturate(wordCount / Math.max(lengthNorm, 0.01), 100);

  // Clarity: inverse of filler ratio
  const filler = detectFiller(content);
  const clarity = filler.densityScore;

  // Specificity: k=3 so 80% term coverage scores ~0.73
  const lowerContent = content.toLowerCase();
  const matchedTerms = expectedTerms.filter((term) =>
    lowerContent.includes(term.toLowerCase()),
  );
  const termCoverage = expectedTerms.length > 0
    ? matchedTerms.length / expectedTerms.length
    : 1;
  const specificity = saturate(termCoverage * 10, 3);

  // Actionability: k=5 so 10 action matches scores ~0.67
  const actionPatterns = [
    /\b(must|shall|will|should|requires?)\b/gi,
    /\b\d+(\.\d+)?(%|ms|s|gb|mb|kb|rpm|tps|req\/s)\b/gi,
    /\b(deploy|implement|configure|install|create|build|test|validate|monitor)\b/gi,
  ];
  const actionMatches = actionPatterns.reduce(
    (count, pattern) => count + (content.match(pattern)?.length ?? 0),
    0,
  );
  const actionability = saturate(actionMatches, 5);

  // Technical depth: k=8 so 12 tech matches scores ~0.60
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
  const technicalDepth = saturate(techMatches, 8);

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

// ─── Structured Iteration Feedback (#2) ─────────────────────

export interface IterationFeedbackItem {
  severity: 'high' | 'medium' | 'low';
  issue: string;
  action: string;
  targetStage: 'refinement' | 'mandatory';
}

/**
 * Build structured iteration feedback from validation results.
 * V4 parity: XML format with severity, positive framing, per-stage routing.
 * Reference: Self-Refine (NeurIPS 2023), Lost in the Middle (TACL 2024).
 */
export function buildIterationFeedback(
  feedback: readonly string[],
  overallScore: number,
  detectedFailures: readonly string[],
): { xml: string; items: IterationFeedbackItem[] } {
  const items: IterationFeedbackItem[] = [];

  // Route each feedback item to the correct stage
  for (const fb of feedback) {
    const lower = fb.toLowerCase();
    const isStoryRelated = lower.includes('story') || lower.includes('stories')
      || lower.includes('acceptance criteria') || lower.includes('user story');
    const isDiagramRelated = lower.includes('diagram') || lower.includes('architecture')
      || lower.includes('mermaid');

    const targetStage = (isStoryRelated || isDiagramRelated) ? 'mandatory' : 'refinement';
    const severity = detectedFailures.some((f) => lower.includes(f.toLowerCase())) ? 'high' : 'medium';

    items.push({
      severity,
      issue: fb,
      // Positive framing: "Ensure X" instead of "Fix X"
      action: fb.replace(/^(fix|correct|address|resolve)\b/i, 'Ensure'),
      targetStage,
    });
  }

  // Build XML
  const strengths = overallScore >= 50
    ? `Score ${overallScore}/100 — preserve the good parts while addressing gaps.`
    : `Score ${overallScore}/100 — significant improvement needed across sections.`;

  const issueXml = items
    .map((i) => `  <issue severity="${i.severity}" target="${i.targetStage}">${i.issue}</issue>`)
    .join('\n');
  const actionXml = items
    .map((i) => `  <action>${i.action}</action>`)
    .join('\n');

  const xml = `<iteration_feedback>
${issueXml}
${actionXml}
  <strengths_to_preserve>${strengths}</strengths_to_preserve>
  <directive>Address the above issues while preserving all existing strengths. Do NOT simply rephrase — make targeted, specific changes.</directive>
</iteration_feedback>`;

  return { xml, items };
}

// ─── RAKE Key Term Extraction (#6) ──────────────────────────

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'must',
  'it', 'its', 'this', 'that', 'these', 'those', 'i', 'we', 'you', 'he',
  'she', 'they', 'me', 'us', 'him', 'her', 'them', 'my', 'our', 'your',
  'his', 'their', 'what', 'which', 'who', 'whom', 'when', 'where', 'how',
  'not', 'no', 'nor', 'as', 'if', 'then', 'than', 'too', 'very', 'so',
  'just', 'about', 'also', 'more', 'some', 'any', 'each', 'every', 'all',
  'both', 'few', 'most', 'other', 'such', 'only', 'own', 'same', 'into',
]);

/**
 * RAKE (Rapid Automatic Keyword Extraction) — splits at stop words,
 * scores by word degree/frequency co-occurrence.
 * Also extracts bigrams and CamelCase splits.
 */
export function extractKeyTerms(text: string): string[] {
  const lower = text.toLowerCase();
  const terms = new Set<string>();

  // 1. RAKE: split at stop words to find candidate phrases
  const sentences = lower.split(/[.!?;:\n]+/);
  const phraseFreq = new Map<string, number>();

  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/).filter(Boolean);
    let phrase: string[] = [];

    for (const word of words) {
      const clean = word.replace(/[^a-z0-9-]/g, '');
      if (!clean || STOP_WORDS.has(clean)) {
        if (phrase.length > 0) {
          const key = phrase.join(' ');
          phraseFreq.set(key, (phraseFreq.get(key) ?? 0) + 1);
          phrase = [];
        }
      } else {
        phrase.push(clean);
      }
    }
    if (phrase.length > 0) {
      const key = phrase.join(' ');
      phraseFreq.set(key, (phraseFreq.get(key) ?? 0) + 1);
    }
  }

  // Track which words are part of multi-word phrases (for dedup — #17)
  const multiWordParts = new Set<string>();

  for (const [phrase, freq] of phraseFreq) {
    const words = phrase.split(' ');
    if (words.length >= 2 && freq >= 1) {
      terms.add(phrase);
      words.forEach((w) => multiWordParts.add(w));
    }
  }

  // Add single words NOT already in a multi-word phrase (#17 dedup)
  for (const [phrase] of phraseFreq) {
    const words = phrase.split(' ');
    if (words.length === 1 && words[0]!.length >= 3 && !multiWordParts.has(words[0]!)) {
      terms.add(words[0]!);
    }
  }

  // 2. Acronyms: 2+ uppercase chars
  const acronyms = text.match(/\b[A-Z]{2,}\b/g);
  if (acronyms) acronyms.forEach((a) => terms.add(a.toLowerCase()));

  // 3. CamelCase splitting
  const camelCases = text.match(/\b[a-z]+(?:[A-Z][a-z]+)+\b/g);
  if (camelCases) {
    for (const cc of camelCases) {
      const parts = cc.replace(/([A-Z])/g, ' $1').toLowerCase().trim().split(/\s+/);
      parts.filter((p) => p.length >= 3 && !STOP_WORDS.has(p)).forEach((p) => terms.add(p));
    }
  }

  return [...terms];
}

// ─── Graph-Theoretic Mermaid Analysis (#8) ───────────────────

export interface MermaidGraphAnalysis {
  nodeCount: number;
  edgeCount: number;
  disconnectedNodes: string[];
  isConnected: boolean;
  duplicateEdges: number;
  poorLabels: string[];
  score: number; // 0-100
}

/**
 * Analyze Mermaid diagram for structural quality.
 * Parses into adjacency list, checks connectivity, labels, duplicates.
 */
export function analyzeMermaidGraph(code: string): MermaidGraphAnalysis {
  const lines = code.split('\n').map((l) => l.trim()).filter(Boolean);

  const nodes = new Map<string, string>(); // id → label
  const edges = new Set<string>();
  const adjacency = new Map<string, Set<string>>();
  let duplicateEdges = 0;

  for (const line of lines) {
    // Parse node declarations: ID["Label"] or ID[Label] or ID("Label")
    const nodeMatch = line.match(/^\s*(\w+)\s*[\[({][\[("]*([^"\])}]+)/);
    if (nodeMatch && !line.includes('-->') && !line.includes('---')) {
      nodes.set(nodeMatch[1]!, nodeMatch[2]!.trim());
    }

    // Parse edges: A --> B, A -.-> B, A ==> B
    const edgeMatch = line.match(/(\w+)\s*[-=.]+>+\s*(?:\|[^|]*\|)?\s*(\w+)/);
    if (edgeMatch) {
      const from = edgeMatch[1]!;
      const to = edgeMatch[2]!;
      const key = `${from}->${to}`;

      if (!nodes.has(from)) nodes.set(from, from);
      if (!nodes.has(to)) nodes.set(to, to);

      if (edges.has(key)) { duplicateEdges++; } else { edges.add(key); }

      if (!adjacency.has(from)) adjacency.set(from, new Set());
      if (!adjacency.has(to)) adjacency.set(to, new Set());
      adjacency.get(from)!.add(to);
    }
  }

  // BFS connectivity check
  const allNodes = [...nodes.keys()];
  const visited = new Set<string>();
  if (allNodes.length > 0) {
    const queue = [allNodes[0]!];
    visited.add(allNodes[0]!);
    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = adjacency.get(current) ?? new Set();
      for (const n of neighbors) {
        if (!visited.has(n)) { visited.add(n); queue.push(n); }
      }
      // Also check reverse edges for weak connectivity
      for (const [src, targets] of adjacency) {
        if (targets.has(current) && !visited.has(src)) { visited.add(src); queue.push(src); }
      }
    }
  }

  const disconnectedNodes = allNodes.filter((n) => !visited.has(n) && adjacency.has(n) === false);
  const isConnected = visited.size >= allNodes.length;

  // Poor labels: single char, numbered generics, placeholders
  const poorLabels: string[] = [];
  for (const [id, label] of nodes) {
    if (label.length <= 1 || /^(step|node|item)\s*\d+$/i.test(label) || /^(tbd|todo|placeholder)$/i.test(label)) {
      poorLabels.push(id);
    }
  }

  // Score: 0-100
  let score = 100;
  if (!isConnected) score -= 25;
  score -= disconnectedNodes.length * 10;
  score -= duplicateEdges * 5;
  score -= poorLabels.length * 5;
  if (allNodes.length < 3) score -= 20;
  score = Math.max(0, Math.min(100, score));

  return {
    nodeCount: nodes.size,
    edgeCount: edges.size,
    disconnectedNodes,
    isConnected,
    duplicateEdges,
    poorLabels,
    score,
  };
}

// ─── BM25-RAKE Hybrid Scoring (#14) ─────────────────────────

/**
 * Hybrid BM25 scoring: single words use standard saturation,
 * multi-word phrases require ALL constituent words present (MIN strategy).
 */
export function saturatedTermCoverageHybrid(
  text: string,
  keyTerms: readonly string[],
  k1: number = 1.5,
): number {
  if (keyTerms.length === 0) return 0;

  const words = text.toLowerCase().split(/\s+/);
  const freq = new Map<string, number>();
  for (const w of words) {
    const clean = w.replace(/[^a-z0-9]/g, '');
    if (clean) freq.set(clean, (freq.get(clean) ?? 0) + 1);
  }

  let totalScore = 0;

  for (const term of keyTerms) {
    const termWords = term.toLowerCase().split(/\s+/);

    if (termWords.length === 1) {
      // Single word: standard BM25
      const tf = freq.get(termWords[0]!) ?? 0;
      totalScore += tf / (tf + k1);
    } else {
      // Multi-word: BM25 each word, take MIN (all must be present)
      const wordScores = termWords.map((w) => {
        const tf = freq.get(w) ?? 0;
        return tf / (tf + k1);
      });
      totalScore += Math.min(...wordScores);
    }
  }

  return totalScore / keyTerms.length;
}

// ─── Lexical Diversity (#7 advanced) ─────────────────────────

/**
 * Compute lexical diversity and sentence variance metrics.
 * Complements filler detection for content quality scoring.
 */
export function computeLexicalMetrics(text: string): {
  lexicalDiversity: number;    // unique/total words (flag if < 0.60)
  sentenceLengthVariance: number; // std dev of sentence lengths (flag if < 5)
} {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const unique = new Set(words);
  const lexicalDiversity = words.length > 0 ? unique.size / words.length : 1;

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const lengths = sentences.map((s) => s.trim().split(/\s+/).length);
  const mean = lengths.reduce((a, b) => a + b, 0) / (lengths.length || 1);
  const variance = lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / (lengths.length || 1);
  const sentenceLengthVariance = Math.sqrt(variance);

  return { lexicalDiversity, sentenceLengthVariance };
}

// ─── Fuzzy Title Matching (#4) ───────────────────────────────

/**
 * Jaro-Winkler similarity for short strings (titles, names).
 * Returns 0-1 where 1 = identical.
 */
export function jaroWinkler(s1: string, s2: string): number {
  const a = s1.toLowerCase();
  const b = s2.toLowerCase();
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const matchWindow = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aMatches = new Array(a.length).fill(false);
  const bMatches = new Array(b.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  const jaro = (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;

  // Winkler prefix bonus (up to 4 chars)
  let prefix = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Dice coefficient — word-level token overlap, order-independent.
 * Returns 0-1 where 1 = identical word sets.
 */
export function diceCoefficient(s1: string, s2: string): number {
  const words1 = new Set(s1.toLowerCase().split(/\s+/).filter(Boolean));
  const words2 = new Set(s2.toLowerCase().split(/\s+/).filter(Boolean));
  if (words1.size === 0 && words2.size === 0) return 1;
  if (words1.size === 0 || words2.size === 0) return 0;

  let intersection = 0;
  for (const w of words1) { if (words2.has(w)) intersection++; }

  return (2 * intersection) / (words1.size + words2.size);
}

// ─── Adaptive Convergence (#11) ──────────────────────────────

/**
 * Determine if pipeline should stop iterating based on headroom and improvement.
 * V4 parity: headroom-based threshold + per-dimension regression detection.
 */
export function shouldStopConvergence(
  currentScore: number,
  previousScore: number,
  maxScore: number = 100,
): boolean {
  const improvement = currentScore - previousScore;
  const headroom = maxScore - previousScore;

  if (headroom <= 0) return true; // Already at max
  if (improvement < 2 && (headroom > 0 ? improvement / headroom : 0) < 0.05) return true;

  return false;
}

// ─── Pareto-Aware Adjusted Score (#12) ───────────────────────

/**
 * Compute adjusted score that penalizes dimension imbalance.
 * Prevents Goodhart's Law degradation.
 */
export function computeAdjustedScore(
  overall: number,
  dimensionScores: readonly number[],
  hardFailCount: number = 0,
): number {
  if (dimensionScores.length === 0) return overall;

  const min = Math.min(...dimensionScores);
  const mean = dimensionScores.reduce((a, b) => a + b, 0) / dimensionScores.length;
  const stdDev = Math.sqrt(
    dimensionScores.reduce((a, b) => a + (b - mean) ** 2, 0) / dimensionScores.length,
  );

  // Harmonic mean: naturally penalizes low outliers
  const recipSum = dimensionScores.reduce((a, b) => a + (b > 0 ? 1 / b : 10), 0);
  const harmonicMean = dimensionScores.length / recipSum;

  const adjusted = 0.5 * overall
    + 0.2 * min * 100
    + 0.2 * harmonicMean * 100
    - 0.1 * stdDev * 100
    - hardFailCount * 15;

  return Math.max(0, Math.min(100, Math.round(adjusted * 100) / 100));
}
