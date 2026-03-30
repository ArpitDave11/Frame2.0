/**
 * Tests for BM25-based quality scorer — T-4.8.
 */

import { describe, it, expect } from 'vitest';
import {
  saturate,
  detectFiller,
  scoreSection,
  scoreDocument,
  getDefaultScoringConfig,
  validateDiagramNodeCount,
  FILLER_PATTERN_COUNTS,
  type ScoringConfig,
} from './epicScorer';

// ─── saturate ───────────────────────────────────────────────

describe('saturate', () => {
  it('returns 0 for value=0', () => {
    expect(saturate(0, 1.2)).toBe(0);
  });

  it('returns ~0.4545 for value=1, k=1.2', () => {
    const result = saturate(1, 1.2);
    expect(result).toBeCloseTo(1 / 2.2, 4);
  });

  it('approaches 1 for large values', () => {
    const result = saturate(100, 1.2);
    expect(result).toBeGreaterThan(0.98);
    expect(result).toBeLessThan(1);
  });

  it('returns 0 for negative values', () => {
    expect(saturate(-5, 1.2)).toBe(0);
  });

  it('returns 0 for k=0', () => {
    expect(saturate(5, 0)).toBe(0);
  });

  it('is monotonically increasing', () => {
    const a = saturate(1, 1.2);
    const b = saturate(5, 1.2);
    const c = saturate(10, 1.2);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });
});

// ─── detectFiller ───────────────────────────────────────────

describe('detectFiller', () => {
  it('detects hedging words', () => {
    const result = detectFiller('We should perhaps maybe consider this');
    const words = result.detectedFillers.map((f) => f.word);
    expect(words).toContain('perhaps');
    expect(words).toContain('maybe');
  });

  it('detects "very" as redundant modifier', () => {
    const result = detectFiller('This is a very important thing');
    const words = result.detectedFillers.map((f) => f.word);
    expect(words).toContain('very');
  });

  it('detects combined hedging and redundant modifiers', () => {
    const result = detectFiller('We should perhaps maybe consider this very important thing');
    const words = result.detectedFillers.map((f) => f.word);
    expect(words).toContain('perhaps');
    expect(words).toContain('maybe');
    expect(words).toContain('very');
  });

  it('finds zero or near-zero filler in technical content', () => {
    const result = detectFiller('Deploy the payment service to Kubernetes with 3 replicas');
    expect(result.fillerCount).toBeLessThanOrEqual(1);
    expect(result.densityScore).toBeGreaterThan(0.8);
  });

  it('detects AI fluff words', () => {
    const result = detectFiller('We must delve into this pivotal paradigm shift');
    const words = result.detectedFillers.map((f) => f.word);
    expect(words).toContain('delve');
    expect(words).toContain('pivotal');
    expect(words).toContain('paradigm');
  });

  it('detects empty phrases', () => {
    const result = detectFiller('It is important to note that in order to succeed we must try');
    const words = result.detectedFillers.map((f) => f.word);
    expect(words).toContain('it is important to note');
    expect(words).toContain('in order to');
  });

  it('detects vague language', () => {
    const result = detectFiller('Various aspects of the system require appropriate handling');
    const words = result.detectedFillers.map((f) => f.word);
    expect(words).toContain('various');
    expect(words).toContain('aspects');
    expect(words).toContain('appropriate');
  });

  it('returns correct totalWords count', () => {
    const result = detectFiller('one two three four five');
    expect(result.totalWords).toBe(5);
  });

  it('computes fillerRatio correctly', () => {
    const result = detectFiller('perhaps very');
    expect(result.fillerRatio).toBeGreaterThan(0);
    expect(result.fillerRatio).toBeLessThanOrEqual(1);
  });

  it('densityScore decreases with more filler', () => {
    const clean = detectFiller('Deploy service to production cluster');
    const dirty = detectFiller('Perhaps we should maybe basically essentially potentially consider');
    expect(clean.densityScore).toBeGreaterThan(dirty.densityScore);
  });

  it('handles empty string', () => {
    const result = detectFiller('');
    expect(result.fillerCount).toBe(0);
    expect(result.totalWords).toBe(0);
    expect(result.fillerRatio).toBe(0);
    expect(result.densityScore).toBe(1);
  });

  it('respects word boundaries', () => {
    // "perhaps" should not match inside "perhapsburg"
    const result = detectFiller('The perhapsburg effect is notable');
    const words = result.detectedFillers.map((f) => f.word);
    expect(words).not.toContain('perhaps');
  });
});

// ─── Filler pattern counts ──────────────────────────────────

