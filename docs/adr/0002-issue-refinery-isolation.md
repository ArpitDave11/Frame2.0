---
id: "0002"
title: Isolate Issue Refinery pipeline under `src/pipeline/issue/`
date: 2026-05-22
status: accepted
---

## Context
FRAME already has a 6-stage epic-refinement pipeline at `src/pipeline/orchestrator*` + `src/pipeline/stages/**`. The Issue Refinery feature introduces a new, smaller 3-stage pipeline (Comprehension → Refinement → Validation) that operates at the child-issue level rather than the epic level. We need to decide whether to extend the existing orchestrator or build the new pipeline in a separate directory.

Forces:
- The existing orchestrator is scope-guarded by the kit-hardening hooks (`pre-edit-protect-paths.sh`) — `src/pipeline/orchestrator*` and `src/pipeline/stages/**` are not editable without explicit human bypass.
- The two pipelines have different inputs (epic markdown vs. issue body + parent epic context), different output shapes (assembled epic with stories vs. refined issue body with advisory score), different stage counts, and different temperature/reasoning-effort tuning.
- A single shared orchestrator would have to branch on a "mode" flag at every stage — premature polymorphism for two consumers with materially different needs.

## Decision
Build the Issue Refinery pipeline in a dedicated subtree: `src/pipeline/issue/` containing its own `runIssuePipeline` orchestrator, its own `stageRunner`, its own schemas, its own prompt-assembly, and 3 stage modules. The existing epic-pipeline code is not touched.

The new pipeline must not import from `src/pipeline/orchestrator*` or `src/pipeline/stages/**`. This invariant is verified by a `grep` check during deep-review and by the absence of those imports in the production code (confirmed in both checkpoints).

The action-boundary pattern is preserved: the orchestrator stays pure (no store imports); a new `refineIssueAction.ts` in `src/actions/` is the only store-toucher.

## Consequences
- Two independent pipelines coexist in the repo. Future cross-cutting improvements (e.g., per-stage callbacks, observability) must be applied to both if desired in both.
- No accidental coupling: a change to epic-pipeline stages cannot regress issue-refinery, and vice versa.
- The shared infrastructure (`aiClient.callAI`, `withRetry`, `gitlabClient.*`) is still reused — duplication is contained to the pipeline-shape layer.
- The `src/pipeline/issue/stageRunner.ts` helper is private to the issue pipeline; if epic-pipeline stages later want similar Instructor-retry behavior they should either copy the pattern or we can promote `stageRunner` to a shared util once the API stabilizes.

## References
- HLD: [docs/plans/2026-05-18-issue-refinery-hld.md](../plans/2026-05-18-issue-refinery-hld.md)
- Design: [docs/plans/2026-05-18-issue-refinery-design.md](../plans/2026-05-18-issue-refinery-design.md)
- Phase A review (verifies scope-guard compliance): [docs/reviews/2026-05-21-issue-refinery-phase-A-review.md](../reviews/2026-05-21-issue-refinery-phase-A-review.md)
- Phase B review: [docs/reviews/2026-05-22-issue-refinery-phase-B-review.md](../reviews/2026-05-22-issue-refinery-phase-B-review.md)
