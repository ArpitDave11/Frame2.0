/**
 * BRP AI seam — estimator provider (B-9).
 *
 * Single-line swap point between the deterministic simulator (today)
 * and a real LLM estimator (Phase 7). Callers — `brpStore.runAnalysis`
 * being the primary one, via Phase 6 wiring — depend on this function
 * and never on the simulator directly. Swapping providers in P7 is
 * a one-line change here; nothing else moves.
 */

import type { AIEstimator } from '../../../domain/brp';
import { createSimulatedEstimator } from './simulatedEstimator';

/**
 * Return the active BRP estimator. Returns the simulator today.
 * Replace the body in Phase 7 with `createAzureOpenAIEstimator(...)`
 * (or whichever real implementation lands) once the LLM backend is
 * available; no consumer needs to change.
 */
export function getEstimator(): AIEstimator {
  return createSimulatedEstimator();
}
