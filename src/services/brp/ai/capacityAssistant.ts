/**
 * CapacityAssistant — AI seam for "suggest capacity inputs" (B-33).
 *
 * Mirrors the AIEstimator pattern: a tiny interface + a deterministic
 * simulator + a provider that returns the active implementation.
 * Phase 7 (B-36/B-37) swaps the simulator for an Azure OpenAI-backed
 * implementation in ONE place — `getCapacityAssistant()`.
 *
 * The simulator uses the pod's historical closed epics (passed in by
 * the caller — the assistant itself is dependency-free of GitLab) to
 * suggest a `spPerResource` value via the median of past actuals
 * divided by the pod's current `resources`. Holiday/leave defaults
 * to zero (the planner sets those manually).
 *
 * Returned `confidence` is in [0, 1] and tells the UI how strongly to
 * present the suggestion (e.g., banner vs. tooltip). Returned `rationale`
 * is a short human-readable string the dialog can render verbatim.
 */

import type { CapacityInputs, Pod, ReferenceEpic } from '@/domain/brp';
import { DEFAULT_SP_PER_RESOURCE } from '@/domain/brp.constants';

export interface CapacitySuggestion {
  /** Recommended inputs — the dialog can merge these with the planner's edits. */
  inputs: CapacityInputs;
  /** Range [0, 1]. 0 = no data; 1 = strong historical signal. */
  confidence: number;
  /** Short human-readable explanation the dialog shows. */
  rationale: string;
}

export interface CapacityAssistant {
  /**
   * Suggest a CapacityInputs for the given pod. `pastReferences` is
   * the pod's closed reference epics (caller fetches via
   * brpGitlabService.fetchReferenceEpics). An empty list is fine —
   * the assistant degrades gracefully to defaults with confidence 0.
   */
  suggestCapacity(
    pod: Pod,
    pastReferences: readonly ReferenceEpic[],
  ): Promise<CapacitySuggestion>;
}

/**
 * Deterministic stub used until the Azure-backed assistant lands.
 * Pure function over its inputs — same `pod` + `pastReferences` always
 * produces the same suggestion.
 *
 * Heuristic:
 *   1. If `pastReferences` has any non-zero actualSp values, take the
 *      median (robust to outliers) and divide by the pod's `resources`
 *      to estimate SP/resource/sprint. Clamp to [1, 30].
 *   2. Otherwise fall back to DEFAULT_SP_PER_RESOURCE (10).
 *   3. Confidence scales with the number of reference data points:
 *      0 refs → 0.0, 1 ref → 0.3, 3+ refs → 0.7, 6+ refs → 0.9.
 *
 * Holiday/leave preserved from the pod's current capacity — those are
 * planner-specific knowledge the heuristic can't recover.
 */
export const simulatedCapacityAssistant: CapacityAssistant = {
  async suggestCapacity(pod, pastReferences) {
    const usable = pastReferences.filter((r) => r.actualSp > 0);
    if (usable.length === 0) {
      return {
        inputs: {
          ...pod.capacity,
          spPerResource: pod.capacity.spPerResource || DEFAULT_SP_PER_RESOURCE,
        },
        confidence: 0,
        rationale:
          'No historical actuals found — keeping the current SP/resource.',
      };
    }

    const sorted = [...usable].map((r) => r.actualSp).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0
        ? Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2)
        : sorted[mid] ?? 0;

    const resources = Math.max(1, pod.capacity.resources);
    const suggested = Math.max(1, Math.min(30, Math.round(median / resources)));

    const confidence =
      usable.length >= 6 ? 0.9 : usable.length >= 3 ? 0.7 : 0.3;

    return {
      inputs: {
        ...pod.capacity,
        spPerResource: suggested,
      },
      confidence,
      rationale: `Median of ${usable.length} past actual${usable.length === 1 ? '' : 's'} ÷ ${resources} resource${resources === 1 ? '' : 's'} = ${suggested} SP/resource/sprint.`,
    };
  },
};

/**
 * Provider — returns the active CapacityAssistant. B-37 swaps the body
 * here when the Azure-backed implementation lands.
 */
export function getCapacityAssistant(): CapacityAssistant {
  return simulatedCapacityAssistant;
}
