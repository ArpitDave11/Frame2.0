/**
 * Issue Refinery — meta edit actions (weight · assignee · iteration).
 *
 * Thin boundary between the meta-chip popovers and the GitLab client. Each
 * setter writes to GitLab, then patches the selected child issue in the store
 * so the chip updates optimistically-after-confirm. Option fetchers back the
 * assignee / iteration typeaheads.
 *
 * Iteration is set via the `/iterate`-style quick-action note (GitLab has no
 * stable REST field for it); see addIssueNote. The test group has no
 * iterations defined, so that path is wired but not yet live-verified.
 */

import { useConfigStore } from '@/stores/configStore';
import { useUiStore } from '@/stores/uiStore';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';
import {
  updateIssue,
  searchGroupMembers,
  fetchRecentIterations,
  addIssueNote,
} from '@/services/gitlab/gitlabClient';
import type { GitLabMember, GitLabIteration, GitLabUser } from '@/services/gitlab/types';

function ctx() {
  const s = useIssueRefineryStore.getState();
  const gitlab = useConfigStore.getState().config.gitlab;
  return {
    gitlab,
    projectId: s.originalProjectId,
    iid: s.selectedChildIid,
    groupId: s.selectedEpic?.groupId ?? null,
    patch: s.updateSelectedChild,
  };
}

function toast(type: 'success' | 'error', title: string) {
  useUiStore.getState().addToast({ type, title });
}

/** Set the GitLab issue weight (story points). null clears it. */
export async function setIssueWeight(weight: number | null): Promise<boolean> {
  const { gitlab, projectId, iid, patch } = ctx();
  if (projectId === null || iid === null) return false;
  const res = await updateIssue(gitlab, projectId, iid, { weight });
  if (!res.success) {
    toast('error', `Couldn't set weight: ${res.error ?? 'unknown error'}`);
    return false;
  }
  patch({ weight: res.data?.weight ?? weight });
  toast('success', weight == null ? 'Weight cleared' : `Weight set to ${weight} SP`);
  return true;
}

/** Replace the issue's assignee (single). null unassigns. */
export async function setIssueAssignee(user: GitLabUser | null): Promise<boolean> {
  const { gitlab, projectId, iid, patch } = ctx();
  if (projectId === null || iid === null) return false;
  const res = await updateIssue(gitlab, projectId, iid, { assigneeIds: user ? [user.id] : [] });
  if (!res.success) {
    toast('error', `Couldn't set assignee: ${res.error ?? 'unknown error'}`);
    return false;
  }
  patch({ assignees: user ? [user] : [], assignee: user });
  toast('success', user ? `Assigned to ${user.name || user.username}` : 'Unassigned');
  return true;
}

/** Set the issue's iteration via a quick-action note. */
export async function setIssueIteration(iter: GitLabIteration | null): Promise<boolean> {
  const { gitlab, projectId, iid, patch } = ctx();
  if (projectId === null || iid === null) return false;
  const body = iter ? `/iteration *iteration:${iter.id}` : '/remove_iteration';
  const res = await addIssueNote(gitlab, projectId, iid, body);
  if (!res.success) {
    toast('error', `Couldn't set iteration: ${res.error ?? 'unknown error'}`);
    return false;
  }
  patch({ iteration: iter ? { id: iter.id, iid: iter.iid, title: iter.title } : null });
  toast('success', iter ? `Moved to ${iter.title ?? 'iteration'}` : 'Iteration removed');
  return true;
}

/** Members matching `query` for the assignee typeahead (empty query → recent). */
export async function fetchAssigneeOptions(query: string): Promise<GitLabMember[]> {
  const { gitlab, groupId } = ctx();
  if (!groupId) return [];
  const res = await searchGroupMembers(gitlab, groupId, query);
  return res.success ? (res.data ?? []) : [];
}

/** Recent iterations in the epic's group for the iteration picker. */
export async function fetchIterationOptions(): Promise<GitLabIteration[]> {
  const { gitlab, groupId } = ctx();
  if (!groupId) return [];
  const res = await fetchRecentIterations(gitlab, groupId);
  return res.success ? (res.data ?? []) : [];
}
