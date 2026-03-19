/**
 * Fetch Issues Action — loads GitLab issues into gitlabStore.
 *
 * Called when Issue Manager view mounts. Uses fetchGroupEpics from
 * gitlabClient if GitLab is configured. When not configured, the
 * IssueManagerView falls back to mock data.
 */

import { useGitlabStore } from '@/stores/gitlabStore';
import { useConfigStore } from '@/stores/configStore';
import { useUiStore } from '@/stores/uiStore';
import { fetchGroupEpics } from '@/services/gitlab/gitlabClient';
import type { GitLabIssue } from '@/stores/gitlabStore';

export async function fetchIssuesAction(): Promise<void> {
  const config = useConfigStore.getState().config;
  const addToast = useUiStore.getState().addToast;

  if (!config.gitlab.enabled || !config.gitlab.rootGroupId) {
    return; // Not configured — IssueManagerView uses mock data
  }

  try {
    const result = await fetchGroupEpics(config.gitlab, config.gitlab.rootGroupId);

    if (result.success && result.data) {
      const issues: GitLabIssue[] = result.data.map((epic) => ({
        id: epic.id,
        iid: epic.iid,
        title: epic.title,
        state: epic.state === 'opened' ? 'opened' as const : 'closed' as const,
        labels: epic.labels,
        assignee: null,
        web_url: epic.web_url,
        created_at: epic.created_at,
      }));
      useGitlabStore.getState().setIssues(issues);
    } else if (result.error) {
      addToast({ type: 'error', title: `Failed to fetch issues: ${result.error}` });
    }
  } catch (err) {
    addToast({
      type: 'error',
      title: `Failed to fetch issues: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}
