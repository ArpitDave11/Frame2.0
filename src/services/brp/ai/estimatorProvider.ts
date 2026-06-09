/**
 * BRP AI seam — estimator provider (B-9, swap landed in B-37).
 *
 * Single swap point between the deterministic simulator (default) and
 * the Azure OpenAI–backed estimator (B-36). Callers — `brpStore.runAnalysis`
 * via brpActions — depend on this function and never on a specific
 * implementation.
 *
 * Switching providers: at runtime the choice is driven by configStore:
 *   - When `config.ai.provider === 'azure'` AND `azureEndpoint` is set
 *     AND `azure.apiKey` is set, we return the Azure estimator.
 *   - Otherwise we fall back to the simulator. This keeps the BRP UI
 *     usable without a live LLM (planner can still load epics, edit
 *     human estimates, see variance bands recompute) and the test
 *     suite doesn't need credentials.
 *
 * The fallback is the safe default — a missing-config slip won't take
 * the planner offline; they just get the simulator's heuristics.
 */

import type { AIEstimator } from './types';
import { createSimulatedEstimator } from './simulatedEstimator';
import { createAzureEstimator } from './azureEstimator';
import { useConfigStore } from '@/stores/configStore';

export function getEstimator(): AIEstimator {
  const root = useConfigStore.getState().config;
  const azureReady =
    root.ai.provider === 'azure' &&
    !!root.endpoints?.azureEndpoint &&
    !!root.ai.azure?.apiKey;

  if (!azureReady) {
    return createSimulatedEstimator();
  }

  return createAzureEstimator({
    readConfig: () => {
      const c = useConfigStore.getState().config;
      return { ...c.ai, endpoints: c.endpoints };
    },
  });
}