describe('FILLER_PATTERN_COUNTS', () => {
  it('hedging has 20+ patterns', () => {
    expect(FILLER_PATTERN_COUNTS['hedging']).toBeGreaterThanOrEqual(20);
  });

  it('emptyPhrases has 15+ patterns', () => {
    expect(FILLER_PATTERN_COUNTS['emptyPhrases']).toBeGreaterThanOrEqual(15);
  });

  it('aiFluff has 15+ patterns', () => {
    expect(FILLER_PATTERN_COUNTS['aiFluff']).toBeGreaterThanOrEqual(15);
  });

  it('redundantModifiers has 10+ patterns', () => {
    expect(FILLER_PATTERN_COUNTS['redundantModifiers']).toBeGreaterThanOrEqual(10);
  });

  it('vagueLanguage has 10+ patterns', () => {
    expect(FILLER_PATTERN_COUNTS['vagueLanguage']).toBeGreaterThanOrEqual(10);
  });

  it('total patterns across all categories is 70+', () => {
    const total = Object.values(FILLER_PATTERN_COUNTS).reduce((s, c) => s + c, 0);
    expect(total).toBeGreaterThanOrEqual(70);
  });
});

// ─── scoreSection ───────────────────────────────────────────

describe('scoreSection', () => {
  const config = getDefaultScoringConfig('moderate');

  it('scores substantial content with expected terms significantly higher than stub content', () => {
    const content = `
      The authentication service must implement OAuth2 authorization code flow with PKCE extension.
      Deploy the API gateway with rate limiting configured at 1000 requests per second.
      The database schema requires migration to PostgreSQL with proper indexing strategy.
      JWT tokens shall expire after 3600 seconds. Session management will use Redis cluster.
      Configure Kubernetes deployment with 3 replicas and horizontal pod autoscaling.
      Implement circuit breaker pattern for all external service calls with 5s timeout.
      Monitor API latency at p99 < 200ms using Prometheus metrics and Grafana dashboards.
      The authentication flow requires secure token storage using HttpOnly cookies.
      Rate limiting must support per-client quotas with configurable burst allowance.
      Database connection pooling shall maintain 20 active connections per service instance.
      All API endpoints require TLS 1.3 encryption for data in transit.
      Service mesh implements mutual TLS for inter-service communication.
      Implement retry logic with exponential backoff for all external API calls.
      Monitoring must include structured logging with correlation IDs for request tracing.
      The deployment pipeline shall validate container health checks before traffic routing.
      Implement graceful shutdown with 30s drain period for active connections.
      Authentication events must be captured in the audit log with timestamp and source IP.
      The API gateway must validate request schemas against OpenAPI specification.
      Database migrations shall be backward-compatible to support rolling deployments.
      Configure alerting thresholds: error rate > 1%, latency p99 > 500ms, availability < 99.9%.
    `;
    const terms = ['oauth2', 'api', 'database', 'jwt', 'kubernetes', 'circuit breaker', 'monitoring'];
    const result = scoreSection(content, terms, config);
    // Substantial content should score well above stub content
    const stub = scoreSection('TODO: add content here', terms, config);
    expect(result.overall).toBeGreaterThan(stub.overall * 3);
    expect(result.overall).toBeGreaterThan(40);
  });

  it('scores empty/minimal content < 30 overall', () => {
    const result = scoreSection('TODO: add content here', ['oauth2', 'api', 'database'], config);
    expect(result.overall).toBeLessThan(30);
  });

  it('returns all 5 dimension scores between 0 and 1', () => {
    const result = scoreSection('Some technical content about api design', ['api'], config);
    expect(result.completeness).toBeGreaterThanOrEqual(0);
    expect(result.completeness).toBeLessThanOrEqual(1);
    expect(result.clarity).toBeGreaterThanOrEqual(0);
    expect(result.clarity).toBeLessThanOrEqual(1);
    expect(result.specificity).toBeGreaterThanOrEqual(0);
    expect(result.specificity).toBeLessThanOrEqual(1);
    expect(result.actionability).toBeGreaterThanOrEqual(0);
    expect(result.actionability).toBeLessThanOrEqual(1);
    expect(result.technicalDepth).toBeGreaterThanOrEqual(0);
    expect(result.technicalDepth).toBeLessThanOrEqual(1);
  });

  it('overall is between 0 and 100', () => {
    const result = scoreSection('Deploy the service to production', ['deploy'], config);
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });

  it('handles no expected terms gracefully', () => {
    const result = scoreSection('Some content here about things', [], config);
    expect(result.specificity).toBeGreaterThan(0);
  });
});

// ─── scoreDocument ──────────────────────────────────────────

