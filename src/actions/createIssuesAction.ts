/**
 * createIssuesAction — Bulk create GitLab issues from selected user stories.
 *
 * For each selected story:
 * 1. Generate AI issue description
 * 2. Create issue in GitLab project
 * 3. Link issue to the loaded epic
 */

import { useConfigStore } from '@/stores/configStore';
import { useGitlabStore } from '@/stores/gitlabStore';
import { useUiStore } from '@/stores/uiStore';
import { createGitLabIssue, linkIssueToEpic } from '@/services/gitlab/gitlabClient';
import { generateIssueDescription } from '@/services/ai/generateIssueDescription';
import type { AIClientConfig } from '@/services/ai/types';
import type { ParsedUserStory } from '@/pipeline/utils/parseUserStories';

export interface CreationProgress {
  current: number;
  total: number;
  currentTitle: string;
  createdIds: string[];
  errors: string[];
}

export async function createIssuesAction(
  stories: ParsedUserStory[],
  epicTitle: string,
  epicContent: string,
  projectId: string,
  onProgress?: (progress: CreationProgress) => void,
  extraLabels?: string[],
): Promise<{ success: boolean; created: number; errors: string[] }> {
  const cfg = useConfigStore.getState().config;
  const { loadedEpicIid, loadedGroupId } = useGitlabStore.getState();
  const addToast = useUiStore.getState().addToast;

  const aiConfig: AIClientConfig = {
    provider: cfg.ai.provider,
    azure: cfg.ai.azure,
    openai: cfg.ai.openai,
    endpoints: cfg.endpoints,
  };

  const progress: CreationProgress = {
    current: 0,
    total: stories.length,
    currentTitle: '',
    createdIds: [],
    errors: [],
  };

  for (const story of stories) {
    progress.current++;
    progress.currentTitle = story.title;
    onProgress?.({ ...progress });

    try {
      // Generate description
      const description = await generateIssueDescription(story, epicTitle, epicContent, aiConfig);

      // Create issue
      const result = await createGitLabIssue(cfg.gitlab, projectId, {
        title: `${story.id}: ${story.title}`,
        description,
        labels: [story.priority, ...(extraLabels ?? [])],
        weight: story.storyPoints ?? undefined,
      });

      if (result.success && result.data) {
        progress.createdIds.push(String(result.data.iid));

        // Link to epic if we have epic context
        if (loadedEpicIid && loadedGroupId) {
          await linkIssueToEpic(cfg.gitlab, loadedGroupId, loadedEpicIid, result.data.id);
        }
      } else {
        progress.errors.push(`${story.id}: ${result.error ?? 'Unknown error'}`);
      }
    } catch (err) {
      progress.errors.push(`${story.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  onProgress?.({ ...progress });

  if (progress.createdIds.length > 0) {
    addToast({
      type: progress.errors.length > 0 ? 'warning' : 'success',
      title: `Created ${progress.createdIds.length}/${stories.length} issues`,
    });
  } else {
    addToast({ type: 'error', title: 'Failed to create any issues' });
  }

  return {
    success: progress.errors.length === 0,
    created: progress.createdIds.length,
    errors: progress.errors,
  };
}
