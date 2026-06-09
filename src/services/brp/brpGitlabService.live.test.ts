/**
 * Live smoke test for `brpGitlabService` (B-11) — gated, skip-by-default.
 *
 * This file deliberately lives in its OWN test file (separate from
 * `brpGitlabService.test.ts`) because Vitest's `vi.mock` is module-
 * scoped: mixing mocked tests and live network tests in one file
 * causes the unmock attempt to defeat the mock for the whole file.
 *
 * The mocked tests in `brpGitlabService.test.ts` prove correctness of
 * mapping and error handling. This file exists only to catch GitLab
 * API drift (field renames, response shape changes, auth quirks)
 * which mocks cannot detect. Run it before a release that touches
 * `brpGitlabService.ts` or `gitlabClient.ts`.
 *
 * Base URL note: `gitlabClient.getBaseUrl()` returns the hardcoded
 * relative `/gitlab-api` for the UBS dev-proxy in `vite.config.ts`.
 * From vitest there's no proxy — so this file installs a global
 * `fetch` interceptor that rewrites `/gitlab-api/...` to
 * `${VITE_GITLAB_BASE_URL}/...` (default: `https://gitlab.com/api/v4`).
 * The interceptor is removed in `afterAll`. Spying on the exported
 * `getBaseUrl` would NOT work because gitlabClient calls it internally
 * via the local binding, not through the module namespace.
 *
 * Manual run command:
 *
 *   VITE_BRP_LIVE_SMOKE=1 \
 *   VITE_GITLAB_BASE_URL=https://gitlab.com/api/v4 \
 *   VITE_GITLAB_ROOT_GROUP_ID=<your-group-id> \
 *   VITE_GITLAB_TOKEN=<your-pat> \
 *   npm run test:run -- src/services/brp/brpGitlabService.live.test.ts
 *
 * Intentionally skipped in CI and in any regular `npm run test:run`.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  fetchCrews,
  fetchPodEpics,
  fetchPods,
} from './brpGitlabService';
import type { GitLabConfig } from '../../domain/configTypes';

const LIVE_SMOKE_ENABLED = process.env['VITE_BRP_LIVE_SMOKE'] === '1';

/** Absolute base URL the test rewrites `/gitlab-api/...` to. */
const LIVE_BASE_URL =
  process.env['VITE_GITLAB_BASE_URL'] ?? 'https://gitlab.com/api/v4';

describe.skipIf(!LIVE_SMOKE_ENABLED)('brpGitlabService — LIVE smoke (gated)', () => {
  const originalFetch = globalThis.fetch;

  beforeAll(() => {
    // Rewrite the relative path that gitlabClient uses (`/gitlab-api`)
    // into the absolute LIVE_BASE_URL. Any other URL is forwarded
    // unchanged so unrelated requests still work normally.
    globalThis.fetch = (async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      let url: string;
      if (typeof input === 'string') url = input;
      else if (input instanceof URL) url = input.toString();
      else url = input.url;

      if (url.startsWith('/gitlab-api/')) {
        const rewritten = url.replace('/gitlab-api/', `${LIVE_BASE_URL}/`);
        return originalFetch(rewritten, init);
      }
      return originalFetch(input, init);
    }) as typeof fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches real crews → pods → epics from configured GitLab', async () => {
    const rootGroupId = process.env['VITE_GITLAB_ROOT_GROUP_ID'] ?? '';
    const accessToken = process.env['VITE_GITLAB_TOKEN'] ?? '';
    if (!rootGroupId || !accessToken) {
      throw new Error(
        'Live smoke requires VITE_GITLAB_ROOT_GROUP_ID and VITE_GITLAB_TOKEN env vars',
      );
    }
    const config: GitLabConfig = {
      enabled: true,
      rootGroupId,
      accessToken,
      authMode: 'pat' as GitLabConfig['authMode'],
    };

    // 1. Crews under the configured root group
    const crewsResult = await fetchCrews(config);
    expect(crewsResult.success).toBe(true);
    if (!crewsResult.success) return;
    expect(crewsResult.data.length).toBeGreaterThan(0);
    // Spot-check shape: every crew has a numeric gitlabGroupId and empty pods.
    for (const crew of crewsResult.data) {
      expect(typeof crew.gitlabGroupId).toBe('number');
      expect(crew.pods).toEqual([]);
      expect(typeof crew.id).toBe('string');
      expect(typeof crew.name).toBe('string');
    }

    // 2. Pods of the first crew
    const firstCrew = crewsResult.data[0]!;
    const podsResult = await fetchPods(config, firstCrew.gitlabGroupId);
    expect(podsResult.success).toBe(true);
    if (!podsResult.success) return;
    for (const pod of podsResult.data) {
      expect(pod.epics).toEqual([]);
      expect(pod.capacity.spPerResource).toBeGreaterThan(0);
      // All 5 capacity input fields present.
      expect(Object.keys(pod.capacity).sort()).toEqual(
        ['holidayDays', 'leaveDays', 'resources', 'spPerResource', 'sprintCount'].sort(),
      );
    }

    // 3. Epics of the first pod (only if the crew has pods)
    if (podsResult.data.length > 0) {
      const firstPod = podsResult.data[0]!;
      const epicsResult = await fetchPodEpics(config, firstPod.gitlabSubgroupId);
      expect(epicsResult.success).toBe(true);
      if (!epicsResult.success) return;
      for (const epic of epicsResult.data) {
        // Shape invariants enforced at the service boundary — must hold
        // even against real GitLab responses or B-10 mappers are wrong.
        expect(epic.analysisStatus).toBe('raw');
        expect(epic.frameResult).toBeNull();
        expect(epic.humanEstimate).toBeNull();
        expect(epic.source).toBe('gitlab');
        expect(typeof epic.description).toBe('string'); // never undefined/null
        expect(typeof epic.id).toBe('string');
        expect(typeof epic.iid).toBe('number');
        expect(epic.podId).toBe(String(firstPod.gitlabSubgroupId));
      }
      // Console-friendly summary for the manual operator.
      // eslint-disable-next-line no-console
      console.log(
        `[live-smoke] crew "${firstCrew.name}" → pod "${firstPod.name}" → ${epicsResult.data.length} open epic(s)`,
      );
    }
  });
});
