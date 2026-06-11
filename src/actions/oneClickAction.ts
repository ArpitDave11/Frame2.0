/**
 * One-Click Issue — boundary actions.
 *
 *   generateOneClickIssue()  gathers group context (labels / members /
 *                            iterations), runs the generation stage, and pushes
 *                            an editable draft into oneClickStore.
 *
 *   publishOneClickIssue()   creates the issue in the chosen project (default
 *                            home), then applies assignee / iteration / epic
 *                            link. Nothing is written before this is called.
 *
 * Mirrors the action-boundary pattern of refineIssueAction.
 */

import type { AIClientConfig } from '@/services/ai/types';
import { useConfigStore } from '@/stores/configStore';
import { useUiStore } from '@/stores/uiStore';
import { useOneClickStore, type IssueDraft } from '@/stores/oneClickStore';
import { runIssueGeneration } from '@/pipeline/issue/generation/generateIssue';
import {
  createGitLabIssue,
  updateIssue,
  addIssueNote,
  linkIssueToEpic,
  fetchGroupLabels,
  searchGroupMembers,
  fetchRecentIterations,
} from '@/services/gitlab/gitlabClient';

function aiConfig(): AIClientConfig {
  const cfg = useConfigStore.getState().config;
  return { provider: cfg.ai.provider, azure: cfg.ai.azure, openai: cfg.ai.openai, endpoints: cfg.endpoints };
}

function toast(type: 'success' | 'error', title: string) {
  useUiStore.getState().addToast({ type, title });
}

/** Group used to source labels / members / iterations for suggestions. */
function contextGroupId(): string | null {
  const s = useOneClickStore.getState();
  return s.epic?.groupId ?? useConfigStore.getState().config.gitlab.rootGroupId ?? null;
}

export async function generateOneClickIssue(): Promise<void> {
  const store = useOneClickStore.getState();
  const prompt = store.prompt.trim();
  if (!prompt) {
    toast('error', 'Enter a prompt describing the issue first.');
    return;
  }
  if (!store.projectId) {
    toast('error', 'Select a target project first.');
    return;
  }

  store.setError(null);
  store.setStep('generating');

  const gitlab = useConfigStore.getState().config.gitlab;
  const gid = contextGroupId();

  // Best-effort context — failures just mean fewer suggestions.
  const [labelsRes, membersRes, itersRes] = await Promise.all([
    gid ? fetchGroupLabels(gitlab, gid) : Promise.resolve({ success: false } as const),
    gid ? searchGroupMembers(gitlab, gid, '') : Promise.resolve({ success: false } as const),
    gid ? fetchRecentIterations(gitlab, gid) : Promise.resolve({ success: false } as const),
  ]);
  const labels = labelsRes.success ? (labelsRes.data ?? []).map((l) => l.name) : [];
  const members = membersRes.success ? (membersRes.data ?? []) : [];
  const iterations = itersRes.success ? (itersRes.data ?? []) : [];

  try {
    const generated = await runIssueGeneration(aiConfig(), {
      prompt,
      epic: store.epic ? { title: store.epic.title, body: store.epic.body } : null,
      labels,
      members: members.map((m) => ({ name: m.name, username: m.username })),
      iterations: iterations.map((i) => i.title ?? '').filter(Boolean),
    });

    useOneClickStore.getState().setDraftFromGenerated(generated);

    // Resolve the suggested assignee username → a real member object.
    const uname = generated.suggestedAssignee?.trim().toLowerCase();
    if (uname) {
      const match = members.find((m) => m.username.toLowerCase() === uname);
      if (match) {
        useOneClickStore.getState().patchDraft({
          assignee: { id: match.id, username: match.username, name: match.name, state: match.state, avatar_url: match.avatar_url },
        });
      }
    }

    useOneClickStore.getState().setStep('review');
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    useOneClickStore.getState().setError(message);
    useOneClickStore.getState().setStep('configure');
    toast('error', `Generation failed: ${message}`);
  }
}

/** Compose the GitLab issue body from the editable draft. */
export function composeIssueBody(draft: IssueDraft): string {
  const lines: string[] = [draft.description.trim(), ''];
  if (draft.acceptanceCriteria.length) {
    lines.push('## Acceptance Criteria', '');
    for (const ac of draft.acceptanceCriteria) lines.push(`- [ ] ${ac}`);
    lines.push('');
  }
  if (draft.dependencies.length) {
    lines.push('## Dependencies', '');
    for (const d of draft.dependencies) lines.push(`- ${d}`);
    lines.push('');
  }
  if (draft.risks.length) {
    lines.push('## Risks', '');
    for (const r of draft.risks) lines.push(`- ${r}`);
    lines.push('');
  }
  return lines.join('\n').trim();
}

export async function publishOneClickIssue(): Promise<void> {
  const store = useOneClickStore.getState();
  const { draft, projectId, epic } = store;
  if (!draft || !projectId) {
    toast('error', 'Nothing to publish — generate an issue first.');
    return;
  }

  const gitlab = useConfigStore.getState().config.gitlab;
  store.setStep('publishing');

  // Priority is modelled as a GitLab scoped label.
  const labels = [...draft.labels, `priority::${draft.priority}`, 'HALLMARK: FRAME'];

  const created = await createGitLabIssue(gitlab, projectId, {
    title: draft.title,
    description: composeIssueBody(draft),
    labels,
    weight: draft.weight ?? undefined,
  });

  if (!created.success || !created.data) {
    useOneClickStore.getState().setStep('review');
    toast('error', `Publish failed: ${created.error ?? 'unknown error'}`);
    return;
  }
  const issue = created.data;

  // Apply post-create metadata (best-effort; the issue already exists).
  if (draft.assignee) {
    await updateIssue(gitlab, projectId, issue.iid, { assigneeIds: [draft.assignee.id] });
  }
  if (draft.iteration) {
    await addIssueNote(gitlab, Number(projectId), issue.iid, `/iteration *iteration:${draft.iteration.id}`);
  }
  if (epic) {
    await linkIssueToEpic(gitlab, epic.groupId, epic.epicIid, issue.id);
  }

  useOneClickStore.getState().setCreated({ iid: issue.iid, webUrl: issue.web_url });
  toast('success', `Issue #${issue.iid} created in GitLab.`);
}
