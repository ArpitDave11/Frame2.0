/**
 * createIssuesAction — Bulk create GitLab issues from selected user stories.
 *
 * For each selected story:
 * 1. Generate AI issue description
 * 2. Create issue in GitLab project (weight/assignee defaults applied)
 * 3. Link issue to the loaded epic — failures are recorded, not swallowed
 * 4. Apply default iteration via quick-action note (best-effort, recorded)
 */

import { useConfigStore } from '@/stores/configStore';
import { useGitlabStore } from '@/stores/gitlabStore';
import { useUiStore } from '@/stores/uiStore';
import { createGitLabIssue, linkIssueToEpic, addIssueNote } from '@/services/gitlab/gitlabClient';
import { generateIssueDescription } from '@/services/ai/generateIssueDescription';
import type { AIClientConfig } from '@/services/ai/types';
import type { GitLabUser, GitLabIteration } from '@/services/gitlab/types';
import type { ParsedUserStory } from '@/pipeline/utils/parseUserStories';

export interface CreatedIssueRef {
  iid: number;
  title: string;
  webUrl: string;
}

export interface CreationProgress {
  current: number;
  total: number;
  currentTitle: string;
  createdIds: string[];
  createdIssues: CreatedIssueRef[];
  errors: string[];
}

/** Defaults applied to every created issue (weight only when a story has no points). */
export interface IssueCreationDefaults {
  weight: number | null;
  assignee: GitLabUser | null;
  iteration: GitLabIteration | null;
}

/** Per-story overrides — a key present (even null) beats the AI value and the defaults. */
export type IssueOverrides = Record<string, Partial<IssueCreationDefaults>>;

/** Resolution order: per-issue override → AI/story value (weight only) → bulk default. */
export function resolveIssueMeta(
  story: ParsedUserStory,
  defaults?: IssueCreationDefaults,
  override?: Partial<IssueCreationDefaults>,
): IssueCreationDefaults {
  return {
    weight:
      override && 'weight' in override
        ? (override.weight ?? null)
        : (story.storyPoints ?? defaults?.weight ?? null),
    assignee:
      override && 'assignee' in override ? (override.assignee ?? null) : (defaults?.assignee ?? null),
    iteration:
      override && 'iteration' in override
        ? (override.iteration ?? null)
        : (defaults?.iteration ?? null),
  };
}

export async function createIssuesAction(
  stories: ParsedUserStory[],
  epicTitle: string,
  epicContent: string,
  projectId: string,
  onProgress?: (progress: CreationProgress) => void,
  extraLabels?: string[],
  defaults?: IssueCreationDefaults,
  overrides?: IssueOverrides,
): Promise<{ success: boolean; created: number; createdIssues: CreatedIssueRef[]; errors: string[] }> {
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
    createdIssues: [],
    errors: [],
  };

  for (const story of stories) {
    progress.current++;
    progress.currentTitle = story.title;
    onProgress?.({ ...progress });

    const meta = resolveIssueMeta(story, defaults, overrides?.[story.id]);

    try {
      // Generate description
      const description = await generateIssueDescription(story, epicTitle, epicContent, aiConfig);

      // Create issue
      const result = await createGitLabIssue(cfg.gitlab, projectId, {
        title: story.id.startsWith('custom-') ? story.title : `${story.id}: ${story.title}`,
        description,
        labels: ['HALLMARK: FRAME', story.priority, ...(extraLabels ?? [])],
        weight: meta.weight ?? undefined,
        assigneeIds: meta.assignee ? [meta.assignee.id] : undefined,
      });

      if (result.success && result.data) {
        const iid = result.data.iid;
        progress.createdIds.push(String(iid));
        progress.createdIssues.push({
          iid,
          title: result.data.title ?? story.title,
          webUrl: result.data.web_url ?? '',
        });

        // Link to epic if we have epic context — a silent failure here used to
        // leave orphan issues while the toast claimed full success
        if (loadedEpicIid && loadedGroupId) {
          const link = await linkIssueToEpic(cfg.gitlab, loadedGroupId, loadedEpicIid, result.data.id);
          if (!link.success) {
            progress.errors.push(
              `#${iid}: issue created but NOT linked to epic — ${link.error ?? 'unknown error'}`,
            );
          }
        }

        // Iteration via quick-action note (no stable REST field)
        if (meta.iteration) {
          const note = await addIssueNote(
            cfg.gitlab,
            Number(projectId),
            iid,
            `/iteration *iteration:${meta.iteration.id}`,
          );
          if (!note.success) {
            progress.errors.push(
              `#${iid}: created but iteration not set — ${note.error ?? 'unknown error'}`,
            );
          }
        }
      } else {
        progress.errors.push(`${story.id}: ${result.error ?? 'Unknown error'}`);
      }
    } catch (err) {
      progress.errors.push(`${story.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  onProgress?.({ ...progress });

  if (progress.createdIssues.length > 0) {
    const first = progress.createdIssues[0]!;
    addToast({
      type: progress.errors.length > 0 ? 'warning' : 'success',
      title:
        progress.errors.length > 0
          ? `Created ${progress.createdIssues.length}/${stories.length} issues — ${progress.errors.length} problem(s), see details in the dialog`
          : `Created ${progress.createdIssues.length}/${stories.length} issues`,
      link:
        progress.createdIssues.length === 1 && first.webUrl
          ? { href: first.webUrl, label: `Open issue #${first.iid} in GitLab` }
          : undefined,
    });
  } else {
    addToast({ type: 'error', title: 'Failed to create any issues' });
  }

  return {
    success: progress.errors.length === 0,
    created: progress.createdIssues.length,
    createdIssues: progress.createdIssues,
    errors: progress.errors,
  };
}
