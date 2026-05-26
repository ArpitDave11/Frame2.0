/**
 * BRP GitLab service — Phase 4 (B-10/B-11).
 *
 * Composes the existing `src/services/gitlab/gitlabClient.ts` to surface
 * Crews, Pods, Epics, and ReferenceEpics as BRP-typed values. The
 * service is the BOUNDARY between GitLab shapes (number ids, snake_case
 * fields, label arrays) and the BRP domain (string ids, camelCase,
 * structured types). No direct `fetch()` calls — composition only.
 *
 * Architectural rules from the PRD (F4):
 *   - Returned `Epic` objects have `analysisStatus: 'raw'`,
 *     `frameResult: null`, `humanEstimate: null`. NEVER pre-filled.
 *   - Pods come with default `CapacityInputs` (spPerResource =
 *     DEFAULT_SP_PER_RESOURCE = 10, sprintCount = 6, others = 0/1).
 *     Planners overwrite via `brpStore.updatePodCapacity`.
 *   - Result-shaped errors (matches gitlabClient): never throws on
 *     expected failures.
 *   - Epic description normalizes null → '' so downstream consumers
 *     (computeVariance's "thin description" heuristic) never null-check.
 *
 * Current limitations (documented for P5/P7 to revisit):
 *   - `ReferenceEpic.similarity` is hardcoded at 0.5. Real similarity
 *     requires comparing the analyzed epic against each reference epic's
 *     text; that belongs to the estimator (P7), not the fetcher.
 *   - `ReferenceEpic.actualSp` is parsed from labels matching
 *     /^SP[-:]?(\d+)$/i (e.g., "SP-13", "sp:8", "SP 21"). Falls back to
 *     0 when no such label is present. GitLab's `weight` field on issues
 *     would be more authoritative but requires fetching every epic's
 *     children — deferred to P7.
 */

import type { GitLabConfig } from '../../domain/configTypes';
import type {
  GitLabEpic,
  GitLabSubgroup,
} from '../gitlab/types';
import {
  fetchGitLabSubgroups,
  fetchGroupEpics,
} from '../gitlab/gitlabClient';
import type {
  CapacityInputs,
  Crew,
  Epic,
  Pod,
  ReferenceEpic,
} from '../../domain/brp';
import { DEFAULT_SP_PER_RESOURCE } from '../../domain/brp.constants';

// ─── Result shape (widened in B-16 to address deep-review I8) ──

/**
 * Discriminated error code for the widened Result<T> shape (B-16).
 * Lets Phase 6 callers branch on error semantics (e.g., prompt to
 * reauthenticate for 'auth' vs. show a backoff toast for 'ratelimit').
 *
 *   'auth'       — token expired/invalid (HTTP 401/403)
 *   'ratelimit'  — too many requests (HTTP 429)
 *   'network'    — connection failure, DNS error, or 5xx server error
 *   'unknown'    — anything else; consult the message
 */
export type ResultErrorCode = 'auth' | 'ratelimit' | 'network' | 'unknown';

/** Structured error returned by every Result<T> failure. */
export interface ResultError {
  code: ResultErrorCode;
  message: string;
  cause?: unknown;
}

/**
 * Discriminated result. Phase 6 wiring branches on `.success` then on
 * `error.code` to drive UI affordances (toast vs. relogin prompt vs.
 * silent retry, etc.).
 *
 * Widened in B-16 from `{ error: string }` after the deep-review's
 * Production Readiness reviewer (I8) flagged that a plain string
 * loses the HTTP status discrimination needed for a regulated context.
 */
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: ResultError };

// ─── Error mapping helpers ─────────────────────────────────

/**
 * Heuristically classify a raw gitlabClient error string. gitlabClient
 * emits errors as `GitLab API error (NNN): {body}` for HTTP failures,
 * or as plain network-failure strings for fetch errors. We parse the
 * HTTP status when present; otherwise grep for common network markers.
 */
