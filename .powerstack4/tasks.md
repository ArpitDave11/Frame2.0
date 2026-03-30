# Tasks — Context-Aware Update Generation

Source: `docs/plans/2026-03-30-context-aware-updates-plan.md`

## Phase 1: API Layer
- [ ] T1: Add `epic` field to `GitLabIssue` type (types.ts)
- [ ] T2: Add `fetchIssueEpic` function + tests (gitlabClient.ts)

## Phase 2: Data Passthrough
- [ ] T3: Add `epic_iid`/`epic_group_id` to `MockIssue`, update mapper

## Phase 3: IssueDetail Integration
- [ ] T4: Eager-fetch parent Epic + bump notes to 10
- [ ] T5: Enrich AI prompt with Epic context
- [ ] T6: Add loading indicator for Epic context

## Phase 4: Testing & Verification
- [ ] T7: Integration tests for context-aware generation
- [ ] T8: Full suite verification
