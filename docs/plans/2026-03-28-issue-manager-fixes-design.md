# Issue Manager — Corrected Fix Plan

**Date:** 2026-03-28
**Status:** Approved, ready for execution

## Root Cause Summary

| Bug | Root Cause |
|-----|-----------|
| My Sprint empty | `email.split('@')[0]` → wrong username (abc@ubs.com ≠ abx04895) |
| Epic Issues shows AUTH-101 | MOCK_ISSUES fallback when API returns [] |
| Search no API | Client-side `.filter()` only |
| Errors invisible | Silent catch swallows failures |

## Fixes (6 total)

1. **fetchCurrentUser** — `GET /user` resolves real GitLab username from PAT
2. **Remove MOCK_ISSUES fallback** — no fake data when API returns empty
3. **Contextual empty states** — different messages for "no epic loaded" vs "epic has no issues"
4. **Remove silent catch** — `console.error` instead of swallowing
5. **Epic tab loading state** — spinner while fetching
6. **Server-side search** — `fetchGroupIssues` with `search` param for issue title/description search