function classifyErrorCode(rawError: string | undefined): ResultErrorCode {
  if (!rawError) return 'unknown';
  const statusMatch = rawError.match(/\((\d{3})\)/);
  if (statusMatch?.[1]) {
    const status = parseInt(statusMatch[1], 10);
    if (status === 401 || status === 403) return 'auth';
    if (status === 429) return 'ratelimit';
    if (status >= 500) return 'network';
  }
  if (/network|fetch failed|enotfound|econnrefused|timeout/i.test(rawError)) {
    return 'network';
  }
  return 'unknown';
}

/** Build a failure Result from a raw gitlabClient error string. */
function toErrorResult<T>(
  rawError: string | undefined,
  fallbackMessage: string,
): Result<T> {
  const message = rawError ?? fallbackMessage;
  return {
    success: false,
    error: { code: classifyErrorCode(rawError), message },
  };
}

// ─── Default capacity for a freshly-loaded Pod ──────────────

/**
 * Sensible starting capacity for a pod that has just been loaded from
 * GitLab and hasn't been configured by a planner yet. Six sprints of
 * one person is a common-enough PI shape that the UI's first render
 * shows non-zero numbers; the planner adjusts via the Capacity dialog
 * (Phase 5).
 *
 * `spPerResource` comes from the canonical constant so the value moves
 * in lockstep if it changes (it shouldn't).
 */
export const DEFAULT_POD_CAPACITY: Readonly<CapacityInputs> = Object.freeze({
  resources: 1,
  spPerResource: DEFAULT_SP_PER_RESOURCE,
  sprintCount: 6,
  holidayDays: 0,
  leaveDays: 0,
});

// ─── Helpers ────────────────────────────────────────────────

/**
 * Coerce a GitLab subgroup id into BRP's two representations: string for
 * routing/keys, number for outbound API calls.
 *
 * Why both coercions are needed: `GitLabSubgroup.id` is typed as `string`
 * in `src/services/gitlab/types.ts`, but the live GitLab API actually
 * returns it as a `number`. The live smoke against gitlab.com caught
 * this drift (2026-05-25 — see the deep-review post-fix journal).
 * Coercing at the boundary makes the mapper robust to either runtime
 * shape, without modifying shared types outside BRP scope.
 */
function toIdString(id: string | number): string {
  return typeof id === 'string' ? id : String(id);
}

function toNumericId(id: string | number): number {
  if (typeof id === 'number') return Number.isFinite(id) ? id : 0;
  const n = parseInt(id, 10);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Pull a story-point total out of a GitLab epic's labels by matching
 * patterns like "SP-13", "SP:8", "sp 21". Returns 0 if no match.
 * Used by `fetchReferenceEpics` only — open epics intentionally don't
 * get this treatment (their SP is the planner's `humanEstimate`).
 */
function extractSpFromLabels(labels: readonly string[]): number {
  for (const label of labels) {
    const m = label.match(/^SP[\s:_-]?(\d+)$/i);
    if (m?.[1]) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n >= 0) return n;
    }
  }
  return 0;
}

/** Map a GitLab subgroup → BRP Crew (with empty pods to be filled later). */
function subgroupToCrew(sg: GitLabSubgroup): Crew {
  return {
    id: toIdString(sg.id),
    name: sg.name,
    gitlabGroupId: toNumericId(sg.id),
    pods: [],
  };
}

/** Map a GitLab subgroup → BRP Pod (with default capacity + empty epics). */
function subgroupToPod(sg: GitLabSubgroup): Pod {
  return {
    id: toIdString(sg.id),
    name: sg.name,
    gitlabSubgroupId: toNumericId(sg.id),
    capacity: { ...DEFAULT_POD_CAPACITY },
    epics: [],
  };
}

/** Map a GitLab epic → BRP Epic. Always 'raw', never pre-filled. */
function gitlabEpicToEpic(e: GitLabEpic, podId: string): Epic {
  return {
    id: String(e.id),
    iid: e.iid,
    title: e.title,
    // Normalize a missing/null description to '' so the variance
    // heuristic doesn't have to null-check.
    description: e.description ?? '',
    gitlabWebUrl: e.web_url,
    podId,
    source: 'gitlab',
    humanEstimate: null,
    analysisStatus: 'raw',
    frameResult: null,
  };
}

