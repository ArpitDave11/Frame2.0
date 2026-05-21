/**
 * Issue Refinery — boundary action (R-9).
 *
 * Thin layer between the UI / Zustand store and the pure pipeline orchestrator
 * (R-8) + the GitLab client (R-1). Two exported actions:
 *
 *   refineSelectedIssue()     reads issueRefineryStore + configStore,
 *                             runs the 3-stage pipeline, writes results back.
 *
 *   publishRefinedIssue()     reads the refined draft from the store and
 *                             PUTs it to GitLab via gitlabClient.updateIssue.
 *
 * Mirrors the action-boundary pattern of `src/pipeline/refinePipelineAction.ts`.
 */

import type { AIClientConfig } from '@/services/ai/types';
import { useConfigStore } from '@/stores/configStore';
import { useUiStore } from '@/stores/uiStore';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';
import { runIssuePipeline } from '@/pipeline/issue/runIssuePipeline';
import { updateIssue } from '@/services/gitlab/gitlabClient';

// ─── Refine ───────────────────────────────────────────────────────

/**
 * Runs the 3-stage pipeline against the currently selected child issue and
 * writes the results to the issueRefineryStore. Fire-and-forget from UI.
 *
 * No-op if no child is selected. On any stage failure, the store ends in
 * phase='error' with `error` populated; previously cached stage outputs
 * are cleared to avoid mixing fresh + stale state.
 */
export async function refineSelectedIssue(): Promise<void> {
  const store = useIssueRefineryStore.getState();

  if (store.selectedChildIid === null || store.selectedEpic === null) {
    useUiStore.getState().addToast({
      type: 'error',
      title: 'Select an epic and a child issue before refining.',
    });
    return;
  }

  const epicBody = store.selectedEpic.body;
  const issueBody = store.originalBody ?? '';

  const cfg = useConfigStore.getState().config;
  const aiConfig: AIClientConfig = {
    provider: cfg.ai.provider,
    azure: cfg.ai.azure,
    openai: cfg.ai.openai,
    endpoints: cfg.endpoints,
  };

  // Clear any stale per-child results before kicking off.
  store.setPhase('comprehending', null);

  try {
    // We run the full pipeline in one go but flip the phase between calls so
    // the UI can show progressive feedback. The orchestrator does not expose
    // per-stage callbacks today; promoting per-stage hooks would touch the
    // pipeline contract — deferred until UI testing shows a real need.
    const result = await runIssuePipeline(aiConfig, epicBody, issueBody);

    // Write results in one batch so UI re-renders once.
    store.setComprehension(result.comprehension);
    store.setRefinedDraft(result.refined.refinedBody, /* userEdited */ false);
    store.setValidation(result.validation);
    for (const n of result.cachedTokens) store.recordCachedTokens(n);
    store.setPhase('ready', null);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    store.setPhase('error', message);
    useUiStore.getState().addToast({ type: 'error', title: `Refine failed: ${message}` });
  }
}

// ─── Publish ──────────────────────────────────────────────────────

/**
 * Publishes the current refined draft to GitLab by issuing
 * `PUT /projects/:projectId/issues/:iid` with `{ description }`.
 *
 * Per locked decision D7: always-overwrite. No `updated_at` concurrency check
 * in v1 — a teammate's edit between load and publish will be silently
 * clobbered. Documented in the design doc; revisit in v2.
 *
 * No-op if no draft is present or no child is selected.
 */
export async function publishRefinedIssue(): Promise<void> {
  const store = useIssueRefineryStore.getState();

  if (
    store.refinedDraft === null ||
    store.refinedDraft.trim().length === 0 ||
    store.selectedChildIid === null ||
    store.originalProjectId === null
  ) {
    useUiStore.getState().addToast({
      type: 'error',
      title: 'Nothing to publish — refine an issue first.',
    });
    return;
  }

  const gitlabConfig = useConfigStore.getState().config.gitlab;
  store.setPhase('publishing', null);

  const result = await updateIssue(
    gitlabConfig,
    store.originalProjectId,
    store.selectedChildIid,
    { description: store.refinedDraft },
  );

  if (result.success) {
    store.setPhase('idle', null);
    useUiStore.getState().addToast({
      type: 'success',
      title: 'Refined issue published to GitLab.',
    });
  } else {
    store.setPhase('error', result.error ?? 'Unknown publish error');
    useUiStore.getState().addToast({
      type: 'error',
      title: `Publish failed: ${result.error ?? 'unknown'}`,
    });
  }
}
