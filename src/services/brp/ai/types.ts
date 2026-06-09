/**
 * BRP AI-seam type definitions (post-deep-review move from `src/domain/brp.ts`).
 *
 * `src/domain/brp.ts` claims, in its header, to be dependency-free of
 * services. `AIEstimator` is a service seam (consumed by `brpStore` and
 * implemented by `simulatedEstimator`); it doesn't belong in the
 * domain layer. The deep-review's Architecture reviewer flagged this
 * (I10) and we agreed to move it.
 *
 * Re-exports `AnalysisEvent` and `AIEstimator` here so consumers in
 * `src/services/brp/ai/` import locally rather than reaching into
 * `domain/`. The `domain/` module now only contains pure data types
 * and pure derivation functions.
 *
 * `analyzeEpic` accepts an optional `AbortSignal` (added post-deep-review
 * to address Critical finding C1 — no cancellation in `runAnalysis` —
 * and Important findings I2 (hung iterator) and I7 (no timeout on the
 * interface)). Implementors should check `signal?.aborted` between
 * yields and either return early or throw `AbortError`; consumers
 * (today: `brpStore.runAnalysis`) MUST also check `signal.aborted`
 * between iterations so a non-cooperative estimator can still be
 * cancelled.
 */

import type { Epic, FrameResult, ReferenceEpic } from '../../../domain/brp';

/**
 * Events emitted by an `AIEstimator` while analyzing one epic. Discriminated
 * on `kind`. The shape supports streaming progress without changing the
 * consumer contract when the simulator (Phase 3) is swapped for a real LLM
 * (Phase 7).
 *
 *   started   first event — emitted once per `analyzeEpic` call
 *   progress  zero-or-more — `pct` in [0, 1]
 *   done      terminal — carries the FrameResult
 *   error     terminal — analyzer failed; carries a human-readable message
 *
 * A consumer should treat 'done' or 'error' as the end of the iterator.
 */
export type AnalysisEvent =
  | { kind: 'started'; epicId: string }
  | { kind: 'progress'; epicId: string; pct: number }
  | { kind: 'done'; epicId: string; result: FrameResult }
  | { kind: 'error'; epicId: string; message: string };

/**
 * The seam between BRP and any analysis backend. The brpStore imports
 * ONLY this interface — never an implementation — so the simulator
 * (Phase 3) and the real estimator (Phase 7) are drop-in interchangeable.
 *
 * `analyzeEpic` is async-iterable so streaming progress works without
 * a separate event-emitter contract. References are passed in by the
 * caller (not fetched inside the estimator) to keep the interface
 * dependency-free.
 *
 * `signal` is optional: implementors SHOULD check it between yields and
 * either return early or throw an `AbortError`. Consumers MUST also
 * check `signal.aborted` between iterations so a non-cooperative
 * estimator can still be cancelled at the consumer boundary.
 */
export interface AIEstimator {
  analyzeEpic(
    epic: Epic,
    references: readonly ReferenceEpic[],
    signal?: AbortSignal,
  ): AsyncIterable<AnalysisEvent>;
}
