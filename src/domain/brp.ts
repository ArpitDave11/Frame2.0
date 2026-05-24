/**
 * BRP — Breakdown & Re-groom Planning — Phase 1 type model (B-1).
 *
 * This module is the single source of truth for BRP data shapes and (in
 * later B-tasks) the pure derivation functions. It is dependency-free:
 * no React, no Zustand, no FRAME services. It can be unit-tested with
 * zero setup, and the pure functions added by B-2..B-4 must respect the
 * same purity rule (same input → same output, no side effects, no
 * `Date.now()`, no randomness).
 *
 * Three architectural invariants are enforced by the type shape itself.
 * If you find yourself wanting to add a field that violates one, do
 * not — fix the call site or compute it via a pure function instead:
 *
 *   1. Epic has NO top-level `variance`, `delta`, or `frameEstimate`
 *      field. All FRAME outputs live inside the nullable
 *      `Epic.frameResult` sub-object — present after analysis, `null`
 *      before. There is no half-populated middle state.
 *
 *   2. Pod stores `CapacityInputs` (the 5 raw inputs). It does NOT
 *      store `totalCapacity`. The total is always `computeCapacity(...)`
 *      at read time, so it can never drift from its inputs.
 *
 *   3. `VarianceBand` is a return type of `computeVariance` — never a
 *      field on any entity. Storing it is the exact bug the sample
 *      code in `docs/Brp_plan/ui_sample_brp/` made.
 *
 * Reviewer gate (per PRD AC5/AC6): grep across BRP code must show
 * zero instances of `variance:`, `delta:`, or `totalCapacity:` as a
 * field, and `brp.ts` must import nothing outside of `./brp.constants`.
 */

// ─── Scales & enums ─────────────────────────────────────────

/**
 * Canonical Fibonacci point scale for FRAME estimates. Literal union so
 * a wrong value is a TypeScript error at the call site, not a runtime
 * validation step. The runtime mirror is `FIBONACCI_POINTS` in
 * `brp.constants.ts`.
 */
export type FibonacciPoint = 1 | 2 | 3 | 5 | 8 | 13 | 21 | 40 | 100;

/** Per-epic analysis lifecycle. */
export type AnalysisStatus = 'raw' | 'analyzing' | 'done' | 'error';

/**
 * Variance band returned by `computeVariance(epic)`. NEVER stored as a
 * field anywhere in the model — invariant #3 above.
 *
 *   agree     human and FRAME estimates within `VARIANCE_AGREE_THRESHOLD`
 *   caution   estimates moderately apart, OR an 'agree' with low FRAME confidence
 *   re-groom  estimates far apart — re-groom the epic before sprinting it
 *   flagged   FRAME could not estimate (description too thin or analysis errored)
 *   pending   FRAME has not analyzed yet (status 'raw'/'analyzing'/'error'),
 *             or human estimate not yet entered
 */
export type VarianceBand = 'agree' | 'caution' | 're-groom' | 'flagged' | 'pending';

// ─── Capacity ───────────────────────────────────────────────

/**
 * The 5 raw capacity inputs the planner enters in the Capacity dialog.
 * A Pod stores exactly this — never a precomputed total — so that
 * `computeCapacity` is the single source of truth.
 */
export interface CapacityInputs {
  /** People available to this Pod for the PI. */
  resources: number;
  /** Story points each resource delivers per sprint. Defaults to 10. */
  spPerResource: number;
  /** Number of sprints in the Planning Increment. */
  sprintCount: number;
  /** Holiday days in the PI. Multiplied by `resources` (a holiday hits everyone). */
  holidayDays: number;
  /** Sum of individual leave days across all resources. Used as-is (no multiplication). */
  leaveDays: number;
}

/** Full breakdown returned by `computeCapacity` so the UI can show each line. */
export interface CapacityResult {
  gross: number;
  holidayDeduction: number;
  leaveDeduction: number;
  /** `max(0, gross - holidayDeduction - leaveDeduction)` — never negative. */
  total: number;
}

// ─── FRAME result building blocks ───────────────────────────

/** One item in a FRAME breakdown. The breakdown's points sum approximately to `frameEstimate`. */
export interface BreakdownItem {
  title: string;
  points: FibonacciPoint;
}

/**
 * A historical reference epic FRAME considered when estimating. Returned
 * to the UI so the planner can verify the comparison was sensible.
 */
export interface ReferenceEpic {
  /** GitLab epic global id, as a string for safety across number ranges. */
  epicId: string;
  title: string;
  /** Cosine/jaccard similarity to the epic being analyzed. Range [0, 1]. */
  similarity: number;
  /** Actual story points the reference epic shipped at. */
  actualSp: number;
}

/**
 * A story FRAME generated when the input epic had no decomposition.
 * Present only in FrameResult.generatedStories when FRAME had to invent them.
 */
export interface GeneratedStory {
  title: string;
  points: FibonacciPoint;
  acceptanceCriteria: string[];
}

/**
 * Everything FRAME produces from one analysis pass. Grouped into a single
 * nullable object on Epic so partial/half-populated state cannot exist
 * (invariant #1). If `Epic.frameResult` is non-null, every field here is
 * present and valid; if null, FRAME has not analyzed the epic yet.
 */
export interface FrameResult {
  frameEstimate: FibonacciPoint;
  breakdown: BreakdownItem[];
  rationale: string;
  /** FRAME's confidence in its own estimate. Range [0, 1]. */
  confidence: number;
  references: ReferenceEpic[];
  /** Present only when FRAME had to invent stories. `null` otherwise. */
  generatedStories: GeneratedStory[] | null;
  /** Identifier of the estimator that produced this result (for audit). */
  modelVersion: string;
  /** ISO-8601 timestamp at which the result was produced. */
  analyzedAt: string;
}

