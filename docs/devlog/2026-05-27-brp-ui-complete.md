# 2026-05-27 — BRP UI complete (B-18 → B-39)

## Summary

Shipped P5+P6+P7 in one continuous session on `feature/brp`. Took
the headless P1-P4 layer (sealed in [2026-05-26-brp-headless.md])
to a complete UI with action layer, AI assists, audit log, Azure
swap, and a11y contract suite. 395 BRP tests passing; tsc baseline
55 unchanged.

## What landed

**12 UI primitives** — VarianceBadge, CapacityDialog, MetricsModal
(recharts mocked in tests), EpicRow (editable inline estimate),
DetailPanel (rationale + breakdown + refs + generated stories),
CrewSelector, PodLoader, EpicPicker, AnalysisProgress, PortfolioView,
PodView. Each is a pure presentational seam — no store reads inside.

**BrpView routing** (B-27/B-28) — switches between Portfolio and Pod
views based on `selectedPodId`, owns the three modal flags as local
state. Falls back to Portfolio defensively if `selectedPodId` no
longer resolves (a refresh dropping the pod must not crash the view).

**brpActions** (B-29/B-30) — orchestration layer composing
brpGitlabService + brpStore + configStore. Single seam where state
and service meet; no components reach in directly.

**5-flow integration test** (B-31) — exercises load → load → list →
confirm → add, capacity save → metrics refresh, inline estimate →
variance flips, Run analysis → success banner, Portfolio ↔ Pod.

**Deep-review checkpoint** (B-32) — caught and fixed 4 criticals:
cancel-during-analysis showed a false success banner (store didn't
throw on abort), "Run analysis" on a Pod actually walked every pod's
epics, unmount mid-run leaked the AbortController, missing cancel
test coverage let those slip. Also fixed 2 importants
(MetricsModal chart treated pending=0SP; DetailPanel rendered
unchecked href). New `BrpView.cancel.test.tsx` pins the contract.

**AI assists** (B-33/B-34) — three seams matching the AIEstimator
pattern: CapacityAssistant (median of past actuals ÷ resources),
VarianceInterpreter (templated explanation for caution/re-groom/
flagged), DuplicateDetector (Jaccard + transitive grouping). All
have simulator implementations + provider seams ready for Azure.

**Audit log** (B-35) — `services/brp/auditLog.ts` ring buffer with
localStorage persistence, wired into every mutating action. See
ADR 0004.

**Azure swap** (B-36/B-37) — `azureEstimator.ts` calls `callAzure`
with a JSON-output prompt + zod schema validation. `estimatorProvider`
swaps based on `configStore.config.ai.provider` + credentials;
unconfigured falls back to the simulator. See ADR 0005.

**a11y contract suite** (B-38) — 17 pinned assertions across all
components covering role, aria-label, aria-modal, aria-live,
progressbar, external-link rel=noopener.

**Empty/loading/error states** (B-39) — EpicPicker gains state="ready"
| "loading" | "error" with retry; closes deep-review I5.

## Test counts (at session end)

- 30 BRP test files, 395 BRP tests, 1 skipped (live-smoke)
- Total in repo: 30+ files, 395+ tests
- tsc errors: 55 baseline (unchanged from session start)

## Decisions deferred

- I2/I3: refactor `onRunAnalysis` body into a `useBrpAnalysisRun`
  hook. Backlog — works correctly today, just a 30-line block in
  BrpView that could be reusable.
- L1-L4 from deep-review: cosmetic + dead-code, not blocking.
- OpenAI-direct estimator (sibling to Azure): backlog. Pattern is
  set; one more file when needed.

## How to live-test

1. **Simulator path** (default): runs against deterministic stub.
   `Run analysis` on a Pod produces stable variance bands.
2. **Azure path**: set `useConfigStore.getState().config.ai.provider
   = 'azure'` + `azure.apiKey` + `endpoints.azureEndpoint`. Same
   button → real Azure call. Schema-validates output; errors land
   in the partial-failure banner.
3. **GitLab live**: provide a PAT in `config.gitlab.accessToken`.
   The `brpGitlabService.live.test.ts` smoke is gated by env var.

## What's next

- B-40 (this doc) ✓
- B-41 CLAUDE.md update — pending
- B-42 final acceptance check + PR — pending
