# brpGitlabService

[src/services/brp/brpGitlabService.ts](../../../../src/services/brp/brpGitlabService.ts) · [src/services/brp/brpGitlabService.test.ts](../../../../src/services/brp/brpGitlabService.test.ts) · [src/services/brp/brpGitlabService.live.test.ts](../../../../src/services/brp/brpGitlabService.live.test.ts)

The BRP→GitLab boundary. Composes the existing
[`src/services/gitlab/gitlabClient.ts`](../../../../src/services/gitlab/gitlabClient.ts)
(no raw `fetch()`) and maps GitLab response shapes to BRP-typed values.
This is where snake_case becomes camelCase, and where mismatches between
the gitlabClient's declared types and the real GitLab runtime shape are
coerced — see "Type drift" below.

## Four operations

| Function | Returns | Notes |
|---|---|---|
| `fetchCrews(config)` | `Result<Crew[]>` | Subgroups directly under `config.rootGroupId`. Each crew comes back with empty `pods` (call `fetchPods` to populate). Errors if `rootGroupId` is empty |
| `fetchPods(config, crewGroupId)` | `Result<Pod[]>` | Subgroups under the crew's group. Each pod gets `DEFAULT_POD_CAPACITY` + empty `epics` |
| `fetchPodEpics(config, podSubgroupId)` | `Result<Epic[]>` | Opened epics in the pod's subgroup. Each Epic comes back `analysisStatus: 'raw'`, `frameResult: null`, `humanEstimate: null` (NEVER pre-filled) |
| `fetchReferenceEpics(config, podSubgroupId)` | `Result<ReferenceEpic[]>` | Closed epics. `similarity` hardcoded at 0.5 (placeholder — real value belongs in P7 estimator); `actualSp` parsed from labels matching `/^SP[\s:_-]?(\d+)$/i` |

`Result<T> = { success: true; data: T } | { success: false; error: string }` — matches gitlabClient's pattern. Never throws on expected failures.

## `DEFAULT_POD_CAPACITY` (exported)

```ts
{
  resources: 1,
  spPerResource: 10,    // from DEFAULT_SP_PER_RESOURCE constant
  sprintCount: 6,
  holidayDays: 0,
  leaveDays: 0,
}
```

Spread (`{ ...DEFAULT_POD_CAPACITY }`) when assigning. `Object.freeze`'d
at module scope. Phase 5's Capacity dialog overwrites via
[`brpStore.updatePodCapacity`](../../stores/brpStore.md#group-2--capacity).

## Type drift — GitLab returns numbers where types say strings

The mocked tests originally passed string IDs in fixtures (matching the declared `GitLabSubgroup.id: string`). The live smoke against gitlab.com (2026-05-25) caught real drift: GitLab actually returns subgroup `id` as a **number**.

**Boundary coercion** (`toIdString` + `toNumericId` helpers in the same file) accepts `string | number` and produces both representations:
- `Crew.id` / `Pod.id`: `string` (for routing/React keys)
- `Crew.gitlabGroupId` / `Pod.gitlabSubgroupId`: `number` (for outbound API calls)

Shared `src/services/gitlab/types.ts` is intentionally NOT modified (outside BRP scope; the IR branch also depends on it). The runtime coercion makes the service robust regardless of what the declared type says.

Regression guard: two mocked tests (`[live-smoke regression] coerces NUMERIC subgroup id from GitLab to BRP string id`) pass a numeric-id fixture via `as unknown as GitLabSubgroup` and assert the BRP output's `id` is a string.

## Live smoke (gated)

[brpGitlabService.live.test.ts](../../../../src/services/brp/brpGitlabService.live.test.ts) is `describe.skipIf(!LIVE_SMOKE_ENABLED)`'d on `VITE_BRP_LIVE_SMOKE === '1'`. Manual run:

```bash
VITE_BRP_LIVE_SMOKE=1 \
VITE_GITLAB_BASE_URL=https://gitlab.com/api/v4 \
VITE_GITLAB_ROOT_GROUP_ID=<your-group-id> \
VITE_GITLAB_TOKEN=<your-pat> \
npm run test:run -- src/services/brp/brpGitlabService.live.test.ts
```

The test installs a global `fetch` interceptor that rewrites the relative `/gitlab-api/...` path (designed for the UBS dev-proxy) to `${VITE_GITLAB_BASE_URL}/...`. Spying on the exported `getBaseUrl` would NOT work because `gitlabClient` calls it internally via the local binding, not through the module namespace.

The smoke test walks `fetchCrews → fetchPods(first crew) → fetchPodEpics(first pod)` and asserts BRP shape invariants on real responses. Verified successfully against `gitlab.com/wma-test-stream` on 2026-05-25.

## Documented v1 limitations (revisit in P5/P7)

| Limit | Why deferred |
|---|---|
| `ReferenceEpic.similarity` hardcoded `0.5` | Real similarity needs text comparison against the analyzed epic — that's the estimator's job (P7), not the fetcher's |
| `ReferenceEpic.actualSp` parsed from labels only | GitLab's `weight` field on issues would be more authoritative but requires iterating each epic's children (deferred to P7) |
| Single-page fetch (`per_page=100`) | PI planning typically scopes < 100 epics per pod. v2 should iterate when `totalCount` exceeds 100 |
| `Result<T>` error is just a string | Phase 6's first action layer to discriminate auth-expired vs rate-limit vs network is when to widen to `{ code?, message, cause? }` — see [acknowledged.md I8](../../../reviews/acknowledged.md) |

## Test count
- `brpGitlabService.test.ts`: 22 mocked tests (4 fetchCrews + 5 fetchPods + 6 fetchPodEpics + 6 fetchReferenceEpics + 1 live-smoke regression for each of Crew/Pod)
- `brpGitlabService.live.test.ts`: 1 gated test (skipped by default; passes against gitlab.com)

## Consumers
- Phase 6 wiring layer — calls `fetchCrews` on crew-loader open, `fetchPods` when a crew is selected, `fetchPodEpics` when a pod expands, `fetchReferenceEpics` as the `getReferences` callback to [`brpStore.runAnalysis`](../../stores/brpStore.md#group-4--analysis).
