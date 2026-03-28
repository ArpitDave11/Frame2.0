/**
 * GitLab Client — Phase 3 (T-3.5).
 *
 * All GitLab API functions. Every function:
 * - Receives config: GitLabConfig
 * - Uses /gitlab-api/ proxy path (vite.config.ts routes to real URL)
 * - Returns typed result objects ({ success, data?, error? })
 * - Never throws — always returns { success: false } on error
 */

import type { GitLabConfig } from '@/domain/configTypes';
import type {
  GitLabEpic,
  GitLabEpicChild,
  GitLabLabel,
  GitLabIssue,
  GitLabNote,
  GitLabProject,
  GitLabIteration,
  GitLabIterationResult,
  GitLabMember,
  GitLabIssueLink,
  GitLabGroupMetadata,
  GitLabSubgroup,
  GitLabBranch,
  GitLabTreeItem,
  GitLabEpicListResult,
  GitLabEpicResult,
  GitLabLabelResult,
  GitLabEpicChildrenResult,
  GitLabIssueResult,
  GitLabNoteResult,
  GitLabNoteListResult,
  GitLabPublishResult,
  GitLabGroupMetadataResult,
  GitLabSubgroupResult,
  GitLabConnectionResult,
  GitLabEpicSearchParams,
  GitLabCreateEpicParams,
  GitLabUpdateEpicParams,
} from './types';

// ─── Base URL ───────────────────────────────────────────────

export function getBaseUrl(): string {
  return '/gitlab-api';
}

// ─── Auth ───────────────────────────────────────────────────

export function getGitLabAuthHeaders(config: GitLabConfig): Record<string, string> {
  if (!config.accessToken) return {};
  if (config.authMode === 'oauth') {
    return { Authorization: `Bearer ${config.accessToken}` };
  }
  return { 'PRIVATE-TOKEN': config.accessToken };
}

export function isGitLabAuthConfigured(config: GitLabConfig): boolean {
  return config.enabled && !!config.accessToken;
}

// ─── Internal Helpers ───────────────────────────────────────

function requireAuth(config: GitLabConfig): string | null {
  if (!isGitLabAuthConfigured(config)) {
    return 'GitLab is not configured — enable it and provide an access token';
  }
  return null;
}

async function gitlabGet<T>(config: GitLabConfig, path: string): Promise<{ ok: boolean; data?: T; headers?: Headers; error?: string }> {
  const authError = requireAuth(config);
  if (authError) return { ok: false, error: authError };

  try {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      headers: { ...getGitLabAuthHeaders(config) },
    });
    if (!response.ok) {
      const text = await response.text();
      return { ok: false, error: `GitLab API error (${response.status}): ${text}` };
    }
    const data = await response.json();
    return { ok: true, data, headers: response.headers };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function gitlabMutate<T>(config: GitLabConfig, method: string, path: string, body: Record<string, unknown>): Promise<{ ok: boolean; data?: T; error?: string }> {
  const authError = requireAuth(config);
  if (authError) return { ok: false, error: authError };

  try {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...getGitLabAuthHeaders(config) },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      return { ok: false, error: `GitLab API error (${response.status}): ${text}` };
    }
    const data = await response.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function gitlabPost<T>(config: GitLabConfig, path: string, body: Record<string, unknown>) {
  return gitlabMutate<T>(config, 'POST', path, body);
}

function gitlabPut<T>(config: GitLabConfig, path: string, body: Record<string, unknown>) {
  return gitlabMutate<T>(config, 'PUT', path, body);
}

// ─── Epics ──────────────────────────────────────────────────

export async function fetchGroupEpics(
  config: GitLabConfig,
  groupId: string,
  params?: GitLabEpicSearchParams,
): Promise<GitLabEpicListResult> {
  if (!groupId) return { success: false, error: 'Group ID is required' };

  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);
  if (params?.state) searchParams.set('state', params.state);
  if (params?.labels?.length) searchParams.set('labels', params.labels.join(','));
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.per_page) searchParams.set('per_page', String(params.per_page));
  if (params?.include_descendant_groups) searchParams.set('include_descendant_groups', 'true');

  const qs = searchParams.toString();
  const path = `/groups/${groupId}/epics${qs ? `?${qs}` : ''}`;
  const result = await gitlabGet<GitLabEpic[]>(config, path);

  if (!result.ok) return { success: false, error: result.error };
  const totalCount = parseInt(result.headers?.get('x-total') ?? '0', 10);
  return { success: true, data: result.data, totalCount };
}

