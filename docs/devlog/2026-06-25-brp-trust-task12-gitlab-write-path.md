# 2026-06-25 — BRP trust T12: GitLab write path (epic + stories)

**Tag:** brp-trust · **Task:** 12/15

## What
`brpGitlabService` gained a write path (was fetch-only), orchestrating the
existing client primitives — no new HTTP infra:
- `createEpicWithStories(config, input)`: createGitLabEpic → per story
  createGitLabIssue (weight=points, label `split::<SPIDR>`, AC checklist +
  rationale/reference in the body) → linkIssueToEpic. Returns `{epicId, epicIid,
  webUrl, issueIds, storyFailures}`.
- `updateEpicWithStories(config, epicIid, input)`: re-analyze variant — update
  epic body, then create + link the new stories.

## Error model
No GitLab bulk-rollback API exists, so it's best-effort with a detailed report:
epic-creation failure aborts (nothing orphaned); a per-story create/link failure
is collected in `storyFailures` and the rest proceed. Errors are classified via
the existing Result error-code mapping (auth/ratelimit/network/unknown).

## Verification
- New `brpGitlabService.write.test.ts`: happy path (create+link all), weight/label
  mapping, epic-fail abort, per-story create failure, link failure, re-analyze
  update. Existing gitlab service tests still pass — 39/39. tsc clean (13 baseline).