describe('scoreDocument', () => {
  const config = getDefaultScoringConfig('moderate');

  const highQualitySections = [
    {
      title: 'Architecture',
      content: `The system implements a microservice architecture with API gateway pattern.
        Authentication uses OAuth2 with JWT tokens. The database layer uses PostgreSQL
        with read replicas for scalability. Deploy to Kubernetes with autoscaling.
        Each service must maintain 99.9% availability with circuit breakers.
        Monitor latency at p99 < 200ms. Implement retry logic with exponential backoff.`,
    },
    {
      title: 'Security',
      content: `Authentication requires OAuth2 authorization code flow with PKCE.
        All API endpoints must validate JWT tokens. Configure rate limiting at 1000 req/s.
        Database connections shall use TLS encryption. Implement RBAC with 3 permission levels.
        Audit logging must capture all authentication events. Token refresh requires secure storage.`,
    },
  ];

  const termsMap = new Map<string, readonly string[]>([
    ['Architecture', ['microservice', 'api', 'database', 'kubernetes', 'availability']],
    ['Security', ['oauth2', 'jwt', 'rate limiting', 'encryption', 'rbac']],
  ]);

  it('produces a report with section scores', () => {
    const report = scoreDocument(highQualitySections, termsMap, config);
    expect(report.sectionScores).toHaveLength(2);
    expect(report.sectionScores[0]!.sectionTitle).toBe('Architecture');
    expect(report.sectionScores[1]!.sectionTitle).toBe('Security');
  });

  it('high-quality fixture produces meaningful scores with correct structure', () => {
    const report = scoreDocument(highQualitySections, termsMap, config);
    expect(report.aggregateScore).toBeGreaterThan(30);
    expect(typeof report.passed).toBe('boolean');
    expect(report.failedDimensions).toEqual([]);
  });

  it('aggregate score is between 0 and 100', () => {
    const report = scoreDocument(highQualitySections, termsMap, config);
    expect(report.aggregateScore).toBeGreaterThanOrEqual(0);
    expect(report.aggregateScore).toBeLessThanOrEqual(100);
  });

  it('geometric mean penalizes a single low dimension', () => {
    // One section with no technical content, other with full technical content
    const mixed = [
      { title: 'Empty', content: 'perhaps maybe' },
      { title: 'Full', content: highQualitySections[0]!.content },
    ];
    const mixedTerms = new Map<string, readonly string[]>([
      ['Empty', ['oauth2', 'api', 'jwt']],
      ['Full', ['microservice', 'api', 'database']],
    ]);
    const report = scoreDocument(mixed, mixedTerms, config);
    // Score should be lower than a balanced document
    expect(report.aggregateScore).toBeLessThan(80);
  });

  it('handles empty sections array', () => {
    const report = scoreDocument([], new Map(), config);
    expect(report.sectionScores).toHaveLength(0);
    expect(report.aggregateScore).toBeLessThanOrEqual(100);
  });

  it('generates recommendations for failing sections', () => {
    const poor = [{ title: 'Stub', content: 'TODO' }];
    const terms = new Map([['Stub', ['oauth2', 'api', 'database']]]);
    const report = scoreDocument(poor, terms, config);
    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  it('reports failed dimensions below minimum', () => {
    const strictConfig: ScoringConfig = {
      ...config,
      perDimensionMinimum: 0.9,
    };
    const poor = [{ title: 'Stub', content: 'TODO' }];
    const terms = new Map([['Stub', ['oauth2']]]);
    const report = scoreDocument(poor, terms, strictConfig);
    expect(report.failedDimensions.length).toBeGreaterThan(0);
    expect(report.passed).toBe(false);
  });
});

// ─── getDefaultScoringConfig ────────────────────────────────

describe('getDefaultScoringConfig', () => {
  it('simple complexity returns threshold 80', () => {
    const config = getDefaultScoringConfig('simple');
    expect(config.passingThreshold).toBe(80);
  });

  it('moderate complexity returns threshold 85', () => {
    const config = getDefaultScoringConfig('moderate');
    expect(config.passingThreshold).toBe(85);
  });

  it('complex complexity returns threshold 90', () => {
    const config = getDefaultScoringConfig('complex');
    expect(config.passingThreshold).toBe(90);
  });

  it('returns default BM25 parameters', () => {
    const config = getDefaultScoringConfig('moderate');
    expect(config.k1).toBe(1.2);
    expect(config.b).toBe(0.75);
  });

  it('returns default quality weights summing to 1.0', () => {
    const config = getDefaultScoringConfig('moderate');
    const sum =
      config.weights.completeness +
      config.weights.clarity +
      config.weights.specificity +
      config.weights.actionability +
      config.weights.technicalDepth;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('returns perDimensionMinimum', () => {
    const config = getDefaultScoringConfig('moderate');
    expect(config.perDimensionMinimum).toBe(0.2);
  });
});

// ─── validateDiagramNodeCount ──────────────────────────────

describe('validateDiagramNodeCount', () => {
  it('simple with 5 nodes → within limits', () => {
    const result = validateDiagramNodeCount(5, 'simple');
    expect(result.withinLimits).toBe(true);
    expect(result.max).toBe(6);
  });

  it('simple with 10 nodes → exceeds limits', () => {
    const result = validateDiagramNodeCount(10, 'simple');
    expect(result.withinLimits).toBe(false);
  });

  it('complex with 12 nodes → within limits', () => {
    const result = validateDiagramNodeCount(12, 'complex');
    expect(result.withinLimits).toBe(true);
    expect(result.max).toBe(12);
  });

  it('complex with 15 nodes → exceeds limits', () => {
    const result = validateDiagramNodeCount(15, 'complex');
    expect(result.withinLimits).toBe(false);
  });
});
