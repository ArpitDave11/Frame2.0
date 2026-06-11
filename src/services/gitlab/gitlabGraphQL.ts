/**
 * GitLab GraphQL client — used for work items (tasks), which the REST API
 * (/api/v4) does not expose. Posts to the `/gitlab-graphql` dev proxy
 * (→ /api/graphql); production needs same-origin ingress for that path.
 *
 * Scope: just enough to create a Task as a child of an existing issue —
 * resolve the issue's work-item GID + the project's Task type GID, then run
 * the `workItemCreate` mutation with a hierarchy parent.
 */

import type { GitLabConfig } from '@/domain/configTypes';

const GRAPHQL_URL = '/gitlab-graphql';

interface GqlResult<T> { ok: boolean; data?: T; error?: string }

/** PAT works on GraphQL via a Bearer header (verified live), as does OAuth. */
function authHeader(config: GitLabConfig): Record<string, string> {
  return config.accessToken ? { Authorization: `Bearer ${config.accessToken}` } : {};
}

export async function gitlabGraphQL<T = unknown>(
  config: GitLabConfig,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<GqlResult<T>> {
  if (!config.accessToken) return { ok: false, error: 'GitLab is not configured — provide an access token' };
  try {
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader(config) },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) return { ok: false, error: `GraphQL HTTP ${res.status}` };
    const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
    if (json.errors?.length) return { ok: false, error: json.errors.map((e) => e.message).join('; ') };
    return { ok: true, data: json.data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Extract the project namespace path from an issue/work-item web_url. */
export function namespacePathFromWebUrl(webUrl: string): string | null {
  // …/<full/path>/-/issues/2  or  …/-/work_items/2
  const m = webUrl.match(/^https?:\/\/[^/]+\/(.+?)\/-\/(?:issues|work_items)\//);
  return m ? m[1]! : null;
}

interface WorkItemNode { id: string; iid: string; title: string; workItemType: { name: string } }

/** Resolve the work-item GID of an issue (by iid) within a project path. */
export async function resolveWorkItemGid(
  config: GitLabConfig,
  fullPath: string,
  iid: number,
): Promise<GqlResult<string>> {
  const q = `query($fp: ID!){ project(fullPath: $fp){ workItems(first: 100){ nodes { id iid workItemType { name } } } } }`;
  const r = await gitlabGraphQL<{ project: { workItems: { nodes: WorkItemNode[] } } }>(config, q, { fp: fullPath });
  if (!r.ok) return { ok: false, error: r.error };
  const node = (r.data?.project?.workItems?.nodes ?? []).find((n) => n.iid === String(iid));
  return node ? { ok: true, data: node.id } : { ok: false, error: `Work item iid ${iid} not found in ${fullPath}` };
}

/** Resolve the project's "Task" work-item type GID (varies by instance). */
export async function resolveTaskTypeId(config: GitLabConfig, fullPath: string): Promise<GqlResult<string>> {
  const q = `query($fp: ID!){ project(fullPath: $fp){ workItemTypes{ nodes { id name } } } }`;
  const r = await gitlabGraphQL<{ project: { workItemTypes: { nodes: { id: string; name: string }[] } } }>(config, q, { fp: fullPath });
  if (!r.ok) return { ok: false, error: r.error };
  const task = (r.data?.project?.workItemTypes?.nodes ?? []).find((t) => t.name === 'Task');
  return task ? { ok: true, data: task.id } : { ok: false, error: 'Task work-item type not available on this instance' };
}

export interface CreatedTask { id: string; iid: number; title: string; webUrl: string }

/** Create a Task work item as a child of `parentGid`. */
export async function createTaskWorkItem(
  config: GitLabConfig,
  input: { namespacePath: string; taskTypeId: string; parentGid: string; title: string; description: string },
): Promise<GqlResult<CreatedTask>> {
  const m = `mutation($in: WorkItemCreateInput!){
    workItemCreate(input: $in){
      workItem { id iid title webUrl }
      errors
    }
  }`;
  const variables = {
    in: {
      namespacePath: input.namespacePath,
      workItemTypeId: input.taskTypeId,
      title: input.title,
      hierarchyWidget: { parentId: input.parentGid },
      descriptionWidget: { description: input.description },
    },
  };
  const r = await gitlabGraphQL<{ workItemCreate: { workItem: { id: string; iid: string; title: string; webUrl: string } | null; errors: string[] } }>(config, m, variables);
  if (!r.ok) return { ok: false, error: r.error };
  const wic = r.data?.workItemCreate;
  if (!wic?.workItem) return { ok: false, error: (wic?.errors ?? []).join('; ') || 'workItemCreate returned no work item' };
  const w = wic.workItem;
  return { ok: true, data: { id: w.id, iid: Number(w.iid), title: w.title, webUrl: w.webUrl } };
}
