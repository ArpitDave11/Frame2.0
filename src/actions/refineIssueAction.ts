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
 * Deep-review hardening (see docs/reviews/2026-05-21-issue-refinery-phase-A-review.md):
 *   - C2: in-flight concurrency guard + stale-child write-back check
 *   - C4: per-stage phase advancement via onStageStart callback
 *   - I1: clearResults() before kickoff so failed runs don't mix fresh/stale
 *   - I8: 50 KB per-body size cap to bound prompt cost on hostile inputs
 *
 * Mirrors the action-boundary pattern of `src/pipeline/refinePipelineAction.ts`.
 */

import type { AIClientConfig } from '@/services/ai/types';
import { useConfigStore } from '@/stores/configStore';
import { useUiStore } from '@/stores/uiStore';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';
import { runIssuePipeline, type StageId } from '@/pipeline/issue/runIssuePipeline';
import { updateIssue, fetchEpicIssues } from '@/services/gitlab/gitlabClient';
import type { GitLabEpic } from '@/services/gitlab/types';

/** Phases during which Refine is NOT idempotent — clicking again does nothing. */
const IN_FLIGHT_PHASES = new Set<string>([
  'comprehending',
  'refining',
  'validating',
  'publishing',
]);

/** Upper bound on individual prompt-body bytes (UTF-16 code-units close enough). */
const MAX_BODY_CHARS = 50_000;

/** Map orchestrator stage id → store phase value. */
function phaseForStage(stage: StageId): 'comprehending' | 'refining' | 'validating' {
  return stage === 'comprehension'
    ? 'comprehending'
    : stage === 'refinement'
      ? 'refining'
      : 'validating';
}

// ─── Bridge: gitlabStore → issueRefineryStore (B-I4) ─────────────

/**
 * Fetches the child issues for a loaded GitLab epic and pushes the result
 * into `issueRefineryStore.setSelectedEpic`. Wraps the gitlab-fetch + error
 * handling that previously lived inline in IssueRefineryView, keeping the
 * view presentational.
 *
 * Returns `true` on success so the caller (a useEffect bridge in the view)
 * can persist the bridged epic-iid only after a successful fetch — addresses
 * B-C1 (no lockout-on-failure).
 */
export async function bridgeLoadedEpicAction(
  groupId: string,
  epicIid: number,
  epic: GitLabEpic,
): Promise<boolean> {
  const gitlabConfig = useConfigStore.getState().config.gitlab;
  const result = await fetchEpicIssues(gitlabConfig, groupId, epicIid);
  if (!result.success) {
    useUiStore.getState().addToast({
      type: 'error',
      title: `Failed to load child issues: ${result.error ?? 'unknown'}`,
    });
    return false;
  }
  useIssueRefineryStore.getState().setSelectedEpic(
    {
      groupId,
      epicIid,
      title: epic.title,
      body: epic.description ?? '',
    },
    result.data ?? [],
  );
  return true;
}

// ─── Refine ───────────────────────────────────────────────────────

/**
 * Runs the 3-stage pipeline against the currently selected child issue and
 * writes the results to the issueRefineryStore. Fire-and-forget from UI.
 *
 * No-op if no child is selected. Re-entry while a refine is in flight is also
 * a no-op (in-flight guard). On any stage failure, the store ends in
 * phase='error' with `error` populated; previously cached stage outputs are
 * cleared at kickoff so the UI never displays mixed fresh + stale state.
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

  // C2: in-flight guard — second click while busy is a no-op.
  if (IN_FLIGHT_PHASES.has(store.phase)) {
    return;
  }

  const epicBody = store.selectedEpic.body;
  const issueBody = store.originalBody ?? '';

  // I8: bound prompt cost / context-window risk for adversarial inputs.
  if (epicBody.length > MAX_BODY_CHARS || issueBody.length > MAX_BODY_CHARS) {
    useUiStore.getState().addToast({
      type: 'error',
      title: `Epic or issue body exceeds ${MAX_BODY_CHARS.toLocaleString()} characters — too large to refine safely.`,
    });
    return;
  }

  // C2 (stale-child write check): capture the iid at start. If the user
  // switches selection mid-flight, late writes must not land on the new child.
  const startIid = store.selectedChildIid;
  const isStale = () =>
    useIssueRefineryStore.getState().selectedChildIid !== startIid;

  const cfg = useConfigStore.getState().config;
  const aiConfig: AIClientConfig = {
    provider: cfg.ai.provider,
    azure: cfg.ai.azure,
    openai: cfg.ai.openai,
    endpoints: cfg.endpoints,
  };

  // I1: clear any stale per-issue derived state from a previous (possibly
  // failed) refine before kicking off. Does NOT drop selectedEpic/children.
  store.clearResults();
  store.setPhase('comprehending', null);

  try {
    const result = await runIssuePipeline(aiConfig, epicBody, issueBody, {
      onStageStart: (stage) => {
        if (isStale()) return; // C2: don't advance phase for an abandoned run.
        useIssueRefineryStore.getState().setPhase(phaseForStage(stage), null);
      },
    });

    if (isStale()) return; // C2: discard results bound to a now-unselected child.

    const s = useIssueRefineryStore.getState();
    s.setComprehension(result.comprehension);
    s.setRefinedDraft(result.refined.refinedBody, /* userEdited */ false);
    s.setValidation(result.validation);
    s.setPhase('ready', null);
  } catch (e) {
    if (isStale()) return; // C2: don't surface errors from abandoned runs.
    const message = e instanceof Error ? e.message : String(e);
    useIssueRefineryStore.getState().setPhase('error', message);
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
 * No-op if no draft is present, no child is selected, or another in-flight
 * action (refine / publish) is running.
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

  // C2: don't stomp an in-flight refine or another publish.
  if (IN_FLIGHT_PHASES.has(store.phase)) {
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
    const s = useIssueRefineryStore.getState();
    s.setPhase('idle', null);
    s.setPublished(true);
    // Reflect the freshly-published body as the new original so a re-open
    // shows what's actually on GitLab now.
    s.updateSelectedChild({ description: store.refinedDraft });
    useUiStore.getState().addToast({
      type: 'success',
      title: 'Refined issue published to GitLab.',
    });
  } else {
    useIssueRefineryStore.getState().setPhase('error', result.error ?? 'Unknown publish error');
    useUiStore.getState().addToast({
      type: 'error',
      title: `Publish failed: ${result.error ?? 'unknown'}`,
    });
  }
}