// ─── Core entities: Crew → Pod → Epic ───────────────────────

/**
 * One epic loaded from GitLab. Authoring is not supported in BRP — epics
 * are always sourced. The shape enforces invariant #1: no top-level
 * `variance`, `delta`, or `frameEstimate` — those are computed by the
 * pure functions in this module from `humanEstimate` + `frameResult`.
 */
export interface Epic {
  /** GitLab epic global id (string for safety across large number ranges). */
  id: string;
  /** GitLab epic internal id (iid) within its group. */
  iid: number;
  title: string;
  /**
   * Epic body. The 'flagged' band heuristic in `computeVariance` reads
   * this; the GitLab service normalizes null bodies to '' so callers
   * never have to null-check.
   */
  description: string;
  /** Direct link back to the GitLab epic page. */
  gitlabWebUrl: string;
  /** ID of the Pod this epic is assigned to. */
  podId: string;
  /**
   * Where the epic came from. Only 'gitlab' is supported today; the
   * union shape reserves room for future sources (e.g., manual seed)
   * without a model change.
   */
  source: 'gitlab';
  /**
   * Planner's estimate in story points. `null` until the planner types
   * a value into the editable cell. Setting this NEVER touches any
   * other field — variance/delta re-derive automatically at render time.
   */
  humanEstimate: number | null;
  /** Lifecycle status of FRAME's analysis for this epic. */
  analysisStatus: AnalysisStatus;
  /**
   * FRAME's analysis output. `null` until status reaches 'done'.
   * Never partially populated — either all fields are present, or the
   * whole sub-object is `null`.
   */
  frameResult: FrameResult | null;
}

/**
 * A squad — a GitLab subgroup. Owns capacity inputs and epics. Does
 * NOT store `totalCapacity` (invariant #2) — that is always
 * `computeCapacity(pod.capacity).total` at read time.
 */
export interface Pod {
  id: string;
  name: string;
  gitlabSubgroupId: number;
  capacity: CapacityInputs;
  epics: Epic[];
}

/** A crew — a GitLab root group. Owns Pods. Thin. */
export interface Crew {
  id: string;
  name: string;
  gitlabGroupId: number;
  pods: Pod[];
}

/** The planning increment the BRP board is sized against. */
export interface PI {
  id: string;
  name: string;
  /** ISO-8601 date. */
  startDate: string;
  /** ISO-8601 date. */
  endDate: string;
  sprintCount: number;
}

// ─── Derived (return types — NEVER stored) ──────────────────

/**
 * The roll-up `computePodMetrics(pod)` returns. Every field is computed;
 * none of these is ever a field on Pod or Crew. `humanLoad` and
 * `frameLoad` EXCLUDE flagged epics — a flagged epic is one FRAME
 * could not estimate, so including it in either load would misrepresent
 * the comparison.
 */
export interface PodMetrics {
  totalCapacity: number;
  humanLoad: number;
  frameLoad: number;
  /** `totalCapacity - frameLoad`. Negative = pod is over-committed. */
  balance: number;
  /** Mean of `frameResult.confidence` across analyzed (non-flagged) epics. 0 if none. */
  avgConfidence: number;
  epicCount: number;
  flaggedCount: number;
  reGroomCount: number;
}

// ─── AI seam ────────────────────────────────────────────────

/**
 * Events emitted by an AIEstimator while analyzing one epic. The shape
 * supports streaming progress without changing the consumer contract
 * when the simulator (Phase 3) is swapped for a real LLM (Phase 7).
 *
 *   started   first event — emitted once per analyzeEpic call
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
 */
export interface AIEstimator {
  analyzeEpic(
    epic: Epic,
    references: readonly ReferenceEpic[],
  ): AsyncIterable<AnalysisEvent>;
}

// ─── Pure functions ─────────────────────────────────────────

/**
 * Compute Pod capacity from its 5 raw inputs. Pure — same input always
 * yields the same output, no side effects, no `Date.now()`, no randomness.
 *
 * Formula (whole-PI basis, 1 day = 1 SP at the SP/resource rate):
 *   gross             = resources × spPerResource × sprintCount
 *   holidayDeduction  = holidayDays × resources         // a holiday hits everyone
 *   leaveDeduction    = leaveDays                       // already a total in person-days
 *   total             = max(0, gross − holidayDeduction − leaveDeduction)
 *
 * Returns the full breakdown so the UI can show each line without recomputing.
 * `total` clamps at 0 — a Pod cannot have negative usable capacity.
 *
 * Worked example (PRD acceptance criterion):
 *   inputs { resources: 6, spPerResource: 10, sprintCount: 6, holidayDays: 2, leaveDays: 5 }
 *   gross = 6 × 10 × 6 = 360
 *   holidayDeduction = 2 × 6 = 12
 *   leaveDeduction = 5
 *   total = 360 − 12 − 5 = 343
 */
export function computeCapacity(inputs: CapacityInputs): CapacityResult {
  const gross = inputs.resources * inputs.spPerResource * inputs.sprintCount;
  const holidayDeduction = inputs.holidayDays * inputs.resources;
  const leaveDeduction = inputs.leaveDays;
  const total = Math.max(0, gross - holidayDeduction - leaveDeduction);
  return { gross, holidayDeduction, leaveDeduction, total };
}