export async function fetchEpicDetails(
  config: GitLabConfig,
  groupId: string,
  epicIid: number,
): Promise<GitLabEpicResult> {
  const result = await gitlabGet<GitLabEpic>(config, `/groups/${groupId}/epics/${epicIid}`);
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function fetchEpicChildren(
  config: GitLabConfig,
  groupId: string,
  epicIid: number,
): Promise<GitLabEpicChildrenResult> {
  const [epicsResult, issuesResult] = await Promise.all([
    gitlabGet<GitLabEpicChild[]>(config, `/groups/${groupId}/epics/${epicIid}/epics`),
    gitlabGet<GitLabEpicChild[]>(config, `/groups/${groupId}/epics/${epicIid}/issues`),
  ]);

  if (!epicsResult.ok || !issuesResult.ok) {
    return { success: false, error: epicsResult.error || issuesResult.error };
  }

  const epics = (epicsResult.data ?? []).map((e) => ({ ...e, type: 'epic' as const }));
  const issues = (issuesResult.data ?? []).map((i) => ({ ...i, type: 'issue' as const }));
  return { success: true, data: { epics, issues } };
}

export async function createGitLabEpic(
  config: GitLabConfig,
  params: GitLabCreateEpicParams,
): Promise<GitLabEpicResult> {
  const groupId = params.group_id || config.rootGroupId;
  if (!groupId) return { success: false, error: 'No group ID available' };

  const body: Record<string, unknown> = { title: params.title };
  if (params.description) body.description = params.description;
  if (params.labels?.length) body.labels = params.labels.join(',');
  if (params.parent_id != null) body.parent_id = params.parent_id; // F01: uses global ID

  const result = await gitlabPost<GitLabEpic>(config, `/groups/${groupId}/epics`, body);
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function updateGitLabEpic(
  config: GitLabConfig,
  groupId: string,
  epicIid: number,
  params: GitLabUpdateEpicParams,
): Promise<GitLabEpicResult> {
  const body: Record<string, unknown> = {};
  if (params.title !== undefined) body.title = params.title;
  if (params.description !== undefined) body.description = params.description;
  if (params.labels !== undefined) body.labels = params.labels.join(',');

  const result = await gitlabPut<GitLabEpic>(config, `/groups/${groupId}/epics/${epicIid}`, body);
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

// ─── Groups ─────────────────────────────────────────────────

export async function fetchGitLabSubgroups(
  config: GitLabConfig,
  groupId: string,
): Promise<GitLabSubgroupResult> {
  const result = await gitlabGet<GitLabSubgroup[]>(config, `/groups/${groupId}/subgroups?per_page=100`);
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function fetchGroupMetadata(
  config: GitLabConfig,
  groupId: string,
): Promise<GitLabGroupMetadataResult> {
  const result = await gitlabGet<GitLabGroupMetadata>(config, `/groups/${groupId}`);
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

/** Placeholder — returns subgroups without enrichment. Future: enrich with per-group metadata. */
export async function fetchGitLabSubgroupsWithMetadata(
  config: GitLabConfig,
  groupId: string,
): Promise<GitLabSubgroupResult> {
  return fetchGitLabSubgroups(config, groupId);
}

export async function fetchGroupEpicsForHierarchy(
  config: GitLabConfig,
  groupId: string,
  params?: GitLabEpicSearchParams,
): Promise<GitLabEpicListResult> {
  return fetchGroupEpics(config, groupId, { ...params, include_descendant_groups: true });
}

// ─── Labels ─────────────────────────────────────────────────

export async function fetchGroupLabels(
  config: GitLabConfig,
  groupId: string,
): Promise<GitLabLabelResult> {
  const result = await gitlabGet<GitLabLabel[]>(config, `/groups/${groupId}/labels?per_page=100`);
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

// ─── Projects (F04: resolve target project for issue creation) ──

export async function fetchGroupProjects(
  config: GitLabConfig,
  groupId: string,
): Promise<{ success: boolean; data?: GitLabProject[]; error?: string }> {
  const result = await gitlabGet<GitLabProject[]>(config, `/groups/${groupId}/projects?per_page=100&include_subgroups=false`);
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

// ─── Issues ─────────────────────────────────────────────────

export async function createGitLabIssue(
  config: GitLabConfig,
  projectId: string,
  params: { title: string; description?: string; labels?: string[]; weight?: number },
): Promise<GitLabIssueResult> {
  const body: Record<string, unknown> = { title: params.title };
  if (params.description) body.description = params.description;
  if (params.labels?.length) body.labels = params.labels.join(',');
  if (params.weight != null) body.weight = params.weight;

  const result = await gitlabPost<GitLabIssue>(config, `/projects/${projectId}/issues`, body);
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function linkIssueToEpic(
  config: GitLabConfig,
  groupId: string,
  epicIid: number,
  issueId: number,
): Promise<GitLabConnectionResult> {
  const result = await gitlabPost(config, `/groups/${groupId}/epics/${epicIid}/issues/${issueId}`, {});
  if (!result.ok) return { success: false, error: result.error };
  return { success: true };
}

export async function fetchEpicIssues(
  config: GitLabConfig,
  groupId: string,
  epicIid: number,
): Promise<{ success: boolean; data?: GitLabIssue[]; error?: string }> {
  const result = await gitlabGet<GitLabIssue[]>(config, `/groups/${groupId}/epics/${epicIid}/issues`);
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

// ─── Issue Notes ─────────────────────────────────────────────

export async function fetchIssueNotes(
  config: GitLabConfig,
  projectId: number,
  issueIid: number,
): Promise<GitLabNoteListResult> {
  const result = await gitlabGet<GitLabNote[]>(config, `/projects/${projectId}/issues/${issueIid}/notes?sort=asc&per_page=50`);
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function addIssueNote(
  config: GitLabConfig,
  projectId: number,
  issueIid: number,
  body: string,
): Promise<GitLabNoteResult> {
  const result = await gitlabPost<GitLabNote>(config, `/projects/${projectId}/issues/${issueIid}/notes`, { body });
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

// ─── Iterations (Issue Manager sprint view) ─────────────────

export async function fetchCurrentIteration(
  config: GitLabConfig,
  groupId: string,
): Promise<GitLabIterationResult> {
  const result = await gitlabGet<GitLabIteration[]>(
    config,
    `/groups/${groupId}/iterations?state=current&per_page=1`,
  );
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

// ─── Group Issues (user-scoped sprint view) ──────────────────

export async function fetchGroupIssues(
  config: GitLabConfig,
  groupId: string,
  params: {
    assignee_username?: string;
    iteration_id?: number;
    per_page?: number;
    state?: string;
  },
): Promise<{ success: boolean; data?: GitLabIssue[]; error?: string }> {
  const searchParams = new URLSearchParams();
  if (params.assignee_username) searchParams.set('assignee_username', params.assignee_username);
  if (params.iteration_id) searchParams.set('iteration_id', String(params.iteration_id));
  searchParams.set('per_page', String(params.per_page ?? 100));
  if (params.state) searchParams.set('state', params.state);
  searchParams.set('order_by', 'updated_at');
  searchParams.set('sort', 'desc');

  const qs = searchParams.toString();
  const result = await gitlabGet<GitLabIssue[]>(config, `/groups/${groupId}/issues?${qs}`);
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

// ─── Group Members (user search autocomplete) ────────────────

export async function searchGroupMembers(
  config: GitLabConfig,
  groupId: string,
  query: string,
): Promise<{ success: boolean; data?: GitLabMember[]; error?: string }> {
  const result = await gitlabGet<GitLabMember[]>(
    config,
    `/groups/${groupId}/members/all?query=${encodeURIComponent(query)}&per_page=10`,
  );
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

// ─── Issue Links (blocker/dependency context) ────────────────

export async function fetchIssueLinks(
  config: GitLabConfig,
  projectId: number,
  issueIid: number,
): Promise<{ success: boolean; data?: GitLabIssueLink[]; error?: string }> {
  const result = await gitlabGet<GitLabIssueLink[]>(
    config,
    `/projects/${projectId}/issues/${issueIid}/links`,
  );
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

// ─── Labels with Search (typeahead autocomplete) ─────────────

export async function fetchLabelsWithSearch(
  config: GitLabConfig,
  groupId: string,
  query: string,
): Promise<GitLabLabelResult> {
  const result = await gitlabGet<GitLabLabel[]>(
    config,
    `/groups/${groupId}/labels?search=${encodeURIComponent(query)}&per_page=20`,
  );
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

// ─── Files / Repos ──────────────────────────────────────────

export async function fetchGitLabRepositoryTree(
  config: GitLabConfig,
  projectId: string,
  path = '',
  ref = 'main',
): Promise<{ success: boolean; data?: GitLabTreeItem[]; error?: string }> {
  const params = new URLSearchParams({ path, ref, per_page: '100' });
  const result = await gitlabGet<GitLabTreeItem[]>(config, `/projects/${projectId}/repository/tree?${params}`);
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function fetchGitLabFileContent(
  config: GitLabConfig,
  projectId: string,
  filePath: string,
  ref = 'main',
): Promise<{ success: boolean; data?: string; error?: string }> {
  const encodedPath = encodeURIComponent(filePath);
  const result = await gitlabGet<{ content: string }>(config, `/projects/${projectId}/repository/files/${encodedPath}?ref=${ref}`);
  if (!result.ok) return { success: false, error: result.error };
  const content = atob(result.data?.content ?? '');
  return { success: true, data: content };
}

export async function fetchGitLabBranches(
  config: GitLabConfig,
  projectId: string,
): Promise<{ success: boolean; data?: GitLabBranch[]; error?: string }> {
  const result = await gitlabGet<GitLabBranch[]>(config, `/projects/${projectId}/repository/branches?per_page=100`);
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

// ─── Publish ────────────────────────────────────────────────

export async function commitToGitLabBranch(
  config: GitLabConfig,
  projectId: string,
  params: {
    branch: string;
    commitMessage: string;
    actions: Array<{ action: string; file_path: string; content: string }>;
    startBranch?: string;
  },
): Promise<GitLabConnectionResult> {
  const body: Record<string, unknown> = {
    branch: params.branch,
    commit_message: params.commitMessage,
    actions: params.actions,
  };
  if (params.startBranch) body.start_branch = params.startBranch;

  const result = await gitlabPost(config, `/projects/${projectId}/repository/commits`, body);
  if (!result.ok) return { success: false, error: result.error };
  return { success: true };
}

export async function createGitLabMergeRequest(
  config: GitLabConfig,
  projectId: string,
  params: { sourceBranch: string; targetBranch: string; title: string; description?: string },
): Promise<{ success: boolean; data?: { web_url: string }; error?: string }> {
  const body: Record<string, unknown> = {
    source_branch: params.sourceBranch,
    target_branch: params.targetBranch,
    title: params.title,
  };
  if (params.description) body.description = params.description;

  const result = await gitlabPost<{ web_url: string }>(config, `/projects/${projectId}/merge_requests`, body);
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function publishWithMergeRequest(
  config: GitLabConfig,
  projectId: string,
  params: {
    branch: string;
    targetBranch: string;
    commitMessage: string;
    mrTitle: string;
    mrDescription?: string;
    actions: Array<{ action: string; file_path: string; content: string }>;
  },
): Promise<GitLabPublishResult> {
  const commitResult = await commitToGitLabBranch(config, projectId, {
    branch: params.branch,
    commitMessage: params.commitMessage,
    actions: params.actions,
    startBranch: params.targetBranch,
  });
  if (!commitResult.success) return { success: false, error: commitResult.error };

  const mrResult = await createGitLabMergeRequest(config, projectId, {
    sourceBranch: params.branch,
    targetBranch: params.targetBranch,
    title: params.mrTitle,
    description: params.mrDescription,
  });
  if (!mrResult.success) return { success: false, error: mrResult.error };

  return { success: true, data: { web_url: mrResult.data?.web_url ?? '', merge_request_url: mrResult.data?.web_url } };
}

// ─── Connection Test ────────────────────────────────────────

export async function testGitLabConnection(config: GitLabConfig): Promise<GitLabConnectionResult> {
  if (!isGitLabAuthConfigured(config)) {
    return { success: false, error: 'GitLab is not configured' };
  }

  const result = await gitlabGet(config, `/groups/${config.rootGroupId}`);
  if (!result.ok) return { success: false, error: result.error };
  return { success: true };
}