/** Map a closed GitLab epic → ReferenceEpic. Similarity is a placeholder. */
function gitlabEpicToReference(e: GitLabEpic): ReferenceEpic {
  return {
    epicId: String(e.id),
    title: e.title,
    // Real similarity is computed at estimator time (P7); 0.5 is a
    // neutral placeholder so the simulator can render references.
    similarity: 0.5,
    actualSp: extractSpFromLabels(e.labels),
  };
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Fetch the top-level crews available to the planner: the subgroups
 * directly under `config.rootGroupId`. Each crew comes back with empty
 * `pods` — call `fetchPods(crewGroupId)` to populate.
 *
 * Returns an error result (not a throw) when:
 *   - rootGroupId is empty
 *   - the GitLab call fails
 */
export async function fetchCrews(config: GitLabConfig): Promise<Result<Crew[]>> {
  if (!config.rootGroupId) {
    return {
      success: false,
      error: { code: 'unknown', message: 'GitLab rootGroupId is not configured' },
    };
  }
  const result = await fetchGitLabSubgroups(config, config.rootGroupId);
  if (!result.success) {
    return toErrorResult(result.error, 'Failed to fetch crews');
  }
  const crews = (result.data ?? []).map(subgroupToCrew);
  return { success: true, data: crews };
}

/**
 * Fetch the pods under a given crew (= subgroups under the crew's
 * GitLab group). Pods come back with default capacity + empty epics.
 */
export async function fetchPods(
  config: GitLabConfig,
  crewGroupId: number,
): Promise<Result<Pod[]>> {
  const result = await fetchGitLabSubgroups(config, String(crewGroupId));
  if (!result.success) {
    return toErrorResult(result.error, 'Failed to fetch pods');
  }
  const pods = (result.data ?? []).map(subgroupToPod);
  return { success: true, data: pods };
}

/**
 * Fetch the epics under a given pod (the pod's GitLab subgroup).
 * Every epic comes back 'raw': analysisStatus 'raw', frameResult null,
 * humanEstimate null. Pre-filling these would violate the Phase 1
 * invariants.
 *
 * Pagination: requests 100 per page. For pods with > 100 open epics
 * this returns the first 100; v2 should iterate `page`. Documented
 * here, not blocking v1 because PI planning typically scopes to < 100
 * epics per pod.
 */
export async function fetchPodEpics(
  config: GitLabConfig,
  podSubgroupId: number,
): Promise<Result<Epic[]>> {
  const result = await fetchGroupEpics(config, String(podSubgroupId), {
    state: 'opened',
    per_page: 100,
  });
  if (!result.success) {
    return toErrorResult(result.error, 'Failed to fetch epics');
  }
  const podIdStr = String(podSubgroupId);
  const epics = (result.data ?? []).map((e) => gitlabEpicToEpic(e, podIdStr));
  return { success: true, data: epics };
}

/**
 * Fetch closed epics under a pod's subgroup, mapped to ReferenceEpic.
 * Filters to `state: 'closed'`. `actualSp` is parsed from labels per
 * the regex in `extractSpFromLabels`; refs without an SP label come
 * back with `actualSp: 0`. `similarity` is a placeholder 0.5 — real
 * computation happens in the estimator at analyzeEpic time (P7).
 */
export async function fetchReferenceEpics(
  config: GitLabConfig,
  podSubgroupId: number,
): Promise<Result<ReferenceEpic[]>> {
  const result = await fetchGroupEpics(config, String(podSubgroupId), {
    state: 'closed',
    per_page: 100,
  });
  if (!result.success) {
    return toErrorResult(result.error, 'Failed to fetch reference epics');
  }
  const refs = (result.data ?? []).map(gitlabEpicToReference);
  return { success: true, data: refs };
}
