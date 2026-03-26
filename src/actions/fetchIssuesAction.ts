/**
 * Fetch Issues Action — loads real GitLab issues for the loaded epic.
 *
 * Called when Issue Manager view mounts. Uses fetchEpicIssues from
 * gitlabClient if GitLab is configured and an epic is loaded.
 * When not configured, the IssueManagerView falls back to mock data.
 */

import { useGitlabStore } from '@/stores/gitlabStore';
import { useConfigStore } from '@/stores/configStore';
import { useUiStore } from '@/stores/uiStore';
import { fetchEpicIssues } from '@/services/gitlab/gitlabClient';

export async function fetchIssuesAction(): Promise<void> {
  const config = useConfigStore.getState().config;
  const addToast = useUiStore.getState().addToast;
  const { loadedEpicIid, loadedGroupId } = useGitlabStore.getState();

  if (!config.gitlab.enabled || !config.gitlab.accessToken) {
    return; // Not configured — IssueManagerView uses mock data
  }

  if (!loadedEpicIid || !loadedGroupId) {
    return; // No epic loaded — nothing to fetch
  }

  try {
    const result = await fetchEpicIssues(config.gitlab, loadedGroupId, loadedEpicIid);

    if (result.success && result.data) {
      useGitlabStore.getState().setIssues(result.data);
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
