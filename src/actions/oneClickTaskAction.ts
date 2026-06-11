/**
 * One-Click Task — boundary actions.
 *
 *   generateTaskDraft()  runs the task-generation stage from the prompt + parent.
 *   publishTask()        creates a GitLab Task work item as a child of the parent
 *                        issue (GraphQL workItemCreate + hierarchy parent).
 */

import type { AIClientConfig } from '@/services/ai/types';
import { useConfigStore } from '@/stores/configStore';
import { useUiStore } from '@/stores/uiStore';
import { useOneClickTaskStore, type TaskDraft } from '@/stores/oneClickTaskStore';
import { runTaskGeneration } from '@/pipeline/issue/generation/generateTask';
import {
  namespacePathFromWebUrl,
  resolveTaskTypeId,
  resolveWorkItemGid,
  createTaskWorkItem,
} from '@/services/gitlab/gitlabGraphQL';

function aiConfig(): AIClientConfig {
  const cfg = useConfigStore.getState().config;
  return { provider: cfg.ai.provider, azure: cfg.ai.azure, openai: cfg.ai.openai, endpoints: cfg.endpoints };
}
function toast(type: 'success' | 'error', title: string) {
  useUiStore.getState().addToast({ type, title });
}

export async function generateTaskDraft(): Promise<void> {
  const s = useOneClickTaskStore.getState();
  const prompt = s.prompt.trim();
  if (!prompt || !s.parent) { toast('error', 'Enter a prompt for the task first.'); return; }

  s.setError(null);
  s.setPhase('generating');
  try {
    const g = await runTaskGeneration(aiConfig(), { prompt, parent: { title: s.parent.title, body: s.parent.body } });
    useOneClickTaskStore.getState().setDraftFromGenerated(g);
    useOneClickTaskStore.getState().setPhase('review');
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    useOneClickTaskStore.getState().setError(message);
    useOneClickTaskStore.getState().setPhase('configure');
    toast('error', `Task generation failed: ${message}`);
  }
}

/** Compose the task body from the draft (description + acceptance checklist). */
export function composeTaskBody(draft: TaskDraft): string {
  const lines = [draft.description.trim(), ''];
  if (draft.acceptanceCriteria.length) {
    lines.push('## Acceptance Criteria', '');
    for (const ac of draft.acceptanceCriteria) lines.push(`- [ ] ${ac}`);
  }
  return lines.join('\n').trim();
}

export async function publishTask(): Promise<void> {
  const s = useOneClickTaskStore.getState();
  const { parent, draft } = s;
  if (!parent || !draft) { toast('error', 'Nothing to create — generate a task first.'); return; }

  const namespacePath = namespacePathFromWebUrl(parent.webUrl);
  if (!namespacePath) { toast('error', 'Could not resolve the project path from the issue URL.'); return; }

  const gitlab = useConfigStore.getState().config.gitlab;
  s.setPhase('publishing');

  const [typeRes, gidRes] = await Promise.all([
    resolveTaskTypeId(gitlab, namespacePath),
    resolveWorkItemGid(gitlab, namespacePath, parent.iid),
  ]);
  if (!typeRes.ok || !typeRes.data) { useOneClickTaskStore.getState().setPhase('review'); toast('error', `Task type unavailable: ${typeRes.error ?? ''}`); return; }
  if (!gidRes.ok || !gidRes.data) { useOneClickTaskStore.getState().setPhase('review'); toast('error', `Parent issue not found: ${gidRes.error ?? ''}`); return; }

  const created = await createTaskWorkItem(gitlab, {
    namespacePath,
    taskTypeId: typeRes.data,
    parentGid: gidRes.data,
    title: draft.title,
    description: composeTaskBody(draft),
  });
  if (!created.ok || !created.data) { useOneClickTaskStore.getState().setPhase('review'); toast('error', `Create task failed: ${created.error ?? ''}`); return; }

  useOneClickTaskStore.getState().setCreated({ iid: created.data.iid, webUrl: created.data.webUrl });
  toast('success', `Task #${created.data.iid} created under issue #${parent.iid}.`);
}
