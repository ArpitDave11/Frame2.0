# Context-Aware Update Generation

## Goal
Enrich AI-generated issue updates with parent Epic context and deeper activity history so updates maintain narrative continuity with the broader project.

## Status: IN PROGRESS

## Current Phase: Phase 1 — API Layer

## Plan Reference
`docs/plans/2026-03-30-context-aware-updates-plan.md` (8 tasks)

## Phases

### Phase 1: API Layer (T1-T2) — in_progress
- Add `epic` field to GitLabIssue type
- Add `fetchIssueEpic` API function + tests

### Phase 2: Data Passthrough (T3) — pending
- Add epic fields to MockIssue type
- Update mapGitLabIssueToMock mapper

### Phase 3: IssueDetail Integration (T4-T6) — pending
- Eager-fetch parent Epic on issue click
- Bump notes from 5 to 10
- Enrich AI prompt with Epic narrative context
- Add loading indicator

### Phase 4: Testing & Verification (T7-T8) — pending
- IssueDetail integration tests
- Full suite verification

## Decisions
- Eager fetch on issue click (not lazy, not prefetch-all)
- Epic description only (no sibling issues)
- Last 10 notes (up from 5)
- Auto-fetch parent epic from GitLab API per issue
- Graceful degradation when no epic linked

## Errors
(none)
