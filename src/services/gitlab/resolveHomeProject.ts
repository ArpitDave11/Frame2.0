/**
 * Resolve a group's canonical "home" project — the place user stories are filed.
 *
 * GitLab issues must live in a PROJECT, never a group/subgroup. The enterprise
 * convention used here (and in the wma-test-stream / dave-group fixtures) is a
 * dedicated catch-all project per team at `<group>/.../commons/home`. Because
 * that project is nested inside a `commons` subgroup, a plain
 * `fetchGroupProjects(group)` (direct children only) never surfaces it — which
 * is why "save to home" silently found no project. This resolver descends into
 * subgroups and ranks candidates by how well they match the convention.
 */

import type { GitLabConfig } from '@/domain/configTypes';
import type { GitLabProject } from './types';
import { fetchGroupProjects } from './gitlabClient';

/** Higher = better match for the issues "home" project. -1 = ineligible. */
export function homeProjectScore(p: GitLabProject): number {
  if (p.issues_enabled === false) return -1; // can't hold issues
  const path = (p.path_with_namespace || '').toLowerCase();
  const last = path.split('/').pop() ?? '';
  if (path.endsWith('/commons/home')) return 100; // canonical convention
  if (last === 'home' && path.includes('/commons/')) return 90;
  if (last === 'home') return 80; // any project literally named "home"
  if (path.includes('/commons/')) return 60; // a commons project
  return 0;
}

/**
 * Pick the canonical issues "home" project from a list (pure, testable).
 * Returns null when no project can hold issues.
 */
export function pickHomeProject(projects: GitLabProject[]): GitLabProject | null {
  const eligible = projects.filter((p) => p.issues_enabled !== false);
  if (eligible.length === 0) return null;
  return eligible.reduce(
    (best, p) => (homeProjectScore(p) > homeProjectScore(best) ? p : best),
    eligible[0]!,
  );
}

export interface ResolveHomeResult {
  success: boolean;
  /** The chosen home project, if any candidate exists. */
  home?: GitLabProject;
  /** All issue-capable projects under the group (for a manual override list). */
  projects: GitLabProject[];
  error?: string;
}

/** Fetch the group's projects (incl. subgroups) and resolve its "home" project. */
export async function resolveHomeProject(
  config: GitLabConfig,
  groupId: string,
): Promise<ResolveHomeResult> {
  const res = await fetchGroupProjects(config, groupId, { includeSubgroups: true });
  if (!res.success) return { success: false, projects: [], error: res.error };
  const projects = res.data ?? [];
  return { success: true, home: pickHomeProject(projects) ?? undefined, projects };
}
