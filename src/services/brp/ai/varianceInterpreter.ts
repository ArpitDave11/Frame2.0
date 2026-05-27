/**
 * VarianceInterpreter — AI seam for "explain why FRAME and the human
 * estimate disagree" (B-34).
 *
 * Generates a short, human-readable explanation that the DetailPanel
 * can render next to the variance badge. Pattern matches the other AI
 * seams: tiny interface, deterministic simulator, provider for swap.
 *
 * The simulator inspects the delta sign + magnitude + the FRAME
 * breakdown shape and picks one of a few canned templates. The Azure
 * implementation in B-37 will pass the epic + variance signal to the
 * LLM and return a free-form explanation.
 *
 * Returns `null` when there is nothing useful to say (variance ===
 * 'agree' or 'pending'). The UI should suppress the section in that
 * case.
 */

import {
  computeDelta,
  computeVariance,
} from '@/domain/brp';
import type { Epic, VarianceBand } from '@/domain/brp';

export interface VarianceInterpretation {
  band: VarianceBand;
  /** One short sentence the planner can act on. */
  message: string;
}

export interface VarianceInterpreter {
  explain(epic: Epic): Promise<VarianceInterpretation | null>;
}

export const simulatedVarianceInterpreter: VarianceInterpreter = {
  async explain(epic) {
    const band = computeVariance(epic);
    if (band === 'agree' || band === 'pending') return null;

    if (band === 'flagged') {
      // The 'flagged' band requires description.length < 80 (see
      // FLAGGED_DESCRIPTION_MIN_CHARS in computeVariance), so the
      // explanation is always the same: not enough body to estimate.
      return {
        band,
        message: 'Needs detail — description too short for a meaningful estimate.',
      };
    }

    const delta = computeDelta(epic);
    // delta === null here would mean pending; the band check above
    // already excluded that path, so cast for clarity.
    if (delta === null) return null;

    const human = epic.humanEstimate ?? 0;
    const frame = epic.frameResult?.frameEstimate ?? 0;
    const breakdownLines = epic.frameResult?.breakdown.length ?? 0;
    const direction = delta > 0 ? 'higher' : 'lower';
    const absDelta = Math.abs(delta);

    if (band === 're-groom') {
      return {
        band,
        message: `FRAME estimates ${frame} SP (planner ${human}, ${direction} by ${absDelta}); ${breakdownLines || 'no'} breakdown line${breakdownLines === 1 ? '' : 's'} — large gap suggests grooming the epic before sprinting.`,
      };
    }

    // caution band
    return {
      band,
      message: `FRAME ${direction} by ${absDelta} SP (FRAME ${frame}, planner ${human}) — review the ${breakdownLines} breakdown line${breakdownLines === 1 ? '' : 's'} to reconcile.`,
    };
  },
};

export function getVarianceInterpreter(): VarianceInterpreter {
  return simulatedVarianceInterpreter;
}
