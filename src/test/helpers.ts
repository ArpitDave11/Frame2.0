/**
 * Shared test utilities for Epic Generator v5.
 *
 * These helpers provide type-safe mock factories for the most common
 * test scenarios. Types are imported from domain modules.
 */

// ─── Domain Type Re-exports ─────────────────────────────────

export type { AppConfig, AIProvider } from '../domain/configTypes';
export type { ComplexityLevel, EpicCategory } from '../domain/types';

import type { AppConfig } from '../domain/configTypes';
import type { EpicCategory } from '../domain/types';

/** Pipeline stage status */
export type StageStatus = 'pending' | 'running' | 'complete' | 'error';

/** Result from the 6-stage AI pipeline */
export interface PipelineResult {
  refinedMarkdown: string;
  category: EpicCategory;
  categoryConfidence: number;
  sectionCount: number;
  storyCount: number;
  wordCount: number;
  validationScore: number;
  stages: Record<1 | 2 | 3 | 4 | 5 | 6, {
    status: StageStatus;
    message: string;
    durationMs: number;
  }>;
}

// ─── Default Constants ──────────────────────────────────────

import { DEFAULT_CONFIG } from '../domain/configTypes';

const DEFAULT_APP_CONFIG: AppConfig = DEFAULT_CONFIG;

const SECTION_TITLES = [
  'Executive Summary',
  'Objective',
  'Background & Context',
  'Scope',
  'Requirements',
  'Architecture Overview',
  'Technical Design',
  'User Stories',
  'Acceptance Criteria',
  'Risk Assessment',
  'Timeline & Milestones',
  'Dependencies',
  'Security Considerations',
  'Testing Strategy',
  'Rollout Plan',
  'Success Metrics',
  'Appendix',
];

// ─── Mock Factories ─────────────────────────────────────────

/**
 * Generates valid epic markdown content with the specified number of sections.
 *
 * @param sections - Number of sections to include (default: 3, max: 17).
 *   Each section has a title and a paragraph of placeholder content.
 * @returns A markdown string with `# Epic Title` and `## N. Section` headings.
 *
 * @example
 * ```ts
 * const md = createMockEpicContent();       // 3 sections
 * const md5 = createMockEpicContent(5);     // 5 sections
 * ```
 */
export function createMockEpicContent(sections: number = 3): string {
  const count = Math.max(1, Math.min(sections, SECTION_TITLES.length));
  const parts = ['# Mock Epic Title\n'];

  for (let i = 0; i < count; i++) {
    const title = SECTION_TITLES[i]!;
    parts.push(
      `## ${i + 1}. ${title}\n`,
      `This is the content for the ${title.toLowerCase()} section. ` +
      `It provides relevant details and context for this part of the epic document.\n`,
    );
  }

  return parts.join('\n');
}

/**
 * Creates a valid AppConfig with sensible defaults, merging any overrides.
 *
 * @param overrides - Partial config to deep-merge over defaults.
 * @returns A complete, valid AppConfig object.
 *
 * @example
 * ```ts
 * const config = createMockConfig();
 * const azureConfig = createMockConfig({ ai: { provider: 'azure' } });
 * ```
 */
export function createMockConfig(
  overrides?: DeepPartial<AppConfig>,
): AppConfig {
  const base = structuredClone(DEFAULT_APP_CONFIG);
  if (!overrides) return base;
  return deepMerge(base, overrides);
}

/**
 * Creates a valid PipelineResult representing a successful 6-stage run.
 *
 * @returns A complete PipelineResult with realistic default values.
 *
 * @example
 * ```ts
 * const result = createMockPipelineResult();
 * expect(result.validationScore).toBeGreaterThanOrEqual(80);
 * ```
 */
export function createMockPipelineResult(): PipelineResult {
  const stageEntry = (msg: string) => ({
    status: 'complete' as StageStatus,
    message: msg,
    durationMs: 1500,
  });

  return {
    refinedMarkdown: createMockEpicContent(10),
    category: 'technical_design',
    categoryConfidence: 0.92,
    sectionCount: 10,
    storyCount: 12,
    wordCount: 2400,
    validationScore: 82,
    stages: {
      1: stageEntry('Deep comprehension complete'),
      2: stageEntry('Category classified: technical-design (92%)'),
      3: stageEntry('Structural assessment complete — 10 sections planned'),
      4: stageEntry('Content refinement complete — 10/10 sections'),
      5: stageEntry('Generated 12 user stories + architecture diagram'),
      6: stageEntry('Validation passed — score: 82/100'),
    },
  };
}

/**
 * Waits for a condition to become true, polling at short intervals.
 *
 * @param condition - A function that returns `true` when the wait should end.
 * @param timeout - Maximum time to wait in milliseconds (default: 3000).
 * @throws Error if the condition is not met within the timeout.
 *
 * @example
 * ```ts
 * await waitFor(() => store.getState().isRunning === false);
 * ```
 */
export async function waitFor(
  condition: () => boolean,
  timeout: number = 3000,
): Promise<void> {
  const start = Date.now();
  const interval = 50;

  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error(`waitFor timed out after ${timeout}ms`);
    }
    await new Promise((r) => setTimeout(r, interval));
  }
}

// ─── Internal Utilities ─────────────────────────────────────

/** Recursive partial type for deep-merge overrides */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Deep-merge source into target (mutates target) */
function deepMerge(target: any, source: any): any {
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = target[key];

    if (
      srcVal !== null &&
      typeof srcVal === 'object' &&
      !Array.isArray(srcVal) &&
      tgtVal !== null &&
      typeof tgtVal === 'object' &&
      !Array.isArray(tgtVal)
    ) {
      deepMerge(tgtVal, srcVal);
    } else {
      target[key] = srcVal;
    }
  }
  return target;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
