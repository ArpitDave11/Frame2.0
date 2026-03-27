/**
 * GitLab Identifier Safety Layer (F11)
 *
 * Centralized reference for GitLab's 5 identifier types.
 * Branded types prevent accidental misuse at compile time.
 *
 * ┌─────────────────┬──────────────┬───────────────────────────────────┐
 * │ Identifier       │ Scope        │ Where Used                        │
 * ├─────────────────┼──────────────┼───────────────────────────────────┤
 * │ Group ID         │ Global       │ All endpoint URL paths as :id     │
 * │ Epic ID (id)     │ Global       │ parent_id, child_epic_id          │
 * │ Epic IID (iid)   │ Group-scoped │ URL paths as :epic_iid, UI display│
 * │ Project ID       │ Global       │ Issues API, Notes API, MR API     │
 * │ Work Item ID     │ Global       │ GraphQL WorkItem operations       │
 * └─────────────────┴──────────────┴───────────────────────────────────┘
 *
 * CRITICAL RULES:
 * - REST URL paths use IID for the epic position (/epics/:epic_iid)
 * - parent_id and child_epic_id use GLOBAL epic ID (NOT IID)
 * - Notes API requires project_id (NOT group_id)
 * - IIDs are group-scoped — NOT globally unique
 * - Never use IID for cross-group lookups
 */

// ─── Branded Types ──────────────────────────────────────────

/** Global epic ID — unique across all groups */
export type GlobalEpicId = number & { readonly __brand: 'GlobalEpicId' };

/** Group-scoped epic IID — NOT globally unique */
export type EpicIid = number & { readonly __brand: 'EpicIid' };

/** Group ID (numeric or string path) */
export type GroupId = string & { readonly __brand: 'GroupId' };

/** Project ID — required for Issues API, Notes API */
export type ProjectId = number & { readonly __brand: 'ProjectId' };

// ─── Type Constructors ──────────────────────────────────────

export function toGlobalEpicId(id: number): GlobalEpicId {
  return id as GlobalEpicId;
}

export function toEpicIid(iid: number): EpicIid {
  return iid as EpicIid;
}

export function toGroupId(id: string | number): GroupId {
  return String(id) as GroupId;
}

export function toProjectId(id: number): ProjectId {
  return id as ProjectId;
}

// ─── Validation Helpers ─────────────────────────────────────

/**
 * Warn if an ID looks suspicious for its context.
 * IIDs are typically small (1-999), global IDs are typically large (1000+).
 * This is a heuristic, not a guarantee.
 */
export function warnIfLikelyIid(id: number, context: string): void {
  if (id < 1000 && typeof console !== 'undefined') {
    console.warn(
      `[F11 ID Safety] ${context}: id=${id} looks like an IID (< 1000). ` +
      `If this should be a global ID, the value may be wrong.`,
    );
  }
}

/**
 * Extract project_id from a GitLab issue web_url.
 * URL format: https://gitlab.com/group/project/-/issues/123
 * Returns the project path, which can be used with the API.
 */
export function resolveProjectIdFromIssueUrl(webUrl: string): string | null {
  const match = webUrl.match(/^https?:\/\/[^/]+\/(.+?)\/-\/issues\//);
  return match?.[1] ?? null;
}
