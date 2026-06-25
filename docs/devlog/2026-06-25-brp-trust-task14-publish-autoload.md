# 2026-06-25 — BRP trust T14: publish + auto-load into pod

**Tag:** brp-trust · **Task:** 14/15

## What
`publishGeneratedEpicAction(podId, stories, epicContent)` in brpActions:
- Resolves the target project from the pod's GitLab subgroup
  (fetchGroupProjects includeSubgroups → first issues-enabled project).
- Title from the epic markdown H1.
- createEpicWithStories (T12) → epic + child issues.
- Maps to a domain Epic whose frameResult.stories carry the planner-confirmed
  points → computeEpicLoad = Σ points (INV2).
- Appends to the pod via loadEpicsIntoPod (D6 auto-load) and records an
  'epic-published' audit entry (new AuditKind).

## Verification
- New brpActions.publish.test.ts: project resolution, title-from-H1, success +
  auto-load with computeEpicLoad=16, no-project error, create-failure propagation
  (no orphan load), missing-pod error. 17 pass (with auditLog). tsc clean (13).
